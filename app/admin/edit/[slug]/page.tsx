import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SongEditor } from "@/components/admin/SongEditor";
import { isAdmin } from "@/lib/adminAuth";
import { getSongBySlug } from "@/lib/songRepository";
export default async function EditSongPage({ params }: { params: Promise<{ slug: string }> }) { if (!await isAdmin()) redirect("/admin"); const song = await getSongBySlug((await params).slug, true); if (!song) notFound(); return <div className="admin-shell"><AdminNav /><SongEditor initialSong={song} /></div>; }
