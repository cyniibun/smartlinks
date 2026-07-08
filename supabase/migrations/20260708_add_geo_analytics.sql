alter table public.click_events
add column if not exists country text,
add column if not exists region text,
add column if not exists city text,
add column if not exists timezone text;

create index if not exists click_events_workspace_country_idx
on public.click_events (workspace_id, country);

create index if not exists click_events_workspace_region_idx
on public.click_events (workspace_id, region);

create index if not exists click_events_workspace_city_idx
on public.click_events (workspace_id, city);

create index if not exists click_events_workspace_event_country_idx
on public.click_events (workspace_id, event_type, country);

create or replace function public.get_click_event_geo_breakdown(
  p_workspace_id uuid,
  p_kind text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_link_page_id uuid default null,
  p_release_id uuid default null,
  p_artist_id uuid default null,
  p_utm_source text default null,
  p_utm_campaign text default null,
  p_limit int default 10
)
returns table(country text, region text, city text, views bigint)
language sql
stable
as $$
  select
    case when p_kind in ('country','region','city') then nullif(country, '') else null end as country,
    case when p_kind in ('region','city') then nullif(region, '') else null end as region,
    case when p_kind = 'city' then nullif(city, '') else null end as city,
    count(*)::bigint as views
  from public.click_events
  where workspace_id = p_workspace_id
    and event_type in ('page_view', 'visit')
    and nullif(country, '') is not null
    and (p_kind = 'country' or nullif(region, '') is not null)
    and (p_kind <> 'city' or nullif(city, '') is not null)
    and (p_from is null or created_at >= p_from)
    and (p_to is null or created_at <= p_to)
    and (p_link_page_id is null or link_page_id = p_link_page_id)
    and (p_release_id is null or release_id = p_release_id)
    and (p_artist_id is null or artist_id = p_artist_id)
    and (p_utm_source is null or utm_source ilike ('%' || p_utm_source || '%'))
    and (p_utm_campaign is null or utm_campaign ilike ('%' || p_utm_campaign || '%'))
  group by 1, 2, 3
  order by views desc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;
