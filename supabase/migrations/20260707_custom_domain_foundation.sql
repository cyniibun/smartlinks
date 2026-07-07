create table if not exists public.workspace_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  hostname text not null,
  status text not null default 'Pending' check (status in ('Pending','Verified','SSL Pending','Active','Disabled')),
  verified boolean not null default false,
  ssl_status text not null default 'Not Started',
  verification_token text not null,
  verification_method text not null default 'txt',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_domains_hostname_unique
on public.workspace_domains (lower(hostname));

create index if not exists workspace_domains_workspace_idx
on public.workspace_domains(workspace_id, status);

insert into public.workspace_subscriptions(workspace_id, plan, status)
select id, coalesce(plan_id, 'free'), 'active'
from public.workspaces
on conflict(workspace_id) do nothing;

update public.workspace_members
set role = 'editor'
where role = 'member';

do $$
declare constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.workspace_members'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role%';

  if constraint_name is not null then
    execute format('alter table public.workspace_members drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.workspace_members
add constraint workspace_members_role_check
check (role in ('owner','admin','editor','viewer','developer'));

alter table public.workspace_domains enable row level security;

drop policy if exists "workspace_domains_select" on public.workspace_domains;
create policy "workspace_domains_select" on public.workspace_domains
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_domains_manage" on public.workspace_domains;
create policy "workspace_domains_manage" on public.workspace_domains
for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin','developer']))
with check (public.has_workspace_role(workspace_id, array['owner','admin','developer']));

drop policy if exists "workspace_members_manage" on public.workspace_members;
create policy "workspace_members_manage" on public.workspace_members for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin','developer']))
with check (public.has_workspace_role(workspace_id, array['owner','admin','developer']));

drop policy if exists "workspaces_update" on public.workspaces;
create policy "workspaces_update" on public.workspaces for update to authenticated
using (public.has_workspace_role(id, array['owner','admin','developer']))
with check (public.has_workspace_role(id, array['owner','admin','developer']));

drop policy if exists "themes_workspace_manage" on public.themes;
create policy "themes_workspace_manage" on public.themes for all to authenticated
using (workspace_id is not null and public.has_workspace_role(workspace_id,array['owner','admin','developer']))
with check (workspace_id is not null and not is_system_theme and public.has_workspace_role(workspace_id,array['owner','admin','developer']));

drop policy if exists "songs_workspace_manage" on public.songs;
create policy "songs_workspace_manage" on public.songs for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin','editor','developer']))
with check (public.has_workspace_role(workspace_id, array['owner','admin','editor','developer']));

drop policy if exists "song_links_workspace_manage" on public.song_links;
create policy "song_links_workspace_manage" on public.song_links for all to authenticated using (
  exists(select 1 from public.songs s where s.id = song_links.song_id and public.has_workspace_role(s.workspace_id, array['owner','admin','editor','developer']))
) with check (
  exists(select 1 from public.songs s where s.id = song_links.song_id and public.has_workspace_role(s.workspace_id, array['owner','admin','editor','developer']))
);

drop policy if exists "artists_workspace_manage" on public.artists;
create policy "artists_workspace_manage" on public.artists for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin','editor','developer']))
with check (public.has_workspace_role(workspace_id, array['owner','admin','editor','developer']));

drop policy if exists "releases_member_manage" on public.releases;
create policy "releases_member_manage" on public.releases for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer'])
  and (artist_id is null or exists(select 1 from public.artists a where a.id=releases.artist_id and a.workspace_id=releases.workspace_id)));

drop policy if exists "link_pages_member_manage" on public.link_pages;
create policy "link_pages_member_manage" on public.link_pages for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer'])
  and (artist_id is null or exists(select 1 from public.artists a where a.id=link_pages.artist_id and a.workspace_id=link_pages.workspace_id))
  and (release_id is null or exists(select 1 from public.releases r where r.id=link_pages.release_id and r.workspace_id=link_pages.workspace_id)));

drop policy if exists "page_links_member_manage" on public.page_links;
create policy "page_links_member_manage" on public.page_links for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer'])
  and exists(select 1 from public.link_pages p where p.id=page_links.link_page_id and p.workspace_id=page_links.workspace_id));

drop policy if exists "campaigns_workspace_manage" on public.campaigns;
create policy "campaigns_workspace_manage" on public.campaigns for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','editor','developer'])
  and (artist_id is null or exists(select 1 from public.artists a where a.id=campaigns.artist_id and a.workspace_id=campaigns.workspace_id))
  and (release_id is null or exists(select 1 from public.releases r where r.id=campaigns.release_id and r.workspace_id=campaigns.workspace_id))
  and (link_page_id is null or exists(select 1 from public.link_pages p where p.id=campaigns.link_page_id and p.workspace_id=campaigns.workspace_id)));

do $$
declare joe_user uuid; cyniical_workspace uuid;
begin
  select id into joe_user from auth.users where lower(email) = 'joe@cyniical.productions' limit 1;
  if joe_user is not null then
    select wm.workspace_id into cyniical_workspace
    from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.user_id = joe_user and lower(w.name) = 'cyniical productions'
    limit 1;

    if cyniical_workspace is not null then
      update public.workspace_members
      set role = 'developer'
      where workspace_id = cyniical_workspace and user_id = joe_user;

      insert into public.workspace_subscriptions(workspace_id, plan, status)
      values(cyniical_workspace, 'developer', 'active')
      on conflict(workspace_id) do update set plan = 'developer', status = 'active', updated_at = now();
    end if;
  end if;
end $$;
