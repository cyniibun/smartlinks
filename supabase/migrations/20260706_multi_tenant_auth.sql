-- tone-link multi-tenant foundation. Safe to run after the 20260705 migrations.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.songs add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.click_events add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
create index if not exists songs_workspace_id_idx on public.songs(workspace_id);
create index if not exists click_events_workspace_id_created_at_idx on public.click_events(workspace_id, created_at desc);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, name)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists artists_workspace_id_idx on public.artists(workspace_id);
create index if not exists campaigns_workspace_id_idx on public.campaigns(workspace_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute procedure public.handle_new_user();

-- Security-definer helpers avoid recursive workspace_members policy evaluation.
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid());
$$;
create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid() and role = any(allowed_roles));
$$;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, text[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated, anon;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.songs enable row level security;
alter table public.song_links enable row level security;
alter table public.click_events enable row level security;
alter table public.artists enable row level security;
alter table public.campaigns enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "workspace_members_select" on public.workspace_members;
create policy "workspace_members_select" on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "workspace_members_manage" on public.workspace_members;
create policy "workspace_members_manage" on public.workspace_members for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']))
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

drop policy if exists "workspaces_select" on public.workspaces;
create policy "workspaces_select" on public.workspaces for select to authenticated using (public.is_workspace_member(id));
drop policy if exists "workspaces_insert" on public.workspaces;
create policy "workspaces_insert" on public.workspaces for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "workspaces_update" on public.workspaces;
create policy "workspaces_update" on public.workspaces for update to authenticated using (public.has_workspace_role(id, array['owner','admin'])) with check (public.has_workspace_role(id, array['owner','admin']));
drop policy if exists "workspaces_delete" on public.workspaces;
create policy "workspaces_delete" on public.workspaces for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "songs_public_published" on public.songs;
create policy "songs_public_published" on public.songs for select to anon, authenticated using (published = true or public.is_workspace_member(workspace_id));
drop policy if exists "songs_workspace_manage" on public.songs;
create policy "songs_workspace_manage" on public.songs for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin','member']))
with check (public.has_workspace_role(workspace_id, array['owner','admin','member']));

drop policy if exists "song_links_public_or_member" on public.song_links;
create policy "song_links_public_or_member" on public.song_links for select to anon, authenticated using (
  exists(select 1 from public.songs s where s.id = song_links.song_id and (s.published = true or public.is_workspace_member(s.workspace_id)))
);
drop policy if exists "song_links_workspace_manage" on public.song_links;
create policy "song_links_workspace_manage" on public.song_links for all to authenticated using (
  exists(select 1 from public.songs s where s.id = song_links.song_id and public.has_workspace_role(s.workspace_id, array['owner','admin','member']))
) with check (
  exists(select 1 from public.songs s where s.id = song_links.song_id and public.has_workspace_role(s.workspace_id, array['owner','admin','member']))
);

drop policy if exists "click_events_workspace_select" on public.click_events;
create policy "click_events_workspace_select" on public.click_events for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists "artists_workspace_select" on public.artists;
create policy "artists_workspace_select" on public.artists for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "artists_workspace_manage" on public.artists;
create policy "artists_workspace_manage" on public.artists for all to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member'])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']));

drop policy if exists "campaigns_workspace_select" on public.campaigns;
create policy "campaigns_workspace_select" on public.campaigns for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "campaigns_workspace_manage" on public.campaigns;
create policy "campaigns_workspace_manage" on public.campaigns for all to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member'])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']));

-- Idempotently seed the existing owner after joe@cyniical.productions exists in Auth.
do $$
declare owner_user uuid; seeded_workspace uuid;
begin
  select id into owner_user from auth.users where lower(email) = 'joe@cyniical.productions' limit 1;
  if owner_user is not null then
    insert into public.profiles(id, email, full_name) values(owner_user, 'joe@cyniical.productions', 'Joe') on conflict(id) do nothing;
    select id into seeded_workspace from public.workspaces where owner_id = owner_user and name = 'Cyniical Productions' limit 1;
    if seeded_workspace is null then
      insert into public.workspaces(name, owner_id) values('Cyniical Productions', owner_user) returning id into seeded_workspace;
    end if;
    insert into public.workspace_members(workspace_id, user_id, role) values(seeded_workspace, owner_user, 'owner')
      on conflict(workspace_id, user_id) do update set role = 'owner';
    update public.songs set workspace_id = seeded_workspace where workspace_id is null;
    update public.click_events ce set workspace_id = s.workspace_id from public.songs s where ce.song_id = s.id and ce.workspace_id is null;
  end if;
end $$;
