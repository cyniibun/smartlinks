alter table public.artists
add column if not exists slug text,
add column if not exists brand_color text,
add column if not exists status text not null default 'active',
add column if not exists bio_link_enabled boolean not null default false,
add column if not exists bio_link_slug text,
add column if not exists bio_link_theme_id text,
add column if not exists bio_link_sections jsonb not null default '[]'::jsonb;

update public.artists
set slug = lower(regexp_replace(trim(name), '[^a-z0-9]+', '-', 'gi'))
where slug is null and name is not null;

update public.artists
set bio_link_slug = slug
where bio_link_slug is null and slug is not null;

create index if not exists artists_workspace_slug_idx
on public.artists (workspace_id, slug);

create index if not exists artists_workspace_status_idx
on public.artists (workspace_id, status);

create index if not exists artists_workspace_bio_link_idx
on public.artists (workspace_id, bio_link_enabled);
