import { notFound, redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export default async function LinkPageAnalytics({params}:{params:Promise<{workspace:string;linkPage:string}>}){const {workspace,linkPage}=await params;if(!await getWorkspaceContext(workspace))redirect("/login");const db=getSupabaseAdmin();const row=await db?.from("link_pages").select("id").eq("id",linkPage).eq("workspace_id",workspace).maybeSingle();if(!row?.data)notFound();return <AnalyticsDashboard workspaceId={workspace} linkPageId={linkPage}/>}
