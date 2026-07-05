import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongSmartLinkPage } from "@/components/SongSmartLinkPage";
import { TikTokPixelDebug } from "@/components/TikTokPixelDebug";
import { getSongBySlug } from "@/lib/songRepository";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ debugPixel?: string }> };

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

export default async function SongPageRoute({ params, searchParams }: Props) {
  const song = await getSongBySlug((await params).slug);
  if (!song) notFound();
  const tiktokPixelId = song.trackingPixels?.tiktokPixelId || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const debugPixel = (await searchParams).debugPixel === "1";
  return <>
    <SongSmartLinkPage song={song} />
    {debugPixel && <TikTokPixelDebug pixelId={tiktokPixelId} songTitle={song.title} />}
  </>;
}
