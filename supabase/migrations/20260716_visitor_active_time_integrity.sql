-- Replace automatic view-content "engagement" with measured active page time.
-- Apply this migration before deploying the matching application code.

alter table public.click_events
add column if not exists page_view_id text,
add column if not exists active_duration_ms bigint,
add column if not exists engagement_completed boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'click_events_active_duration_valid'
      and conrelid = 'public.click_events'::regclass
  ) then
    alter table public.click_events
      add constraint click_events_active_duration_valid
      check (active_duration_ms is null or active_duration_ms between 0 and 86400000);
  end if;
end $$;

create unique index if not exists click_events_page_engagement_unique_idx
on public.click_events (workspace_id, page_view_id, event_type)
where page_view_id is not null and event_type = 'page_engagement';

create index if not exists click_events_workspace_engagement_created_idx
on public.click_events (workspace_id, event_type, created_at desc)
where event_type = 'page_engagement';

create or replace function public.record_page_engagement(
  p_workspace_id uuid,
  p_song_id uuid,
  p_link_page_id uuid,
  p_release_id uuid,
  p_artist_id uuid,
  p_visitor_id text,
  p_session_id text,
  p_page_view_id text,
  p_event_id text,
  p_active_duration_ms bigint,
  p_completed boolean,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_referrer text,
  p_user_agent text,
  p_device_type text
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.click_events (
    workspace_id, song_id, link_page_id, release_id, artist_id,
    visitor_id, external_id, session_id, page_view_id, event_id,
    event_type, event_name, active_duration_ms, engagement_completed,
    utm_source, utm_medium, utm_campaign, referrer, user_agent, device_type
  ) values (
    p_workspace_id, p_song_id, p_link_page_id, p_release_id, p_artist_id,
    p_visitor_id, p_visitor_id, p_session_id, p_page_view_id, p_event_id,
    'page_engagement', 'active_view_time', least(greatest(p_active_duration_ms, 0), 86400000), coalesce(p_completed, false),
    p_utm_source, p_utm_medium, p_utm_campaign, p_referrer, p_user_agent, p_device_type
  )
  on conflict (workspace_id, page_view_id, event_type)
    where page_view_id is not null and event_type = 'page_engagement'
  do update set
    active_duration_ms = greatest(coalesce(click_events.active_duration_ms, 0), excluded.active_duration_ms),
    engagement_completed = click_events.engagement_completed or excluded.engagement_completed,
    event_id = coalesce(click_events.event_id, excluded.event_id);
$$;

revoke all on function public.record_page_engagement(uuid, uuid, uuid, uuid, uuid, text, text, text, text, bigint, boolean, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_page_engagement(uuid, uuid, uuid, uuid, uuid, text, text, text, text, bigint, boolean, text, text, text, text, text, text) to service_role;

drop function if exists public.get_visitor_behavior_metrics(uuid, timestamptz, timestamptz, uuid, uuid, uuid, text, text);

create function public.get_visitor_behavior_metrics(
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
  average_active_view_seconds numeric,
  active_view_samples bigint,
  visitor_identity_events bigint
)
language sql
stable
security invoker
set search_path = public
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
  where event_type = 'page_view' and visitor_id is not null
),
previous_visitors as (
  select distinct visitor_id
  from public.click_events
  where workspace_id = p_workspace_id
    and event_type = 'page_view'
    and visitor_id is not null
    and p_from is not null
    and created_at < p_from
),
all_time_returning as (
  select visitor_id
  from filtered
  where event_type = 'page_view' and visitor_id is not null and session_id is not null
  group by visitor_id
  having count(distinct session_id) >= 2
),
repeat_clicker_rows as (
  select visitor_id
  from filtered
  where visitor_id is not null and event_type = 'platform_click'
  group by visitor_id
  having count(*) >= 2
),
session_firsts as (
  select
    session_id,
    min(created_at) filter (where event_type = 'page_view') as first_view_at,
    min(created_at) filter (where event_type = 'platform_click') as first_click_at
  from filtered
  where session_id is not null
  group by session_id
),
time_to_click as (
  select extract(epoch from (first_click_at - first_view_at)) as seconds
  from session_firsts
  where first_view_at is not null and first_click_at is not null and first_click_at >= first_view_at
),
active_view_rows as (
  select page_view_id, max(active_duration_ms)::numeric as duration_ms
  from filtered
  where event_type = 'page_engagement' and page_view_id is not null and active_duration_ms is not null
  group by page_view_id
)
select
  (select count(distinct visitor_id) from filtered where event_type = 'page_view' and visitor_id is not null)::bigint,
  (select count(distinct session_id) from filtered where event_type = 'page_view' and session_id is not null)::bigint,
  case
    when p_from is null then (select count(*) from all_time_returning)::bigint
    else (select count(*) from current_visitors c join previous_visitors p using (visitor_id))::bigint
  end,
  (select count(*) from repeat_clicker_rows)::bigint,
  (select percentile_cont(0.5) within group (order by seconds) from time_to_click)::numeric,
  (select round(avg(duration_ms) / 1000.0, 2) from active_view_rows)::numeric,
  (select count(*) from active_view_rows)::bigint,
  (select count(*) from filtered where event_type = 'page_view' and (visitor_id is not null or session_id is not null))::bigint;
$$;

revoke all on function public.get_visitor_behavior_metrics(uuid, timestamptz, timestamptz, uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_visitor_behavior_metrics(uuid, timestamptz, timestamptz, uuid, uuid, uuid, text, text) to service_role;
