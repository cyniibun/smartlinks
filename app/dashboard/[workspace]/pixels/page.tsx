import { redirect } from "next/navigation";
import { PixelsDashboard, type PixelEventSummary, type PixelHealth, type PixelProviderRow, type PixelStatus, type PixelSeriesPoint } from "@/components/admin/PixelsDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

type WorkspaceRow = {
  default_tiktok_pixel_id?: string | null;
  default_meta_pixel_id?: string | null;
  default_ga_measurement_id?: string | null;
};
type ArtistRow = {
  default_tiktok_pixel_id?: string | null;
  default_meta_pixel_id?: string | null;
  default_ga_measurement_id?: string | null;
};
type LinkPageRow = {
  tiktok_pixel_id?: string | null;
  meta_pixel_id?: string | null;
  ga_measurement_id?: string | null;
};
type EventRow = { event_type: string | null; created_at: string };

const providers = [
  { provider: "meta", providerName: "Meta Pixel", providerShortName: "Meta", key: "meta" },
  { provider: "tiktok", providerName: "TikTok Pixel", providerShortName: "TikTok", key: "tiktok" },
  { provider: "google_analytics", providerName: "Google Analytics 4", providerShortName: "GA4", key: "ga" },
  { provider: "google_ads", providerName: "Google Ads Conversion", providerShortName: "Google Ads", key: "google_ads" },
  { provider: "snapchat", providerName: "Snapchat Pixel", providerShortName: "Snapchat", key: "snapchat" },
  { provider: "custom", providerName: "Custom Pixel", providerShortName: "Custom", key: "custom" },
] as const;

function compactId(value?: string | null) {
  const id = String(value || "").trim();
  if (!id) return null;
  return id.length > 22 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function statusFor(configured: boolean, events: number): PixelStatus {
  if (!configured) return "disconnected";
  if (events > 0) return "verified";
  return "pending";
}

function healthFor(status: PixelStatus): PixelHealth {
  if (status === "verified" || status === "connected") return "good";
  if (status === "pending") return "warning";
  if (status === "error") return "error";
  return "inactive";
}

function eventDisplayType(eventType?: string | null) {
  const type = String(eventType || "unknown");
  if (type === "view_content") return "Content View";
  if (type === "platform_click") return "Platform Click";
  if (type === "page_view" || type === "visit") return "Page View";
  return type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pixelValueFor(row: WorkspaceRow | ArtistRow | LinkPageRow, key: string) {
  const fields = row as WorkspaceRow & ArtistRow & LinkPageRow;
  if (key === "meta") return fields.default_meta_pixel_id || fields.meta_pixel_id || null;
  if (key === "tiktok") return fields.default_tiktok_pixel_id || fields.tiktok_pixel_id || null;
  if (key === "ga") return fields.default_ga_measurement_id || fields.ga_measurement_id || null;
  return null;
}

function buildSeries(events: EventRow[], start: Date): PixelSeriesPoint[] {
  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const count = events.filter((event) => event.created_at.slice(0, 10) === key).length;
    return { label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count };
  });
}

export default async function PixelsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const workspaceId = (await params).workspace;
  const context = await getWorkspaceContext(workspaceId);
  if (!context) redirect("/login");

  const db = getSupabaseAdmin();
  if (!db) return null;

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [workspace, artists, linkPages, events] = await Promise.all([
    db.from("workspaces").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("id", workspaceId).maybeSingle(),
    db.from("artists").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("workspace_id", workspaceId).limit(500),
    db.from("link_pages").select("tiktok_pixel_id,meta_pixel_id,ga_measurement_id").eq("workspace_id", workspaceId).limit(1000),
    db.from("click_events").select("event_type,created_at").eq("workspace_id", workspaceId).gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(2000),
  ]);

  const artistRows = (artists.data || []) as ArtistRow[];
  const linkRows = (linkPages.data || []) as LinkPageRow[];
  const eventRows = (events.data || []) as EventRow[];
  const totalEvents = eventRows.length;
  const lastEventAt = eventRows[0]?.created_at || null;

  const rows: PixelProviderRow[] = providers.map((provider) => {
    const workspaceValue = pixelValueFor((workspace.data || {}) as WorkspaceRow, provider.key);
    const artistValues = artistRows.map((row) => pixelValueFor(row, provider.key)).filter(Boolean);
    const linkValues = linkRows.map((row) => pixelValueFor(row, provider.key)).filter(Boolean);
    const configuredId = compactId(workspaceValue || artistValues[0] || linkValues[0] || null);
    const status = statusFor(Boolean(configuredId), totalEvents);
    const health = healthFor(status);
    const configured = Boolean(configuredId);

    return {
      id: provider.provider,
      provider: provider.provider,
      providerName: provider.providerName,
      providerShortName: provider.providerShortName,
      configuredId,
      status,
      health,
      events: configured ? totalEvents : 0,
      lastEventAt: configured ? lastEventAt : null,
      artistsUsing: artistValues.length,
      releasesUsing: linkValues.length,
      workspaceAssigned: Boolean(workspaceValue),
      diagnostics: configured
        ? totalEvents > 0
          ? [`✓ ${provider.providerShortName} is configured and ToneLink is receiving events.`, "Provider-side verification and Conversions API diagnostics will be attached in a future pass."]
          : [`⚠ ${provider.providerShortName} is configured but no events were recorded in the selected range.`, "Open a public release page and trigger Page View / Platform Click events to verify."]
        : [`⚠ ${provider.providerShortName} credentials are not configured.`, "Add workspace-level pixel configurations, then let artists inherit them."],
    };
  });

  const eventCounts = new Map<string, number>();
  for (const event of eventRows) {
    const key = eventDisplayType(event.event_type);
    eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
  }
  const eventSummaries: PixelEventSummary[] = [...eventCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([eventType, count]) => ({ eventType, count, changeLabel: count ? "Active" : "—" }));

  return <PixelsDashboard rows={rows} events={eventSummaries} series={buildSeries(eventRows, since)} />;
}
