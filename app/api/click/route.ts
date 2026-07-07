import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeUtmValue } from "@/lib/utm";

export async function POST(request: Request) {
  try {
    const event = await request.json();
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] || "";
      const ipHash = forwarded ? createHash("sha256").update(`${forwarded}:${process.env.EVENT_HASH_SALT || process.env.SUPABASE_SECRET_KEY || "tone-link"}`).digest("hex") : null;
      const page = event.songSlug ? await supabase.from("link_pages").select("id, workspace_id, artist_id, release_id").eq("slug", event.songSlug).eq("published", true).maybeSingle() : null;
      const song = !page?.data && event.songSlug ? await supabase.from("songs").select("id, workspace_id").eq("slug", event.songSlug).eq("published", true).maybeSingle() : null;
      const utmSource = normalizeUtmValue(event.utmSource);
      const utmMedium = normalizeUtmValue(event.utmMedium);
      const utmCampaign = normalizeUtmValue(event.utmCampaign);
      const utmContent = normalizeUtmValue(event.utmContent);
      const utmTerm = normalizeUtmValue(event.utmTerm);
      const { error } = await supabase.from("click_events").insert({
        song_id: song?.data?.id ?? null, workspace_id: page?.data?.workspace_id ?? song?.data?.workspace_id ?? event.workspaceId ?? null,
        link_page_id: page?.data?.id ?? event.linkPageId ?? null, release_id: page?.data?.release_id ?? event.releaseId ?? null,
        artist_id: page?.data?.artist_id ?? event.artistId ?? null, campaign_id: event.campaignId || null,
        event_type: event.eventType || "click", event_name: event.eventName || null,
        platform: event.platform || null, destination_url: event.destinationUrl || null,
        referrer: event.referrer || null, user_agent: event.userAgent || request.headers.get("user-agent"),
        ip_hash: ipHash, utm_source: utmSource, utm_medium: utmMedium,
        utm_campaign: utmCampaign, utm_content: utmContent, utm_term: utmTerm,
        device_type: /mobile|android|iphone/i.test(event.userAgent || request.headers.get("user-agent") || "") ? "mobile" : "desktop"
      });
      if (error) throw error;
    } else console.info("[smart-link-event]", event);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }
}
