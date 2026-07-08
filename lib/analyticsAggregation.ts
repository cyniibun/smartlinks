import "server-only";

export const ANALYTICS_VIEW_EVENT_TYPES = ["page_view", "visit"] as const;
export const ANALYTICS_CLICK_EVENT_TYPES = ["platform_click"] as const;
export const ANALYTICS_SECONDARY_EVENT_TYPES = ["view_content", "copy_url", "share", "embed_click", "campaign_click"] as const;
export const ANALYTICS_STANDARD_EVENT_TYPES = [
  ...ANALYTICS_VIEW_EVENT_TYPES,
  ...ANALYTICS_CLICK_EVENT_TYPES,
  ...ANALYTICS_SECONDARY_EVENT_TYPES,
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_STANDARD_EVENT_TYPES)[number];

export type AnalyticsEventFilters = {
  workspaceId: string;
  from?: string | null;
  to?: string | null;
  eventType?: string | null;
  platform?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  artistId?: string | null;
  releaseId?: string | null;
  linkPageId?: string | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export function isAnalyticsViewEvent(eventType?: string | null) {
  return (ANALYTICS_VIEW_EVENT_TYPES as readonly string[]).includes(String(eventType || ""));
}

export function isAnalyticsClickEvent(eventType?: string | null) {
  return (ANALYTICS_CLICK_EVENT_TYPES as readonly string[]).includes(String(eventType || ""));
}

export function applyAnalyticsEventFilters(query: any, filters: AnalyticsEventFilters): any {
  let next = query
    .eq("workspace_id", filters.workspaceId);

  if (filters.from) next = next.gte("created_at", filters.from);
  if (filters.to) next = next.lte("created_at", filters.to);
  if (filters.eventType) next = next.eq("event_type", filters.eventType);
  if (filters.platform) next = next.eq("platform", filters.platform);
  if (filters.utmSource) next = next.ilike("utm_source", `%${filters.utmSource}%`);
  if (filters.utmCampaign) next = next.ilike("utm_campaign", `%${filters.utmCampaign}%`);
  if (filters.artistId) next = next.eq("artist_id", filters.artistId);
  if (filters.releaseId) next = next.eq("release_id", filters.releaseId);
  if (filters.linkPageId) next = next.eq("link_page_id", filters.linkPageId);

  return next;
}

async function countAnalyticsEvents(db: SupabaseLike, filters: AnalyticsEventFilters, eventTypes: readonly string[]) {
  let query = db
    .from("click_events")
    .select("id", { count: "exact", head: true });

  query = applyAnalyticsEventFilters(query, filters).in("event_type", [...eventTypes]);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getAnalyticsSummaryCounts(db: SupabaseLike, filters: AnalyticsEventFilters) {
  const [views, clicks] = await Promise.all([
    countAnalyticsEvents(db, filters, ANALYTICS_VIEW_EVENT_TYPES),
    countAnalyticsEvents(db, filters, ANALYTICS_CLICK_EVENT_TYPES),
  ]);

  return {
    visits: views,
    views,
    clicks,
    ctr: views ? Math.round((clicks / views) * 100) : 0,
  };
}
