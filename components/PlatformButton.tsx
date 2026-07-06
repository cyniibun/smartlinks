"use client";

import type { MouseEvent } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import type { SongLink, SongPage } from "@/data/songs";
import { PlatformIcon } from "@/lib/platformIcons";
import { trackPlatformClick } from "@/lib/tracking";

const TRACKING_REDIRECT_DELAY_MS = 600;

export function PlatformButton({ song, link }: { song: SongPage; link: SongLink }) {
  const handlePlatformClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    trackPlatformClick(song, link);
    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      songSlug: song.slug, songTitle: song.title, workspaceId: song.workspaceId, artistId: song.artistId,
      releaseId: song.releaseId, linkPageId: song.linkPageId, platform: link.platform, eventType: "platform_click",
      destinationUrl: link.url, referrer: document.referrer,
      userAgent: navigator.userAgent, timestamp: new Date().toISOString(),
      utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"), utmContent: params.get("utm_content"), utmTerm: params.get("utm_term")
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
