create table if not exists public.pixel_event_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pixel_connection_id uuid references public.workspace_pixel_configurations(id) on delete set null,
  provider text not null check (provider in ('meta','tiktok','google_analytics','google_ads','snapchat','custom')),
  pixel_id text,
  internal_event_id uuid references public.click_events(id) on delete set null,
  provider_event_name text not null,
  event_id text,
  dedupe_key text not null unique,
  status text not null default 'sent' check (status in ('queued','sent','acknowledged','failed','skipped')),
  attempted_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  error_code text,
  error_message text,
  test_event boolean not null default false,
  latency_ms int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pixel_event_deliveries_workspace_attempted_idx
on public.pixel_event_deliveries(workspace_id, attempted_at desc);

create index if not exists pixel_event_deliveries_workspace_provider_idx
on public.pixel_event_deliveries(workspace_id, provider, attempted_at desc);

create index if not exists pixel_event_deliveries_connection_idx
on public.pixel_event_deliveries(pixel_connection_id, attempted_at desc);

create index if not exists pixel_event_deliveries_status_idx
on public.pixel_event_deliveries(workspace_id, status, attempted_at desc);

create table if not exists public.pixel_connection_test_sessions (
  id uuid primary key default gen_random_uuid(),
  pixel_connection_id uuid not null references public.workspace_pixel_configurations(id) on delete cascade,
  provider text not null check (provider in ('meta','tiktok','google_analytics','google_ads','snapchat','custom')),
  test_code text not null,
  expires_at timestamptz not null,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pixel_connection_test_sessions_active_idx
on public.pixel_connection_test_sessions(pixel_connection_id, provider, enabled, expires_at);

alter table public.pixel_event_deliveries enable row level security;
alter table public.pixel_connection_test_sessions enable row level security;

drop policy if exists "pixel_event_deliveries_select" on public.pixel_event_deliveries;
create policy "pixel_event_deliveries_select" on public.pixel_event_deliveries
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "pixel_event_deliveries_manage" on public.pixel_event_deliveries;
create policy "pixel_event_deliveries_manage" on public.pixel_event_deliveries
for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin','developer']))
with check (public.has_workspace_role(workspace_id, array['owner','admin','developer']));

drop policy if exists "pixel_connection_test_sessions_select" on public.pixel_connection_test_sessions;
create policy "pixel_connection_test_sessions_select" on public.pixel_connection_test_sessions
for select to authenticated
using (
  exists (
    select 1
    from public.workspace_pixel_configurations wpc
    where wpc.id = pixel_connection_test_sessions.pixel_connection_id
      and public.is_workspace_member(wpc.workspace_id)
  )
);

drop policy if exists "pixel_connection_test_sessions_manage" on public.pixel_connection_test_sessions;
create policy "pixel_connection_test_sessions_manage" on public.pixel_connection_test_sessions
for all to authenticated
using (
  exists (
    select 1
    from public.workspace_pixel_configurations wpc
    where wpc.id = pixel_connection_test_sessions.pixel_connection_id
      and public.has_workspace_role(wpc.workspace_id, array['owner','admin','developer'])
  )
)
with check (
  exists (
    select 1
    from public.workspace_pixel_configurations wpc
    where wpc.id = pixel_connection_test_sessions.pixel_connection_id
      and public.has_workspace_role(wpc.workspace_id, array['owner','admin','developer'])
  )
);

create index if not exists click_events_visitor_created_idx
on public.click_events(visitor_id, created_at);

create index if not exists click_events_session_created_idx
on public.click_events(session_id, created_at);

create index if not exists click_events_workspace_created_idx
on public.click_events(workspace_id, created_at);

create index if not exists click_events_release_created_idx
on public.click_events(release_id, created_at);

create index if not exists click_events_event_type_created_idx
on public.click_events(event_type, created_at);

create or replace function public.get_visitor_behavior_metrics(
  p_workspace_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_link_page_id uuid default null,
  p_release_id uuid default null,
  p_artist_id uuid default null,
  p_utm_source text default null,
  p_utm_campaign text default null
)
returns table (
  unique_visitors bigint,
  sessions bigint,
  returning_visitors bigint,
  repeat_clickers bigint,
  median_time_to_click_seconds numeric,
  engagement_rate numeric,
  visitor_identity_events bigint
)
language sql
stable
as $$
with filtered as (
  select *
  from public.click_events
  where workspace_id = p_workspace_id
    and (p_from is null or created_at >= p_from)
    and (p_to is null or created_at <= p_to)
    and (p_link_page_id is null or link_page_id = p_link_page_id)
    and (p_release_id is null or release_id = p_release_id)
    and (p_artist_id is null or artist_id = p_artist_id)
    and (p_utm_source is null or utm_source ilike '%' || p_utm_source || '%')
    and (p_utm_campaign is null or utm_campaign ilike '%' || p_utm_campaign || '%')
),
current_visitors as (
  select distinct visitor_id
  from filtered
  where visitor_id is not null
),
previous_visitors as (
  select distinct visitor_id
  from public.click_events
  where workspace_id = p_workspace_id
    and visitor_id is not null
    and p_from is not null
    and created_at < p_from
),
repeat_clicker_rows as (
  select visitor_id
  from filtered
  where visitor_id is not null
    and event_type = 'platform_click'
  group by visitor_id
  having count(*) >= 2
),
session_firsts as (
  select
    session_id,
    min(created_at) filter (where event_type = 'page_view') as first_view_at,
    min(created_at) filter (where event_type = 'platform_click') as first_click_at,
    bool_or(event_type = 'view_content') as has_engaged_view,
    bool_or(event_type = 'page_view') as has_page_view
  from filtered
  where session_id is not null
  group by session_id
),
time_to_click as (
  select extract(epoch from (first_click_at - first_view_at)) as seconds
  from session_firsts
  where first_view_at is not null
    and first_click_at is not null
    and first_click_at >= first_view_at
)
select
  (select count(distinct visitor_id) from filtered where visitor_id is not null)::bigint as unique_visitors,
  (select count(distinct session_id) from filtered where session_id is not null)::bigint as sessions,
  (select count(*) from current_visitors c join previous_visitors p using (visitor_id))::bigint as returning_visitors,
  (select count(*) from repeat_clicker_rows)::bigint as repeat_clickers,
  (select percentile_cont(0.5) within group (order by seconds) from time_to_click)::numeric as median_time_to_click_seconds,
  (
    select case
      when count(*) filter (where has_page_view) = 0 then null
      else round((count(*) filter (where has_engaged_view and has_page_view))::numeric / (count(*) filter (where has_page_view))::numeric * 100, 2)
    end
    from session_firsts
  ) as engagement_rate,
  (select count(*) from filtered where visitor_id is not null or session_id is not null)::bigint as visitor_identity_events;
$$;
