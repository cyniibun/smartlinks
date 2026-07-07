import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/authUrls";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getSupabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  const isJson = request.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const email = String(body.email || "").trim();
  const supabase = getSupabasePublic();
  if (!supabase) return NextResponse.json({ error: "Supabase Auth is not configured." }, { status: 500 });
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  const rateKey = `resend-confirmation:${getClientIp(request)}:${email.toLowerCase()}`;
  if (checkRateLimit(request, rateKey, 5)) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${getSiteUrl(request)}/auth/callback` },
    });
    if (error) console.warn("[tone-link:resend-confirmation]", error.message);
  }
  return NextResponse.json({ ok: true });
}
