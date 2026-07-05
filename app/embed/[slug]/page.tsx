import Image from "next/image";
import { notFound } from "next/navigation";
import { PlatformButton } from "@/components/PlatformButton";
import { getSong } from "@/lib/getSong";

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const song = getSong((await params).slug);
  if (!song) notFound();
  const links = song.links.filter((link) => link.enabled && link.section === "listen").sort((a, b) => a.order - b.order).slice(0, 4);
  return <main className="embed-page"><div className="embed-card"><Image src={song.artworkUrl} alt="" width={220} height={220} /><div><span className="eyebrow">LISTEN NOW</span><h1>{song.title}</h1><p>{song.artist}</p><div className="embed-links">{links.map((link) => <PlatformButton key={link.platform} song={song} link={link} />)}</div></div></div></main>;
}
