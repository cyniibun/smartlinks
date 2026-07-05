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

  useEffect(() => { trackView(song); }, [song]);

  const copyUrl = async (label = "Copy URL") => {
    if (await copyText(window.location.href)) {
      trackUtility(song, label); setCopied(true); setTimeout(() => setCopied(false), 1800);
    }
  };
  const share = async () => {
    trackUtility(song, "Share");
    if (navigator.share) {
      try { await navigator.share({ title: `${song.title} by ${song.artist}`, text: `Listen to ${song.title} by ${song.artist}`, url: window.location.href }); } catch { /* share cancelled */ }
    } else await copyUrl("Share fallback");
  };
  const openEmbed = () => { trackUtility(song, "Embed"); setEmbedOpen(true); };

  return <main className="smart-link-shell">
    <Background artworkUrl={song.backgroundImageUrl ?? song.artworkUrl} />
    <div className="content-wrap">
      <section className="hero-card">
        <div className="artwork-wrap"><Image src={song.artworkUrl} alt={`${song.title} cover artwork`} width={900} height={900} priority /></div>
        <div className="hero-info">
          <div><span className="eyebrow">CYNiiCAL AESTHETIC PRESENTS</span><h1>{song.title}</h1><p>{song.artist}</p></div>
          <div className="utility-row">
            <UtilityButton label={copied ? "Copied" : "Copy URL"} icon={copied ? FiCheck : FiCopy} onClick={() => void copyUrl()} />
            <UtilityButton label="Embed" icon={FiCode} onClick={openEmbed} />
            <UtilityButton label="Share" icon={FiShare2} onClick={() => void share()} />
          </div>
        </div>
      </section>

      {(["listen", "buy"] as const).map((section) => {
        const sectionLinks = links.filter((link) => link.section === section);
        if (!sectionLinks.length) return null;
        return <section className="link-section" key={section}>
          <div className="section-heading"><span>{section === "listen" ? "Choose your platform" : "Own the track"}</span><h2>{section === "listen" ? "Listen" : "Buy"}</h2></div>
          <div className="platform-grid">{sectionLinks.map((link) => <PlatformButton key={`${link.platform}-${link.order}`} song={song} link={link} />)}</div>
        </section>;
      })}

      <footer><a href="https://cyniicalaesthetic.productions">CYNiiCAL AESTHETIC <span>×</span> PRODUCTIONS</a><p>Independent music, on your frequency.</p></footer>
    </div>
    <EmbedModal song={song} open={embedOpen} onClose={() => setEmbedOpen(false)} />
  </main>;
}
