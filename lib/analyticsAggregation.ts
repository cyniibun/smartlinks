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

export type CountryBreakdownRow = { country: string; views: number };
export type RegionBreakdownRow = { country: string; region: string; views: number };
export type CityBreakdownRow = { country: string; region: string | null; city: string; views: number };
export type AnalyticsGeoBreakdowns = {
  countryBreakdown: CountryBreakdownRow[];
  regionBreakdown: RegionBreakdownRow[];
  cityBreakdown: CityBreakdownRow[];
};

export type AnalyticsMetric = { id?: string; name: string; count: number };
export type AnalyticsTimePoint = { date: string; views: number; clicks: number; ctr: number };
export type AnalyticsMetricPopulation = "views" | "clicks" | "all";

type SupabaseLike = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => any;
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

// Platform describes an outbound click destination; it is not present on a
// normal page view. Event type is an event-log filter, not a KPI denominator.
export function analyticsViewFilters(filters: AnalyticsEventFilters): AnalyticsEventFilters {
  return { ...filters, platform: null, eventType: null };
}

export function analyticsClickFilters(filters: AnalyticsEventFilters): AnalyticsEventFilters {
  return { ...filters, eventType: null };
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
  const { data, error } = await db.rpc("get_analytics_summary_v2", {
    p_workspace_id: filters.workspaceId,
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_link_page_id: filters.linkPageId || null,
    p_release_id: filters.releaseId || null,
    p_artist_id: filters.artistId || null,
    p_platform: filters.platform || null,
    p_utm_source: filters.utmSource || null,
    p_utm_campaign: filters.utmCampaign || null,
  });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    const views = Number(row?.views || 0);
    const clicks = Number(row?.clicks || 0);
    return { visits: views, views, clicks, ctr: views ? Math.round((clicks / views) * 100) : 0 };
  }

  // Exact-count fallback supports deployments while the v2 RPC migration is
  // being applied. It never samples a limited raw event window.
  const [views, clicks] = await Promise.all([
    countAnalyticsEvents(db, analyticsViewFilters(filters), ANALYTICS_VIEW_EVENT_TYPES),
    countAnalyticsEvents(db, analyticsClickFilters(filters), ANALYTICS_CLICK_EVENT_TYPES),
  ]);

  return {
    visits: views,
    views,
    clicks,
    ctr: views ? Math.round((clicks / views) * 100) : 0,
  };
}

async function getGeoBreakdown(db: SupabaseLike, filters: AnalyticsEventFilters, kind: "country" | "region" | "city") {
  if (filters.eventType && !isAnalyticsViewEvent(filters.eventType)) return [];

  const { data, error } = await db.rpc("get_click_event_geo_breakdown", {
    p_workspace_id: filters.workspaceId,
    p_kind: kind,
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_link_page_id: filters.linkPageId || null,
    p_release_id: filters.releaseId || null,
    p_artist_id: filters.artistId || null,
    p_utm_source: filters.utmSource || null,
    p_utm_campaign: filters.utmCampaign || null,
    p_limit: 10,
  });

  if (error) {
    console.warn("[tone-link:analytics:geo-breakdown]", error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getAnalyticsGeoBreakdowns(db: SupabaseLike, filters: AnalyticsEventFilters): Promise<AnalyticsGeoBreakdowns> {
  const [countries, regions, cities] = await Promise.all([
    getGeoBreakdown(db, filters, "country"),
    getGeoBreakdown(db, filters, "region"),
    getGeoBreakdown(db, filters, "city"),
  ]);

  return {
    countryBreakdown: countries
      .filter((row: any) => row.country)
      .map((row: any) => ({ country: String(row.country), views: Number(row.views || 0) })),
    regionBreakdown: regions
      .filter((row: any) => row.country && row.region)
      .map((row: any) => ({ country: String(row.country), region: String(row.region), views: Number(row.views || 0) })),
    cityBreakdown: cities
      .filter((row: any) => row.country && row.city)
      .map((row: any) => ({ country: String(row.country), region: row.region ? String(row.region) : null, city: String(row.city), views: Number(row.views || 0) })),
  };
}

function analyticsRpcArgs(filters: AnalyticsEventFilters) {
  return {
    p_workspace_id: filters.workspaceId,
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_link_page_id: filters.linkPageId || null,
    p_release_id: filters.releaseId || null,
    p_artist_id: filters.artistId || null,
    p_platform: filters.platform || null,
    p_utm_source: filters.utmSource || null,
    p_utm_campaign: filters.utmCampaign || null,
  };
}

export async function getAnalyticsMetricBreakdown(
  db: SupabaseLike,
  filters: AnalyticsEventFilters,
  dimension: "platform" | "campaign_platform" | "release" | "referrer" | "utm_source" | "utm_campaign" | "device" | "browser" | "source",
  options: { population: AnalyticsMetricPopulation; limit?: number },
): Promise<AnalyticsMetric[] | null> {
  const { data, error } = await db.rpc("get_analytics_metric_breakdown_v2", {
    ...analyticsRpcArgs(filters),
    p_dimension: dimension,
    p_population: options.population,
    p_limit: options.limit || 10,
  });
  if (error) {
    console.warn("[tone-link:analytics:metric-breakdown]", dimension, error.message);
    return null;
  }
  return (Array.isArray(data) ? data : []).map((row: any) => ({ id: row.metric_id ? String(row.metric_id) : undefined, name: String(row.name || "Unknown"), count: Number(row.count || 0) }));
}

export async function getAnalyticsTimeSeries(
  db: SupabaseLike,
  filters: AnalyticsEventFilters,
  timezone: string,
): Promise<AnalyticsTimePoint[] | null> {
  const { data, error } = await db.rpc("get_analytics_timeseries_v2", {
    ...analyticsRpcArgs(filters),
    p_timezone: timezone,
  });
  if (error) {
    console.warn("[tone-link:analytics:timeseries]", error.message);
    return null;
  }
  return (Array.isArray(data) ? data : []).map((row: any) => ({
    date: String(row.date),
    views: Number(row.views || 0),
    clicks: Number(row.clicks || 0),
    ctr: Number(row.ctr || 0),
  }));
}
