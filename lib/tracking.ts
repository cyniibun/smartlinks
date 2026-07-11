import type { SongLink, SongPage } from "@/data/songs";
import type { VisitorIdentityPayload } from "@/lib/analytics/visitor";

declare global {
  interface Window {
    ttq?: { track: (name: string, values?: Record<string, unknown>) => void };
    __cyniicalTtq?: { track: (name: string, values?: Record<string, unknown>) => void };
    __cyniicalTikTokInstalled?: string;
    fbq?: (action: string, event: string, values?: Record<string, unknown>, options?: Record<string, unknown>) => void;
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

function sendPixelDelivery(song: SongPage, input: { provider: "tiktok" | "meta" | "google_analytics"; providerEventName: string; internalEventType: string; eventId?: string | null; pixelId?: string | null; testEvent?: boolean }) {
  if (!input.pixelId) return;
  const payload = {
    songSlug: song.slug,
    workspaceId: song.workspaceId,
    linkPageId: song.linkPageId,
    releaseId: song.releaseId,
    artistId: song.artistId,
    provider: input.provider,
    providerEventName: input.providerEventName,
    internalEventType: input.internalEventType,
    eventId: input.eventId,
    pixelId: input.pixelId,
    status: "sent",
    testEvent: Boolean(input.testEvent),
  };
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/pixel-deliveries", blob)) {
      void fetch("/api/pixel-deliveries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true });
    }
  } catch {
    // Pixel delivery logging must never block visitor navigation.
  }
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

export function trackView(song: SongPage, identity?: VisitorIdentityPayload) {
  const payload = {
    content_id: song.pixelEvents.contentId,
    content_name: song.pixelEvents.contentName,
    artist_name: song.pixelEvents.artistName,
    ...(identity ? {
      external_id: identity.external_id,
      event_id: identity.event_id,
      ttclid: identity.ttclid,
      _ttp: identity.ttp
    } : {})
  };
  if (new URLSearchParams(window.location.search).get("debugPixel") === "1") console.log("ttq exists:", Boolean(window.ttq), "tracking ViewContent:", payload);
  trackTikTok("ViewContent", payload);
  sendPixelDelivery(song, { provider: "tiktok", providerEventName: "ViewContent", internalEventType: "view_content", eventId: identity?.event_id, pixelId: song.trackingPixels?.tiktokPixelId, testEvent: Boolean(getTikTokTestCode()) });
  window.fbq?.("track", "ViewContent", { content_ids: [song.pixelEvents.contentId], content_name: song.pixelEvents.contentName, event_id: identity?.event_id, fbp: identity?.fbp, fbc: identity?.fbc }, identity?.event_id ? { eventID: identity.event_id } : undefined);
  sendPixelDelivery(song, { provider: "meta", providerEventName: "ViewContent", internalEventType: "view_content", eventId: identity?.event_id, pixelId: song.trackingPixels?.metaPixelId });
  window.gtag?.("event", "view_item", { song_slug: song.slug, song_title: song.title, artist: song.artist, event_id: identity?.event_id, session_id: identity?.session_id });
  sendPixelDelivery(song, { provider: "google_analytics", providerEventName: "view_item", internalEventType: "view_content", eventId: identity?.event_id, pixelId: song.trackingPixels?.gaMeasurementId });
}

export function trackPlatformClick(song: SongPage, link: SongLink, identity?: VisitorIdentityPayload) {
  const payload = {
    button_text: link.label,
    action: "platform_click",
    platform: link.platform,
    destination_url: link.url,
    content_id: song.slug,
    content_name: song.title,
    artist_name: song.artist,
    content_type: "platform_click",
    external_id: identity?.external_id,
    session_id: identity?.session_id,
    event_id: identity?.event_id,
    ttclid: identity?.ttclid,
    _ttp: identity?.ttp
  };
  if (new URLSearchParams(window.location.search).get("debugPixel") === "1") {
    console.log("ttq exists:", Boolean(window.ttq));
    console.log("tracking platform click:", payload);
  }
  try {
    trackTikTok("ClickButton", payload);
    sendPixelDelivery(song, { provider: "tiktok", providerEventName: "ClickButton", internalEventType: "platform_click", eventId: identity?.event_id, pixelId: song.trackingPixels?.tiktokPixelId, testEvent: Boolean(getTikTokTestCode()) });
    window.fbq?.("trackCustom", "MusicPlatformClick", { ...payload, fbp: identity?.fbp, fbc: identity?.fbc }, identity?.event_id ? { eventID: identity.event_id } : undefined);
    sendPixelDelivery(song, { provider: "meta", providerEventName: "MusicPlatformClick", internalEventType: "platform_click", eventId: identity?.event_id, pixelId: song.trackingPixels?.metaPixelId });
    window.gtag?.("event", "music_platform_click", payload);
    sendPixelDelivery(song, { provider: "google_analytics", providerEventName: "music_platform_click", internalEventType: "platform_click", eventId: identity?.event_id, pixelId: song.trackingPixels?.gaMeasurementId });
  } catch (error) { console.warn("Pixel tracking failed", error); }
  return payload;
}

export function trackUtility(song: SongPage, label: "Copy URL" | "Share" | "Embed", action: "copy_url" | "share" | "embed", identity?: VisitorIdentityPayload) {
  const payload = {
    button_text: label,
    action,
    content_id: song.slug,
    content_name: song.title,
    artist_name: song.artist,
    external_id: identity?.external_id,
    session_id: identity?.session_id,
    event_id: identity?.event_id,
    ttclid: identity?.ttclid,
    _ttp: identity?.ttp
  };
  if (new URLSearchParams(window.location.search).get("debugPixel") === "1") console.log(`tracking ${action}:`, payload);
  try {
    trackTikTok("ClickButton", payload);
    sendPixelDelivery(song, { provider: "tiktok", providerEventName: "ClickButton", internalEventType: action, eventId: identity?.event_id, pixelId: song.trackingPixels?.tiktokPixelId, testEvent: Boolean(getTikTokTestCode()) });
    window.fbq?.("trackCustom", "SmartLinkUtilityClick", { ...payload, fbp: identity?.fbp, fbc: identity?.fbc }, identity?.event_id ? { eventID: identity.event_id } : undefined);
    sendPixelDelivery(song, { provider: "meta", providerEventName: "SmartLinkUtilityClick", internalEventType: action, eventId: identity?.event_id, pixelId: song.trackingPixels?.metaPixelId });
    window.gtag?.("event", "smart_link_utility_click", payload);
    sendPixelDelivery(song, { provider: "google_analytics", providerEventName: "smart_link_utility_click", internalEventType: action, eventId: identity?.event_id, pixelId: song.trackingPixels?.gaMeasurementId });
  } catch (error) { console.warn("Pixel tracking failed", error); }
}
