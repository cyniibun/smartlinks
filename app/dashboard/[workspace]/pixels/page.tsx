import { redirect } from "next/navigation";
import { PixelsDashboard, type PixelEventSummary, type PixelHealth, type PixelProviderRow, type PixelStatus, type PixelSeriesPoint } from "@/components/admin/PixelsDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { listWorkspacePixelConfigurations, pixelProviders, type WorkspacePixelConfiguration } from "@/lib/pixelConfigurations";
import { getSupabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

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

function legacyProviderValue(providerKey: string, workspace: WorkspaceRow, artists: ArtistRow[], links: LinkPageRow[]) {
  const workspaceValue = pixelValueFor(workspace, providerKey);
  const artistValues = artists.map((row) => pixelValueFor(row, providerKey)).filter(Boolean);
  const linkValues = links.map((row) => pixelValueFor(row, providerKey)).filter(Boolean);
  return { workspaceValue, artistValues, linkValues };
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
  const entitlements = await getWorkspaceEntitlements(workspaceId, context.user, context.role);
  if (!(entitlements.features.standard_pixels || entitlements.developer)) {
    return <main className="admin-main pixels-v2">
      <section className="admin-panel upgrade-state">
        <span className="admin-kicker">TRACKING</span>
        <h1>Upgrade to use Pixels</h1>
        <p>Tracking pixels are available on Basic and Pro plans.</p>
        <Link className="admin-primary" href={`/dashboard/${workspaceId}/settings?section=Billing`}>View billing plans</Link>
      </section>
    </main>;
  }

  const db = getSupabaseAdmin();
  if (!db) return null;

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [pixelConfigs, workspace, artists, linkPages, events] = await Promise.all([
    listWorkspacePixelConfigurations(db, workspaceId),
    db.from("workspaces").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("id", workspaceId).maybeSingle(),
    db.from("artists").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("workspace_id", workspaceId).limit(500),
    db.from("link_pages").select("tiktok_pixel_id,meta_pixel_id,ga_measurement_id").eq("workspace_id", workspaceId).limit(1000),
    db.from("click_events").select("event_type,created_at").eq("workspace_id", workspaceId).gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(2000),
  ]);

  const artistRows = (artists.data || []) as ArtistRow[];
  const linkRows = (linkPages.data || []) as LinkPageRow[];
  const eventRows = (events.data || []) as EventRow[];
  const configurationRows = pixelConfigs as WorkspacePixelConfiguration[];
  const totalEvents = eventRows.length;
  const lastEventAt = eventRows[0]?.created_at || null;

  const allowedProviders = entitlements.features.advanced_pixels || entitlements.developer
    ? pixelProviders
    : pixelProviders.filter((provider) => provider.provider !== "snapchat" && provider.provider !== "custom");

  const rows: PixelProviderRow[] = allowedProviders.map((provider) => {
    const configs = configurationRows.filter((row) => row.provider === provider.provider);
    const primaryConfig = configs.find((row) => row.is_default) || configs[0] || null;
    const legacy = legacyProviderValue(provider.key, (workspace.data || {}) as WorkspaceRow, artistRows, linkRows);
    const configuredId = compactId(primaryConfig?.pixel_id || legacy.workspaceValue || legacy.artistValues[0] || legacy.linkValues[0] || null);
    const inferredStatus = statusFor(Boolean(configuredId), totalEvents);
    const status = primaryConfig?.status || inferredStatus;
    const health = primaryConfig?.health || healthFor(status);
    const configured = Boolean(configuredId);
    const artistsUsing = artistRows.filter((row) => Boolean(pixelValueFor(row, provider.key))).length;
    const releasesUsing = linkRows.filter((row) => Boolean(pixelValueFor(row, provider.key))).length;

    return {
      id: primaryConfig?.id || provider.provider,
      provider: provider.provider,
      providerName: primaryConfig?.name || provider.providerName,
      providerShortName: provider.providerShortName,
      configuredId,
      status,
      health,
      events: configured ? totalEvents : 0,
      lastEventAt: configured ? primaryConfig?.last_event_at || lastEventAt : null,
      artistsUsing,
      releasesUsing,
      workspaceAssigned: Boolean(primaryConfig?.is_default || legacy.workspaceValue),
      diagnostics: configured
        ? totalEvents > 0
          ? [`✓ ${provider.providerShortName} is configured through workspace pixel configurations and ToneLink is receiving events.`, "Provider-side verification and Conversions API diagnostics will attach to this configuration in a future pass."]
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

  return <PixelsDashboard rows={rows} events={eventSummaries} series={buildSeries(eventRows, since)} canUseAdvancedPixels={entitlements.features.advanced_pixels || entitlements.developer} />;
}
