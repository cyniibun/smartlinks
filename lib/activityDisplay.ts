const eventLabels: Record<string, string> = {
  platform_click: "Platform Click",
  page_view: "Page View",
  view_content: "Content View",
  visit: "Visit",
  share: "Share",
  click: "Click",
  copy_url: "Copy URL",
  embed_click: "Embed Click",
  campaign_click: "Campaign Click",
};

const eventBadgeClasses: Record<string, string> = {
  platform_click: "event-platform-click",
  page_view: "event-page-view",
  view_content: "event-view-content",
  visit: "event-visit",
  share: "event-share",
  click: "event-click",
  copy_url: "event-click",
  embed_click: "event-click",
  campaign_click: "event-platform-click",
};

const platformLabels: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  itunes: "iTunes",
  youtube: "YouTube",
  youtube_music: "YouTube Music",
  soundcloud: "SoundCloud",
  pandora: "Pandora",
  deezer: "Deezer",
  amazon_music: "Amazon Music",
  amazon: "Amazon",
  tidal: "TIDAL",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  meta: "Meta",
  google: "Google",
};

export function displayEventType(eventType?: string | null) {
  const key = String(eventType || "").toLowerCase();
  return eventLabels[key] || key.split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || "Unknown";
}

export function eventBadgeClass(eventType?: string | null) {
  const key = String(eventType || "").toLowerCase();
  return `event-badge ${eventBadgeClasses[key] || "event-unknown"}`;
}

export function displayPlatformName(platform?: string | null, fallback = "Page") {
  const value = String(platform || "").trim();
  if (!value) return fallback;
  const key = value.toLowerCase();
  return platformLabels[key] || value.split(/[_\s-]+/).filter(Boolean).map((part) => {
    const lowered = part.toLowerCase();
    if (lowered === "url") return "URL";
    if (lowered === "ctr") return "CTR";
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(" ");
}
