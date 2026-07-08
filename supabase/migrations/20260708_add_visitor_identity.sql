alter table public.click_events
add column if not exists visitor_id text,
add column if not exists session_id text,
add column if not exists external_id text,
add column if not exists ttclid text,
add column if not exists fbclid text,
add column if not exists gclid text,
add column if not exists msclkid text,
add column if not exists twclid text,
add column if not exists li_fat_id text,
add column if not exists utm_source text,
add column if not exists utm_medium text,
add column if not exists utm_campaign text,
add column if not exists utm_content text,
add column if not exists utm_term text,
add column if not exists normalized_referrer text,
add column if not exists event_id text;

create index if not exists click_events_workspace_visitor_idx
on public.click_events (workspace_id, visitor_id);

create index if not exists click_events_workspace_session_idx
on public.click_events (workspace_id, session_id);

create index if not exists click_events_workspace_event_id_idx
on public.click_events (workspace_id, event_id);

create index if not exists click_events_workspace_click_ids_idx
on public.click_events (workspace_id, ttclid, fbclid, gclid);

create index if not exists click_events_workspace_normalized_referrer_idx
on public.click_events (workspace_id, normalized_referrer);
