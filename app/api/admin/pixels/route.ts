import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { pixelProviders, type PixelConfigurationProvider } from "@/lib/pixelConfigurations";
import { getSupabaseAdmin } from "@/lib/supabase";

const providerSet = new Set(pixelProviders.map((provider) => provider.provider));
const advancedProviders = new Set<PixelConfigurationProvider>(["snapchat", "custom"]);

async function assertPixelAccess(workspaceId: string, user: Pick<User, "id" | "email">, role: Parameters<typeof getWorkspaceEntitlements>[2], provider: PixelConfigurationProvider) {
  const entitlements = await getWorkspaceEntitlements(workspaceId, user, role);
  if (!(entitlements.features.standard_pixels || entitlements.developer)) {
    return { ok: false as const, message: "Tracking pixels are available on Basic and Pro plans." };
  }
  if (provider === "custom" && !(entitlements.features.advanced_pixels || entitlements.developer)) {
    return { ok: false as const, message: "Custom pixels require Pro." };
  }
  if (provider === "snapchat" && !(entitlements.features.advanced_pixels || entitlements.developer)) {
    return { ok: false as const, message: "Snapchat pixels require Pro." };
  }
  if (advancedProviders.has(provider) && !(entitlements.features.advanced_pixels || entitlements.developer)) {
    return { ok: false as const, message: "Advanced pixels require Pro." };
  }
  return { ok: true as const };
}

function normalizeProvider(value: unknown): PixelConfigurationProvider | null {
  const provider = String(value || "").trim() as PixelConfigurationProvider;
  return providerSet.has(provider) ? provider : null;
}

function cleanString(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

export async function POST(request: Request) {
  const body = await request.json();
  const context = await getWorkspaceContext(body.workspaceId);
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const provider = normalizeProvider(body.provider);
  if (!provider) return NextResponse.json({ error: "Unsupported pixel provider." }, { status: 400 });
  const access = await assertPixelAccess(context.workspace.id, context.user, context.role, provider);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: 403 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });
  const result = await db.from("workspace_pixel_configurations").insert({
    workspace_id: context.workspace.id,
    provider,
    name: cleanString(body.name) || pixelProviders.find((item) => item.provider === provider)?.providerName || provider,
    pixel_id: cleanString(body.pixelId),
    access_token: cleanString(body.accessToken),
    dataset_id: cleanString(body.datasetId),
    conversion_label: cleanString(body.conversionLabel),
    status: "pending",
    health: "warning",
    is_default: Boolean(body.isDefault),
    settings: body.settings && typeof body.settings === "object" ? body.settings : {},
  }).select("id").single();
  if (result.error) return genericApiError("pixels:create:error", result.error, { workspaceId: context.workspace.id, provider }, 400, "Unable to create pixel configuration.");
  return NextResponse.json({ id: result.data.id });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const context = await getWorkspaceContext(body.workspaceId);
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const provider = normalizeProvider(body.provider);
  if (!provider) return NextResponse.json({ error: "Unsupported pixel provider." }, { status: 400 });
  const access = await assertPixelAccess(context.workspace.id, context.user, context.role, provider);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: 403 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });
  const result = await db.from("workspace_pixel_configurations").update({
    name: cleanString(body.name) || pixelProviders.find((item) => item.provider === provider)?.providerName || provider,
    pixel_id: cleanString(body.pixelId),
    access_token: cleanString(body.accessToken),
    dataset_id: cleanString(body.datasetId),
    conversion_label: cleanString(body.conversionLabel),
    is_default: Boolean(body.isDefault),
    settings: body.settings && typeof body.settings === "object" ? body.settings : {},
    updated_at: new Date().toISOString(),
  }).eq("id", String(body.id || "")).eq("workspace_id", context.workspace.id).select("id").single();
  if (result.error) return genericApiError("pixels:update:error", result.error, { workspaceId: context.workspace.id, provider }, 400, "Unable to update pixel configuration.");
  return NextResponse.json({ id: result.data.id });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const context = await getWorkspaceContext(searchParams.get("workspaceId") || undefined);
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const provider = normalizeProvider(searchParams.get("provider"));
  if (!provider) return NextResponse.json({ error: "Unsupported pixel provider." }, { status: 400 });
  const access = await assertPixelAccess(context.workspace.id, context.user, context.role, provider);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: 403 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });
  const result = await db.from("workspace_pixel_configurations").delete().eq("id", searchParams.get("id") || "").eq("workspace_id", context.workspace.id);
  if (result.error) return genericApiError("pixels:delete:error", result.error, { workspaceId: context.workspace.id, provider }, 400, "Unable to delete pixel configuration.");
  return NextResponse.json({ deleted: true });
}
