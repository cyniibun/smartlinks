import { NextResponse } from "next/server";
import { canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { validateHeadEntries } from "@/lib/headEntries";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isSafeHttpsUrl, validateDestinationUrl } from "@/lib/validation/platformUrls";
const asStringArray=(value:unknown)=>Array.isArray(value)?value.map(item=>String(item).trim()).filter(Boolean):[];
const validSlugPattern=(value:string)=>["{title}","{artist}-{title}"].includes(value);
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function safeHex(value:unknown){const next=String(value||"").trim();return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(next)?next:null}

function optionalSafeUrl(value: unknown, label: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const validation = isSafeHttpsUrl(raw);
  if (!validation.ok) throw new Error(`${label}: ${validation.error}`);
  return validation.normalizedUrl;
}

function optionalPlatformUrl(platform: string, value: unknown, label: string, allowGeneric = false) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const validation = validateDestinationUrl(platform, raw, { allowGeneric });
  if (!validation.ok) throw new Error(`${label}: ${validation.error}`);
  return validation.normalizedUrl;
}

function normalizeBioLinkSections(value: unknown, allowBioLinks: boolean, allowGeneric: boolean) {
  if (!Array.isArray(value)) return [];
  if (value.length && !allowBioLinks) throw new Error("Bio links are available on Pro.");
  return value.map((section) => {
    if (!section || typeof section !== "object") return section;
    const next = { ...(section as Record<string, unknown>) };
    for (const key of ["url", "href", "destinationUrl"]) {
      if (typeof next[key] === "string" && next[key]) {
        const validation = validateDestinationUrl(String(next.platform || "other"), String(next[key]), { allowGeneric });
        if (!validation.ok) throw new Error(`Bio link ${key}: ${validation.error}`);
        next[key] = validation.normalizedUrl;
      }
    }
    return next;
  });
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const body=await request.json();const context=await getWorkspaceContext(body.workspaceId);
  if(!context||!canManage(context.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Supabase unavailable"},{status:500});
  try {
    const entitlements=await getWorkspaceEntitlements(context.workspace.id,context.user,context.role);
    const canStandardPixels=entitlements.features.standard_pixels||entitlements.developer;
    const canBioPages=entitlements.features.bio_pages||entitlements.developer;
    const canHeaderInjection=entitlements.features.header_injection||entitlements.developer;
    const allowGeneric=entitlements.features.custom_destinations||entitlements.developer;
    const slugPattern=String(body.defaultSlugPattern||"{title}").trim();
    if(!validSlugPattern(slugPattern))return NextResponse.json({error:"Slug pattern must be {title} or {artist}-{title}."},{status:400});
    const wantsBioLink=Boolean(body.bioLinkEnabled);
    if(wantsBioLink&&!canBioPages)return NextResponse.json({error:"Bio links are available on Pro."},{status:403});
    if((String(body.tiktokPixelId||"").trim()||String(body.metaPixelId||"").trim()||String(body.gaMeasurementId||"").trim())&&!canStandardPixels)return NextResponse.json({error:"Tracking pixels are available on Basic and Pro plans."},{status:403});
    const headEntries=validateHeadEntries(body.headEntries);
    if(headEntries.length&&!canHeaderInjection)return NextResponse.json({error:"Header injection requires Pro."},{status:403});
    const name=String(body.name||"").trim();const slug=slugify(String(body.slug||name));const bioLinkSlug=slugify(String(body.bioLinkSlug||slug));
    const allowed={name,image_url:optionalSafeUrl(body.imageUrl,"Image URL"),slug:slug||null,brand_color:safeHex(body.brandColor),status:["active","inactive","archived"].includes(String(body.status))?String(body.status):"active",default_label_name:body.defaultLabelName||null,default_tiktok_pixel_id:body.tiktokPixelId||null,default_meta_pixel_id:body.metaPixelId||null,default_ga_measurement_id:body.gaMeasurementId||null,default_head_entries:headEntries,default_theme_id:String(body.defaultThemeId||"").trim()||null,default_platform_order:asStringArray(body.defaultPlatformOrder),default_enabled_platforms:asStringArray(body.defaultEnabledPlatforms),default_footer_text:String(body.defaultFooterText||"").trim()||null,default_slug_pattern:slugPattern,bio:body.bio||null,website_url:optionalSafeUrl(body.websiteUrl,"Website"),instagram_url:optionalSafeUrl(body.instagramUrl,"Instagram"),tiktok_url:optionalSafeUrl(body.tiktokUrl,"TikTok"),youtube_url:optionalPlatformUrl("youtube",body.youtubeUrl,"YouTube"),spotify_artist_url:optionalPlatformUrl("spotify",body.spotifyArtistUrl,"Spotify artist URL"),apple_artist_url:optionalPlatformUrl("apple_music",body.appleArtistUrl,"Apple artist URL"),bio_link_enabled:wantsBioLink,bio_link_slug:bioLinkSlug||null,bio_link_theme_id:String(body.bioLinkThemeId||"").trim()||null,bio_link_sections:normalizeBioLinkSections(body.bioLinkSections,canBioPages,allowGeneric),updated_at:new Date().toISOString()};
    const artistId=(await params).id;const result=await db.from("artists").update(allowed).eq("id",artistId).eq("workspace_id",context.workspace.id).select().single();
    if(result.error)return genericApiError("artist:update:error",result.error,{artistId,workspaceId:context.workspace.id},400,"Unable to update artist.");
    return NextResponse.json({artist:result.data});
  } catch(error) {
    return genericApiError("artist:update:validation",error,{workspaceId:context.workspace.id},400,"Unable to update artist.");
  }
}
