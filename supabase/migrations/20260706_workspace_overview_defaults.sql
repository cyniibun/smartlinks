-- Workspace identity and inheritance defaults. Additive; existing names are preserved.
alter table public.workspaces add column if not exists slug text;
alter table public.workspaces add column if not exists default_public_domain text not null default 'link.tone-link.com';
alter table public.workspaces add column if not exists default_timezone text not null default 'UTC';
alter table public.workspaces add column if not exists timezone text not null default 'America/New_York';
alter table public.workspaces add column if not exists default_market text not null default 'US';
alter table public.workspaces add column if not exists default_theme text not null default 'minimal';
alter table public.workspaces add column if not exists default_tiktok_pixel_id text;
alter table public.workspaces add column if not exists default_meta_pixel_id text;
alter table public.workspaces add column if not exists default_ga_measurement_id text;
alter table public.workspaces add column if not exists updated_at timestamptz not null default now();

update public.workspaces
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 6)
where slug is null or slug = '';

update public.workspaces
set timezone = case when default_timezone is not null and default_timezone <> '' then default_timezone else 'America/New_York' end
where timezone is null or timezone = '';

alter table public.workspaces alter column slug set not null;
create unique index if not exists workspaces_slug_idx on public.workspaces(slug);

comment on column public.workspaces.default_market is 'ISO 3166-1 alpha-2 resolver market, for example US.';
comment on column public.workspaces.default_tiktok_pixel_id is 'Lowest-priority workspace TikTok default; link and artist overrides win.';
comment on column public.workspaces.timezone is 'IANA timezone used for workspace analytics date ranges and dashboard timestamps.';
