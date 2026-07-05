import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const event = await request.json();
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] || "";
      const ipHash = forwarded ? createHash("sha256").update(`${forwarded}:${process.env.ADMIN_PASSWORD || "cyniical"}`).digest("hex") : null;
      const song = event.songSlug ? await supabase.from("songs").select("id").eq("slug", event.songSlug).maybeSingle() : null;
      const { error } = await supabase.from("click_events").insert({
        song_id: song?.data?.id ?? null, event_type: event.eventType || "click",
        platform: event.platform || null, destination_url: event.destinationUrl || null,
        referrer: event.referrer || null, user_agent: event.userAgent || request.headers.get("user-agent"),
        ip_hash: ipHash, utm_source: event.utmSource || null, utm_medium: event.utmMedium || null,
        utm_campaign: event.utmCampaign || null
      });
      if (error) throw error;
    } else console.info("[smart-link-event]", event);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }
}
