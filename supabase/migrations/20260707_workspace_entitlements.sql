create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade unique,
  plan text not null default 'free' check (plan in ('free','basic','pro','enterprise','developer')),
  status text not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

update public.workspace_members
set role = 'editor'
where role = 'member';

alter table public.workspace_members
add constraint workspace_members_role_check
check (role in ('owner','admin','editor','viewer','developer'));

insert into public.workspace_subscriptions(workspace_id, plan, status)
select id, coalesce(plan_id, 'free'), 'active'
from public.workspaces
on conflict(workspace_id) do nothing;

alter table public.workspace_subscriptions enable row level security;
drop policy if exists "workspace_subscriptions_select" on public.workspace_subscriptions;
create policy "workspace_subscriptions_select" on public.workspace_subscriptions
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_subscriptions_manage" on public.workspace_subscriptions;
create policy "workspace_subscriptions_manage" on public.workspace_subscriptions
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
