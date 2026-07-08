import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/adminAuth";
import { ensureUserWorkspace } from "@/lib/authBootstrap";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getSupabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not-configured", request.url), 303);
  const ip = getClientIp(request);
  const normalizedEmail = email.toLowerCase();
  if (
    !checkRateLimit(request, `admin-login:ip:${ip}`, 20) ||
    !checkRateLimit(request, `admin-login:email:${normalizedEmail}`, 8)
  ) {
    console.warn("[tone-link:admin-login:rate-limited]", { ip, hasEmail: Boolean(normalizedEmail) });
    return NextResponse.redirect(new URL("/login?error=too-many-attempts", request.url), 303);
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return NextResponse.redirect(new URL("/login?error=invalid-credentials", request.url), 303);
  if (!data.user.email_confirmed_at) return NextResponse.redirect(new URL(`/check-email?email=${encodeURIComponent(email)}`, request.url), 303);
  let workspaceId = "";
  try {
    workspaceId = (await ensureUserWorkspace(data.user)).workspaceId;
  } catch (reason) {
    console.warn("[tone-link:login-bootstrap]", reason);
    return NextResponse.redirect(new URL("/login?error=workspace-bootstrap-failed", request.url), 303);
  }
  const destination = `/dashboard/${workspaceId}/overview`;
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, data.session.access_token, { ...options, maxAge: data.session.expires_in });
  response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
