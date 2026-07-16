-- Entitlement-sensitive writes must pass through ToneLink server routes, which
-- use the service role after checking workspace membership and entitlements.
-- Authenticated browser clients retain reads but cannot mutate these tables
-- directly through Supabase REST.

drop policy if exists "workspace_subscriptions_manage" on public.workspace_subscriptions;

drop policy if exists "workspace_members_manage" on public.workspace_members;
create policy "workspace_members_manage_non_developer"
on public.workspace_members
for all
to authenticated
using (
  role <> 'developer'
  and public.has_workspace_role(workspace_id, array['owner','admin','developer'])
)
with check (
  role <> 'developer'
  and public.has_workspace_role(workspace_id, array['owner','admin','developer'])
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'workspace_subscriptions',
    'workspace_members',
    'workspaces',
    'artists',
    'releases',
    'link_pages',
    'page_links',
    'songs',
    'song_links',
    'themes',
    'workspace_domains',
    'workspace_pixel_configurations',
    'pixel_connection_test_sessions',
    'pixel_event_deliveries'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'revoke insert, update, delete on table public.%I from authenticated, anon',
        table_name
      );
    end if;
  end loop;
end $$;

comment on table public.workspace_subscriptions is
  'Server-managed billing state. Client roles may read their workspace subscription but cannot mutate plan or status.';

comment on column public.workspace_members.role is
  'Workspace role. The developer value is internal-only and can only be assigned through trusted service-role operations.';
