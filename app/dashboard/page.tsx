import { redirect } from "next/navigation";
import { LinkPagesList } from "@/components/admin/LinkPagesList";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export default async function DashboardPage(){const context=await getWorkspaceContext();if(!context)redirect("/login");const db=getSupabaseAdmin();const result=await db?.from("link_pages").select("id,slug,title,artist_display_name,artwork_url,published,page_type,created_at").eq("workspace_id",context.workspace.id).order("created_at",{ascending:false});return <main className="admin-main"><LinkPagesList workspaceId={context.workspace.id} pages={result?.data||[]}/></main>}
