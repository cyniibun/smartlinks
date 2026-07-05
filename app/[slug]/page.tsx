import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongSmartLinkPage } from "@/components/SongSmartLinkPage";
import { songs } from "@/data/songs";
import { getSong } from "@/lib/getSong";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return songs.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const song = getSong((await params).slug);
  if (!song) return { title: "Song not found" };
  return {
    title: song.seo.title,
    description: song.seo.description,
    alternates: { canonical: song.canonicalUrl },
    openGraph: { title: song.seo.title, description: song.seo.description, url: song.canonicalUrl, type: "music.song", images: [{ url: song.seo.ogImage, width: 1200, height: 1200, alt: `${song.title} by ${song.artist}` }] },
    twitter: { card: "summary_large_image", title: song.seo.title, description: song.seo.description, images: [song.seo.ogImage] }
  };
}

export default async function SongPageRoute({ params }: Props) {
  const song = getSong((await params).slug);
  if (!song) notFound();
  return <SongSmartLinkPage song={song} />;
}
