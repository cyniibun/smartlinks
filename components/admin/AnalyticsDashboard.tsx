"use client";

import { useEffect, useMemo, useState } from "react";
import { AsyncError } from "@/components/admin/AsyncError";
import { formatWorkspaceDate } from "@/lib/timezone";
import { displayUtmCampaign, displayUtmMedium, displayUtmSource } from "@/lib/utm";

type Option = { id: string; name?: string; title?: string; slug?: string };
type Metric = { name: string; count: number };
type CountryMetric = { country: string; views: number };
type RegionMetric = { country: string; region: string; views: number };
type CityMetric = { country: string; region?: string | null; city: string; views: number };
type Point = { date: string; views: number; clicks: number; ctr: number };
type RecentEvent = { id: string; event_type: string; platform?: string; created_at: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; device_type?: string; browser?: string; songs?: { title: string }; releases?: { title: string }; link_pages?: { title: string }; referrer?: string };
type Analytics = { timezone: string; planId?: string; canExport?: boolean; lockedRange?: boolean; eventTypes?: string[]; summary: { visits: number; clicks: number }; byPlatform: Metric[]; bySong: Metric[]; referrers: Metric[]; utmSources: Metric[]; campaigns: Metric[]; devices: Metric[]; browsers: Metric[]; countryBreakdown?: CountryMetric[]; regionBreakdown?: RegionMetric[]; cityBreakdown?: CityMetric[]; timeSeries: Point[]; recent: RecentEvent[]; configured: boolean; retentionDays?: number | null; retentionLimited?: boolean; recentPage?: number; recentHasMore?: boolean };

const emptyAnalytics: Analytics = { timezone: "America/New_York", summary: { visits: 0, clicks: 0 }, byPlatform: [], bySong: [], referrers: [], utmSources: [], campaigns: [], devices: [], browsers: [], timeSeries: [], recent: [], configured: true };
const eventTypes = ["page_view", "view_content", "platform_click", "copy_url", "share", "embed_click", "campaign_click"];

function Spinner() {
  return <span className="tone-spinner" aria-label="Loading analytics" />;
}

function KpiSkeleton() {
  return <div className="stat-grid">{Array.from({ length: 3 }).map((_, i) => <article key={i}><span className="skeleton skeleton-line short" /><strong><Spinner /></strong></article>)}</div>;
}

