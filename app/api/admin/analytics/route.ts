import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { logApiError } from "@/lib/apiSecurity";
import {
  ANALYTICS_STANDARD_EVENT_TYPES,
  analyticsViewFilters,
  applyAnalyticsEventFilters,
  getAnalyticsGeoBreakdowns,
  getAnalyticsMetricBreakdown,
  getAnalyticsSummaryCounts,
  getAnalyticsTimeSeries,
  type AnalyticsEventFilters,
} from "@/lib/analyticsAggregation";
import { getReferrerDomain, type AnalyticsEventRow } from "@/lib/analyticsBreakdowns";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_WORKSPACE_TIMEZONE, getWorkspaceDateRange } from "@/lib/timezone";
import { normalizeUtmValue } from "@/lib/utm";
import { getVisitorBehaviorMetrics } from "@/lib/visitorBehavior";

const csvEscape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const analyticsJson = (body: unknown, init?: ResponseInit) => NextResponse.json(body, { ...init, headers: { "cache-control": "no-store", ...(init?.headers || {}) } });
const VISIBLE_EVENT_TYPES = ["page_view", "view_content", "platform_click"];

type AnalyticsSection = "summary" | "primary" | "secondary" | "events" | "legacy";

function normalizeEvent(event: AnalyticsEventRow): AnalyticsEventRow {
  return {
    ...event,
    utm_source: normalizeUtmValue(event.utm_source),
    utm_medium: normalizeUtmValue(event.utm_medium),
    utm_campaign: normalizeUtmValue(event.utm_campaign),
    utm_content: normalizeUtmValue(event.utm_content),
    utm_term: normalizeUtmValue(event.utm_term),
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return analyticsJson({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return analyticsJson({ summary: { visits: 0, clicks: 0 }, byPlatform: [], bySong: [], referrers: [], utmSources: [], campaigns: [], devices: [], browsers: [], timeSeries: [], recent: [], configured: false });

  const [workspacePlan, entitlements] = await Promise.all([
    supabase.from("workspaces").select("timezone, default_timezone").eq("id", context.workspace.id).single(),
    getWorkspaceEntitlements(context.workspace.id, context.user, context.role),
  ]);
  const planId = entitlements.plan;
  const timezone = String(workspacePlan.data?.timezone || workspacePlan.data?.default_timezone || DEFAULT_WORKSPACE_TIMEZONE);
  const retentionDays = entitlements.limits.analytics_retention_days;
  const selectedRange = params.get("range") || "7";
  const range = selectedRange === "custom" ? { start: params.get("from") || undefined, end: params.get("to") || undefined } : getWorkspaceDateRange(selectedRange, timezone);
  const requestedFrom = params.get("from") || range.start;
  const requestedTo = params.get("to") || range.end;
  const retentionFloor = retentionDays ? new Date(Date.now() - retentionDays * 86400000).toISOString() : null;
  const lockedRange = Boolean(!entitlements.developer && ((selectedRange === "all" && retentionDays) || (selectedRange === "custom" && !entitlements.features.advanced_analytics) || (retentionFloor && requestedFrom && requestedFrom < retentionFloor)));
  const effectiveFrom = retentionFloor && (!requestedFrom || requestedFrom < retentionFloor) ? retentionFloor : requestedFrom;
  const section = (params.get("section") || (params.get("summary") === "1" ? "summary" : "legacy")) as AnalyticsSection;
  const exportCsv = params.get("export") === "csv";
  const recentLimit = Math.min(Number(params.get("recentLimit") || "50") || 50, 100);
  const recentPage = Math.max(Number(params.get("recentPage") || "1") || 1, 1);
  const filters: AnalyticsEventFilters = {
    workspaceId: context.workspace.id,
    from: effectiveFrom,
    to: requestedTo,
    eventType: params.get("eventType"),
    platform: params.get("platform"),
    utmSource: params.get("utmSource"),
    utmCampaign: params.get("utmCampaign"),
    artistId: params.get("artistId"),
    releaseId: params.get("releaseId"),
    linkPageId: params.get("linkPageId"),
  };
  const baseMeta = { timezone, planId, retentionDays, canExport: entitlements.features.analytics_export, lockedRange, eventTypes: ANALYTICS_STANDARD_EVENT_TYPES, retentionLimited: Boolean(lockedRange || (retentionFloor && requestedFrom && requestedFrom < retentionFloor)), configured: true };

  const fetchEvents = async (eventFilters: AnalyticsEventFilters, limit: number, offset = 0, allowedEventTypes?: string[]) => {
    let query = (supabase.from("click_events") as any)
      .select("id,event_type,platform,created_at,utm_source,utm_medium,utm_campaign,utm_content,utm_term,device_type,browser,user_agent,country,referrer,normalized_referrer,songs(title,slug),releases(title),link_pages(title,slug)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);
    query = applyAnalyticsEventFilters(query, eventFilters);
    if (!eventFilters.eventType && allowedEventTypes?.length) query = query.in("event_type", allowedEventTypes);
    const result = await query;
    if (result.error) throw new Error(result.error.message);
    return ((result.data || []) as AnalyticsEventRow[]).map(normalizeEvent);
  };

  try {
    if (exportCsv) {
      if (!entitlements.features.analytics_export) return analyticsJson({ error: "CSV event-log export is available on upgraded plans." }, { status: 403 });
      const events = (await fetchEvents(filters, 5000)).slice(0, 5000);
      const rows = [["timestamp", "event_type", "smart_link", "platform", "referrer", "utm_source", "utm_campaign", "device"].map(csvEscape).join(",")].concat(events.map((event) => [event.created_at, event.event_type, event.link_pages?.title || event.releases?.title || event.songs?.title || "", event.platform || "", getReferrerDomain(event.referrer), event.utm_source || "", event.utm_campaign || "", event.device_type || ""].map(csvEscape).join(",")));
      return new NextResponse(rows.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="tonelink-analytics-${Date.now()}.csv"` } });
    }

    if (section === "summary") {
      const summary = await getAnalyticsSummaryCounts(supabase, filters);
      return analyticsJson({ ...baseMeta, summary: { visits: summary.visits, clicks: summary.clicks } });
    }

    const loadPrimary = async () => {
      const [byPlatform, bySong, timeSeries] = await Promise.all([
        getAnalyticsMetricBreakdown(supabase, filters, "platform", { population: "clicks", limit: 100 }),
        getAnalyticsMetricBreakdown(supabase, filters, "release", { population: "clicks", limit: 100 }),
        getAnalyticsTimeSeries(supabase, filters, timezone),
      ]);
      if (!byPlatform || !bySong || !timeSeries) throw new Error("Analytics integrity migration 20260818 is required.");
      return { byPlatform, bySong, timeSeries, aggregateSource: "database" as const };
    };

    const loadSecondary = async () => {
      const recentFilters: AnalyticsEventFilters = { ...filters, eventType: "platform_click" };
      const viewFilters = analyticsViewFilters(filters);
      const [referrers, utmSources, campaigns, devices, browsers, campaignByPlatform, geoBreakdowns, visitorBehavior, recentRows] = await Promise.all([
        getAnalyticsMetricBreakdown(supabase, viewFilters, "referrer", { population: "views" }),
        getAnalyticsMetricBreakdown(supabase, viewFilters, "utm_source", { population: "views" }),
        getAnalyticsMetricBreakdown(supabase, viewFilters, "utm_campaign", { population: "views" }),
        getAnalyticsMetricBreakdown(supabase, viewFilters, "device", { population: "views" }),
        getAnalyticsMetricBreakdown(supabase, viewFilters, "browser", { population: "views" }),
        getAnalyticsMetricBreakdown(supabase, filters, "campaign_platform", { population: "clicks", limit: 100 }),
        getAnalyticsGeoBreakdowns(supabase, viewFilters),
        getVisitorBehaviorMetrics(supabase, viewFilters),
        fetchEvents(recentFilters, 8),
      ]);
      if (!referrers || !utmSources || !campaigns || !devices || !browsers || !campaignByPlatform) throw new Error("Analytics integrity migration 20260818 is required.");
      return { referrers, utmSources, campaigns, devices, browsers, campaignByPlatform, aggregateSource: "database" as const, ...geoBreakdowns, visitorBehavior, recent: recentRows.slice(0, 8).map((event) => ({ ...event, referrer: getReferrerDomain(event.referrer) })) };
    };

    if (section === "primary") return analyticsJson({ ...baseMeta, ...(await loadPrimary()) });
    if (section === "secondary") return analyticsJson({ ...baseMeta, ...(await loadSecondary()) });
    if (section === "events") {
      const offset = (recentPage - 1) * recentLimit;
      const rows = await fetchEvents(filters, recentLimit, offset, VISIBLE_EVENT_TYPES);
      return analyticsJson({ ...baseMeta, recent: rows.slice(0, recentLimit).map((event) => ({ ...event, referrer: getReferrerDomain(event.referrer) })), recentPage, recentLimit, recentHasMore: rows.length > recentLimit });
    }

    // Backward-compatible full response for older clients. The current UI uses
    // progressive summary/primary/secondary requests instead.
    const [summary, primary, secondary] = await Promise.all([getAnalyticsSummaryCounts(supabase, filters), loadPrimary(), loadSecondary()]);
    return analyticsJson({ ...baseMeta, summary: { visits: summary.visits, clicks: summary.clicks }, ...primary, ...secondary, recentPage, recentLimit });
  } catch (error) {
    logApiError("analytics:section:error", error, { workspaceId: context.workspace.id, section });
    return analyticsJson({ error: `Unable to load analytics ${section}.` }, { status: 500 });
  }
}
