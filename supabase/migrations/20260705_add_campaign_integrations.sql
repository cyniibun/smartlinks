-- Safe to run more than once.
alter table songs add column if not exists tiktok_pixel_id text;
alter table songs add column if not exists meta_pixel_id text;
alter table songs add column if not exists ga_measurement_id text;
alter table songs add column if not exists head_entries jsonb not null default '[]'::jsonb;
