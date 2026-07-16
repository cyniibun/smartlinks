import "server-only";

import type { AnalyticsEventFilters } from "@/lib/analyticsAggregation";

export type VisitorBehaviorMetrics = {
  uniqueVisitors: number | null;
  sessions: number | null;
  returningVisitors: number | null;
  repeatClickers: number | null;
  medianTimeToClickSeconds: number | null;
  averageActiveViewSeconds: number | null;
  activeViewSamples: number;
  visitorIdentityEvents: number;
  available: boolean;
};

const emptyMetrics: VisitorBehaviorMetrics = {
  uniqueVisitors: null,
  sessions: null,
  returningVisitors: null,
  repeatClickers: null,
  medianTimeToClickSeconds: null,
  averageActiveViewSeconds: null,
  activeViewSamples: 0,
  visitorIdentityEvents: 0,
  available: false,
};

type SupabaseLike = {
  rpc: (fn: string, args: Record<string, unknown>) => any;
};

export async function getVisitorBehaviorMetrics(db: SupabaseLike, filters: AnalyticsEventFilters): Promise<VisitorBehaviorMetrics> {
  const { data, error } = await db.rpc("get_visitor_behavior_metrics", {
    p_workspace_id: filters.workspaceId,
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_link_page_id: filters.linkPageId || null,
    p_release_id: filters.releaseId || null,
    p_artist_id: filters.artistId || null,
    p_utm_source: filters.utmSource || null,
    p_utm_campaign: filters.utmCampaign || null,
  });

  if (error) {
    console.warn("[tone-link:analytics:visitor-behavior]", error.message);
    return emptyMetrics;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return emptyMetrics;
  const visitorIdentityEvents = Number(row.visitor_identity_events || 0);
  return {
    uniqueVisitors: row.unique_visitors === null || row.unique_visitors === undefined ? null : Number(row.unique_visitors),
    sessions: row.sessions === null || row.sessions === undefined ? null : Number(row.sessions),
    returningVisitors: row.returning_visitors === null || row.returning_visitors === undefined ? null : Number(row.returning_visitors),
    repeatClickers: row.repeat_clickers === null || row.repeat_clickers === undefined ? null : Number(row.repeat_clickers),
    medianTimeToClickSeconds: row.median_time_to_click_seconds === null || row.median_time_to_click_seconds === undefined ? null : Number(row.median_time_to_click_seconds),
    averageActiveViewSeconds: row.average_active_view_seconds === null || row.average_active_view_seconds === undefined ? null : Number(row.average_active_view_seconds),
    activeViewSamples: Number(row.active_view_samples || 0),
    visitorIdentityEvents,
    available: visitorIdentityEvents > 0,
  };
}
