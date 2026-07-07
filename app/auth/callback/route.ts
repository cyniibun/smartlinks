import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/adminAuth";
import { ensureUserWorkspace } from "@/lib/authBootstrap";
import { getSupabasePublic } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not-configured", request.url));
  if (!code) return NextResponse.redirect(new URL("/login?error=missing-auth-code", request.url));

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.user) {
    console.warn("[tone-link:auth-callback]", error?.message);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message || "auth-callback-failed")}`, request.url));
  }
  const user = data.session.user;
  if (!user.email) return NextResponse.redirect(new URL("/login?error=missing-email", request.url));
  if (!user.email_confirmed_at) return NextResponse.redirect(new URL(`/check-email?email=${encodeURIComponent(user.email)}`, request.url));

  let workspaceId = "";
  try {
    workspaceId = (await ensureUserWorkspace(user)).workspaceId;
  } catch (reason) {
    console.warn("[tone-link:callback-bootstrap]", reason);
    return NextResponse.redirect(new URL("/login?error=workspace-bootstrap-failed", request.url));
  }

  const destination = next && next.startsWith("/dashboard") ? next : `/dashboard/${workspaceId}/overview`;
  const response = NextResponse.redirect(new URL(destination, request.url));
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, data.session.access_token, { ...options, maxAge: data.session.expires_in });
  response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
