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
import { minimalDarkTheme, themeCssVars } from "@/lib/themes";
import { getVisitorIdentity, type VisitorIdentityPayload } from "@/lib/analytics/visitor";

export function SongSmartLinkPage({ song }: { song: SongPage }) {
  const [copied, setCopied] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const links = useMemo(() => song.links.filter((link) => link.enabled).sort((a, b) => a.order - b.order), [song.links]);

  const sendInternalEvent = (eventType: string, identity: VisitorIdentityPayload = getVisitorIdentity()) => {
    const payload = JSON.stringify({ eventType, songSlug: song.slug, workspaceId: song.workspaceId, artistId: song.artistId,
      releaseId: song.releaseId, linkPageId: song.linkPageId, referrer: document.referrer, userAgent: navigator.userAgent,
      visitorId: identity.visitor_id, externalId: identity.external_id, sessionId: identity.session_id,
      clickIds: identity.click_ids, ttclid: identity.ttclid, fbclid: identity.fbclid, gclid: identity.gclid,
      msclkid: identity.msclkid, twclid: identity.twclid, liFatId: identity.li_fat_id,
      utmSource: identity.utm_source, utmMedium: identity.utm_medium, utmCampaign: identity.utm_campaign,
      utmContent: identity.utm_content, utmTerm: identity.utm_term, normalizedReferrer: identity.normalized_referrer,
      marketingCookies: identity.marketing_cookies, eventId: identity.event_id, eventTimestamp: identity.event_timestamp });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
  };

  useEffect(() => {
    const viewIdentity = getVisitorIdentity();
    trackView(song, viewIdentity);
    sendInternalEvent("page_view", viewIdentity); sendInternalEvent("view_content");
    // sendInternalEvent only depends on the immutable song prop for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song]);

  const copyUrl = async () => {
    const identity = getVisitorIdentity();
    trackUtility(song, "Copy URL", "copy_url", identity);
    sendInternalEvent("copy_url", identity);
    if (await copyText(window.location.href)) {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    }
  };
  const share = async () => {
    const identity = getVisitorIdentity();
    trackUtility(song, "Share", "share", identity);
    sendInternalEvent("share", identity);
    if (navigator.share) {
      try { await navigator.share({ title: `${song.title} by ${song.artist}`, text: `Listen to ${song.title} by ${song.artist}`, url: window.location.href }); } catch { /* share cancelled */ }
    } else if (await copyText(window.location.href)) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };
  const openEmbed = () => { const identity = getVisitorIdentity(); trackUtility(song, "Embed", "embed", identity); sendInternalEvent("embed_click", identity); setEmbedOpen(true); };

  const theme = song.theme || minimalDarkTheme;
  return <main className={`smart-link-shell theme-${theme.backgroundStyle} density-${theme.layoutDensity} buttons-${theme.buttonStyle} artwork-${theme.artworkSize} type-${theme.typographyScale} hero-${theme.heroLayout} mobile-hero-${theme.mobileHeroLayout}`} style={themeCssVars(theme)}>
    <Background artworkUrl={song.backgroundImageUrl ?? song.artworkUrl} />
    {song.showToneLinkHeader !== false && <header className="public-brand-header"><a href="https://tone-link.com">tone-link</a></header>}
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

      {theme.footerVisible && song.showPoweredByFooter !== false && <footer><span className="powered-by">Powered by</span><a href="https://tone-link.com">tone-link</a>{song.footerText && <p>{song.footerText}</p>}</footer>}
    </div>
    <EmbedModal song={song} open={embedOpen} onClose={() => setEmbedOpen(false)} />
  </main>;
}
