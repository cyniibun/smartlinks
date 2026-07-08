import { NextResponse } from "next/server";
import { canAdmin, canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";
import { minimalDarkTheme, resolveThemeSettings, systemThemes } from "@/lib/themes";

const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ themes: systemThemes, entitlements });

  const result = await db
    .from("themes")
    .select("*")
    .or(`is_system_theme.eq.true,workspace_id.eq.${context.workspace.id}`)
    .order("is_system_theme", { ascending: false })
    .order("name");

  if (result.error) return genericApiError("themes:list:error", result.error, { workspaceId: context.workspace.id }, 500, "Unable to load themes.");
  return NextResponse.json({ themes: result.data, entitlements });
}

export async function POST(request: Request) {
  const body = await request.json();
  const context = await getWorkspaceContext(body.workspaceId);
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  if (!entitlements.features.custom_themes) return NextResponse.json({ error: "Custom themes are available on Pro." }, { status: 403 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });

  let source: any | null = null;
  if (body.sourceThemeId) {
    const sourceResult = await db.from("themes").select("*").eq("id", body.sourceThemeId).maybeSingle();
    if (sourceResult.error) return genericApiError("themes:source:error", sourceResult.error, { workspaceId: context.workspace.id, sourceThemeId: body.sourceThemeId }, 400, "Unable to create theme.");
    source = sourceResult.data as any | null;
    if (!source) source = systemThemes.find(theme => theme.id === body.sourceThemeId);
    if (!source) return NextResponse.json({ error: "Theme not found." }, { status: 404 });
  }

  const settings = resolveThemeSettings(source?.settings || { ...minimalDarkTheme, accentColor: "#ff4f93", backgroundStyle: "minimal_dark", buttonStyle: "glass" });
  const name = String(body.name || source?.name && `${source.name} Copy` || "Untitled Theme").trim() || "Untitled Theme";
  const id = `${context.workspace.id}-${slug(name)}-${Date.now()}`;
  const inserted = await db.from("themes").insert({
    id,
    workspace_id: context.workspace.id,
    name,
    description: String(body.description || source?.description || "Custom workspace theme").trim(),
    is_system_theme: false,
    settings,
  }).select("*").single();

  if (inserted.error) return genericApiError("themes:create:error", inserted.error, { workspaceId: context.workspace.id, themeId: id }, 400, "Unable to create theme.");
  return NextResponse.json({ theme: inserted.data, entitlements });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const context = await getWorkspaceContext(body.workspaceId);
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });

  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  if (body.action === "set_workspace_default") {
    if (!canAdmin(context.role)) return NextResponse.json({ error: "Only owners, admins, and developers can set workspace defaults." }, { status: 403 });
    const themeId = String(body.themeId || "minimal-dark");
    const updated = await db
      .from("workspaces")
      .update({ default_theme_id: themeId, default_theme: themeId, updated_at: new Date().toISOString() })
      .eq("id", context.workspace.id)
      .select("id,default_theme_id")
      .single();

    if (updated.error) return genericApiError("themes:set-default:error", updated.error, { workspaceId: context.workspace.id, themeId }, 400, "Unable to set workspace default theme.");
    return NextResponse.json({ workspace: updated.data, entitlements });
  }

  if (!entitlements.features.theme_studio) return NextResponse.json({ error: "Theme Studio is available on Pro." }, { status: 403 });
  const themeId = String(body.themeId || "");
  const existing = await db.from("themes").select("*").eq("id", themeId).eq("workspace_id", context.workspace.id).maybeSingle();
  if (existing.error) return genericApiError("themes:lookup:error", existing.error, { workspaceId: context.workspace.id, themeId }, 400, "Unable to update theme.");
  if (!existing.data) return NextResponse.json({ error: "Custom theme not found." }, { status: 404 });

  const settings = resolveThemeSettings(body.settings);
  const updated = await db
    .from("themes")
    .update({
      name: String(body.name || existing.data.name || "Custom Theme").trim() || "Custom Theme",
      description: String(body.description || "").trim() || null,
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", themeId)
    .eq("workspace_id", context.workspace.id)
    .select("*")
    .single();

  if (updated.error) return genericApiError("themes:update:error", updated.error, { workspaceId: context.workspace.id, themeId }, 400, "Unable to update theme.");
  return NextResponse.json({ theme: updated.data, entitlements });
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context || !canAdmin(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  if (!entitlements.features.custom_themes) return NextResponse.json({ error: "Custom themes are available on Pro." }, { status: 403 });

  const themeId = String(params.get("themeId") || "");
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });

  const deleted = await db.from("themes").delete().eq("id", themeId).eq("workspace_id", context.workspace.id).eq("is_system_theme", false);
  if (deleted.error) return genericApiError("themes:delete:error", deleted.error, { workspaceId: context.workspace.id, themeId }, 400, "Unable to delete theme.");
  return NextResponse.json({ ok: true, entitlements });
}
