"use client";

import type { MouseEvent } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import type { SongLink, SongPage } from "@/data/songs";
import { PlatformIcon } from "@/lib/platformIcons";
import { trackPlatformClick } from "@/lib/tracking";
import { getVisitorIdentity } from "@/lib/analytics/visitor";

const TRACKING_REDIRECT_DELAY_MS = 600;

export function PlatformButton({ song, link }: { song: SongPage; link: SongLink }) {
  const handlePlatformClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const identity = getVisitorIdentity();
    trackPlatformClick(song, link, identity);
    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      songSlug: song.slug, songTitle: song.title, workspaceId: song.workspaceId, artistId: song.artistId,
      releaseId: song.releaseId, linkPageId: song.linkPageId, platform: link.platform, eventType: "platform_click",
      destinationUrl: link.url, referrer: document.referrer,
      userAgent: navigator.userAgent, timestamp: new Date().toISOString(),
      visitorId: identity.visitor_id, externalId: identity.external_id, sessionId: identity.session_id,
      clickIds: identity.click_ids, ttclid: identity.ttclid, fbclid: identity.fbclid, gclid: identity.gclid,
      msclkid: identity.msclkid, twclid: identity.twclid, liFatId: identity.li_fat_id,
      utmSource: identity.utm_source, utmMedium: identity.utm_medium,
      utmCampaign: identity.utm_campaign, utmContent: identity.utm_content, utmTerm: identity.utm_term,
      normalizedReferrer: identity.normalized_referrer, marketingCookies: identity.marketing_cookies,
      eventId: identity.event_id, eventTimestamp: identity.event_timestamp
    });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon("/api/click", new Blob([payload], { type: "application/json" }));
      else void fetch("/api/click", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
    } catch { /* Redirect still proceeds if internal analytics is unavailable. */ }
    if (params.get("debugPixel") === "1") console.log("redirecting after delay:", link.url);
    setTimeout(() => { window.location.assign(link.url); }, TRACKING_REDIRECT_DELAY_MS);
  };

  return <button type="button" className={`platform-button platform-${link.platform}`} onClick={handlePlatformClick} aria-label={`${link.section === "buy" ? "Buy" : "Listen on"} ${link.label}`}>
    <span className="platform-icon"><PlatformIcon platform={link.platform} label={link.label} /></span>
    <span className="platform-label">{link.label}</span>
    <FiArrowUpRight className="platform-arrow" aria-hidden="true" />
  </button>;
}
