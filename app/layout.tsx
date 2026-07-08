import type { Metadata } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { PixelScripts } from "@/components/PixelScripts";
import { getSongBySlug } from "@/lib/songRepository";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://link.tone-link.com"),
  title: { default: "tone-link — Music Marketing OS", template: "%s | tone-link" },
  description: "Choose your preferred platform and listen to your favorite releases."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const slug = (await headers()).get("x-cyniical-song-slug");
  const song = slug ? await getSongBySlug(slug) : undefined;
  return <html lang="en"><body>
    {song && <PixelScripts tiktokPixelId={song.trackingPixels?.tiktokPixelId} metaPixelId={song.trackingPixels?.metaPixelId} gaMeasurementId={song.trackingPixels?.gaMeasurementId} />}
    {children}
    <Analytics />
  </body></html>;
}
