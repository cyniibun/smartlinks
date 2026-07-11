import { NextResponse } from "next/server";
import { buildPixelDeliveryDedupeKey, isPixelDeliveryProvider, isPixelDeliveryStatus } from "@/lib/pixelDeliveries";
import { getSupabaseAdmin } from "@/lib/supabase";

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = nullableString(body.provider);
    const status = nullableString(body.status) || "sent";
    const providerEventName = nullableString(body.providerEventName ?? body.provider_event_name);
    const eventId = nullableString(body.eventId ?? body.event_id);
    const songSlug = nullableString(body.songSlug ?? body.song_slug);
    const pixelId = nullableString(body.pixelId ?? body.pixel_id);
    const suppliedWorkspaceId = nullableString(body.workspaceId ?? body.workspace_id);

    if (!isPixelDeliveryProvider(provider)) return json(400, { ok: false, error: "Unsupported pixel provider." });
    if (!isPixelDeliveryStatus(status)) return json(400, { ok: false, error: "Unsupported delivery status." });
    if (!providerEventName) return json(400, { ok: false, error: "Provider event name is required." });

    const db = getSupabaseAdmin();
    if (!db) return json(202, { ok: true, skipped: "Supabase unavailable" });

    const page = songSlug
      ? await db.from("link_pages").select("id, workspace_id, artist_id, release_id").eq("slug", songSlug).eq("published", true).maybeSingle()
      : null;

    const workspaceId = page?.data?.workspace_id || suppliedWorkspaceId;
    if (!workspaceId) return json(400, { ok: false, error: "Workspace could not be resolved." });

    const configured = await db
      .from("workspace_pixel_configurations")
      .select("id,pixel_id")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .order("is_default", { ascending: false })
      .limit(20);

    const connection = (configured.data || []).find((row: any) => pixelId && row.pixel_id === pixelId) || (configured.data || [])[0] || null;
    const dedupeKey = buildPixelDeliveryDedupeKey({
      workspaceId,
      provider,
      pixelConnectionId: connection?.id || null,
      pixelId,
      providerEventName,
      eventId,
    });

    const row = {
      workspace_id: workspaceId,
      pixel_connection_id: connection?.id || null,
      link_page_id: page?.data?.id || nullableString(body.linkPageId ?? body.link_page_id),
      release_id: page?.data?.release_id || nullableString(body.releaseId ?? body.release_id),
      artist_id: page?.data?.artist_id || nullableString(body.artistId ?? body.artist_id),
      provider,
      pixel_id: pixelId || connection?.pixel_id || null,
      internal_event_type: nullableString(body.internalEventType ?? body.internal_event_type),
      provider_event_name: providerEventName,
      event_id: eventId,
      dedupe_key: dedupeKey,
      status,
      attempted_at: new Date().toISOString(),
      acknowledged_at: status === "acknowledged" ? new Date().toISOString() : null,
      error_code: nullableString(body.errorCode ?? body.error_code),
      error_message: nullableString(body.errorMessage ?? body.error_message),
      test_event: Boolean(body.testEvent ?? body.test_event),
      latency_ms: Number.isFinite(Number(body.latencyMs ?? body.latency_ms)) ? Number(body.latencyMs ?? body.latency_ms) : null,
    };

    const result = await db
      .from("pixel_event_deliveries")
      .upsert(row, { onConflict: "dedupe_key" })
      .select("id,status")
      .single();

    if (result.error) {
      console.warn("[tone-link:pixel-delivery]", result.error.message);
      return json(202, { ok: true, skipped: "delivery-table-unavailable" });
    }

    return json(202, { ok: true, delivery: result.data });
  } catch {
    return json(400, { ok: false, error: "Invalid JSON payload." });
  }
}
