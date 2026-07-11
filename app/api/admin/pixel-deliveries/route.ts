import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { isSuccessfulPixelDelivery, type PixelDeliveryRow } from "@/lib/pixelDeliveries";
import { pixelProviders, type WorkspacePixelConfiguration } from "@/lib/pixelConfigurations";
import { getSupabaseAdmin } from "@/lib/supabase";

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

function deliveryMatches(delivery: PixelDeliveryRow, config: WorkspacePixelConfiguration) {
  if (delivery.provider !== config.provider) return false;
  if (delivery.pixel_connection_id === config.id) return true;
  return Boolean(config.pixel_id && delivery.pixel_id === config.pixel_id);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return json({ summary: [], events: [], page: 1, hasMore: false });

  const workspaceId = context.workspace.id;
  const page = Math.max(Number(params.get("page") || "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "50") || 50, 10), 100);
  const from = params.get("from");
  const to = params.get("to");
  const providerFilter = params.get("provider");
  const connectionFilter = params.get("connectionId");
  const statusFilter = params.get("status");
  const eventNameFilter = params.get("eventType");
  const offset = (page - 1) * pageSize;

  const [configs, artists, linkPages] = await Promise.all([
    db.from("workspace_pixel_configurations").select("id,workspace_id,provider,name,pixel_id,status,health,is_default,last_event_at,last_verified_at").eq("workspace_id", workspaceId).neq("status", "disconnected").order("provider"),
    db.from("artists").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("workspace_id", workspaceId).limit(500),
    db.from("link_pages").select("id,title,artist_display_name,tiktok_pixel_id,meta_pixel_id,ga_measurement_id").eq("workspace_id", workspaceId).limit(1000),
  ]);

  const configRows = (configs.data || []) as WorkspacePixelConfiguration[];
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
  const deliveryResult = await deliveryQuery.range(offset, offset + pageSize - 1);
  if (deliveryResult.error) return json({ error: deliveryResult.error.message }, { status: 500 });

  let allForSummaryQuery = db.from("pixel_event_deliveries").select("*").eq("workspace_id", workspaceId).limit(5000);
  if (from) allForSummaryQuery = allForSummaryQuery.gte("attempted_at", from);
  if (to) allForSummaryQuery = allForSummaryQuery.lte("attempted_at", to);
  const allForSummary = await allForSummaryQuery;
  const allDeliveries = (allForSummary.data || []) as PixelDeliveryRow[];

  const summary = assignedConfigs.map((config) => {
    const artistsUsing = artistRows.filter((artist: any) => pixelValueFor(artist, config.provider) === config.pixel_id).length;
    const releasesUsing = linkRows.filter((link: any) => pixelValueFor(link, config.provider) === config.pixel_id).length;
    const deliveries = allDeliveries.filter((delivery) => deliveryMatches(delivery, config));
    const successful = deliveries.filter(isSuccessfulPixelDelivery);
    const failed = deliveries.filter((delivery) => delivery.status === "failed");
    const lastSuccessful = successful[0]?.attempted_at || null;
    const health = failed.length >= 3 && failed.length >= successful.length ? "error" : successful.length ? "good" : "warning";
    return {
      id: config.id,
      provider: config.provider,
      providerName: providerNames[config.provider] || config.provider,
      name: config.name,
      safeId: compactId(config.pixel_id),
      status: successful.length ? "Active" : config.status === "error" ? "Error" : "Warning",
      health,
      lastSuccessfulEvent: lastSuccessful,
      events: successful.length,
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
