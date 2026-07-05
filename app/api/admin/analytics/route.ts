import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ summary: { visits: 0, clicks: 0 }, byPlatform: [], bySong: [], referrers: [], campaigns: [], devices: [], recent: [], configured: false });
  const { data, error } = await supabase.from("click_events").select("*, songs(title, slug)").order("created_at", { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const events = data || []; const clicks = events.filter((event) => event.event_type !== "visit"); const visits = events.filter((event) => event.event_type === "visit");
  const group = (items: typeof events, value: (item: typeof events[number]) => string) => Object.entries(items.reduce<Record<string, number>>((acc, item) => { const key = value(item) || "Direct / unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return NextResponse.json({ summary: { visits: visits.length, clicks: clicks.length }, byPlatform: group(clicks, (event) => event.platform), bySong: group(clicks, (event) => event.songs?.title), referrers: group(events, (event) => { try { return new URL(event.referrer).hostname; } catch { return "Direct / unknown"; } }), campaigns: group(events.filter((event) => event.utm_campaign), (event) => event.utm_campaign), devices: group(events, (event) => /mobile|android|iphone/i.test(event.user_agent || "") ? "Mobile" : "Desktop"), recent: events.slice(0, 50), configured: true });
}
