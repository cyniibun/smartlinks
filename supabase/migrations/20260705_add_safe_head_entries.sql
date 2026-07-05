alter table songs add column if not exists head_entries jsonb not null default '[]'::jsonb;
