import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/adminAuth";
import { ensureUserWorkspace } from "@/lib/authBootstrap";
import { getSupabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accessToken = String(body.accessToken || "");
  const refreshToken = String(body.refreshToken || "");
  const expiresIn = Number(body.expiresIn || 3600);
  const next = String(body.next || "");
  if (!accessToken || !refreshToken) return NextResponse.json({ error: "Missing OAuth session." }, { status: 400 });
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.json({ error: "Supabase Auth is not configured." }, { status: 500 });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return NextResponse.json({ error: error?.message || "Unable to verify OAuth session." }, { status: 401 });
  if (!data.user.email) return NextResponse.json({ error: "Authenticated user is missing an email address." }, { status: 400 });
  if (!data.user.email_confirmed_at) return NextResponse.json({ error: "Email address is not confirmed." }, { status: 403 });
  let workspaceId = "";
  try {
    workspaceId = (await ensureUserWorkspace(data.user)).workspaceId;
  } catch (reason) {
    console.warn("[tone-link:complete-oauth-bootstrap]", reason);
    return NextResponse.json({ error: "Workspace bootstrap failed." }, { status: 500 });
  }
  const redirectTo = next && next.startsWith("/dashboard") ? next : `/dashboard/${workspaceId}/overview`;
  const response = NextResponse.json({ ok: true, workspaceId, redirectTo });
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, accessToken, { ...options, maxAge: expiresIn });
  response.cookies.set(REFRESH_COOKIE, refreshToken, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
