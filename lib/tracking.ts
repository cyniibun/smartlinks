import type { SongLink, SongPage } from "@/data/songs";

declare global {
  interface Window {
    ttq?: { track: (name: string, values?: Record<string, unknown>) => void };
    __cyniicalTtq?: { track: (name: string, values?: Record<string, unknown>) => void };
    __cyniicalTikTokInstalled?: string;
    fbq?: (action: string, event: string, values?: Record<string, unknown>) => void;
    gtag?: (...args: unknown[]) => void;
    __cyniicalTikTokDebug?: { pixelId: string; loaderRequested: boolean; pageCalled: boolean; lastClick: null | { event: string; properties: Record<string, unknown>; at: string } };
  }
}

function trackTikTok(name: string, values: Record<string, unknown>) {
  if (name === "ClickButton" && window.__cyniicalTikTokDebug) {
    window.__cyniicalTikTokDebug.lastClick = { event: name, properties: values, at: new Date().toISOString() };
    window.dispatchEvent(new Event("cyniical:tiktok-debug"));
  }
  (window.ttq || window.__cyniicalTtq)?.track(name, values);
}

export function trackView(song: SongPage) {
  trackTikTok("ViewContent", {
    content_id: song.pixelEvents.contentId,
    content_name: song.pixelEvents.contentName,
    artist_name: song.pixelEvents.artistName
  });
  window.fbq?.("track", "ViewContent", { content_ids: [song.pixelEvents.contentId], content_name: song.pixelEvents.contentName });
  window.gtag?.("event", "view_item", { song_slug: song.slug, song_title: song.title, artist: song.artist });
}

export function trackPlatformClick(song: SongPage, link: SongLink) {
  trackTikTok("ClickButton", {
    content_id: song.pixelEvents.contentId, content_name: song.pixelEvents.contentName,
    platform: link.platform, button_text: link.label
  });
  window.fbq?.("trackCustom", "MusicPlatformClick", {
    content_id: song.pixelEvents.contentId, content_name: song.pixelEvents.contentName, platform: link.platform
  });
  window.gtag?.("event", "music_platform_click", {
    song_slug: song.slug, song_title: song.title, platform: link.platform
  });
}

export function trackUtility(song: SongPage, label: string) {
  trackTikTok("ClickButton", { button_text: label, content_name: song.title });
  window.fbq?.("trackCustom", "SmartLinkUtilityClick", { button_text: label, content_name: song.title });
  window.gtag?.("event", "smart_link_utility_click", { song_slug: song.slug, button_text: label });
}
