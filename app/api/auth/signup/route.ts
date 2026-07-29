import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/adminAuth";
import { getSiteUrl } from "@/lib/authUrls";
import { ensureUserWorkspace } from "@/lib/authBootstrap";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { getSupabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");
  const acceptedLegal = String(form.get("acceptedLegal") || "") === "yes";
  const fullName = String(form.get("fullName") || "").trim();
  const honeypot = String(form.get("company") || "").trim();
  const supabase = getSupabasePublic();
  if (honeypot) return NextResponse.redirect(new URL("/check-email", request.url), 303);
  if (!acceptedLegal) return NextResponse.redirect(new URL("/signup?error=legal-consent-required", request.url), 303);
  if (password !== confirmPassword) return NextResponse.redirect(new URL("/signup?error=passwords-do-not-match", request.url), 303);
  const rateKey = `signup:${getClientIp(request)}:${email.toLowerCase()}`;
  if (!checkRateLimit(request, rateKey, 5)) return NextResponse.redirect(new URL("/signup?error=too-many-attempts", request.url), 303);
  if (!supabase) return NextResponse.redirect(new URL("/signup?error=not-configured", request.url), 303);
  const siteUrl = getSiteUrl(request);
  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, terms_accepted_at: acceptedAt, terms_version: "2026-07-21", privacy_acknowledged_at: acceptedAt, privacy_version: "2026-07-21" }, emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error || !data.user) return NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(error?.message || "signup-failed")}`, request.url), 303);
  if (!data.session || !data.user.email_confirmed_at) return NextResponse.redirect(new URL(`/check-email?email=${encodeURIComponent(email)}`, request.url), 303);
  let workspaceId = "";
  try {
    workspaceId = (await ensureUserWorkspace(data.user)).workspaceId;
  } catch (reason) {
    console.warn("[tone-link:signup-bootstrap]", reason);
    return NextResponse.redirect(new URL("/signup?error=workspace-bootstrap-failed", request.url), 303);
  }
  const response = NextResponse.redirect(new URL(`/dashboard/${workspaceId}/overview`, request.url), 303);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, data.session.access_token, { ...options, maxAge: data.session.expires_in });
  response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
