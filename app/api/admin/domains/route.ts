import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { NextResponse } from "next/server";
import { canAdmin, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { domainVerificationHost, normalizeHostname } from "@/lib/customDomains";
import { getFeatureLimit, hasFeature } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";

function createVerificationToken() {
  return randomBytes(16).toString("hex").toUpperCase();
}

function txtRecordsContainToken(records: string[][], token: string) {
  const expected = token.trim();
  return records.flatMap(record => record.map(value => value.trim())).some(value => value === expected);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ domains: [] });
  const result = await db.from("workspace_domains").select("*").eq("workspace_id", context.workspace.id).order("created_at", { ascending: false });
  if (result.error) return genericApiError("domains:list:error", result.error, { workspaceId: context.workspace.id }, 500, "Unable to load domains.");
  return NextResponse.json({ domains: result.data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const context = await getWorkspaceContext(body.workspaceId);
  if (!context || !canAdmin(context.role)) return NextResponse.json({ error: "Only workspace owners, admins, and developers can add domains." }, { status: 403 });
  if (!(await hasFeature(context.workspace.id, "custom_domains", context.user, context.role))) return NextResponse.json({ error: "🔒 Custom domains are available on Pro." }, { status: 403 });
  const limit = await getFeatureLimit(context.workspace.id, "custom_domains", context.user, context.role);
  let hostname: string;
  try {
    hostname = normalizeHostname(String(body.hostname || ""));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enter a valid hostname." }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable." }, { status: 500 });
  if (limit !== null) {
    const count = await db.from("workspace_domains").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace.id).neq("status", "Disabled");
    if (count.error) return genericApiError("domains:count:error", count.error, { workspaceId: context.workspace.id }, 400, "Unable to check domain limits.");
    if ((count.count || 0) >= limit) return NextResponse.json({ error: `Custom-domain limit reached for this workspace (${limit}).` }, { status: 403 });
  }
  const inserted = await db.from("workspace_domains").insert({
    workspace_id: context.workspace.id,
    hostname,
    status: "Pending",
    verified: false,
    ssl_status: "Not Started",
    verification_token: createVerificationToken(),
    verification_method: "txt",
  }).select("*").single();
  if (inserted.error) return genericApiError("domains:create:error", inserted.error, { workspaceId: context.workspace.id, hostname }, 400, "Unable to add domain.");
  return NextResponse.json({ domain: inserted.data });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const context = await getWorkspaceContext(body.workspaceId);
  if (!context || !canAdmin(context.role)) return NextResponse.json({ error: "Only workspace owners, admins, and developers can verify domains." }, { status: 403 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable." }, { status: 500 });
  const existing = await db.from("workspace_domains").select("*").eq("id", String(body.domainId || "")).eq("workspace_id", context.workspace.id).maybeSingle();
  if (existing.error) return genericApiError("domains:lookup:error", existing.error, { workspaceId: context.workspace.id, domainId: body.domainId }, 400, "Unable to verify domain.");
  if (!existing.data) return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  let lookupHost: string;
  try {
    lookupHost = domainVerificationHost(existing.data.hostname);
  } catch {
    return NextResponse.json({ error: "Stored hostname is invalid." }, { status: 400 });
  }
  try {
    const records = await resolveTxt(lookupHost);
    if (!txtRecordsContainToken(records, existing.data.verification_token)) {
      return NextResponse.json({ verified: false, domain: existing.data, error: `TXT record found for ${lookupHost}, but the value does not match yet.` });
    }
  } catch (error) {
    console.info("[tone-link:domains:dns-check]", { lookupHost, reason: error instanceof Error ? error.message : "TXT lookup failed" });
    return NextResponse.json({ verified: false, domain: existing.data, error: `TXT record not found for ${lookupHost} yet.` });
  }
  const updated = await db.from("workspace_domains").update({
    verified: true,
    status: "Verified",
    ssl_status: "SSL Pending",
    updated_at: new Date().toISOString(),
  }).eq("id", existing.data.id).eq("workspace_id", context.workspace.id).select("*").single();
  if (updated.error) return genericApiError("domains:update:error", updated.error, { workspaceId: context.workspace.id, domainId: existing.data.id }, 400, "Unable to update domain verification.");
  return NextResponse.json({ verified: true, domain: updated.data });
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context || !canAdmin(context.role)) return NextResponse.json({ error: "Only workspace owners, admins, and developers can remove domains." }, { status: 403 });
  const domainId = params.get("domainId");
  if (!domainId) return NextResponse.json({ error: "Missing domain id." }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase unavailable." }, { status: 500 });
  const deleted = await db.from("workspace_domains").delete().eq("id", domainId).eq("workspace_id", context.workspace.id);
  if (deleted.error) return genericApiError("domains:delete:error", deleted.error, { workspaceId: context.workspace.id, domainId }, 400, "Unable to remove domain.");
  return NextResponse.json({ ok: true });
}
