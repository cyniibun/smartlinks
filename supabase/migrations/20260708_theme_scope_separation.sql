alter table public.workspaces
add column if not exists release_default_theme_id text;

alter table public.workspaces
add column if not exists workspace_display_theme_id text default 'tonelink';

update public.workspaces
set release_default_theme_id = coalesce(release_default_theme_id, default_theme_id, 'minimal-dark')
where release_default_theme_id is null;

update public.workspaces
set workspace_display_theme_id = coalesce(workspace_display_theme_id, 'tonelink')
where workspace_display_theme_id is null;

insert into public.themes (id, workspace_id, name, description, is_system_theme, settings)
values (
  'tonelink',
  null,
  'ToneLink',
  'Default dashboard display theme for ToneLink workspaces.',
  true,
  '{
    "backgroundStyle": "minimal_dark",
    "gradientPreset": "radial_top_right",
    "backgroundIntensity": "medium",
    "artworkSize": "standard",
    "heroLayout": "large_artwork",
    "mobileHeroLayout": "compact_horizontal",
    "cardRadius": "rounded",
    "buttonStyle": "glass",
    "typographyScale": "standard",
    "accentColor": "#ff4f93",
    "secondaryAccentColor": "#ff7bb2",
    "buttonTextColor": "#ffffff",
    "buttonBackgroundColor": "#ff4f93",
    "buttonBorderColor": "#ff4f93",
    "mutedTextColor": "#a8a1a8",
    "autoButtonContrast": true,
    "layoutDensity": "standard",
    "footerVisible": true,
    "blurIntensity": "strong"
  }'::jsonb
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_theme = true,
  settings = excluded.settings,
  updated_at = now();

create index if not exists workspaces_release_default_theme_idx
on public.workspaces (release_default_theme_id);

create index if not exists workspaces_display_theme_idx
on public.workspaces (workspace_display_theme_id);
