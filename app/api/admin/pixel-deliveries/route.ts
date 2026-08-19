import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import type { PixelDeliveryRow } from "@/lib/pixelDeliveries";
import { pixelProviders, type WorkspacePixelConfiguration } from "@/lib/pixelConfigurations";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_WORKSPACE_TIMEZONE, getWorkspaceDateRange } from "@/lib/timezone";

const providerNames = Object.fromEntries(pixelProviders.map((provider) => [provider.provider, provider.providerName]));

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: { "cache-control": "no-store", ...(init?.headers || {}) } });
}

function compactId(value?: string | null) {
  const id = String(value || "").trim();
  if (!id) return null;
  return id.length > 22 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function pixelValueFor(row: any, provider: string) {
  if (provider === "meta") return row.default_meta_pixel_id || row.meta_pixel_id || null;
  if (provider === "tiktok") return row.default_tiktok_pixel_id || row.tiktok_pixel_id || null;
  if (provider === "google_analytics") return row.default_ga_measurement_id || row.ga_measurement_id || null;
  return null;
}

type PixelDeliverySummaryRow = {
  pixel_connection_id: string | null;
  provider: string;
  pixel_id: string | null;
  successful_count: number | string;
  failed_count: number | string;
  last_successful: string | null;
  last_attempted: string | null;
  last_acknowledged: string | null;
};

function summaryMatches(summary: PixelDeliverySummaryRow, config: WorkspacePixelConfiguration) {
  if (summary.provider !== config.provider) return false;
  if (summary.pixel_connection_id === config.id) return true;
  return Boolean(config.pixel_id && summary.pixel_id === config.pixel_id);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return json({ error: "Unauthorized" }, { status: 401 });
  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  if (!(entitlements.features.standard_pixels || entitlements.developer)) return json({ error: "Tracking pixels are available on Basic and Pro plans." }, { status: 403 });
  const db = getSupabaseAdmin();
  if (!db) return json({ summary: [], events: [], page: 1, hasMore: false });

  const workspaceId = context.workspace.id;
  const page = Math.max(Number(params.get("page") || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "50") || 50, 10), 100);
  const selectedRange = params.get("range") || "7";
  const providerFilter = params.get("provider");
  const canUseAdvancedPixels = entitlements.features.advanced_pixels || entitlements.developer;
  if (providerFilter && ["snapchat", "custom"].includes(providerFilter) && !canUseAdvancedPixels) {
    return json({ error: "Advanced pixels require Pro." }, { status: 403 });
  }
  const connectionFilter = params.get("connectionId");
  const statusFilter = params.get("status");
  const eventNameFilter = params.get("eventType");
  const offset = (page - 1) * pageSize;

  const [configs, artists, linkPages, workspaceResult] = await Promise.all([
    db.from("workspace_pixel_configurations").select("id,workspace_id,provider,name,pixel_id,status,health,is_default,last_event_at,last_verified_at").eq("workspace_id", workspaceId).neq("status", "disconnected").order("provider"),
    db.from("artists").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("workspace_id", workspaceId).limit(500),
    db.from("link_pages").select("id,title,artist_display_name,tiktok_pixel_id,meta_pixel_id,ga_measurement_id").eq("workspace_id", workspaceId).limit(1000),
    db.from("workspaces").select("timezone,default_timezone").eq("id", workspaceId).maybeSingle(),
  ]);
  const timezone = String(workspaceResult.data?.timezone || workspaceResult.data?.default_timezone || DEFAULT_WORKSPACE_TIMEZONE);
  const resolvedRange = selectedRange === "custom" ? {} : getWorkspaceDateRange(selectedRange, timezone);
  const from = params.get("from") || resolvedRange.start || null;
  const to = params.get("to") || resolvedRange.end || null;

  const configRows = ((configs.data || []) as WorkspacePixelConfiguration[]).filter((config) => canUseAdvancedPixels || !["snapchat", "custom"].includes(config.provider));
  const artistRows = artists.data || [];
  const linkRows = linkPages.data || [];
  const assignedConfigs = configRows.filter((config) => {
    if (!config.pixel_id) return false;
    const artistsUsing = artistRows.filter((artist: any) => pixelValueFor(artist, config.provider) === config.pixel_id).length;
    const releasesUsing = linkRows.filter((link: any) => pixelValueFor(link, config.provider) === config.pixel_id).length;
    return Boolean(config.is_default || artistsUsing || releasesUsing);
  });

  let deliveryQuery = db
    .from("pixel_event_deliveries")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("attempted_at", { ascending: false });
  if (from) deliveryQuery = deliveryQuery.gte("attempted_at", from);
  if (to) deliveryQuery = deliveryQuery.lte("attempted_at", to);
  if (providerFilter) deliveryQuery = deliveryQuery.eq("provider", providerFilter);
  if (connectionFilter) deliveryQuery = deliveryQuery.eq("pixel_connection_id", connectionFilter);
  if (statusFilter) deliveryQuery = deliveryQuery.eq("status", statusFilter);
  if (eventNameFilter) deliveryQuery = deliveryQuery.ilike("provider_event_name", `%${eventNameFilter}%`);
  if (!canUseAdvancedPixels) deliveryQuery = deliveryQuery.not("provider", "in", "(snapchat,custom)");
  const deliveryResult = await deliveryQuery.range(offset, offset + pageSize - 1);
  if (deliveryResult.error) return json({ error: deliveryResult.error.message }, { status: 500 });

  const deliverySummaryResult = await db.rpc("get_pixel_delivery_summary_v2", {
    p_workspace_id: workspaceId,
    p_from: from,
    p_to: to,
  });
  if (deliverySummaryResult.error) return json({ error: "Pixel analytics integrity migration 20260818 is required." }, { status: 500 });
  const deliverySummaries = (deliverySummaryResult.data || []) as PixelDeliverySummaryRow[];

  const summary = assignedConfigs.map((config) => {
    const artistsUsing = artistRows.filter((artist: any) => pixelValueFor(artist, config.provider) === config.pixel_id).length;
    const releasesUsing = linkRows.filter((link: any) => pixelValueFor(link, config.provider) === config.pixel_id).length;
    const deliverySummary = deliverySummaries.find((row) => summaryMatches(row, config));
    const successfulCount = Number(deliverySummary?.successful_count || 0);
    const failedCount = Number(deliverySummary?.failed_count || 0);
    const lastSuccessful = deliverySummary?.last_successful || null;
    const health = failedCount >= 3 && failedCount >= successfulCount ? "error" : successfulCount ? "good" : "warning";
    return {
      id: config.id,
      provider: config.provider,
      providerName: providerNames[config.provider] || config.provider,
      name: config.name,
      safeId: compactId(config.pixel_id),
      status: successfulCount ? "Active" : config.status === "error" ? "Error" : "Warning",
      health,
      lastSuccessfulEvent: lastSuccessful,
      events: successfulCount,
      assignmentScope: {
        workspaceDefault: Boolean(config.is_default),
        artists: artistsUsing,
        releases: releasesUsing,
      },
    };
  });

  const linkTitles = new Map((linkRows as any[]).map((link) => [link.id, { title: link.title, artist: link.artist_display_name }]));
  const configNames = new Map(configRows.map((config) => [config.id, config.name]));

  return json({
    summary,
    events: ((deliveryResult.data || []) as PixelDeliveryRow[]).map((event) => ({
      id: event.id,
      provider: event.provider,
      providerName: providerNames[event.provider] || event.provider,
      connectionName: event.pixel_connection_id ? configNames.get(event.pixel_connection_id) || "Pixel connection" : "Legacy pixel",
      providerEventName: event.provider_event_name,
      internalEventType: event.internal_event_type || null,
      status: event.status,
      attemptedAt: event.attempted_at,
      releaseTitle: event.link_page_id ? linkTitles.get(event.link_page_id)?.title || null : null,
      artistName: event.link_page_id ? linkTitles.get(event.link_page_id)?.artist || null : null,
      testEvent: event.test_event,
      latencyMs: event.latency_ms,
      errorReason: event.error_message || event.error_code,
    })),
    page,
    pageSize,
    total: deliveryResult.count || 0,
    hasMore: (deliveryResult.count || 0) > offset + pageSize,
  });
}
