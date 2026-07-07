import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { DEFAULT_WORKSPACE_TIMEZONE, getWorkspaceDateRange } from "@/lib/timezone";
import { displayUtmCampaign, displayUtmSource, normalizeUtmValue } from "@/lib/utm";

const VIEW_EVENTS = ["page_view", "view_content", "visit"];
const STANDARD_EVENT_TYPES = ["page_view","view_content","platform_click","copy_url","share","embed_click","campaign_click"];
const csvEscape = (value: unknown) => `"${String(value ?? "").replaceAll('"','""')}"`;
const dayKey = (value: string, timezone: string) => new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const context = await getWorkspaceContext(params.get("workspaceId") || undefined);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ summary: { visits: 0, clicks: 0 }, byPlatform: [], bySong: [], referrers: [], campaigns: [], devices: [], recent: [], configured: false });
  const workspacePlan = await supabase.from("workspaces").select("timezone, default_timezone").eq("id", context.workspace.id).single();
  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  const planId = entitlements.plan;
  const timezone = String(workspacePlan.data?.timezone || workspacePlan.data?.default_timezone || DEFAULT_WORKSPACE_TIMEZONE);
  const bypass = entitlements.developer;
  const retentionDays = entitlements.limits.analytics_retention_days;
  const selectedRange = params.get("range") || "7";
  const range = selectedRange === "custom" ? { start: params.get("from") || undefined, end: params.get("to") || undefined } : getWorkspaceDateRange(selectedRange, timezone);
  const requestedFrom = params.get("from") || range.start; const requestedTo = params.get("to") || range.end; const retentionFloor = retentionDays ? new Date(Date.now() - retentionDays * 86400000).toISOString() : null;
  const lockedRange = Boolean(!bypass && ((selectedRange === "all" && retentionDays) || (selectedRange === "custom" && !entitlements.features.advanced_analytics) || (retentionFloor && requestedFrom && requestedFrom < retentionFloor)));
  const effectiveFrom = retentionFloor && (!requestedFrom || requestedFrom < retentionFloor) ? retentionFloor : requestedFrom;
  const summaryOnly=params.get("summary")==="1";const exportCsv=params.get("export")==="csv";const rowLimit=exportCsv?5000:Math.min(Number(params.get("limit")||"1000")||1000,1000);const recentLimit=Math.min(Number(params.get("recentLimit")||"50")||50,100);const recentPage=Math.max(Number(params.get("recentPage")||"1")||1,1);
  let query = (supabase.from("click_events") as any).select(summaryOnly ? "id,event_type" : "*, songs(title, slug), releases(title), link_pages(title,slug), artists(name)").eq("workspace_id", context.workspace.id).order("created_at", { ascending: false }).limit(rowLimit);
  if (effectiveFrom) query = query.gte("created_at", effectiveFrom); if (requestedTo) query = query.lte("created_at", requestedTo);
  if (params.get("eventType")) query = query.eq("event_type", params.get("eventType")!); if (params.get("platform")) query = query.eq("platform", params.get("platform")!);
  if (params.get("utmSource")) query = query.ilike("utm_source", `%${params.get("utmSource")}%`); if (params.get("utmCampaign")) query = query.ilike("utm_campaign", `%${params.get("utmCampaign")}%`);
  if (params.get("artistId")) query = query.eq("artist_id", params.get("artistId")!); if (params.get("releaseId")) query = query.eq("release_id", params.get("releaseId")!); if (params.get("linkPageId")) query = query.eq("link_page_id", params.get("linkPageId")!);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const events = (data || []) as any[]; const clicks = events.filter((event) => event.event_type === "platform_click"); const visits = events.filter((event) => VIEW_EVENTS.includes(event.event_type));
  const baseMeta = { timezone, planId, retentionDays, canExport: entitlements.features.analytics_export, lockedRange, eventTypes: STANDARD_EVENT_TYPES, retentionLimited: Boolean(lockedRange || (retentionFloor&&requestedFrom&&requestedFrom<retentionFloor)) };
  if(exportCsv){if(!entitlements.features.analytics_export)return NextResponse.json({error:"CSV event-log export is available on upgraded plans."},{status:403});const rows=[["timestamp","event_type","smart_link","platform","referrer","utm_source","utm_campaign","device"].map(csvEscape).join(",")].concat(events.map(event=>[event.created_at,event.event_type,event.link_pages?.title||event.releases?.title||event.songs?.title||"",event.platform||"",event.referrer||"",normalizeUtmValue(event.utm_source)||"",normalizeUtmValue(event.utm_campaign)||"",event.device_type||""].map(csvEscape).join(",")));return new NextResponse(rows.join("\n"),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename=\"tonelink-analytics-${Date.now()}.csv\"`}})}
  if(summaryOnly)return NextResponse.json({...baseMeta,summary:{visits:visits.length,clicks:clicks.length},byPlatform:[],bySong:[],referrers:[],campaigns:[],devices:[],browsers:[],timeSeries:[],recent:[],recentPage,recentLimit,configured:true,summaryOnly:true});
  const group = (items: typeof events, value: (item: typeof events[number]) => string) => Object.entries(items.reduce<Record<string, number>>((acc, item) => { const key = value(item) || "Direct / unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const timeSeriesMap=new Map<string,{date:string;views:number;clicks:number;ctr:number}>();for(const event of events){const key=dayKey(event.created_at,timezone);const row=timeSeriesMap.get(key)||{date:key,views:0,clicks:0,ctr:0};if(VIEW_EVENTS.includes(event.event_type))row.views++;if(event.event_type==="platform_click")row.clicks++;row.ctr=row.views?Math.round(row.clicks/row.views*100):0;timeSeriesMap.set(key,row)}
  const recentStart=(recentPage-1)*recentLimit;
  const recent = events.slice(recentStart, recentStart + recentLimit).map(event => ({ ...event, utm_source: normalizeUtmValue(event.utm_source), utm_medium: normalizeUtmValue(event.utm_medium), utm_campaign: normalizeUtmValue(event.utm_campaign), utm_content: normalizeUtmValue(event.utm_content), utm_term: normalizeUtmValue(event.utm_term) }));
  return NextResponse.json({ ...baseMeta, summary: { visits: visits.length, clicks: clicks.length }, byPlatform: group(clicks, (event) => event.platform).slice(0,10), bySong: group(clicks, (event) => event.link_pages?.title || event.releases?.title || event.songs?.title).slice(0,10), referrers: group(events, (event) => { try { return new URL(event.referrer).hostname; } catch { return displayUtmSource(event.utm_source); } }).slice(0,10), campaigns: group(events, (event) => displayUtmCampaign(event.utm_campaign)).slice(0,10), devices: group(events, (event) => event.device_type || (/mobile|android|iphone/i.test(event.user_agent || "") ? "Mobile" : "Desktop")).slice(0,10), browsers: group(events, (event) => event.browser || "Unknown").slice(0,10), timeSeries: [...timeSeriesMap.values()].sort((a,b)=>a.date.localeCompare(b.date)), recent, recentPage, recentLimit, recentHasMore: events.length > recentStart + recentLimit, configured: true });
}
