create extension if not exists pgcrypto;

create table if not exists songs (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  artist text not null, subtitle text, artwork_url text, background_image_url text, release_date date,
  canonical_url text, seo_title text, seo_description text, og_image text,
  published boolean default false, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists song_links (
  id uuid primary key default gen_random_uuid(), song_id uuid references songs(id) on delete cascade,
  platform text not null, label text not null, url text not null, section text default 'listen',
  enabled boolean default true, display_order int default 0, created_at timestamptz default now()
);
create table if not exists click_events (
  id uuid primary key default gen_random_uuid(), song_id uuid references songs(id) on delete set null,
  event_type text default 'click', platform text, destination_url text, referrer text, user_agent text,
  ip_hash text, utm_source text, utm_medium text, utm_campaign text, created_at timestamptz default now()
);

-- Per-release advertising pixels. These ALTERs safely upgrade an existing project.
alter table songs add column if not exists tiktok_pixel_id text;
alter table songs add column if not exists meta_pixel_id text;
alter table songs add column if not exists ga_measurement_id text;
create index if not exists click_events_created_at_idx on click_events(created_at desc);
create index if not exists click_events_song_id_idx on click_events(song_id);
alter table songs enable row level security;
alter table song_links enable row level security;
alter table click_events enable row level security;

-- Initial production release. Safe to run more than once.
insert into songs (
  slug, title, artist, artwork_url, canonical_url,
  seo_title, seo_description, og_image, published
) values (
  'watching-me', 'Watching Me', 'Cyniical', '/artwork/watching-me.jpg',
  'https://go.cyniicalaesthetic.productions/watching-me',
  'Watching Me by Cyniical',
  'Choose your preferred music platform to listen to Watching Me by Cyniical.',
  '/artwork/watching-me.jpg', true
)
on conflict (slug) do update set
  title = excluded.title,
  artist = excluded.artist,
  canonical_url = excluded.canonical_url,
  published = true,
  updated_at = now();

insert into song_links (song_id, platform, label, url, section, enabled, display_order)
select songs.id, seed.platform, seed.label, seed.url, seed.section, true, seed.display_order
from songs
cross join (values
  ('spotify', 'Spotify', 'https://open.spotify.com/track/24ZvlQYTeCXky7KynS1H89?si=be5fade522cc4270', 'listen', 1),
  ('apple_music', 'Apple Music', 'https://geo.music.apple.com/us/album/_/1851085966?i=1851085968&mt=1&app=music&ls=1', 'listen', 2),
  ('youtube', 'YouTube', 'https://www.youtube.com/watch?v=fDKialXYsTc', 'listen', 3),
  ('youtube_music', 'YouTube Music', 'https://music.youtube.com/playlist?list=OLAK5uy_nIdRoop2PTi9VgMHEB7qQH-PGicf3d0bg', 'listen', 4),
  ('soundcloud', 'SoundCloud', 'https://soundcloud.com/cyniical/watching-me-cyniical', 'listen', 5),
  ('pandora', 'Pandora', 'https://www.pandora.com/TR:178708869', 'listen', 6),
  ('deezer', 'Deezer', 'https://www.deezer.com/track/3633848602', 'listen', 7),
  ('amazon_music', 'Amazon Music', 'https://music.amazon.com/albums/B0FZ2XFN9C?trackAsin=B0FZ2Z4C9H', 'listen', 8),
  ('tidal', 'TIDAL', 'https://listen.tidal.com/track/471057346', 'listen', 9),
  ('itunes', 'iTunes', 'https://geo.music.apple.com/us/album/_/1851085966?i=1851085968&mt=1&app=itunes&ls=1', 'buy', 10),
  ('amazon', 'Amazon', 'https://amazon.com/dp/B0FZ2Z4C9H', 'buy', 11)
) as seed(platform, label, url, section, display_order)
where songs.slug = 'watching-me'
  and not exists (
    select 1 from song_links existing
    where existing.song_id = songs.id and existing.platform = seed.platform
  );
