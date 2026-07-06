import { redirect } from "next/navigation";
import { LinkPagesList } from "@/components/admin/LinkPagesList";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export default async function SmartLinksPage({params}:{params:Promise<{workspace:string}>}){const id=(await params).workspace;if(!await getWorkspaceContext(id))redirect("/login");const db=getSupabaseAdmin();const result=await db?.from("link_pages").select("id,slug,title,artist_display_name,artwork_url,published,page_type,created_at").eq("workspace_id",id).order("created_at",{ascending:false});return <main className="admin-main"><LinkPagesList workspaceId={id} pages={result?.data||[]}/></main>}
