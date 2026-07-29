import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/adminAuth";
import { ensureUserWorkspace } from "@/lib/authBootstrap";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const legalVersion = request.nextUrl.searchParams.get("legal");
  const providerError = request.nextUrl.searchParams.get("error") || request.nextUrl.searchParams.get("error_description");
  console.info("[tone-link:auth-callback:debug]", {
    pathname: request.nextUrl.pathname,
    queryKeys: [...request.nextUrl.searchParams.keys()],
    hasCode: Boolean(code),
    hasError: Boolean(providerError),
  });
  if (providerError) {
    console.warn("[tone-link:auth-callback:provider-error]", { hasProviderError: true });
    return NextResponse.redirect(new URL("/login?error=oauth-provider-error", request.url));
  }
  if (!code) return NextResponse.redirect(new URL("/login?error=missing-auth-code", request.url));
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not-configured", request.url));
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.user) {
    console.warn("[tone-link:auth-callback:exchange-failed]", { message: error?.message || "missing session" });
    return NextResponse.redirect(new URL("/login?error=oauth-exchange-failed", request.url));
  }
  console.info("[tone-link:auth-callback:exchange-success]", { hasUser: Boolean(data.session.user?.id) });
  const user = data.session.user;
  if (!user.email) return NextResponse.redirect(new URL("/login?error=missing-email", request.url));
  if (legalVersion === "2026-07-21") {
    const acceptedAt = new Date().toISOString();
    const { error: consentError } = await supabase.auth.updateUser({ data: { terms_accepted_at: acceptedAt, terms_version: legalVersion, privacy_acknowledged_at: acceptedAt, privacy_version: legalVersion } });
    if (consentError) console.warn("[tone-link:auth-callback:legal-consent]", consentError.message);
  }
  if (!user.email_confirmed_at) return NextResponse.redirect(new URL(`/check-email?email=${encodeURIComponent(user.email)}`, request.url));
  let workspaceId = "";
  try {
    workspaceId = (await ensureUserWorkspace(user)).workspaceId;
    console.info("[tone-link:auth-callback:workspace-success]", { hasWorkspace: Boolean(workspaceId) });
  } catch (reason) {
    console.warn("[tone-link:auth-callback:workspace-failed]", reason instanceof Error ? reason.message : "workspace bootstrap failed");
    return NextResponse.redirect(new URL("/login?error=workspace-bootstrap-failed", request.url));
  }
  const destination = next && next.startsWith("/dashboard") ? next : `/dashboard/${workspaceId}/overview`;
  const response = NextResponse.redirect(new URL(destination, request.url));
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, data.session.access_token, { ...options, maxAge: data.session.expires_in });
  response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
