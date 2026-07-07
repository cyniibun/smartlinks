import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_WORKSPACE_TIMEZONE, isValidTimeZone } from "@/lib/timezone";

const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export async function PATCH(request:Request) {
  const body=await request.json();const context=await getWorkspaceContext(body.workspaceId);
  if(!context||!["owner","admin"].includes(context.role))return NextResponse.json({error:"Only workspace owners and admins can update workspace settings."},{status:403});
  const name=String(body.name||"").trim();const slug=slugify(String(body.slug||name));const timezone=String(body.timezone||body.defaultTimezone||DEFAULT_WORKSPACE_TIMEZONE).trim();const market=String(body.defaultMarket||"US").trim().toUpperCase();const theme=String(body.defaultTheme||"minimal").trim().toLowerCase();
  if(!name)return NextResponse.json({error:"Workspace name is required."},{status:400});if(!slug)return NextResponse.json({error:"Enter a valid workspace slug."},{status:400});if(!/^[A-Z]{2}$/.test(market))return NextResponse.json({error:"Market must be a two-letter country code."},{status:400});if(!isValidTimeZone(timezone))return NextResponse.json({error:"Choose a valid IANA timezone, such as America/New_York."},{status:400});
  const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable."},{status:500});
  const result=await db.from("workspaces").update({name,slug,timezone,default_timezone:timezone,default_market:market,default_theme:theme,default_theme_id:String(body.defaultThemeId||body.defaultTheme||"minimal-dark").trim(),default_tiktok_pixel_id:String(body.defaultTiktokPixelId||"").trim()||null,default_meta_pixel_id:String(body.defaultMetaPixelId||"").trim()||null,default_ga_measurement_id:String(body.defaultGaMeasurementId||"").trim()||null,updated_at:new Date().toISOString()}).eq("id",context.workspace.id).select("id,name,slug,timezone,default_timezone,default_public_domain,default_market,default_theme,default_theme_id,default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").single();
  if(result.error){console.error("[tone-link:workspace-settings:error]",result.error.message);return NextResponse.json({error:result.error.message},{status:400})}
  return NextResponse.json({workspace:result.data});
}
