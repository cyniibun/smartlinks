import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getGeoFromHeaders } from "@/lib/analytics/geo";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeUtmValue } from "@/lib/utm";

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boundedDuration(value: unknown) {
  const duration = Number(value);
  if (!Number.isFinite(duration)) return 0;
  return Math.min(Math.max(Math.round(duration), 0), 86_400_000);
}

export async function POST(request: Request) {
  try {
    const event = await request.json();
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] || "";
      const ipHash = forwarded ? createHash("sha256").update(`${forwarded}:${process.env.EVENT_HASH_SALT || process.env.SUPABASE_SECRET_KEY || "tone-link"}`).digest("hex") : null;
      const geo = getGeoFromHeaders(request.headers);
      const page = event.songSlug ? await supabase.from("link_pages").select("id, workspace_id, artist_id, release_id").eq("slug", event.songSlug).eq("published", true).maybeSingle() : null;
      const song = !page?.data && event.songSlug ? await supabase.from("songs").select("id, workspace_id").eq("slug", event.songSlug).eq("published", true).maybeSingle() : null;
      const utmSource = normalizeUtmValue(event.utmSource);
      const utmMedium = normalizeUtmValue(event.utmMedium);
      const utmCampaign = normalizeUtmValue(event.utmCampaign);
      const utmContent = normalizeUtmValue(event.utmContent);
      const utmTerm = normalizeUtmValue(event.utmTerm);
      const clickIds = event.clickIds && typeof event.clickIds === "object" ? event.clickIds : {};
      const workspaceId = page?.data?.workspace_id ?? song?.data?.workspace_id ?? event.workspaceId ?? null;
      if (event.eventType === "page_engagement") {
        const pageViewId = nullableString(event.pageViewId ?? event.page_view_id);
        if ((!page?.data && !song?.data) || !workspaceId || !pageViewId) return NextResponse.json({ ok: false, error: "Page engagement requires a valid published page view." }, { status: 400 });
        const { error } = await supabase.rpc("record_page_engagement", {
          p_workspace_id: workspaceId,
          p_song_id: song?.data?.id ?? null,
          p_link_page_id: page?.data?.id ?? event.linkPageId ?? null,
          p_release_id: page?.data?.release_id ?? event.releaseId ?? null,
          p_artist_id: page?.data?.artist_id ?? event.artistId ?? null,
          p_visitor_id: nullableString(event.visitorId ?? event.visitor_id),
          p_session_id: nullableString(event.sessionId ?? event.session_id),
          p_page_view_id: pageViewId,
          p_event_id: nullableString(event.eventId ?? event.event_id),
          p_active_duration_ms: boundedDuration(event.activeDurationMs ?? event.active_duration_ms),
          p_completed: Boolean(event.engagementCompleted ?? event.engagement_completed),
          p_utm_source: utmSource,
          p_utm_medium: utmMedium,
          p_utm_campaign: utmCampaign,
          p_referrer: nullableString(event.referrer),
          p_user_agent: nullableString(event.userAgent ?? request.headers.get("user-agent")),
          p_device_type: /mobile|android|iphone/i.test(event.userAgent || request.headers.get("user-agent") || "") ? "mobile" : "desktop"
        });
        if (error) throw error;
        return NextResponse.json({ ok: true }, { status: 202 });
      }
      const { error } = await supabase.from("click_events").insert({
        song_id: song?.data?.id ?? null, workspace_id: workspaceId,
        link_page_id: page?.data?.id ?? event.linkPageId ?? null, release_id: page?.data?.release_id ?? event.releaseId ?? null,
        artist_id: page?.data?.artist_id ?? event.artistId ?? null, campaign_id: event.campaignId || null,
        event_type: event.eventType || "click", event_name: event.eventName || null,
        platform: event.platform || null, destination_url: event.destinationUrl || null,
        referrer: event.referrer || null, user_agent: event.userAgent || request.headers.get("user-agent"),
        visitor_id: nullableString(event.visitorId ?? event.visitor_id),
        external_id: nullableString(event.externalId ?? event.external_id ?? event.visitorId ?? event.visitor_id),
        session_id: nullableString(event.sessionId ?? event.session_id),
        ttclid: nullableString(event.ttclid ?? clickIds.ttclid),
        fbclid: nullableString(event.fbclid ?? clickIds.fbclid),
        gclid: nullableString(event.gclid ?? clickIds.gclid),
        msclkid: nullableString(event.msclkid ?? clickIds.msclkid),
        twclid: nullableString(event.twclid ?? clickIds.twclid),
        li_fat_id: nullableString(event.liFatId ?? event.li_fat_id ?? clickIds.li_fat_id),
        normalized_referrer: nullableString(event.normalizedReferrer ?? event.normalized_referrer),
        event_id: nullableString(event.eventId ?? event.event_id),
        ip_hash: ipHash, utm_source: utmSource, utm_medium: utmMedium,
        utm_campaign: utmCampaign, utm_content: utmContent, utm_term: utmTerm,
        country: geo.country, region: geo.region, city: geo.city, timezone: geo.timezone,
        device_type: /mobile|android|iphone/i.test(event.userAgent || request.headers.get("user-agent") || "") ? "mobile" : "desktop"
      });
      if (error) throw error;
    } else console.info("[smart-link-event]", event);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }
}
