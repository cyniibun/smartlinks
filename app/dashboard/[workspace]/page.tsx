import { notFound, redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getCurrentUser } from "@/lib/adminAuth";
import { listSongs } from "@/lib/songRepository";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
export default async function WorkspaceDashboardPage({ params }: { params: Promise<{ workspace: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const id = (await params).workspace; const admin = getSupabaseAdmin(); if (!admin) notFound();
  const membership = await admin.from("workspace_members").select("workspace_id").eq("workspace_id", id).eq("user_id", user.id).maybeSingle();
  if (!membership.data) notFound();
  const songs = await listSongs(true, id);
  return <AdminDashboard initialSongs={songs} databaseReady={hasSupabaseConfig()} />;
}
