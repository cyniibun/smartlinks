import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SongEditor } from "@/components/admin/SongEditor";
import { isAdmin } from "@/lib/adminAuth";
export default async function NewSongPage() { if (!await isAdmin()) redirect("/admin"); return <div className="admin-shell"><AdminNav /><SongEditor /></div>; }
