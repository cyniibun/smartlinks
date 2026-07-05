import type { SongLink, SongPage } from "@/data/songs";

declare global {
  interface Window {
    ttq?: { track: (name: string, values?: Record<string, unknown>) => void };
    fbq?: (action: string, event: string, values?: Record<string, unknown>) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackView(song: SongPage) {
  window.ttq?.track("ViewContent", {
    content_id: song.pixelEvents.contentId,
    content_name: song.pixelEvents.contentName,
    artist_name: song.pixelEvents.artistName
  });
  window.fbq?.("track", "ViewContent", { content_ids: [song.pixelEvents.contentId], content_name: song.pixelEvents.contentName });
  window.gtag?.("event", "view_item", { song_slug: song.slug, song_title: song.title, artist: song.artist });
}

export function trackPlatformClick(song: SongPage, link: SongLink) {
  window.ttq?.track("ClickButton", {
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
  window.ttq?.track("ClickButton", { button_text: label, content_name: song.title });
  window.fbq?.("trackCustom", "SmartLinkUtilityClick", { button_text: label, content_name: song.title });
  window.gtag?.("event", "smart_link_utility_click", { song_slug: song.slug, button_text: label });
}
