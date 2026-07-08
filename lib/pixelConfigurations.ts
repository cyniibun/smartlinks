import "server-only";

export type PixelConfigurationProvider = "meta" | "tiktok" | "google_analytics" | "google_ads" | "snapchat" | "custom";

export type WorkspacePixelConfiguration = {
  id: string;
  workspace_id: string;
  provider: PixelConfigurationProvider;
  name: string;
  pixel_id: string | null;
  access_token?: string | null;
  dataset_id?: string | null;
  conversion_label?: string | null;
  status: "connected" | "verified" | "pending" | "disconnected" | "error";
  health: "good" | "warning" | "error" | "inactive";
  is_default: boolean;
  settings?: Record<string, unknown>;
  last_verified_at?: string | null;
  last_event_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const pixelProviders: Array<{
  provider: PixelConfigurationProvider;
  providerName: string;
  providerShortName: string;
  key: "meta" | "tiktok" | "ga" | "google_ads" | "snapchat" | "custom";
}> = [
  { provider: "meta", providerName: "Meta Pixel", providerShortName: "Meta", key: "meta" },
  { provider: "tiktok", providerName: "TikTok Pixel", providerShortName: "TikTok", key: "tiktok" },
  { provider: "google_analytics", providerName: "Google Analytics 4", providerShortName: "GA4", key: "ga" },
  { provider: "google_ads", providerName: "Google Ads Conversion", providerShortName: "Google Ads", key: "google_ads" },
  { provider: "snapchat", providerName: "Snapchat Pixel", providerShortName: "Snapchat", key: "snapchat" },
  { provider: "custom", providerName: "Custom Pixel", providerShortName: "Custom", key: "custom" },
];

export async function listWorkspacePixelConfigurations(db: { from: (table: string) => any }, workspaceId: string): Promise<WorkspacePixelConfiguration[]> {
  const result = await db
    .from("workspace_pixel_configurations")
    .select("id,workspace_id,provider,name,pixel_id,status,health,is_default,last_verified_at,last_event_at,created_at,updated_at")
    .eq("workspace_id", workspaceId)
    .order("is_default", { ascending: false })
    .order("provider");

  if (result.error) {
    console.warn("[tone-link:pixels:configs-fallback]", result.error.message);
    return [];
  }

  return (result.data || []) as WorkspacePixelConfiguration[];
}
