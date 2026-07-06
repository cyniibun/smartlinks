import { notFound,redirect } from "next/navigation";
import { LinkPageDetail } from "@/components/admin/LinkPageDetail";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export default async function LinkPagePage({params,searchParams}:{params:Promise<{workspace:string;linkPage:string}>;searchParams:Promise<{created?:string}>}){const{workspace,linkPage}=await params;if(!await getWorkspaceContext(workspace))redirect("/login");const db=getSupabaseAdmin();const result=await db?.from("link_pages").select("id,release_id,slug,title,artist_display_name,published,page_links(id,platform,label,url,section)").eq("id",linkPage).eq("workspace_id",workspace).maybeSingle();if(!result?.data)notFound();return <LinkPageDetail workspaceId={workspace} page={result.data} created={(await searchParams).created==="1"}/>}
