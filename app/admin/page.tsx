import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminNav } from "@/components/admin/AdminNav";
import { isAdmin } from "@/lib/adminAuth";
import { listSongs } from "@/lib/songRepository";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { SongPage } from "@/data/songs";

export default async function AdminPage() {
  if (!await isAdmin()) return <AdminLogin configured={Boolean(process.env.ADMIN_PASSWORD)} />;
  let songs: SongPage[] = []; let error = false;
  try { songs = await listSongs(true); } catch { error = true; }
  return <div className="admin-shell"><AdminNav /><AdminDashboard initialSongs={songs} databaseReady={hasSupabaseConfig() && !error} /></div>;
}
