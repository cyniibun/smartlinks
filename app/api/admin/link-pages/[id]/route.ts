import { NextResponse } from "next/server";
import { canDelete, canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { getWorkspaceEntitlements, requiredFeatureForReleaseType } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";
import { updateSmartLinkEditorPage } from "@/lib/linkPageEditor";
import { validateDestinationUrl } from "@/lib/validation/platformUrls";

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}) {
  const body=await request.json();const context=await getWorkspaceContext(body.workspaceId);
  if(!context||!canManage(context.role))return NextResponse.json({error:"Forbidden"},{status:403});
  try {
    const entitlements=await getWorkspaceEntitlements(context.workspace.id,context.user,context.role);
    const requestedHeadEntries=Array.isArray(body.page?.headEntries)?body.page.headEntries:[];
    if(requestedHeadEntries.length&&!(entitlements.features.header_injection||entitlements.developer))return NextResponse.json({error:"Header injection requires Pro."},{status:403});
    if((String(body.page?.tiktokPixelId||"").trim()||String(body.page?.metaPixelId||"").trim()||String(body.page?.gaMeasurementId||"").trim())&&!(entitlements.features.standard_pixels||entitlements.developer))return NextResponse.json({error:"Tracking pixels are available on Basic and Pro plans."},{status:403});
    if((body.page?.showToneLinkHeader===false||body.page?.showPoweredByFooter===false)&&!(entitlements.features.remove_branding||entitlements.developer))return NextResponse.json({error:"Removing ToneLink branding requires Pro."},{status:403});
    if(Boolean(body.page?.themeOverride)&&!(entitlements.features.custom_themes||entitlements.developer))return NextResponse.json({error:"Per-link theme customization requires Pro."},{status:403});
    const page=await updateSmartLinkEditorPage((await params).id,context.workspace.id,body.page,{allowGenericDestinations:entitlements.features.custom_destinations||entitlements.developer,allowHeaderInjection:entitlements.features.header_injection||entitlements.developer});
    console.info("[tone-link:edit-page]",{pageId:page.id,workspaceId:context.workspace.id,slug:page.slug,published:page.published});
    return NextResponse.json({page});
  } catch(error) {
    return genericApiError("edit-page:error", error, { pageId: (await params).id, workspaceId: context.workspace.id }, 400, "Unable to save Smart Link.");
  }
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const body=await request.json();const context=await getWorkspaceContext(body.workspaceId);
  if(!context||!canManage(context.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable"},{status:500});
  const pageId=(await params).id;
  const entitlements=await getWorkspaceEntitlements(context.workspace.id,context.user,context.role);
  if(Boolean(body.published)) {
    const existing=await db.from("link_pages").select("head_entries,tiktok_pixel_id,meta_pixel_id,ga_measurement_id,layout_settings,page_links(platform,label,url),releases(release_type)").eq("id",pageId).eq("workspace_id",context.workspace.id).maybeSingle();
    if(existing.error)return genericApiError("publish-page:lookup:error",existing.error,{pageId,workspaceId:context.workspace.id},400,"Unable to publish Smart Link.");
    const row=existing.data as {head_entries?:unknown[];tiktok_pixel_id?:string|null;meta_pixel_id?:string|null;ga_measurement_id?:string|null;layout_settings?:{themeMode?:string;themeOverride?:unknown;branding?:{showToneLinkHeader?:boolean;showPoweredByFooter?:boolean}};page_links?:Array<{platform:string;label:string;url:string}>;releases?:{release_type?:string}|Array<{release_type?:string}>|null}|null;
    if(!row)return NextResponse.json({error:"Smart Link not found."},{status:404});
    if(Array.isArray(row.head_entries)&&row.head_entries.length&&!(entitlements.features.header_injection||entitlements.developer))return NextResponse.json({error:"Header injection requires Pro."},{status:403});
    if((row.tiktok_pixel_id||row.meta_pixel_id||row.ga_measurement_id)&&!(entitlements.features.standard_pixels||entitlements.developer))return NextResponse.json({error:"Tracking pixels are available on Basic and Pro plans."},{status:403});
    if((row.layout_settings?.branding?.showToneLinkHeader===false||row.layout_settings?.branding?.showPoweredByFooter===false)&&!(entitlements.features.remove_branding||entitlements.developer))return NextResponse.json({error:"Removing ToneLink branding requires Pro."},{status:403});
    if((row.layout_settings?.themeMode==="override"||Boolean(row.layout_settings?.themeOverride))&&!(entitlements.features.custom_themes||entitlements.developer))return NextResponse.json({error:"Per-link theme customization requires Pro."},{status:403});
    const release=Array.isArray(row.releases)?row.releases[0]:row.releases;
    const requiredFeature=requiredFeatureForReleaseType(release?.release_type);
    if(requiredFeature&&!entitlements.features[requiredFeature]&&!entitlements.developer)return NextResponse.json({error:`${String(release?.release_type||"This page type").replaceAll("_"," ")} requires an upgraded plan.`},{status:403});
    for(const link of row.page_links||[]) {
      const validation=validateDestinationUrl(link.platform,link.url,{allowGeneric:entitlements.features.custom_destinations||entitlements.developer});
      if(!validation.ok)return NextResponse.json({error:`${link.label||link.platform}: ${validation.error}`},{status:400});
    }
  }
  const result=await db.from("link_pages").update({published:Boolean(body.published),updated_at:new Date().toISOString()}).eq("id",pageId).eq("workspace_id",context.workspace.id).select("id,slug,published").single();
  if(result.error)return genericApiError("update-page:error",result.error,{pageId,workspaceId:context.workspace.id},400,"Unable to update Smart Link.");
  await db.from("releases").update({import_status:result.data.published?"published":"approved",updated_at:new Date().toISOString()}).eq("id",body.releaseId).eq("workspace_id",context.workspace.id);
  return NextResponse.json({page:result.data});
}

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
