import type { Metadata } from "next";
import { headers } from "next/headers";
import { PixelScripts } from "@/components/PixelScripts";
import { getSongBySlug } from "@/lib/songRepository";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://go.cyniicalaesthetic.productions"),
  title: { default: "Cyniical — Smart Links", template: "%s | Cyniical" },
  description: "Listen to Cyniical on your favorite music platform."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const slug = (await headers()).get("x-cyniical-song-slug");
  const song = slug ? await getSongBySlug(slug) : undefined;
  return <html lang="en"><body>
    {song && <PixelScripts tiktokPixelId={song.trackingPixels?.tiktokPixelId} metaPixelId={song.trackingPixels?.metaPixelId} gaMeasurementId={song.trackingPixels?.gaMeasurementId} />}
    {children}
  </body></html>;
}
