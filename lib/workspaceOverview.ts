import "server-only";
import { getAnalyticsMetricBreakdown, getAnalyticsSummaryCounts, isAnalyticsClickEvent } from "@/lib/analyticsAggregation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_WORKSPACE_TIMEZONE, getWorkspaceDateRange } from "@/lib/timezone";

type EventRow={id:string;event_type:string;platform?:string|null;referrer?:string|null;utm_source?:string|null;created_at:string;link_page_id?:string|null;link_pages?:{title?:string;slug?:string}|null};
type PageRow={id:string;slug:string;title:string;artist_display_name?:string|null;published:boolean;created_at:string;updated_at:string};
export type OverviewLink=PageRow&{visits:number;clicks:number;ctr:number;lastActivity?:string};
export type WorkspaceOverview={timezone:string;visits:number;clicks:number;ctr:number;topPlatform?:{name:string;count:number};bestLink?:OverviewLink;recentPublished?:PageRow;links:OverviewLink[];drafts:PageRow[];recent:EventRow[];sources:Array<{name:string;count:number}>};

export async function getWorkspaceOverview(workspaceId:string):Promise<WorkspaceOverview> {
  const db=getSupabaseAdmin();if(!db)return{timezone:DEFAULT_WORKSPACE_TIMEZONE,visits:0,clicks:0,ctr:0,links:[],drafts:[],recent:[],sources:[]};
  const workspaceResult=await db.from("workspaces").select("timezone,default_timezone").eq("id",workspaceId).maybeSingle();
  const timezone=String(workspaceResult.data?.timezone||workspaceResult.data?.default_timezone||DEFAULT_WORKSPACE_TIMEZONE);
  const range=getWorkspaceDateRange("7",timezone);
  const filters={workspaceId,from:range.start,to:range.end};
  const [pagesResult,summary,linkMetricsResult,topPlatforms,optimizedSources,recentResult]=await Promise.all([
    db.from("link_pages").select("id,slug,title,artist_display_name,published,created_at,updated_at").eq("workspace_id",workspaceId).order("updated_at",{ascending:false}),
    getAnalyticsSummaryCounts(db,filters),
    db.rpc("get_workspace_link_metrics",{p_workspace_id:workspaceId,p_from:range.start||null,p_to:range.end||null}),
    getAnalyticsMetricBreakdown(db,filters,"platform",{population:"clicks",limit:1}),
    getAnalyticsMetricBreakdown(db,filters,"source",{population:"views",limit:5}),
    db.from("click_events").select("id,event_type,platform,referrer,utm_source,created_at,link_page_id,link_pages(title,slug)").eq("workspace_id",workspaceId).gte("created_at",range.start!).lte("created_at",range.end!).in("event_type",["page_view","view_content","platform_click"]).order("created_at",{ascending:false}).limit(8),
  ]);
  if(pagesResult.error)throw new Error(pagesResult.error.message);if(recentResult.error)throw new Error(recentResult.error.message);
  const pages=(pagesResult.data||[]) as PageRow[];
  let fallbackEvents:EventRow[]=[];
  if(linkMetricsResult.error||!topPlatforms||!optimizedSources){
    const fallback=await db.from("click_events").select("id,event_type,platform,referrer,utm_source,created_at,link_page_id,link_pages(title,slug)").eq("workspace_id",workspaceId).gte("created_at",range.start!).lte("created_at",range.end!).order("created_at",{ascending:false}).limit(1000);
    if(fallback.error)throw new Error(fallback.error.message);fallbackEvents=(fallback.data||[]) as unknown as EventRow[];
  }
  const visits=summary.visits,clicks=summary.clicks;
  let topPlatform=topPlatforms?.[0]?([topPlatforms[0].name,topPlatforms[0].count] as [string,number]):undefined;
  if(!topPlatforms){const platformCounts=new Map<string,number>();for(const event of fallbackEvents.filter((event)=>isAnalyticsClickEvent(event.event_type))){const key=event.platform||"Unknown";platformCounts.set(key,(platformCounts.get(key)||0)+1)}topPlatform=[...platformCounts.entries()].sort((a,b)=>b[1]-a[1])[0]}
  const rpcMetrics=!linkMetricsResult.error&&Array.isArray(linkMetricsResult.data)?new Map(linkMetricsResult.data.map((row:any)=>[String(row.link_page_id),{visits:Number(row.views||0),clicks:Number(row.clicks||0),lastActivity:row.last_activity?String(row.last_activity):undefined}])):null;
  if(linkMetricsResult.error)console.warn("[tone-link:overview:link-metrics]",linkMetricsResult.error.message);
  const linkSummaries=rpcMetrics?null:await Promise.all(pages.map(async(page)=>({page,summary:await getAnalyticsSummaryCounts(db,{workspaceId,from:range.start,to:range.end,linkPageId:page.id})})));
  const links=rpcMetrics?pages.map(page=>{const metrics=rpcMetrics.get(page.id)||{visits:0,clicks:0,lastActivity:undefined};return{...page,...metrics,ctr:metrics.visits?Math.round(metrics.clicks/metrics.visits*100):0}}):linkSummaries!.map(({page,summary})=>{const activity=fallbackEvents.filter(event=>event.link_page_id===page.id);return{...page,visits:summary.visits,clicks:summary.clicks,ctr:summary.ctr,lastActivity:activity[0]?.created_at}});
  links.sort((a,b)=>b.clicks-a.clicks||b.visits-a.visits||new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime());
  let sources=optimizedSources||[];
  if(!optimizedSources){const sourceCounts=new Map<string,number>();for(const event of fallbackEvents){let name=event.utm_source?.trim();if(!name){try{name=event.referrer?new URL(event.referrer).hostname:"Direct / unknown"}catch{name="Direct / unknown"}}sourceCounts.set(name||"Direct / unknown",(sourceCounts.get(name||"Direct / unknown")||0)+1)}sources=[...sourceCounts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,5)}
  return{timezone,visits,clicks,ctr:visits?Math.round(clicks/visits*100):0,topPlatform:topPlatform?{name:topPlatform[0],count:topPlatform[1]}:undefined,bestLink:links.find(link=>link.clicks||link.visits),recentPublished:pages.filter(page=>page.published).sort((a,b)=>new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime())[0],links:links.slice(0,5),drafts:pages.filter(page=>!page.published).slice(0,5),recent:(recentResult.data||[]) as unknown as EventRow[],sources};
}
