import { NextResponse } from "next/server";
import { canDelete, canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { getSupabaseAdmin } from "@/lib/supabase";
import { updateSmartLinkEditorPage } from "@/lib/linkPageEditor";

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}) {
  const body=await request.json();const context=await getWorkspaceContext(body.workspaceId);
  if(!context||!canManage(context.role))return NextResponse.json({error:"Forbidden"},{status:403});
  try {
    const page=await updateSmartLinkEditorPage((await params).id,context.workspace.id,body.page);
    console.info("[tone-link:edit-page]",{pageId:page.id,workspaceId:context.workspace.id,slug:page.slug,published:page.published});
    return NextResponse.json({page});
  } catch(error) {
    return genericApiError("edit-page:error", error, { pageId: (await params).id, workspaceId: context.workspace.id }, 400, "Unable to save Smart Link.");
  }
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const body=await request.json();const context=await getWorkspaceContext(body.workspaceId);if(!context||!canManage(context.role))return NextResponse.json({error:"Forbidden"},{status:403});const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable"},{status:500});const pageId=(await params).id;const result=await db.from("link_pages").update({published:Boolean(body.published),updated_at:new Date().toISOString()}).eq("id",pageId).eq("workspace_id",context.workspace.id).select("id,slug,published").single();if(result.error)return genericApiError("update-page:error",result.error,{pageId,workspaceId:context.workspace.id},400,"Unable to update Smart Link.");await db.from("releases").update({import_status:result.data.published?"published":"approved",updated_at:new Date().toISOString()}).eq("id",body.releaseId).eq("workspace_id",context.workspace.id);return NextResponse.json({page:result.data})}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}) {
  const workspaceId=new URL(request.url).searchParams.get("workspaceId")||undefined;
  const context=await getWorkspaceContext(workspaceId);
  if(!context||!canDelete(context.role))return NextResponse.json({error:"Only workspace owners and admins can delete link pages."},{status:403});
  const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable"},{status:500});
  const id=(await params).id;
  const existing=await db.from("link_pages").select("id,release_id").eq("id",id).eq("workspace_id",context.workspace.id).maybeSingle();
  if(existing.error)return genericApiError("delete-page:lookup:error",existing.error,{id,workspaceId:context.workspace.id},400,"Unable to delete Smart Link.");
  if(!existing.data)return NextResponse.json({error:"Link page not found."},{status:404});
  const deleted=await db.from("link_pages").delete().eq("id",id).eq("workspace_id",context.workspace.id);
  if(deleted.error)return genericApiError("delete-page:error",deleted.error,{id,workspaceId:context.workspace.id},400,"Unable to delete Smart Link.");
  console.info("[tone-link:delete-page]",{id,workspaceId:context.workspace.id,releaseId:existing.data.release_id});
  return NextResponse.json({deleted:true});
}
