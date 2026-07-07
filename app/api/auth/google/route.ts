import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/authUrls";
import { getSupabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not-configured", request.url), 303);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl(request)}/auth/callback` },
  });
  if (error || !data.url) {
    console.warn("[tone-link:google-oauth]", error?.message);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message || "google-oauth-failed")}`, request.url), 303);
  }
  return NextResponse.redirect(data.url, 303);
}
