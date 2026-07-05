"use client";

import type { MouseEvent } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import type { SongLink, SongPage } from "@/data/songs";
import { PlatformIcon } from "@/lib/platformIcons";
import { trackPlatformClick } from "@/lib/tracking";

export function PlatformButton({ song, link }: { song: SongPage; link: SongLink }) {
  const handlePlatformClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    trackPlatformClick(song, link);
    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      songSlug: song.slug, songTitle: song.title, platform: link.platform,
      destinationUrl: link.url, referrer: document.referrer,
      userAgent: navigator.userAgent, timestamp: new Date().toISOString(),
      utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign")
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/click", new Blob([payload], { type: "application/json" }));
    else void fetch("/api/click", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
    setTimeout(() => { window.location.href = link.url; }, 150);
  };

  return <a className={`platform-button platform-${link.platform}`} href={link.url} onClick={handlePlatformClick} aria-label={`${link.section === "buy" ? "Buy" : "Listen on"} ${link.label}`}>
    <span className="platform-icon"><PlatformIcon platform={link.platform} label={link.label} /></span>
    <span className="platform-label">{link.label}</span>
    <FiArrowUpRight className="platform-arrow" aria-hidden="true" />
  </a>;
}