function BreakdownSkeleton() {
  return <div className="analytics-grid">{Array.from({ length: 7 }).map((_, i) => <section className={`admin-panel metric-panel ${i === 0 ? "full-chart" : ""}`} key={i}><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-chart" />{Array.from({ length: 3 }).map((__, row) => <span className="skeleton skeleton-line" key={row} />)}</section>)}</div>;
}

function RecentSkeleton() {
  return <section className="admin-panel" id="recent-events"><div className="panel-title"><div><h2>Recent events</h2><p className="muted">Loading event log…</p></div><Spinner /></div><div className="recent-table analytics-recent">{Array.from({ length: 6 }).map((_, i) => <div key={i}>{Array.from({ length: 9 }).map((__, j) => <span className="skeleton skeleton-line" key={j} />)}</div>)}</div></section>;
}

function Bars({ title, data, emptyLabel = "No data yet" }: { title: string; data: Metric[]; emptyLabel?: string }) {
  const max = Math.max(...data.map((i) => i.count), 1);
  return <section className="admin-panel metric-panel"><h2>{title}</h2>{data.length ? <div className="bar-list">{data.slice(0, 10).map((i) => <div className="bar-item" key={i.name}><div><span>{i.name}</span><strong>{i.count}</strong></div><i style={{ width: `${i.count / max * 100}%` }} /></div>)}</div> : <div className="analytics-empty"><strong>{emptyLabel}</strong><p>Once matching tracking events are recorded, this card will show the top results for the selected filters.</p></div>}</section>;
}

function TimeSeriesChart({ data, workspaceId, loaded }: { data: Point[]; workspaceId?: string; loaded: boolean }) {
  const max = Math.max(...data.map((i) => Math.max(i.views, i.clicks)), 1);
  const meaningful = data.filter((point) => point.views || point.clicks).length;
  const [tip, setTip] = useState<{ point: Point; dateLabel: string; left: number; top: number } | null>(null);
  const activate = (event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>, point: Point, dateLabel: string) => {
    const button = event.currentTarget;
    const chart = button.closest(".time-series-chart") as HTMLElement | null;
    if (!chart) return;
    const chartRect = chart.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const tooltipWidth = 220;
    const tooltipHeight = 104;
    const padding = 10;
    const centered = buttonRect.left - chartRect.left + buttonRect.width / 2 - tooltipWidth / 2;
    const left = Math.min(Math.max(centered, padding), Math.max(chartRect.width - tooltipWidth - padding, padding));
    const above = buttonRect.top - chartRect.top - tooltipHeight - 12;
    const below = buttonRect.bottom - chartRect.top + 10;
    const top = above > padding ? above : Math.min(below, Math.max(chartRect.height - tooltipHeight - padding, padding));
    setTip({ point, dateLabel, left, top });
  };
  return <section className="admin-panel metric-panel full-chart"><div className="panel-title"><div><h2>Views, clicks, and CTR over time</h2><p className="muted">Hover, focus, or tap a day to inspect exact values.</p></div><div className="chart-legend"><span><i className="views" />Views</span><span><i className="clicks" />Clicks</span><span><i className="ctr" />CTR</span></div></div>{loaded && meaningful < 3 && <div className="analytics-helper"><strong>Analytics will become more useful as traffic comes in.</strong><p>For now, use test campaigns or copied links to verify tracking.</p><div><a href={workspaceId ? `/dashboard/${workspaceId}/link-pages` : "/dashboard"}>Open Smart Links</a><a href={workspaceId ? `/dashboard/${workspaceId}/create` : "/dashboard"}>Create Test Campaign URL</a><a href="#recent-events">View Recent Events</a></div></div>}{data.length ? <div className="time-series-chart" onMouseLeave={() => setTip(null)}>{data.map((point) => { const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${point.date}T12:00:00`)); const label = `${dateLabel}. Views: ${point.views}. Clicks: ${point.clicks}. CTR: ${point.ctr}%.`; return <button type="button" className="time-series-point" key={point.date} aria-label={label} onMouseEnter={(event) => activate(event, point, dateLabel)} onFocus={(event) => activate(event, point, dateLabel)} onBlur={() => setTip(null)} onClick={(event) => { activate(event, point, dateLabel); const button = event.currentTarget; button.classList.add("tap-active"); window.setTimeout(() => button.classList.remove("tap-active"), 1800); window.setTimeout(() => setTip(null), 2200); }}><span>{point.date.slice(5)}</span><div><i className="views" style={{ height: `${Math.max(point.views / max * 100, 3)}%` }} /><i className="clicks" style={{ height: `${Math.max(point.clicks / max * 100, 3)}%` }} /></div><small>{point.ctr}% CTR</small></button>; })}{tip && <div className="chart-tooltip" role="tooltip" style={{ left: tip.left, top: tip.top }}><strong>{tip.dateLabel}</strong><span>Views: {tip.point.views}</span><span>Clicks: {tip.point.clicks}</span><span>CTR: {tip.point.ctr}%</span></div>}</div> : <div className="analytics-empty"><strong>No time-series data yet</strong><p>Tracking events for this date range will appear here after page views or platform clicks are recorded.</p></div>}</section>;
}

export function AnalyticsDashboard({ workspaceId, artistId = "", releaseId = "", linkPageId = "", artists = [], linkPages = [] }: { workspaceId?: string; artistId?: string; releaseId?: string; linkPageId?: string; artists?: Option[]; linkPages?: Option[] }) {
  const [data, setData] = useState<Analytics>(emptyAnalytics);
  const [loadState, setLoadState] = useState<"loading" | "loaded_with_data" | "loaded_empty" | "error">("loading");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");
  const [filters, setFilters] = useState({ range: "7", from: "", to: "", eventType: "", platform: "", utmSource: "", utmCampaign: "", artistId, releaseId, linkPageId, recentPage: "1" });
  const queryBase = useMemo(() => { const q = new URLSearchParams(); if (workspaceId) q.set("workspaceId", workspaceId); q.set("range", filters.range); if (filters.range === "custom") { if (filters.from) q.set("from", new Date(`${filters.from}T00:00:00`).toISOString()); if (filters.to) q.set("to", new Date(`${filters.to}T23:59:59`).toISOString()); } q.set("recentPage", filters.recentPage); q.set("recentLimit", "50"); q.set("limit", "1000"); Object.entries(filters).forEach(([k, v]) => { if (v && !["range", "from", "to", "recentPage"].includes(k)) q.set(k, v); }); return q; }, [workspaceId, filters]);
  const buildQuery = (summary = false) => { const q = new URLSearchParams(queryBase); if (summary) q.set("summary", "1"); return q; };
  const hasMeaningfulData = (next: Analytics) => Boolean(next.summary.visits || next.summary.clicks || next.timeSeries.some((point) => point.views || point.clicks) || next.recent.length);
  const load = () => {
    setLoadState("loading"); setSummaryLoading(true); setBreakdownLoading(true); setError(""); setDetail("");
    fetch(`/api/admin/analytics?${buildQuery(true)}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `Analytics summary failed (${r.status})`); setData((current) => ({ ...current, ...j })); setSummaryLoading(false); return fetch(`/api/admin/analytics?${buildQuery(false)}`); }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `Analytics breakdown failed (${r.status})`); setData(j); setLoadState(hasMeaningfulData(j) ? "loaded_with_data" : "loaded_empty"); }).catch((e) => { setLoadState("error"); setError("Unable to load analytics."); setDetail(e instanceof Error ? e.message : "Analytics request failed."); }).finally(() => { setSummaryLoading(false); setBreakdownLoading(false); });
  };
  useEffect(load, [queryBase]);
  const exportHref = `/api/admin/analytics?${new URLSearchParams([...queryBase.entries(), ["export", "csv"]])}`;
  const updateFilter = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch, recentPage: patch.recentPage || "1" }));
  const loaded = loadState === "loaded_with_data" || loadState === "loaded_empty";
  return <main className="admin-main analytics-page"><div className="admin-title-row"><div><span className="admin-kicker">PERFORMANCE</span><h1>Analytics</h1><p>Reporting across Smart Links, campaigns, traffic sources, and devices.</p></div><div className="editor-actions">{data.canExport ? <a className="admin-secondary" href={exportHref}>Export event log CSV</a> : <button className="admin-secondary" disabled title="CSV event-log export is available on upgraded plans.">Export event log CSV</button>}</div></div>{error && <AsyncError message={error} detail={detail} onRetry={load} />}
    <section className="admin-panel analytics-filters"><select value={filters.range} onChange={(e) => updateFilter({ range: e.target.value })}><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option><option value="all">All time</option><option value="custom">Custom</option></select>{filters.range === "custom" && <><input type="date" value={filters.from} onChange={(e) => updateFilter({ from: e.target.value })} /><input type="date" value={filters.to} onChange={(e) => updateFilter({ to: e.target.value })} /></>}<select value={filters.artistId} onChange={(e) => updateFilter({ artistId: e.target.value })}><option value="">All artists</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select><select value={filters.linkPageId} onChange={(e) => updateFilter({ linkPageId: e.target.value })}><option value="">All Smart Links</option>{linkPages.map((page) => <option key={page.id} value={page.id}>{page.title || page.slug}</option>)}</select><input placeholder="Platform" value={filters.platform} onChange={(e) => updateFilter({ platform: e.target.value })} /><select value={filters.eventType} onChange={(e) => updateFilter({ eventType: e.target.value })}><option value="">All events</option>{eventTypes.map((v) => <option key={v}>{v}</option>)}</select><input placeholder="UTM source" value={filters.utmSource} onChange={(e) => updateFilter({ utmSource: e.target.value })} /><input placeholder="UTM campaign" value={filters.utmCampaign} onChange={(e) => updateFilter({ utmCampaign: e.target.value })} /></section>
    {data.retentionLimited && <div className="admin-alert">This workspace is on the {data.planId || "free"} plan. {data.retentionDays ? `Analytics are limited to ${data.retentionDays} days.` : "Custom/all-time reporting is locked."} Upgrade to unlock the selected range.</div>}
    {summaryLoading ? <KpiSkeleton /> : <div className="stat-grid"><article><span>Total views</span><strong>{data.summary.visits}</strong></article><article><span>Outbound clicks</span><strong>{data.summary.clicks}</strong></article><article><span>Click-through rate</span><strong>{data.summary.visits ? `${Math.round(data.summary.clicks / data.summary.visits * 100)}%` : "—"}</strong></article></div>}
    {breakdownLoading ? <><BreakdownSkeleton /><RecentSkeleton /></> : <><div className="analytics-grid"><TimeSeriesChart data={data.timeSeries} workspaceId={workspaceId} loaded={loaded} /><Bars title="Platform breakdown" data={data.byPlatform} /><Bars title="Top Smart Links" data={data.bySong} /><Bars title="Top Countries" data={(data.countryBreakdown || []).map((item) => ({ name: item.country, count: item.views }))} emptyLabel="No country data yet" /><Bars title="Referrers" data={data.referrers} emptyLabel="No referrers yet" /><Bars title="UTM Sources" data={data.utmSources} emptyLabel="No UTM sources yet" /><Bars title="UTM Campaigns" data={data.campaigns} emptyLabel="No UTM campaigns yet" /><Bars title="Devices" data={data.devices} /><Bars title="Browsers" data={data.browsers} /></div><section className="admin-panel" id="recent-events"><div className="panel-title"><div><h2>Recent events</h2><p className="muted">Showing 50 events per page.</p></div><div className="pagination-row compact"><button disabled={filters.recentPage === "1"} onClick={() => updateFilter({ recentPage: String(Math.max(Number(filters.recentPage) - 1, 1)) })}>Previous</button><span>Page {filters.recentPage}</span><button disabled={!data.recentHasMore} onClick={() => updateFilter({ recentPage: String(Number(filters.recentPage) + 1) })}>Next</button></div></div>{data.recent.length ? <div className="recent-table analytics-recent">{data.recent.map((e) => <div key={e.id}><time>{formatWorkspaceDate(e.created_at, data.timezone, true)}</time><span className={`status-pill ${["page_view", "view_content", "visit"].includes(e.event_type) ? "draft" : "published"}`}>{e.event_type}</span><strong>{e.link_pages?.title || e.releases?.title || e.songs?.title || "Unknown"}</strong><span>{e.platform || "Page"}</span><span>{e.referrer || "Direct"}</span><span>{displayUtmSource(e.utm_source)}</span><span>{displayUtmCampaign(e.utm_campaign)}</span><span>{displayUtmMedium(e.utm_medium)}</span><span>{e.device_type || "Unknown"}</span></div>)}</div> : <div className="analytics-empty"><strong>No recent events yet</strong><p>Open a Smart Link, copy its URL, or click a platform button to verify tracking.</p></div>}</section></>}
  </main>;
}
