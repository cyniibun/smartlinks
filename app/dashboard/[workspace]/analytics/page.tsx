import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export default async function WorkspaceAnalytics({params}:{params:Promise<{workspace:string}>}){const id=(await params).workspace;if(!await getWorkspaceContext(id))redirect("/login");const db=getSupabaseAdmin();const [artists,links]=db?await Promise.all([db.from("artists").select("id,name").eq("workspace_id",id).order("name").limit(100),db.from("link_pages").select("id,title,slug").eq("workspace_id",id).order("updated_at",{ascending:false}).limit(250)]):[{data:[]},{data:[]}];return <AnalyticsDashboard workspaceId={id} artists={artists.data||[]} linkPages={links.data||[]}/>}
