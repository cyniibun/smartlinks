-- Explicit metric populations for Analytics dashboard cards.
-- Views retain the documented legacy `visit` alias; new clients emit page_view.

create or replace function public.get_analytics_summary_v2(
  p_workspace_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_link_page_id uuid default null,
  p_release_id uuid default null,
  p_artist_id uuid default null,
  p_platform text default null,
  p_utm_source text default null,
  p_utm_campaign text default null
)
returns table(views bigint, clicks bigint, ctr numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select event_type, platform
    from public.click_events event
    where event.workspace_id = p_workspace_id
      and (p_from is null or event.created_at >= p_from)
      and (p_to is null or event.created_at <= p_to)
      and (p_link_page_id is null or event.link_page_id = p_link_page_id)
      and (p_release_id is null or event.release_id = p_release_id)
      and (p_artist_id is null or event.artist_id = p_artist_id)
      and (p_utm_source is null or event.utm_source ilike ('%' || p_utm_source || '%'))
      and (p_utm_campaign is null or event.utm_campaign ilike ('%' || p_utm_campaign || '%'))
  ), totals as (
    select
      count(*) filter (where event_type in ('page_view', 'visit'))::bigint as views,
      count(*) filter (
        where event_type = 'platform_click'
          and (p_platform is null or platform = p_platform)
      )::bigint as clicks
    from filtered
  )
  select
    totals.views,
    totals.clicks,
    case when totals.views = 0 then 0
      else round(totals.clicks::numeric / totals.views::numeric * 100)
    end
  from totals;
$$;

create or replace function public.get_analytics_metric_breakdown_v2(
  p_workspace_id uuid,
  p_dimension text,
  p_population text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_link_page_id uuid default null,
  p_release_id uuid default null,
  p_artist_id uuid default null,
  p_platform text default null,
  p_utm_source text default null,
  p_utm_campaign text default null,
  p_limit integer default 10
)
returns table(metric_id text, name text, count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select
      event.link_page_id,
      event.release_id,
      event.song_id,
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
      and (p_utm_source is null or event.utm_source ilike ('%' || p_utm_source || '%'))
      and (p_utm_campaign is null or event.utm_campaign ilike ('%' || p_utm_campaign || '%'))
      and (
        p_population = 'all'
        or (p_population = 'views' and event.event_type in ('page_view', 'visit'))
        or (p_population = 'clicks' and event.event_type = 'platform_click')
      )
      -- Platform is a click dimension. It must never remove the view denominator.
      and (p_population = 'views' or p_platform is null or event.platform = p_platform)
      and (
        p_dimension <> 'campaign_platform'
        or nullif(trim(event.utm_campaign), '') is not null
        or nullif(trim(event.utm_source), '') is not null
      )
  ), labeled as (
    select
      case p_dimension
        when 'release' then coalesce(link_page_id::text, release_id::text, song_id::text, release_title)
        else case p_dimension
          when 'platform' then coalesce(nullif(trim(platform), ''), 'Unknown')
          when 'campaign_platform' then coalesce(nullif(trim(platform), ''), 'Unknown')
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
                split_part(regexp_replace(coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')), '^https?://', '', 'i'), '/', 1)
              else coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), ''), 'Direct / unknown')
            end
          )
          when 'referrer' then case
            when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) is null then 'Direct'
            when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) ~* '^https?://' then
              split_part(regexp_replace(coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')), '^https?://', '', 'i'), '/', 1)
            else coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), ''), 'Direct')
          end
          else null
        end
      end as metric_id,
      case p_dimension
        when 'release' then release_title
        when 'platform' then coalesce(nullif(trim(platform), ''), 'Unknown')
        when 'campaign_platform' then coalesce(nullif(trim(platform), ''), 'Unknown')
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
              split_part(regexp_replace(coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')), '^https?://', '', 'i'), '/', 1)
            else coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), ''), 'Direct / unknown')
          end
        )
        when 'referrer' then case
          when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) is null then 'Direct'
          when coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')) ~* '^https?://' then
            split_part(regexp_replace(coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), '')), '^https?://', '', 'i'), '/', 1)
          else coalesce(nullif(trim(normalized_referrer), ''), nullif(trim(referrer), ''), 'Direct')
        end
        else null
      end as name
    from filtered
  )
  select labeled.metric_id, labeled.name, count(*)::bigint
  from labeled
  where labeled.name is not null
  group by labeled.metric_id, labeled.name
  order by count(*) desc, labeled.name asc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

create or replace function public.get_analytics_timeseries_v2(
  p_workspace_id uuid,
  p_timezone text default 'UTC',
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_link_page_id uuid default null,
  p_release_id uuid default null,
  p_artist_id uuid default null,
  p_platform text default null,
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
    count(*) filter (
      where event.event_type = 'platform_click'
        and (p_platform is null or event.platform = p_platform)
    )::bigint as clicks,
    case
      when count(*) filter (where event.event_type in ('page_view', 'visit')) = 0 then 0
      else round(
        (count(*) filter (
          where event.event_type = 'platform_click'
            and (p_platform is null or event.platform = p_platform)
        ))::numeric
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
    and (p_utm_source is null or event.utm_source ilike ('%' || p_utm_source || '%'))
    and (p_utm_campaign is null or event.utm_campaign ilike ('%' || p_utm_campaign || '%'))
  group by timezone(p_timezone, event.created_at)::date
  order by timezone(p_timezone, event.created_at)::date asc;
$$;

create or replace function public.get_pixel_delivery_summary_v2(
  p_workspace_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table(
  pixel_connection_id uuid,
  provider text,
  pixel_id text,
  successful_count bigint,
  failed_count bigint,
  last_successful timestamptz,
  last_attempted timestamptz,
  last_acknowledged timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    delivery.pixel_connection_id,
    delivery.provider,
    delivery.pixel_id,
    count(*) filter (where delivery.status in ('sent', 'acknowledged'))::bigint,
    count(*) filter (where delivery.status = 'failed')::bigint,
    max(delivery.attempted_at) filter (where delivery.status in ('sent', 'acknowledged')),
    max(delivery.attempted_at),
    max(delivery.acknowledged_at)
  from public.pixel_event_deliveries delivery
  where delivery.workspace_id = p_workspace_id
    and (p_from is null or delivery.attempted_at >= p_from)
    and (p_to is null or delivery.attempted_at <= p_to)
  group by delivery.pixel_connection_id, delivery.provider, delivery.pixel_id;
$$;

revoke all on function public.get_analytics_summary_v2(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.get_analytics_metric_breakdown_v2(uuid,text,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.get_analytics_timeseries_v2(uuid,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.get_pixel_delivery_summary_v2(uuid,timestamptz,timestamptz) from public, anon, authenticated;

grant execute on function public.get_analytics_summary_v2(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text) to service_role;
grant execute on function public.get_analytics_metric_breakdown_v2(uuid,text,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,integer) to service_role;
grant execute on function public.get_analytics_timeseries_v2(uuid,text,timestamptz,timestamptz,uuid,uuid,uuid,text,text,text) to service_role;
grant execute on function public.get_pixel_delivery_summary_v2(uuid,timestamptz,timestamptz) to service_role;
