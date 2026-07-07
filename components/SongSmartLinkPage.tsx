"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiCode, FiCopy, FiShare2 } from "react-icons/fi";
import type { SongPage } from "@/data/songs";
import { Background } from "@/components/Background";
import { EmbedModal } from "@/components/EmbedModal";
import { PlatformButton } from "@/components/PlatformButton";
import { UtilityButton } from "@/components/UtilityButton";
import { trackUtility, trackView } from "@/lib/tracking";
import { copyText } from "@/lib/copyText";

export function SongSmartLinkPage({ song }: { song: SongPage }) {
  const [copied, setCopied] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const links = useMemo(() => song.links.filter((link) => link.enabled).sort((a, b) => a.order - b.order), [song.links]);

  const sendInternalEvent = (eventType: string) => {
    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({ eventType, songSlug: song.slug, workspaceId: song.workspaceId, artistId: song.artistId,
      releaseId: song.releaseId, linkPageId: song.linkPageId, referrer: document.referrer, userAgent: navigator.userAgent,
      utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"), utmCampaign: params.get("utm_campaign"),
      utmContent: params.get("utm_content"), utmTerm: params.get("utm_term") });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
  };

  useEffect(() => {
    trackView(song);
    sendInternalEvent("page_view"); sendInternalEvent("view_content");
    // sendInternalEvent only depends on the immutable song prop for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song]);

  const copyUrl = async () => {
    trackUtility(song, "Copy URL", "copy_url");
    sendInternalEvent("copy_url");
    if (await copyText(window.location.href)) {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    }
  };
  const share = async () => {
    trackUtility(song, "Share", "share");
    sendInternalEvent("share");
    if (navigator.share) {
      try { await navigator.share({ title: `${song.title} by ${song.artist}`, text: `Listen to ${song.title} by ${song.artist}`, url: window.location.href }); } catch { /* share cancelled */ }
    } else if (await copyText(window.location.href)) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };
  const openEmbed = () => { trackUtility(song, "Embed", "embed"); sendInternalEvent("embed_click"); setEmbedOpen(true); };

  return <main className="smart-link-shell">
    <Background artworkUrl={song.backgroundImageUrl ?? song.artworkUrl} />
    <div className="content-wrap">
      <section className="hero-card">
        <div className="artwork-wrap"><Image src={song.artworkUrl} alt={`${song.title} cover artwork`} width={900} height={900} priority unoptimized /></div>
        <div className="hero-info">
        <div><h1>{song.title}</h1><p>{song.artist}</p>{song.labelName && <small className="release-label">{song.labelName}</small>}</div>
          <div className="utility-row">
            <UtilityButton label={copied ? "Copied" : "Copy URL"} icon={copied ? FiCheck : FiCopy} onClick={() => void copyUrl()} />
            <UtilityButton label="Embed" icon={FiCode} onClick={openEmbed} />
            <UtilityButton label="Share" icon={FiShare2} onClick={() => void share()} />
          </div>
        </div>
      </section>

      {(["listen", "watch", "buy", "podcast", "merch", "tickets", "other"] as const).map((section) => {
        const sectionLinks = links.filter((link) => link.section === section);
        if (!sectionLinks.length) return null;
        return <section className="link-section" key={section}>
          <div className="section-heading"><span>Choose your destination</span><h2>{section.charAt(0).toUpperCase() + section.slice(1)}</h2></div>
          <div className="platform-grid">{sectionLinks.map((link) => <PlatformButton key={`${link.platform}-${link.order}`} song={song} link={link} />)}</div>
        </section>;
      })}

      <footer><a href="https://tone-link.com">tone-link</a><p>{song.footerText || "Independent music, on your frequency."}</p></footer>
    </div>
    <EmbedModal song={song} open={embedOpen} onClose={() => setEmbedOpen(false)} />
  </main>;
}
