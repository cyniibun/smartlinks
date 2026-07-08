create table if not exists public.workspace_pixel_configurations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('meta','tiktok','google_analytics','google_ads','snapchat','custom')),
  name text not null,
  pixel_id text,
  access_token text,
  dataset_id text,
  conversion_label text,
  status text not null default 'connected' check (status in ('connected','verified','pending','disconnected','error')),
  health text not null default 'inactive' check (health in ('good','warning','error','inactive')),
  is_default boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, provider, pixel_id)
);

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select id, 'tiktok', 'TikTok Pixel', default_tiktok_pixel_id, 'connected', 'warning', true
from public.workspaces
where nullif(trim(default_tiktok_pixel_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select id, 'meta', 'Meta Pixel', default_meta_pixel_id, 'connected', 'warning', true
from public.workspaces
where nullif(trim(default_meta_pixel_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select id, 'google_analytics', 'Google Analytics 4', default_ga_measurement_id, 'connected', 'warning', true
from public.workspaces
where nullif(trim(default_ga_measurement_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select distinct workspace_id, 'tiktok', 'TikTok Pixel', default_tiktok_pixel_id, 'connected', 'warning', false
from public.artists
where nullif(trim(default_tiktok_pixel_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select distinct workspace_id, 'meta', 'Meta Pixel', default_meta_pixel_id, 'connected', 'warning', false
from public.artists
where nullif(trim(default_meta_pixel_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select distinct workspace_id, 'google_analytics', 'Google Analytics 4', default_ga_measurement_id, 'connected', 'warning', false
from public.artists
where nullif(trim(default_ga_measurement_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select distinct workspace_id, 'tiktok', 'TikTok Pixel', tiktok_pixel_id, 'connected', 'warning', false
from public.link_pages
where nullif(trim(tiktok_pixel_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select distinct workspace_id, 'meta', 'Meta Pixel', meta_pixel_id, 'connected', 'warning', false
from public.link_pages
where nullif(trim(meta_pixel_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

insert into public.workspace_pixel_configurations(workspace_id, provider, name, pixel_id, status, health, is_default)
select distinct workspace_id, 'google_analytics', 'Google Analytics 4', ga_measurement_id, 'connected', 'warning', false
from public.link_pages
where nullif(trim(ga_measurement_id), '') is not null
on conflict(workspace_id, provider, pixel_id) do nothing;

alter table public.workspace_pixel_configurations enable row level security;

drop policy if exists "workspace_pixel_configurations_select" on public.workspace_pixel_configurations;
create policy "workspace_pixel_configurations_select" on public.workspace_pixel_configurations
for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_pixel_configurations_manage" on public.workspace_pixel_configurations;
create policy "workspace_pixel_configurations_manage" on public.workspace_pixel_configurations
for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin','developer']))
with check (public.has_workspace_role(workspace_id, array['owner','admin','developer']));

create index if not exists workspace_pixel_configurations_workspace_provider_idx
on public.workspace_pixel_configurations(workspace_id, provider);

create index if not exists workspace_pixel_configurations_workspace_status_idx
on public.workspace_pixel_configurations(workspace_id, status, health);
