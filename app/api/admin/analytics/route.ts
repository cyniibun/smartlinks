import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasBillingBypass } from "@/lib/billing";
import { DEFAULT_WORKSPACE_TIMEZONE, getWorkspaceDateRange } from "@/lib/timezone";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ summary: { visits: 0, clicks: 0 }, byPlatform: [], bySong: [], referrers: [], campaigns: [], devices: [], recent: [], configured: false });
  const workspacePlan = await supabase.from("workspaces").select("plan_id, timezone, default_timezone, plans(analytics_retention_days)").eq("id", context.workspace.id).single();
  const plan = Array.isArray(workspacePlan.data?.plans) ? workspacePlan.data.plans[0] : workspacePlan.data?.plans;
  const timezone = String(workspacePlan.data?.timezone || workspacePlan.data?.default_timezone || DEFAULT_WORKSPACE_TIMEZONE);
  const retentionDays = await hasBillingBypass(context.user.id) ? null : plan?.analytics_retention_days ?? 7;
  const range = getWorkspaceDateRange(params.get("range") || "7", timezone);
  const requestedFrom = params.get("from") || range.start; const requestedTo = params.get("to") || range.end; const retentionFloor = retentionDays ? new Date(Date.now() - retentionDays * 86400000).toISOString() : null;
  const effectiveFrom = retentionFloor && (!requestedFrom || requestedFrom < retentionFloor) ? retentionFloor : requestedFrom;
  const summaryOnly=params.get("summary")==="1";const rowLimit=Math.min(Number(params.get("limit")||"1000")||1000,1000);
  let query = (supabase.from("click_events") as any).select(summaryOnly ? "id,event_type" : "*, songs(title, slug), releases(title), link_pages(title,slug), artists(name)").eq("workspace_id", context.workspace.id).order("created_at", { ascending: false }).limit(rowLimit);
  if (effectiveFrom) query = query.gte("created_at", effectiveFrom); if (requestedTo) query = query.lte("created_at", requestedTo);
  if (params.get("eventType")) query = query.eq("event_type", params.get("eventType")!); if (params.get("platform")) query = query.eq("platform", params.get("platform")!);
  if (params.get("utmSource")) query = query.ilike("utm_source", `%${params.get("utmSource")}%`); if (params.get("utmCampaign")) query = query.ilike("utm_campaign", `%${params.get("utmCampaign")}%`);
  if (params.get("artistId")) query = query.eq("artist_id", params.get("artistId")!); if (params.get("releaseId")) query = query.eq("release_id", params.get("releaseId")!); if (params.get("linkPageId")) query = query.eq("link_page_id", params.get("linkPageId")!);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const events = (data || []) as any[]; const clicks = events.filter((event) => event.event_type === "platform_click"); const visits = events.filter((event) => ["visit","page_view"].includes(event.event_type));
  if(summaryOnly)return NextResponse.json({timezone,summary:{visits:visits.length,clicks:clicks.length},byPlatform:[],bySong:[],referrers:[],campaigns:[],devices:[],recent:[],configured:true,retentionDays,retentionLimited:Boolean(retentionFloor&&requestedFrom&&requestedFrom<retentionFloor),summaryOnly:true});
  const group = (items: typeof events, value: (item: typeof events[number]) => string) => Object.entries(items.reduce<Record<string, number>>((acc, item) => { const key = value(item) || "Direct / unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return NextResponse.json({ timezone, summary: { visits: visits.length, clicks: clicks.length }, byPlatform: group(clicks, (event) => event.platform).slice(0,10), bySong: group(clicks, (event) => event.link_pages?.title || event.releases?.title || event.songs?.title).slice(0,10), referrers: group(events, (event) => { try { return new URL(event.referrer).hostname; } catch { return "Direct / unknown"; } }).slice(0,10), campaigns: group(events.filter((event) => event.utm_campaign), (event) => event.utm_campaign).slice(0,10), devices: group(events, (event) => event.device_type || (/mobile|android|iphone/i.test(event.user_agent || "") ? "Mobile" : "Desktop")).slice(0,10), recent: events.slice(0, 50), configured: true, retentionDays, retentionLimited: Boolean(retentionFloor && requestedFrom && requestedFrom < retentionFloor) });
}
