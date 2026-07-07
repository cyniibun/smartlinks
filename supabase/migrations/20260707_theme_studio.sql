create table if not exists public.themes (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  is_system_theme boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces add column if not exists default_theme_id text default 'minimal-dark';
alter table public.artists add column if not exists default_theme_id text;

create index if not exists themes_workspace_id_idx on public.themes(workspace_id);
create index if not exists themes_system_idx on public.themes(is_system_theme);

insert into public.themes(id,workspace_id,name,description,is_system_theme,settings) values
('minimal-dark',null,'Minimal Dark','Premium dark default for music links.',true,'{"backgroundStyle":"minimal_dark","artworkSize":"standard","cardRadius":"rounded","buttonStyle":"glass","typographyScale":"standard","accentColor":"#df5d93","layoutDensity":"standard","footerVisible":true,"blurIntensity":"strong"}'::jsonb),
('neon',null,'Neon','High contrast glow with saturated accent.',true,'{"backgroundStyle":"neon","artworkSize":"standard","cardRadius":"rounded","buttonStyle":"outline","typographyScale":"large","accentColor":"#77f7ff","layoutDensity":"standard","footerVisible":true,"blurIntensity":"strong"}'::jsonb),
('luxury',null,'Luxury','Warm, polished, spacious presentation.',true,'{"backgroundStyle":"luxury","artworkSize":"standard","cardRadius":"soft","buttonStyle":"glass","typographyScale":"standard","accentColor":"#d8b46a","layoutDensity":"spacious","footerVisible":true,"blurIntensity":"strong"}'::jsonb),
('editorial',null,'Editorial','Clean type-first layout for campaigns.',true,'{"backgroundStyle":"editorial","artworkSize":"standard","cardRadius":"rounded","buttonStyle":"solid","typographyScale":"standard","accentColor":"#f4f0e9","layoutDensity":"standard","footerVisible":true,"blurIntensity":"soft"}'::jsonb),
('podcast',null,'Podcast','Comfortable dense layout for episodic pages.',true,'{"backgroundStyle":"podcast","artworkSize":"compact","cardRadius":"rounded","buttonStyle":"glass","typographyScale":"standard","accentColor":"#8f7cff","layoutDensity":"compact","footerVisible":true,"blurIntensity":"strong"}'::jsonb),
('glass',null,'Glass','Album-art blur and glassmorphism.',true,'{"backgroundStyle":"glass","artworkSize":"standard","cardRadius":"rounded","buttonStyle":"glass","typographyScale":"standard","accentColor":"#ef85b1","layoutDensity":"standard","footerVisible":true,"blurIntensity":"strong"}'::jsonb),
('monochrome',null,'Monochrome','Black, white, and minimal contrast.',true,'{"backgroundStyle":"monochrome","artworkSize":"standard","cardRadius":"rounded","buttonStyle":"outline","typographyScale":"standard","accentColor":"#ffffff","layoutDensity":"standard","footerVisible":true,"blurIntensity":"none"}'::jsonb)
on conflict(id) do update set name=excluded.name, description=excluded.description, is_system_theme=excluded.is_system_theme, settings=excluded.settings, updated_at=now();

alter table public.themes enable row level security;
drop policy if exists "themes_read" on public.themes;
create policy "themes_read" on public.themes for select to anon, authenticated using (is_system_theme or public.is_workspace_member(workspace_id));
drop policy if exists "themes_workspace_manage" on public.themes;
create policy "themes_workspace_manage" on public.themes for all to authenticated
using (workspace_id is not null and public.has_workspace_role(workspace_id,array['owner','admin']))
with check (workspace_id is not null and not is_system_theme and public.has_workspace_role(workspace_id,array['owner','admin']));
