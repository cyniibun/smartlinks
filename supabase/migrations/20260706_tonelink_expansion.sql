-- Run after 20260706_multi_tenant_auth.sql.
create table if not exists public.plans (
  id text primary key, name text not null, monthly_price numeric,
  analytics_retention_days int, max_pixels int, max_custom_domains int,
  max_team_members int, max_artist_folders int, max_email_access_per_link int,
  features jsonb not null default '{}'::jsonb
);
insert into public.plans values
  ('free','Free',0,7,0,0,1,1,0,'{"smart_links":true,"artist_bio":true}'),
  ('basic','Basic',8,28,1,0,1,1,50,'{"smart_links":true,"presaves":true,"artist_bio":true,"design_customization":true}'),
  ('artist','Artist',19,90,2,1,2,3,200,'{"smart_links":true,"presaves":true,"artist_bio":true,"custom_stores":true,"retargeting_pixels":true}'),
  ('pro','Pro Artist',39,null,999,1,5,10,null,'{"smart_links":true,"presaves":true,"future_save":true,"custom_stores":true,"retargeting_pixels":true,"email_exports":true}')
on conflict(id) do update set name=excluded.name, monthly_price=excluded.monthly_price,
analytics_retention_days=excluded.analytics_retention_days, max_pixels=excluded.max_pixels,
max_custom_domains=excluded.max_custom_domains, max_team_members=excluded.max_team_members,
max_artist_folders=excluded.max_artist_folders, max_email_access_per_link=excluded.max_email_access_per_link,
features=excluded.features;
alter table public.workspaces add column if not exists plan_id text references public.plans(id) default 'free';

alter table public.artists add column if not exists default_tiktok_pixel_id text;
alter table public.artists add column if not exists default_meta_pixel_id text;
alter table public.artists add column if not exists default_ga_measurement_id text;
alter table public.artists add column if not exists default_head_entries jsonb not null default '[]'::jsonb;
alter table public.artists add column if not exists default_label_name text;
alter table public.artists add column if not exists bio text;
alter table public.artists add column if not exists website_url text;
alter table public.artists add column if not exists instagram_url text;
alter table public.artists add column if not exists tiktok_url text;
alter table public.artists add column if not exists youtube_url text;
alter table public.artists add column if not exists spotify_artist_url text;
alter table public.artists add column if not exists apple_artist_url text;

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete set null,
  legacy_song_id uuid unique references public.songs(id) on delete set null,
  title text not null,
  release_type text not null default 'single' check (release_type in ('single','album','ep','playlist','podcast','podcast_episode','audiobook','youtube_video','merch','event','ticket_page','presave','artist_bio','short_link','custom')),
  primary_artist_name text, label_name text, album text, isrc text, upc text,
  release_date date, artwork_url text, source_import_url text, import_provider text,
  import_confidence numeric not null default 0,
  import_status text not null default 'review' check (import_status in ('review','approved','published','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists releases_workspace_id_idx on public.releases(workspace_id);
create index if not exists releases_artist_id_idx on public.releases(artist_id);
create index if not exists releases_isrc_idx on public.releases(isrc);
create index if not exists releases_type_idx on public.releases(release_type);

create table if not exists public.link_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete set null,
  release_id uuid references public.releases(id) on delete cascade,
  legacy_song_id uuid unique references public.songs(id) on delete set null,
  slug text unique not null,
  page_type text not null default 'released_smart_link' check (page_type in ('released_smart_link','presave','artist_bio','podcast','playlist','event','contest','action_page','short_link','custom')),
  title text not null, subtitle text, artist_display_name text, label_name text,
  artwork_url text, background_image_url text, canonical_url text,
  seo_title text, seo_description text, og_image text,
  published boolean not null default false, scheduled_publish_at timestamptz,
  tiktok_pixel_id text, meta_pixel_id text, ga_measurement_id text,
  head_entries jsonb not null default '[]'::jsonb,
  layout_settings jsonb not null default '{}'::jsonb,
  feature_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists link_pages_workspace_slug_idx on public.link_pages(workspace_id, slug);
create index if not exists link_pages_workspace_id_idx on public.link_pages(workspace_id);
create index if not exists link_pages_release_id_idx on public.link_pages(release_id);
create index if not exists link_pages_page_type_idx on public.link_pages(page_type);

create table if not exists public.page_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  link_page_id uuid not null references public.link_pages(id) on delete cascade,
  platform text not null, label text not null, url text not null,
  section text not null default 'listen', enabled boolean not null default true,
  display_order int not null default 0, confidence numeric not null default 1,
  source text, review_status text not null default 'approved' check (review_status in ('suggested','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists page_links_link_page_id_idx on public.page_links(link_page_id);
create index if not exists page_links_workspace_id_idx on public.page_links(workspace_id);
create index if not exists page_links_platform_idx on public.page_links(platform);

alter table public.click_events add column if not exists link_page_id uuid references public.link_pages(id) on delete set null;
alter table public.click_events add column if not exists release_id uuid references public.releases(id) on delete set null;
alter table public.click_events add column if not exists artist_id uuid references public.artists(id) on delete set null;
alter table public.click_events add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.click_events add column if not exists event_name text;
alter table public.click_events add column if not exists device_type text;
alter table public.click_events add column if not exists country text;
alter table public.click_events add column if not exists city text;
alter table public.click_events add column if not exists browser text;
alter table public.click_events add column if not exists os text;
alter table public.click_events add column if not exists utm_content text;
alter table public.click_events add column if not exists utm_term text;
alter table public.campaigns add column if not exists artist_id uuid references public.artists(id) on delete set null;
alter table public.campaigns add column if not exists release_id uuid references public.releases(id) on delete cascade;
alter table public.campaigns add column if not exists link_page_id uuid references public.link_pages(id) on delete cascade;
create index if not exists click_events_link_page_created_idx on public.click_events(link_page_id, created_at desc);
create index if not exists click_events_release_created_idx on public.click_events(release_id, created_at desc);
create index if not exists click_events_artist_created_idx on public.click_events(artist_id, created_at desc);
create index if not exists click_events_platform_created_idx on public.click_events(platform, created_at desc);
create index if not exists click_events_event_type_created_idx on public.click_events(event_type, created_at desc);
create index if not exists click_events_utm_campaign_idx on public.click_events(utm_campaign);

alter table public.plans enable row level security;
alter table public.releases enable row level security;
alter table public.link_pages enable row level security;
alter table public.page_links enable row level security;
drop policy if exists "plans_read" on public.plans;
create policy "plans_read" on public.plans for select to anon, authenticated using (true);
drop policy if exists "releases_member_read" on public.releases;
create policy "releases_member_read" on public.releases for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "releases_member_manage" on public.releases;
create policy "releases_member_manage" on public.releases for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','member']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','member'])
  and (artist_id is null or exists(select 1 from public.artists a where a.id=releases.artist_id and a.workspace_id=releases.workspace_id)));
drop policy if exists "link_pages_public_or_member" on public.link_pages;
create policy "link_pages_public_or_member" on public.link_pages for select to anon, authenticated using (published or public.is_workspace_member(workspace_id));
drop policy if exists "link_pages_member_manage" on public.link_pages;
create policy "link_pages_member_manage" on public.link_pages for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','member']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','member'])
  and (artist_id is null or exists(select 1 from public.artists a where a.id=link_pages.artist_id and a.workspace_id=link_pages.workspace_id))
  and (release_id is null or exists(select 1 from public.releases r where r.id=link_pages.release_id and r.workspace_id=link_pages.workspace_id)));
