import type { SongLink, SongPage } from "@/data/songs";

declare global {
  interface Window {
    ttq?: { track: (name: string, values?: Record<string, unknown>) => void };
    __cyniicalTtq?: { track: (name: string, values?: Record<string, unknown>) => void };
    __cyniicalTikTokInstalled?: string;
    fbq?: (action: string, event: string, values?: Record<string, unknown>) => void;
    gtag?: (...args: unknown[]) => void;
    __cyniicalTikTokDebug?: { pixelId: string; loaderRequested: boolean; pageCalled: boolean; lastClick: null | { event: string; properties: Record<string, unknown>; at: string }; testEventCode?: string | null };
  }
}

export function getTikTokTestCode() {
  const queryCode = new URLSearchParams(window.location.search).get("tt_test_code");
  if (queryCode) return queryCode;
  try { return window.sessionStorage.getItem("cyniical_tiktok_test_code"); } catch { return null; }
}

export function withTikTokTestCode(payload: Record<string, unknown> = {}) {
  const testCode = getTikTokTestCode();
  return { ...payload, ...(testCode ? { test_event_code: testCode } : {}) };
}

function trackTikTok(name: string, values: Record<string, unknown>) {
  const payload = withTikTokTestCode(values);
  if (name === "ClickButton" && new URLSearchParams(window.location.search).get("debugPixel") === "1") {
    window.__cyniicalTikTokDebug ||= { pixelId: window.__cyniicalTikTokInstalled || "Unknown", loaderRequested: Boolean(window.__cyniicalTikTokInstalled), pageCalled: true, lastClick: null, testEventCode: getTikTokTestCode() };
    window.__cyniicalTikTokDebug.lastClick = { event: name, properties: payload, at: new Date().toISOString() };
    window.__cyniicalTikTokDebug.testEventCode = getTikTokTestCode();
    window.dispatchEvent(new Event("cyniical:tiktok-debug"));
  }
  (window.ttq || window.__cyniicalTtq)?.track(name, payload);
}

export function trackView(song: SongPage) {
  const payload = {
    content_id: song.pixelEvents.contentId,
    content_name: song.pixelEvents.contentName,
    artist_name: song.pixelEvents.artistName
  };
  if (new URLSearchParams(window.location.search).get("debugPixel") === "1") console.log("ttq exists:", Boolean(window.ttq), "tracking ViewContent:", payload);
  trackTikTok("ViewContent", payload);
  window.fbq?.("track", "ViewContent", { content_ids: [song.pixelEvents.contentId], content_name: song.pixelEvents.contentName });
  window.gtag?.("event", "view_item", { song_slug: song.slug, song_title: song.title, artist: song.artist });
}

export function trackPlatformClick(song: SongPage, link: SongLink) {
  const payload = {
    button_text: link.label,
    action: "platform_click",
    platform: link.platform,
    destination_url: link.url,
    content_id: song.slug,
    content_name: song.title,
    artist_name: song.artist
  };
  if (new URLSearchParams(window.location.search).get("debugPixel") === "1") {
    console.log("ttq exists:", Boolean(window.ttq));
    console.log("tracking platform click:", payload);
  }
  try {
    trackTikTok("ClickButton", payload);
    window.fbq?.("trackCustom", "MusicPlatformClick", payload);
    window.gtag?.("event", "music_platform_click", payload);
  } catch (error) { console.warn("Pixel tracking failed", error); }
  return payload;
}

export function trackUtility(song: SongPage, label: "Copy URL" | "Share" | "Embed", action: "copy_url" | "share" | "embed") {
  const payload = { button_text: label, action, content_id: song.slug, content_name: song.title, artist_name: song.artist };
  if (new URLSearchParams(window.location.search).get("debugPixel") === "1") console.log(`tracking ${action}:`, payload);
  try {
    trackTikTok("ClickButton", payload);
    window.fbq?.("trackCustom", "SmartLinkUtilityClick", payload);
    window.gtag?.("event", "smart_link_utility_click", payload);
  } catch (error) { console.warn("Pixel tracking failed", error); }
}
