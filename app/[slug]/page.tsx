import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongSmartLinkPage } from "@/components/SongSmartLinkPage";
import { PixelScripts } from "@/components/PixelScripts";
import { HeadEntries } from "@/components/HeadEntries";
import { getSongBySlug } from "@/lib/songRepository";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const song = await getSongBySlug((await params).slug);
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
  const song = await getSongBySlug((await params).slug);
  if (!song) notFound();
  return <>
    <HeadEntries entries={song.headEntries} />
    <PixelScripts
      tiktokPixelId={song.trackingPixels?.tiktokPixelId}
      metaPixelId={song.trackingPixels?.metaPixelId}
      gaMeasurementId={song.trackingPixels?.gaMeasurementId}
    />
    <SongSmartLinkPage song={song} />
  </>;
}