drop policy if exists "page_links_public_or_member" on public.page_links;
create policy "page_links_public_or_member" on public.page_links for select to anon, authenticated using (exists(select 1 from public.link_pages p where p.id=link_page_id and (p.published or public.is_workspace_member(p.workspace_id))));
drop policy if exists "page_links_member_manage" on public.page_links;
create policy "page_links_member_manage" on public.page_links for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','member']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','member'])
  and exists(select 1 from public.link_pages p where p.id=page_links.link_page_id and p.workspace_id=page_links.workspace_id));

drop policy if exists "campaigns_workspace_manage" on public.campaigns;
create policy "campaigns_workspace_manage" on public.campaigns for all to authenticated
using (public.has_workspace_role(workspace_id,array['owner','admin','member']))
with check (public.has_workspace_role(workspace_id,array['owner','admin','member'])
  and (artist_id is null or exists(select 1 from public.artists a where a.id=campaigns.artist_id and a.workspace_id=campaigns.workspace_id))
  and (release_id is null or exists(select 1 from public.releases r where r.id=campaigns.release_id and r.workspace_id=campaigns.workspace_id))
  and (link_page_id is null or exists(select 1 from public.link_pages p where p.id=campaigns.link_page_id and p.workspace_id=campaigns.workspace_id)));

-- Idempotent legacy backfill. Rows without a workspace remain legacy-only until assigned.
do $$
declare row_song record; default_artist uuid; new_release uuid; new_page uuid;
begin
  for row_song in select * from public.songs where workspace_id is not null loop
    select id into default_artist from public.artists where workspace_id=row_song.workspace_id and lower(name)=lower(row_song.artist) limit 1;
    if default_artist is null then insert into public.artists(workspace_id,name) values(row_song.workspace_id,row_song.artist) returning id into default_artist; end if;
    insert into public.releases(workspace_id,artist_id,legacy_song_id,title,release_type,primary_artist_name,release_date,artwork_url,import_provider,import_confidence,import_status)
    values(row_song.workspace_id,default_artist,row_song.id,row_song.title,'single',row_song.artist,row_song.release_date,row_song.artwork_url,'legacy',1,'published')
    on conflict(legacy_song_id) do update set title=excluded.title, artist_id=excluded.artist_id, artwork_url=excluded.artwork_url
    returning id into new_release;
    insert into public.link_pages(workspace_id,artist_id,release_id,legacy_song_id,slug,page_type,title,subtitle,artist_display_name,artwork_url,background_image_url,canonical_url,seo_title,seo_description,og_image,published,tiktok_pixel_id,meta_pixel_id,ga_measurement_id,head_entries)
    values(row_song.workspace_id,default_artist,new_release,row_song.id,row_song.slug,'released_smart_link',row_song.title,row_song.subtitle,row_song.artist,row_song.artwork_url,row_song.background_image_url,row_song.canonical_url,row_song.seo_title,row_song.seo_description,row_song.og_image,row_song.published,row_song.tiktok_pixel_id,row_song.meta_pixel_id,row_song.ga_measurement_id,coalesce(row_song.head_entries,'[]'::jsonb))
    on conflict(legacy_song_id) do update set release_id=excluded.release_id,title=excluded.title,published=excluded.published
    returning id into new_page;
    delete from public.page_links where link_page_id=new_page and source='legacy_song_links';
    insert into public.page_links(workspace_id,link_page_id,platform,label,url,section,enabled,display_order,confidence,source,review_status)
    select row_song.workspace_id,new_page,sl.platform,sl.label,sl.url,sl.section,sl.enabled,sl.display_order,1,'legacy_song_links','approved' from public.song_links sl where sl.song_id=row_song.id;
  end loop;
end $$;
