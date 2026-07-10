import "server-only";

export const PIXEL_DELIVERY_SUCCESS_STATUSES = ["sent", "acknowledged"] as const;
export const PIXEL_DELIVERY_STATUSES = ["queued", "sent", "acknowledged", "failed", "skipped"] as const;
export const PIXEL_DELIVERY_PROVIDERS = ["meta", "tiktok", "google_analytics", "google_ads", "snapchat", "custom"] as const;

export type PixelDeliveryStatus = (typeof PIXEL_DELIVERY_STATUSES)[number];
export type PixelDeliveryProvider = (typeof PIXEL_DELIVERY_PROVIDERS)[number];

export type PixelDeliveryRow = {
  id: string;
  workspace_id: string;
  pixel_connection_id: string | null;
  provider: PixelDeliveryProvider;
  pixel_id: string | null;
  internal_event_id: string | null;
  provider_event_name: string;
  event_id: string | null;
  dedupe_key: string;
  status: PixelDeliveryStatus;
  attempted_at: string;
  acknowledged_at: string | null;
  error_code: string | null;
  error_message: string | null;
  test_event: boolean;
  latency_ms: number | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export function isPixelDeliveryProvider(value: unknown): value is PixelDeliveryProvider {
  return (PIXEL_DELIVERY_PROVIDERS as readonly string[]).includes(String(value || ""));
}

export function isPixelDeliveryStatus(value: unknown): value is PixelDeliveryStatus {
  return (PIXEL_DELIVERY_STATUSES as readonly string[]).includes(String(value || ""));
}

export function buildPixelDeliveryDedupeKey(input: {
  workspaceId: string;
  pixelConnectionId?: string | null;
  provider: string;
  pixelId?: string | null;
  providerEventName: string;
  eventId?: string | null;
}) {
  return [
    input.workspaceId,
    input.provider,
    input.pixelConnectionId || input.pixelId || "legacy",
    input.providerEventName,
    input.eventId || "no-event-id",
  ].join(":");
}

export async function listPixelDeliveries(db: SupabaseLike, workspaceId: string, sinceIso: string): Promise<PixelDeliveryRow[]> {
  const { data, error } = await db
    .from("pixel_event_deliveries")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("attempted_at", sinceIso)
    .order("attempted_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.warn("[tone-link:pixels:deliveries]", error.message);
    return [];
  }

  return (data || []) as PixelDeliveryRow[];
}

export function isSuccessfulPixelDelivery(row: Pick<PixelDeliveryRow, "status">) {
  return (PIXEL_DELIVERY_SUCCESS_STATUSES as readonly string[]).includes(row.status);
}

