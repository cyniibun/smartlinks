-- Artist reusable Smart Link templates. Additive; existing artists and links are not overwritten.
alter table public.artists add column if not exists default_theme_id text;
alter table public.artists add column if not exists default_platform_order jsonb not null default '[]'::jsonb;
alter table public.artists add column if not exists default_enabled_platforms jsonb not null default '[]'::jsonb;
alter table public.artists add column if not exists default_head_entries jsonb not null default '[]'::jsonb;
alter table public.artists add column if not exists default_label_name text;
alter table public.artists add column if not exists default_footer_text text;
alter table public.artists add column if not exists default_slug_pattern text not null default '{title}';

comment on column public.artists.default_platform_order is 'Ordered platform keys used to sort newly created Smart Link destinations.';
comment on column public.artists.default_enabled_platforms is 'Platform keys enabled by default during new Smart Link creation.';
comment on column public.artists.default_slug_pattern is 'Supported MVP patterns: {title}, {artist}-{title}. Future routing may support {artist}/{title}.';
