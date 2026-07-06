import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/adminAuth";
import { getSupabaseAdmin, getSupabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const fullName = String(form.get("fullName") || "").trim();
  const workspaceName = String(form.get("workspaceName") || "").trim();
  const supabase = getSupabasePublic(); const admin = getSupabaseAdmin();
  if (!supabase || !admin) return NextResponse.redirect(new URL("/signup?error=not-configured", request.url), 303);
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error || !data.user) return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(error?.message || "signup-failed")}`, request.url), 303);
  await admin.from("profiles").upsert({ id: data.user.id, email, full_name: fullName || null });
  const existing = await admin.from("workspace_members").select("workspace_id").eq("user_id", data.user.id).limit(1).maybeSingle();
  if (!existing.data) {
    const created = await admin.from("workspaces").insert({ name: workspaceName || `${fullName || email}'s workspace`, owner_id: data.user.id }).select("id").single();
    if (created.data) await admin.from("workspace_members").insert({ workspace_id: created.data.id, user_id: data.user.id, role: "owner" });
  }
  if (!data.session) return NextResponse.redirect(new URL("/login?message=check-email", request.url), 303);
  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, data.session.access_token, { ...options, maxAge: data.session.expires_in });
  response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
