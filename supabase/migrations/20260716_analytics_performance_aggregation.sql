-- Exact, database-side analytics aggregates used by the progressive Analytics
-- dashboard. These functions return small grouped result sets instead of
-- sending the newest 1,000 raw events to the application for aggregation.

create index if not exists click_events_workspace_event_created_idx
on public.click_events (workspace_id, event_type, created_at desc);

create index if not exists click_events_workspace_link_created_idx
on public.click_events (workspace_id, link_page_id, created_at desc);

create index if not exists click_events_workspace_artist_created_idx
on public.click_events (workspace_id, artist_id, created_at desc);

create index if not exists click_events_workspace_release_created_idx
on public.click_events (workspace_id, release_id, created_at desc);

create index if not exists click_events_workspace_platform_created_idx
on public.click_events (workspace_id, platform, created_at desc);

create or replace function public.get_analytics_metric_breakdown(
  p_workspace_id uuid,
  p_dimension text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_link_page_id uuid default null,
  p_release_id uuid default null,
  p_artist_id uuid default null,
  p_platform text default null,
  p_event_type text default null,
  p_utm_source text default null,
  p_utm_campaign text default null,
  p_clicks_only boolean default false,
  p_limit integer default 10
)
returns table(name text, count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select
      event.platform,
      event.referrer,
      event.normalized_referrer,
      event.utm_source,
      event.utm_campaign,
      event.device_type,
      event.browser,
      event.user_agent,
      coalesce(page.title, release.title, song.title, 'Unknown') as release_title
    from public.click_events event
    left join public.link_pages page on page.id = event.link_page_id
    left join public.releases release on release.id = event.release_id
    left join public.songs song on song.id = event.song_id
    where event.workspace_id = p_workspace_id
      and (p_from is null or event.created_at >= p_from)
      and (p_to is null or event.created_at <= p_to)
      and (p_link_page_id is null or event.link_page_id = p_link_page_id)
      and (p_release_id is null or event.release_id = p_release_id)
      and (p_artist_id is null or event.artist_id = p_artist_id)
      and (p_platform is null or event.platform = p_platform)
      and (p_event_type is null or event.event_type = p_event_type)
      and (p_utm_source is null or event.utm_source ilike ('%' || p_utm_source || '%'))
      and (p_utm_campaign is null or event.utm_campaign ilike ('%' || p_utm_campaign || '%'))
      and (not p_clicks_only or event.event_type = 'platform_click')
  ), labeled as (
    select case p_dimension
      when 'platform' then coalesce(nullif(trim(platform), ''), 'Unknown')
      when 'release' then release_title
      when 'utm_source' then coalesce(nullif(trim(utm_source), ''), 'Unassigned')
      when 'utm_campaign' then coalesce(nullif(trim(utm_campaign), ''), 'Unassigned')
      when 'device' then coalesce(
        nullif(trim(device_type), ''),
        case when coalesce(user_agent, '') ~* '(mobile|android|iphone)' then 'Mobile' else 'Desktop' end
      )
      when 'browser' then coalesce(nullif(trim(browser), ''), 'Unknown')
      when 'source' then coalesce(
        nullif(trim(utm_source), ''),
        case
          when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) is null then 'Direct / unknown'
          when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) ~* '^https?://' then
            split_part(
              regexp_replace(
                coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')),
                '^https?://', '', 'i'
              ),
              '/', 1
            )
          else coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), ''), 'Direct / unknown')
        end
      )
      when 'referrer' then case
        when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) is null then 'Direct'
        when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) ~* '^https?://' then
          split_part(
            regexp_replace(
              coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')),
              '^https?://', '', 'i'
            ),
            '/', 1
          )
        else coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), ''), 'Direct')
      end
      else null
    end as name
    from filtered
  )
  select labeled.name, count(*)::bigint
  from labeled
  where labeled.name is not null
  group by labeled.name
  order by count(*) desc, labeled.name asc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

create or replace function public.get_analytics_timeseries(
  p_workspace_id uuid,
  p_timezone text default 'UTC',
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_link_page_id uuid default null,
  p_release_id uuid default null,
  p_artist_id uuid default null,
  p_platform text default null,
  p_event_type text default null,
  p_utm_source text default null,
  p_utm_campaign text default null
)
returns table(date text, views bigint, clicks bigint, ctr numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    to_char(timezone(p_timezone, event.created_at)::date, 'YYYY-MM-DD') as date,
    count(*) filter (where event.event_type in ('page_view', 'visit'))::bigint as views,
    count(*) filter (where event.event_type = 'platform_click')::bigint as clicks,
    case
      when count(*) filter (where event.event_type in ('page_view', 'visit')) = 0 then 0
      else round(
        (count(*) filter (where event.event_type = 'platform_click'))::numeric
        / (count(*) filter (where event.event_type in ('page_view', 'visit')))::numeric * 100
      )
    end as ctr
  from public.click_events event
  where event.workspace_id = p_workspace_id
    and (p_from is null or event.created_at >= p_from)
    and (p_to is null or event.created_at <= p_to)
    and (p_link_page_id is null or event.link_page_id = p_link_page_id)
    and (p_release_id is null or event.release_id = p_release_id)
    and (p_artist_id is null or event.artist_id = p_artist_id)
    and (p_platform is null or event.platform = p_platform)
    and (p_event_type is null or event.event_type = p_event_type)
    and (p_utm_source is null or event.utm_source ilike ('%' || p_utm_source || '%'))
    and (p_utm_campaign is null or event.utm_campaign ilike ('%' || p_utm_campaign || '%'))
  group by timezone(p_timezone, event.created_at)::date
  order by timezone(p_timezone, event.created_at)::date asc;
$$;

create or replace function public.get_workspace_link_metrics(
  p_workspace_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table(link_page_id uuid, views bigint, clicks bigint, last_activity timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select
    page.id as link_page_id,
    count(event.id) filter (where event.event_type in ('page_view', 'visit'))::bigint as views,
    count(event.id) filter (where event.event_type = 'platform_click')::bigint as clicks,
    max(event.created_at) as last_activity
  from public.link_pages page
  left join public.click_events event
    on event.link_page_id = page.id
    and event.workspace_id = p_workspace_id
    and (p_from is null or event.created_at >= p_from)
    and (p_to is null or event.created_at <= p_to)
  where page.workspace_id = p_workspace_id
  group by page.id;
$$;

revoke all on function public.get_analytics_metric_breakdown(uuid,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,boolean,integer) from public, anon, authenticated;
revoke all on function public.get_analytics_timeseries(uuid,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.get_workspace_link_metrics(uuid,timestamptz,timestamptz) from public, anon, authenticated;

grant execute on function public.get_analytics_metric_breakdown(uuid,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,boolean,integer) to service_role;
grant execute on function public.get_analytics_timeseries(uuid,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.get_workspace_link_metrics(uuid,timestamptz,timestamptz) to service_role;
