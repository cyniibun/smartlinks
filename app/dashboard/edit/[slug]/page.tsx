import { notFound } from "next/navigation";
import { SongEditor } from "@/components/admin/SongEditor";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSongBySlug } from "@/lib/songRepository";
export default async function DashboardEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const context = await getWorkspaceContext(); if (!context) return null;
  const song = await getSongBySlug((await params).slug, true, context.workspace.id); if (!song) notFound();
  return <SongEditor initialSong={song} />;
}
