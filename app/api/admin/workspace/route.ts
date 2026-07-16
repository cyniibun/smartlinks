import { NextResponse } from "next/server";
import { canAdmin, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";
import { systemThemes } from "@/lib/themes";
import { DEFAULT_WORKSPACE_TIMEZONE, isValidTimeZone } from "@/lib/timezone";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clean = (value: unknown) => String(value || "").trim() || null;

export async function PATCH(request: Request) {
  const body = await request.json();
  const context = await getWorkspaceContext(body.workspaceId);
  if (!context || !canAdmin(context.role)) {
    return NextResponse.json({ error: "Only workspace owners, admins, and developers can update workspace settings." }, { status: 403 });
  }

  const name = String(body.name || "").trim();
  const slug = slugify(String(body.slug || name));
  const timezone = String(body.timezone || body.defaultTimezone || DEFAULT_WORKSPACE_TIMEZONE).trim();
  const market = String(body.defaultMarket || "US").trim().toUpperCase();
  const releaseThemeId = String(body.releaseDefaultThemeId || body.defaultThemeId || body.defaultTheme || "minimal-dark").trim();
  const displayThemeId = String(body.workspaceDisplayThemeId || "tonelink").trim();
  if (!name) return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Enter a valid workspace slug." }, { status: 400 });
  if (!/^[A-Z]{2}$/.test(market)) return NextResponse.json({ error: "Market must be a two-letter country code." }, { status: 400 });
  if (!isValidTimeZone(timezone)) return NextResponse.json({ error: "Choose a valid IANA timezone, such as America/New_York." }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable." }, { status: 500 });
  const currentResult = await db
    .from("workspaces")
    .select("release_default_theme_id,default_theme_id,workspace_display_theme_id,default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id")
    .eq("id", context.workspace.id)
    .single();
  if (currentResult.error) return genericApiError("workspace-settings:lookup-error", currentResult.error, { workspaceId: context.workspace.id }, 400, "Unable to load workspace settings.");

  const current = currentResult.data;
  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  const requestedPixels = {
    tiktok: clean(body.defaultTiktokPixelId),
    meta: clean(body.defaultMetaPixelId),
    ga: clean(body.defaultGaMeasurementId),
  };
  const pixelValuesChanged = requestedPixels.tiktok !== (current.default_tiktok_pixel_id || null)
    || requestedPixels.meta !== (current.default_meta_pixel_id || null)
    || requestedPixels.ga !== (current.default_ga_measurement_id || null);
  if (pixelValuesChanged && !(entitlements.features.standard_pixels || entitlements.developer)) {
    return NextResponse.json({ error: "Tracking pixels are available on Basic and Pro plans." }, { status: 403 });
  }

  const currentReleaseTheme = current.release_default_theme_id || current.default_theme_id || "minimal-dark";
  const currentDisplayTheme = current.workspace_display_theme_id || "tonelink";
  for (const [themeId, currentThemeId] of [[releaseThemeId, currentReleaseTheme], [displayThemeId, currentDisplayTheme]]) {
    if (themeId === currentThemeId) continue;
    const theme = await db.from("themes").select("workspace_id,is_system_theme").eq("id", themeId).maybeSingle();
    if (theme.error) return genericApiError("workspace-settings:theme-error", theme.error, { workspaceId: context.workspace.id, themeId }, 400, "Unable to validate theme selection.");
    const systemTheme = systemThemes.some((item) => item.id === themeId);
    if ((!theme.data && !systemTheme) || (theme.data && !theme.data.is_system_theme && theme.data.workspace_id !== context.workspace.id)) {
      return NextResponse.json({ error: "Selected theme is not available to this workspace." }, { status: 400 });
    }
    if (theme.data && !theme.data.is_system_theme && !(entitlements.features.custom_themes || entitlements.developer)) {
      return NextResponse.json({ error: "Custom themes are available on Pro." }, { status: 403 });
    }
  }

  const result = await db.from("workspaces").update({
    name,
    slug,
    timezone,
    default_timezone: timezone,
    default_market: market,
    default_theme: releaseThemeId,
    default_theme_id: releaseThemeId,
    release_default_theme_id: releaseThemeId,
    workspace_display_theme_id: displayThemeId,
    default_tiktok_pixel_id: requestedPixels.tiktok,
    default_meta_pixel_id: requestedPixels.meta,
    default_ga_measurement_id: requestedPixels.ga,
    updated_at: new Date().toISOString(),
  }).eq("id", context.workspace.id).select("id,name,slug,timezone,default_timezone,default_public_domain,default_market,default_theme,default_theme_id,release_default_theme_id,workspace_display_theme_id,default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").single();
  if (result.error) return genericApiError("workspace-settings:error", result.error, { workspaceId: context.workspace.id }, 400, "Unable to update workspace settings.");
  return NextResponse.json({ workspace: result.data });
}
