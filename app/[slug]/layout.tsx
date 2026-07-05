import type { ReactNode } from "react";
import { HeadEntries } from "@/components/HeadEntries";
import { getSongBySlug } from "@/lib/songRepository";

export default async function SongLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const song = await getSongBySlug((await params).slug);
  if (!song) return children;
  return <>
    <HeadEntries entries={song.headEntries} />
    {children}
  </>;
}
