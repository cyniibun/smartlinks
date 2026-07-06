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
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo:`${origin}/login?message=email-confirmed` } });
  if (error || !data.user) return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(error?.message || "signup-failed")}`, request.url), 303);
  const fail=async(message:string)=>{await admin.auth.admin.deleteUser(data.user!.id);return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(message)}`,request.url),303)};
  const profile=await admin.from("profiles").upsert({ id: data.user.id, email, full_name: fullName || null });if(profile.error)return fail("Unable to create your profile. Please try again.");
  const existing = await admin.from("workspace_members").select("workspace_id").eq("user_id", data.user.id).limit(1).maybeSingle();
  if(existing.error)return fail("Unable to check workspace access. Please try again.");
  let workspaceId=existing.data?.workspace_id as string|undefined;
  if (!existing.data) {
    const emailPrefix=email.split("@")[0]||"New user";const defaultName=`${emailPrefix}'s Workspace`;const finalName=workspaceName||defaultName;const workspaceSlug=`${finalName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"workspace"}-${data.user.id.slice(0,6)}`;
    const created = await admin.from("workspaces").insert({ name: finalName, slug: workspaceSlug, owner_id: data.user.id }).select("id").single();
    if(created.error||!created.data)return fail("Unable to create your workspace. Please try again.");workspaceId=created.data.id;
    const membership=await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: data.user.id, role: "owner" });if(membership.error){await admin.from("workspaces").delete().eq("id",workspaceId);return fail("Unable to assign workspace ownership. Please try again.")}
  }
  if (!data.session) return NextResponse.redirect(new URL("/login?message=check-email", request.url), 303);
  if(!workspaceId)return fail("Workspace provisioning did not complete. Please try again.");
  const response = NextResponse.redirect(new URL(`/dashboard/${workspaceId}/overview`, request.url), 303);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, data.session.access_token, { ...options, maxAge: data.session.expires_in });
  response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
