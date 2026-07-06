import { notFound, redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export default async function ArtistAnalytics({params}:{params:Promise<{workspace:string;artist:string}>}){const {workspace,artist}=await params;if(!await getWorkspaceContext(workspace))redirect("/login");const db=getSupabaseAdmin();const row=await db?.from("artists").select("id").eq("id",artist).eq("workspace_id",workspace).maybeSingle();if(!row?.data)notFound();return <AnalyticsDashboard workspaceId={workspace} artistId={artist}/>}
