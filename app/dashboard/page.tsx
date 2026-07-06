import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { listSongs } from "@/lib/songRepository";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { SongPage } from "@/data/songs";
export default async function DashboardPage() {
  const context = await getWorkspaceContext(); if (!context) return null;
  let songs: SongPage[] = []; let error = false; try { songs = await listSongs(true, context.workspace.id); } catch { error = true; }
  return <AdminDashboard initialSongs={songs} databaseReady={hasSupabaseConfig() && !error} />;
}
