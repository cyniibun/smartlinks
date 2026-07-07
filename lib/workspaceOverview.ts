import "server-only";
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
  const [eventsResult,pagesResult]=await Promise.all([
    db.from("click_events").select("id,event_type,platform,referrer,utm_source,created_at,link_page_id,link_pages(title,slug)").eq("workspace_id",workspaceId).gte("created_at",range.start!).lte("created_at",range.end!).order("created_at",{ascending:false}).limit(1000),
    db.from("link_pages").select("id,slug,title,artist_display_name,published,created_at,updated_at").eq("workspace_id",workspaceId).order("updated_at",{ascending:false}),
  ]);
  if(eventsResult.error)throw new Error(eventsResult.error.message);if(pagesResult.error)throw new Error(pagesResult.error.message);
  const events=(eventsResult.data||[]) as unknown as EventRow[];const pages=(pagesResult.data||[]) as PageRow[];
  const isVisit=(event:EventRow)=>["visit","page_view"].includes(event.event_type);const isClick=(event:EventRow)=>event.event_type==="platform_click";
  const visits=events.filter(isVisit).length,clicks=events.filter(isClick).length;
  const platformCounts=new Map<string,number>();for(const event of events.filter(isClick)){const key=event.platform||"Unknown";platformCounts.set(key,(platformCounts.get(key)||0)+1)}
  const topPlatform=[...platformCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
  const links=pages.map(page=>{const activity=events.filter(event=>event.link_page_id===page.id);const pageVisits=activity.filter(isVisit).length,pageClicks=activity.filter(isClick).length;return{...page,visits:pageVisits,clicks:pageClicks,ctr:pageVisits?Math.round(pageClicks/pageVisits*100):0,lastActivity:activity[0]?.created_at}}).sort((a,b)=>b.clicks-a.clicks||b.visits-a.visits||new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime());
  const sourceCounts=new Map<string,number>();for(const event of events){let name=event.utm_source?.trim();if(!name){try{name=event.referrer?new URL(event.referrer).hostname:"Direct / unknown"}catch{name="Direct / unknown"}}sourceCounts.set(name||"Direct / unknown",(sourceCounts.get(name||"Direct / unknown")||0)+1)}
  return{timezone,visits,clicks,ctr:visits?Math.round(clicks/visits*100):0,topPlatform:topPlatform?{name:topPlatform[0],count:topPlatform[1]}:undefined,bestLink:links.find(link=>link.clicks||link.visits),recentPublished:pages.filter(page=>page.published).sort((a,b)=>new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime())[0],links:links.slice(0,5),drafts:pages.filter(page=>!page.published).slice(0,5),recent:events.slice(0,8),sources:[...sourceCounts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,5)};
}
