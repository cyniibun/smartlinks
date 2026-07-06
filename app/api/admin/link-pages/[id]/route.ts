import { NextResponse } from "next/server";
import { canDelete, canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const body=await request.json();const context=await getWorkspaceContext(body.workspaceId);if(!context||!canManage(context.role))return NextResponse.json({error:"Forbidden"},{status:403});const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable"},{status:500});const result=await db.from("link_pages").update({published:Boolean(body.published),updated_at:new Date().toISOString()}).eq("id",(await params).id).eq("workspace_id",context.workspace.id).select("id,slug,published").single();if(result.error){console.error("[tone-link:update-page:error]",result.error.message);return NextResponse.json({error:result.error.message},{status:400})}await db.from("releases").update({import_status:result.data.published?"published":"approved",updated_at:new Date().toISOString()}).eq("id",body.releaseId).eq("workspace_id",context.workspace.id);return NextResponse.json({page:result.data})}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}) {
  const workspaceId=new URL(request.url).searchParams.get("workspaceId")||undefined;
  const context=await getWorkspaceContext(workspaceId);
  if(!context||!canDelete(context.role))return NextResponse.json({error:"Only workspace owners and admins can delete link pages."},{status:403});
  const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable"},{status:500});
  const id=(await params).id;
  const existing=await db.from("link_pages").select("id,release_id").eq("id",id).eq("workspace_id",context.workspace.id).maybeSingle();
  if(existing.error)return NextResponse.json({error:existing.error.message},{status:400});
  if(!existing.data)return NextResponse.json({error:"Link page not found."},{status:404});
  const deleted=await db.from("link_pages").delete().eq("id",id).eq("workspace_id",context.workspace.id);
  if(deleted.error){console.error("[tone-link:delete-page:error]",{id,message:deleted.error.message});return NextResponse.json({error:deleted.error.message},{status:400})}
  console.info("[tone-link:delete-page]",{id,workspaceId:context.workspace.id,releaseId:existing.data.release_id});
  return NextResponse.json({deleted:true});
}
