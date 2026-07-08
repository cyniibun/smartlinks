import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { ANALYTICS_STANDARD_EVENT_TYPES, applyAnalyticsEventFilters, getAnalyticsGeoBreakdowns, getAnalyticsSummaryCounts, isAnalyticsClickEvent, isAnalyticsViewEvent, type AnalyticsEventFilters } from "@/lib/analyticsAggregation";
import { getCampaignTimeseries, getReferrerBreakdown, getReferrerDomain, getReferrerTimeseries, getUtmCampaignBreakdown, getUtmSourceBreakdown, groupAnalyticsEvents, type AnalyticsEventRow } from "@/lib/analyticsBreakdowns";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_WORKSPACE_TIMEZONE, getWorkspaceDateRange } from "@/lib/timezone";
import { normalizeUtmValue } from "@/lib/utm";

const csvEscape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const dayKey = (value: string, timezone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const analyticsJson = (body: unknown, init?: ResponseInit) => NextResponse.json(body, { ...init, headers: { "cache-control": "no-store", ...(init?.headers || {}) } });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return analyticsJson({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return analyticsJson({ summary: { visits: 0, clicks: 0 }, byPlatform: [], bySong: [], referrers: [], utmSources: [], campaigns: [], devices: [], recent: [], configured: false });

  const workspacePlan = await supabase.from("workspaces").select("timezone, default_timezone").eq("id", context.workspace.id).single();
  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  const planId = entitlements.plan;
  const timezone = String(workspacePlan.data?.timezone || workspacePlan.data?.default_timezone || DEFAULT_WORKSPACE_TIMEZONE);
  const bypass = entitlements.developer;
  const retentionDays = entitlements.limits.analytics_retention_days;
  const selectedRange = params.get("range") || "7";
  const range = selectedRange === "custom" ? { start: params.get("from") || undefined, end: params.get("to") || undefined } : getWorkspaceDateRange(selectedRange, timezone);
  const requestedFrom = params.get("from") || range.start;
  const requestedTo = params.get("to") || range.end;
  const retentionFloor = retentionDays ? new Date(Date.now() - retentionDays * 86400000).toISOString() : null;
  const lockedRange = Boolean(!bypass && ((selectedRange === "all" && retentionDays) || (selectedRange === "custom" && !entitlements.features.advanced_analytics) || (retentionFloor && requestedFrom && requestedFrom < retentionFloor)));
  const effectiveFrom = retentionFloor && (!requestedFrom || requestedFrom < retentionFloor) ? retentionFloor : requestedFrom;
  const summaryOnly = params.get("summary") === "1";
  const exportCsv = params.get("export") === "csv";
  const rowLimit = exportCsv ? 5000 : Math.min(Number(params.get("limit") || "1000") || 1000, 1000);
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
  const baseMeta = { timezone, planId, retentionDays, canExport: entitlements.features.analytics_export, lockedRange, eventTypes: ANALYTICS_STANDARD_EVENT_TYPES, retentionLimited: Boolean(lockedRange || (retentionFloor && requestedFrom && requestedFrom < retentionFloor)) };

  let summary;
  let geoBreakdowns;
  try {
    [summary, geoBreakdowns] = await Promise.all([
      getAnalyticsSummaryCounts(supabase, filters),
      getAnalyticsGeoBreakdowns(supabase, filters),
    ]);
  } catch (error) {
    return analyticsJson({ error: error instanceof Error ? error.message : "Analytics summary failed." }, { status: 500 });
  }

  if (summaryOnly) return analyticsJson({ ...baseMeta, summary: { visits: summary.visits, clicks: summary.clicks }, byPlatform: [], bySong: [], referrers: [], utmSources: [], campaigns: [], devices: [], browsers: [], ...geoBreakdowns, timeSeries: [], recent: [], recentPage, recentLimit, configured: true, summaryOnly: true });

  let query = (supabase.from("click_events") as any)
    .select("*, songs(title, slug), releases(title), link_pages(title,slug), artists(name)")
    .order("created_at", { ascending: false })
    .limit(rowLimit);
  query = applyAnalyticsEventFilters(query, filters);

  const { data, error } = await query;
  if (error) return analyticsJson({ error: error.message }, { status: 500 });

  const rawEvents = (data || []) as AnalyticsEventRow[];
  const events: AnalyticsEventRow[] = rawEvents.map((event) => ({
    ...event,
    utm_source: normalizeUtmValue(event.utm_source),
    utm_medium: normalizeUtmValue(event.utm_medium),
    utm_campaign: normalizeUtmValue(event.utm_campaign),
    utm_content: normalizeUtmValue(event.utm_content),
    utm_term: normalizeUtmValue(event.utm_term),
  }));
  const clicks = events.filter((event) => isAnalyticsClickEvent(event.event_type));

  if (exportCsv) {
    if (!entitlements.features.analytics_export) return analyticsJson({ error: "CSV event-log export is available on upgraded plans." }, { status: 403 });
    const rows = [["timestamp", "event_type", "smart_link", "platform", "referrer", "utm_source", "utm_campaign", "device"].map(csvEscape).join(",")].concat(events.map((event) => [event.created_at, event.event_type, event.link_pages?.title || event.releases?.title || event.songs?.title || "", event.platform || "", getReferrerDomain(event.referrer), event.utm_source || "", event.utm_campaign || "", event.device_type || ""].map(csvEscape).join(",")));
    return new NextResponse(rows.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=\"tonelink-analytics-${Date.now()}.csv\"` } });
  }

  const timeSeriesMap = new Map<string, { date: string; views: number; clicks: number; ctr: number }>();
  for (const event of events) {
    const key = dayKey(event.created_at, timezone);
    const row = timeSeriesMap.get(key) || { date: key, views: 0, clicks: 0, ctr: 0 };
    if (isAnalyticsViewEvent(event.event_type)) row.views++;
    if (isAnalyticsClickEvent(event.event_type)) row.clicks++;
    row.ctr = row.views ? Math.round(row.clicks / row.views * 100) : 0;
    timeSeriesMap.set(key, row);
  }

  const recentStart = (recentPage - 1) * recentLimit;
  const recent = events.slice(recentStart, recentStart + recentLimit).map((event) => ({ ...event, referrer: getReferrerDomain(event.referrer) }));

  return analyticsJson({
    ...baseMeta,
    summary: { visits: summary.visits, clicks: summary.clicks },
    byPlatform: groupAnalyticsEvents(clicks, (event) => event.platform || "Unknown").slice(0, 10),
    bySong: groupAnalyticsEvents(clicks, (event) => event.link_pages?.title || event.releases?.title || event.songs?.title || "Unknown").slice(0, 10),
    referrers: getReferrerBreakdown(events),
    utmSources: getUtmSourceBreakdown(events),
    campaigns: getUtmCampaignBreakdown(events),
    campaignTimeseries: getCampaignTimeseries(events),
    referrerTimeseries: getReferrerTimeseries(events),
    ...geoBreakdowns,
    devices: groupAnalyticsEvents(events, (event) => event.device_type || (/mobile|android|iphone/i.test(event.user_agent || "") ? "Mobile" : "Desktop")).slice(0, 10),
    browsers: groupAnalyticsEvents(events, (event) => event.browser || "Unknown").slice(0, 10),
    timeSeries: [...timeSeriesMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    recent,
    recentPage,
    recentLimit,
    recentHasMore: events.length > recentStart + recentLimit,
    configured: true,
  });
}
