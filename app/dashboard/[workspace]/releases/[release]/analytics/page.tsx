import { notFound, redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export default async function ReleaseAnalytics({params}:{params:Promise<{workspace:string;release:string}>}){const {workspace,release}=await params;if(!await getWorkspaceContext(workspace))redirect("/login");const db=getSupabaseAdmin();const row=await db?.from("releases").select("id").eq("id",release).eq("workspace_id",workspace).maybeSingle();if(!row?.data)notFound();return <AnalyticsDashboard workspaceId={workspace} releaseId={release}/>}
