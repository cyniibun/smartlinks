import type { Metadata } from "next";
import { PixelScripts } from "@/components/PixelScripts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://go.cyniicalaesthetic.productions"),
  title: { default: "Cyniical — Smart Links", template: "%s | Cyniical" },
  description: "Listen to Cyniical on your favorite music platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PixelScripts />{children}</body></html>;
}
