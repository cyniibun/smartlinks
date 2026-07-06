import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/adminAuth";
import { getSupabaseAdmin, getSupabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not-configured", request.url), 303);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return NextResponse.redirect(new URL("/login?error=invalid-credentials", request.url), 303);
  const membership=await getSupabaseAdmin()?.from("workspace_members").select("workspace_id").eq("user_id",data.user.id).limit(1).maybeSingle();
  const destination=membership?.data?.workspace_id?`/dashboard/${membership.data.workspace_id}/overview`:"/dashboard";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, data.session.access_token, { ...options, maxAge: data.session.expires_in });
  response.cookies.set(REFRESH_COOKIE, data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  return response;
}
