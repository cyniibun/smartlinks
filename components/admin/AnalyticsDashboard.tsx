"use client";

import type { FocusEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WorldCountryMap, getCountryName } from "@/components/analytics/WorldCountryMap";
import { AsyncError } from "@/components/admin/AsyncError";
import { formatWorkspaceDate } from "@/lib/timezone";
import { displayUtmCampaign, displayUtmMedium, displayUtmSource } from "@/lib/utm";
import { displayEventType, displayPlatformName, eventBadgeClass } from "@/lib/activityDisplay";
import { FiEye, FiMousePointer, FiTarget, FiTrendingUp, FiUsers } from "react-icons/fi";

type Option = { id: string; name?: string; title?: string; slug?: string };
type Metric = { name: string; count: number };
type CountryMetric = { country: string; views: number };
type RegionMetric = { country: string; region: string; views: number };
type CityMetric = { country: string; region?: string | null; city: string; views: number };
type Point = { date: string; views: number; clicks: number; ctr: number };
type RecentEvent = { id: string; event_type: string; platform?: string; created_at: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; device_type?: string; browser?: string; country?: string | null; songs?: { title: string }; releases?: { title: string }; link_pages?: { title: string }; referrer?: string };
type VisitorBehavior = { uniqueVisitors: number | null; sessions: number | null; returningVisitors: number | null; repeatClickers: number | null; medianTimeToClickSeconds: number | null; engagementRate: number | null; visitorIdentityEvents: number; available: boolean };
type Analytics = { timezone: string; planId?: string; canExport?: boolean; lockedRange?: boolean; eventTypes?: string[]; summary: { visits: number; clicks: number }; visitorBehavior?: VisitorBehavior; byPlatform: Metric[]; bySong: Metric[]; referrers: Metric[]; utmSources: Metric[]; campaigns: Metric[]; devices: Metric[]; browsers: Metric[]; countryBreakdown?: CountryMetric[]; regionBreakdown?: RegionMetric[]; cityBreakdown?: CityMetric[]; timeSeries: Point[]; recent: RecentEvent[]; configured: boolean; retentionDays?: number | null; retentionLimited?: boolean; recentPage?: number; recentHasMore?: boolean };
type PixelSummary = { id: string; provider: string; providerName: string; name: string; safeId: string | null; status: string; health: string; lastSuccessfulEvent: string | null; events: number; assignmentScope: { workspaceDefault: boolean; artists: number; releases: number } };

const emptyAnalytics: Analytics = { timezone: "America/New_York", summary: { visits: 0, clicks: 0 }, byPlatform: [], bySong: [], referrers: [], utmSources: [], campaigns: [], devices: [], browsers: [], timeSeries: [], recent: [], configured: true };
const visibleEventTypes = ["page_view", "view_content", "platform_click"];
const eventTypes = visibleEventTypes;

function Spinner() {
  return <span className="tone-spinner" aria-label="Loading analytics" />;
}

function KpiSkeleton() {
  return <div className="analytics-kpi-grid">{Array.from({ length: 5 }).map((_, i) => <article className="analytics-kpi-card" key={i}><span className="skeleton skeleton-line short" /><strong><Spinner /></strong><span className="skeleton skeleton-line" /></article>)}</div>;
}

function BreakdownSkeleton() {
  return <div className="analytics-grid">{Array.from({ length: 7 }).map((_, i) => <section className={`admin-panel metric-panel ${i === 0 ? "full-chart" : ""}`} key={i}><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-chart" />{Array.from({ length: 3 }).map((__, row) => <span className="skeleton skeleton-line" key={row} />)}</section>)}</div>;
}

function RecentSkeleton() {
  return <section className="admin-panel" id="recent-events"><div className="panel-title"><div><h2>Recent events</h2><p className="muted">Loading event log…</p></div><Spinner /></div><div className="recent-table analytics-recent">{Array.from({ length: 6 }).map((_, i) => <div key={i}>{Array.from({ length: 9 }).map((__, j) => <span className="skeleton skeleton-line" key={j} />)}</div>)}</div></section>;
}

function Bars({ title, data, emptyLabel = "No data yet", formatName = (name: string) => name }: { title: string; data: Metric[]; emptyLabel?: string; formatName?: (name: string) => string }) {
  const max = Math.max(...data.map((i) => i.count), 1);
  return <section className="admin-panel metric-panel"><h2>{title}</h2>{data.length ? <div className="bar-list">{data.slice(0, 10).map((i) => <div className="bar-item" key={i.name}><div><span>{formatName(i.name)}</span><strong>{i.count}</strong></div><i style={{ width: `${i.count / max * 100}%` }} /></div>)}</div> : <div className="analytics-empty"><strong>{emptyLabel}</strong><p>Once matching tracking events are recorded, this card will show the top results for the selected filters.</p></div>}</section>;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompactDateTime(value: string | null | undefined, timezone: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const safeDate = new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "short", day: "numeric" }).format(date);
  const safeTime = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(date);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(yesterdayDate);
  const eventDay = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const eventYear = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric" }).format(date);
  const currentYear = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric" }).format(new Date());
  if (eventDay === today) return `Today · ${safeTime}`;
  if (eventDay === yesterday) return `Yesterday · ${safeTime}`;
  return `${safeDate}${eventYear !== currentYear ? `, ${eventYear}` : ""} · ${safeTime}`;
}

function normalizeMetricName(name: string) {
  const value = String(name || "Unknown").trim();
  const key = value.toLowerCase();
  if (["mobile", "phone"].includes(key)) return "Mobile";
  if (["desktop", "computer"].includes(key)) return "Desktop";
  if (["tablet"].includes(key)) return "Tablet";
  if (!value || key === "unknown" || key === "undefined" || key === "null") return "Unknown";
  return displayPlatformName(value, value);
}

function mergeMetrics(data: Metric[]) {
  const totals = new Map<string, number>();
  data.forEach((item) => {
    const name = normalizeMetricName(item.name);
    totals.set(name, (totals.get(name) || 0) + item.count);
  });
  return [...totals.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function Sparkline({ data }: { data: Point[] }) {
  const points = data.length ? data : [{ date: "", views: 0, clicks: 0, ctr: 0 }];
  const max = Math.max(...points.map((point) => point.views), 1);
  const path = points.map((point, index) => {
    const x = points.length === 1 ? 0 : index / (points.length - 1) * 100;
    const y = 42 - point.views / max * 36;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  return <svg className="analytics-sparkline" viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true"><path d={path} /></svg>;
}

function KpiCard({ label, value, caption, data, icon }: { label: string; value: string; caption: string; data: Point[]; icon: ReactNode }) {
  return <article className="analytics-kpi-card"><span>{label}</span><div className="analytics-kpi-icon" aria-hidden="true">{icon}</div><strong>{value}</strong><small>{caption}</small><Sparkline data={data} /></article>;
}

function percent(count: number, total: number) {
  return total ? Math.round(count / total * 100) : 0;
}

function DonutCard({ title, data, emptyLabel = "No data yet" }: { title: string; data: Metric[]; emptyLabel?: string }) {
  const normalized = mergeMetrics(data).slice(0, 5);
  const total = normalized.reduce((sum, item) => sum + item.count, 0);
  const colors = ["var(--tl-chart-primary,#ff4f93)", "#58d68d", "var(--tl-pink-2,#ff8ab9)", "#77f7ff", "#8f7cff"];
  const cardRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const circumference = 2 * Math.PI * 42;
  let offset = 0;
  const activeItem = normalized.find((item) => item.name === active);
  const activate = (name: string, event: MouseEvent<Element> | FocusEvent<Element>) => {
    setActive(name);
    const card = cardRef.current;
    if (!card) return;
    const cardRect = card.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 168;
    const tooltipHeight = 88;
    const padding = 14;
    const eventClientX = "clientX" in event && event.clientX ? event.clientX : targetRect.left + targetRect.width / 2;
    const eventClientY = "clientY" in event && event.clientY ? event.clientY : targetRect.top + targetRect.height / 2;
    let left = eventClientX - cardRect.left + 14;
    let top = eventClientY - cardRect.top - tooltipHeight - 12;
    if (left + tooltipWidth > cardRect.width - padding) left = eventClientX - cardRect.left - tooltipWidth - 14;
    if (top < padding) top = eventClientY - cardRect.top + 14;
    left = Math.min(Math.max(left, padding), Math.max(cardRect.width - tooltipWidth - padding, padding));
    top = Math.min(Math.max(top, padding), Math.max(cardRect.height - tooltipHeight - padding, padding));
    setTooltipPosition({ left, top });
  };
  const clearActive = () => { setActive(null); setTooltipPosition(null); };
  return <section ref={cardRef} className="admin-panel metric-panel analytics-donut-card"><div className="panel-title"><h2>{title}</h2></div>{normalized.length ? <div className="donut-layout"><div className="donut-chart interactive" onMouseLeave={clearActive}><svg viewBox="0 0 120 120" aria-label={`${title} distribution`} role="img">{normalized.map((item, index) => {
    const length = item.count / total * circumference;
    const dashOffset = -offset;
    offset += length;
    const isDimmed = Boolean(active && active !== item.name);
    return <circle key={item.name} className={`donut-segment ${isDimmed ? "dimmed" : ""} ${active === item.name ? "active" : ""}`} cx="60" cy="60" r="42" fill="none" stroke={colors[index % colors.length]} strokeWidth="22" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} pathLength={circumference} transform="rotate(-90 60 60)" tabIndex={0} role="button" aria-label={`${displayPlatformName(item.name, item.name)}: ${formatCount(item.count)} clicks, ${percent(item.count, total)} percent`} onMouseEnter={(event) => activate(item.name, event)} onMouseMove={(event) => activate(item.name, event)} onFocus={(event) => activate(item.name, event)} onBlur={clearActive} />;
  })}</svg><div className="donut-center"><span>{formatCount(total)}</span><small>clicks</small></div>{activeItem && tooltipPosition && <div className="donut-tooltip" style={tooltipPosition} role="tooltip"><strong>{displayPlatformName(activeItem.name, activeItem.name)}</strong><span>{formatCount(activeItem.count)} clicks</span><span>{percent(activeItem.count, total)}%</span></div>}</div><div className="donut-legend">{normalized.map((item, index) => <button type="button" key={item.name} className={active === item.name ? "active" : ""} onMouseEnter={(event) => activate(item.name, event)} onMouseMove={(event) => activate(item.name, event)} onFocus={(event) => activate(item.name, event)} onBlur={clearActive}><i style={{ background: colors[index % colors.length] }} /><span>{displayPlatformName(item.name, item.name)}</span><strong>{percent(item.count, total)}%</strong><small>{formatCount(item.count)}</small></button>)}</div></div> : <div className="analytics-empty"><strong>{emptyLabel}</strong><p>Distribution appears after matching events are recorded.</p></div>}</section>;
}

function CountriesCard({ data }: { data?: CountryMetric[] }) {
  const rows = (data || []).slice(0, 6);
  const max = Math.max(...rows.map((item) => item.views), 1);
  const mapCountries = rows.map((item) => ({ countryCode: item.country, countryName: getCountryName(item.country), value: item.views }));
  return <section className="admin-panel metric-panel countries-card"><div className="panel-title"><h2>Top Countries</h2></div><div className="countries-layout"><div className="world-map-visual"><WorldCountryMap countries={mapCountries} /></div>{rows.length ? <div className="bar-list">{rows.map((item) => <div className="bar-item" key={item.country}><div><span>{getCountryName(item.country)}</span><strong>{formatCount(item.views)} views</strong></div><i style={{ width: `${item.views / max * 100}%` }} /></div>)}</div> : <div className="analytics-empty"><strong>Country data will appear once geo tracking is enabled.</strong><p>New page-view events can include privacy-safe country, region, and city fields when the hosting edge provides them.</p></div>}</div></section>;
}

const analyticsTabs = ["Overview", "Audience", "Releases", "Campaigns", "Platforms", "Referrers", "Events", "Pixels"] as const;
type AnalyticsTab = (typeof analyticsTabs)[number];

function AnalyticsTabs({ activeTab, onChange }: { activeTab: AnalyticsTab; onChange: (tab: AnalyticsTab) => void }) {
  return <nav className="analytics-tabs" aria-label="Analytics sections">{analyticsTabs.map((tab) => <button key={tab} className={tab === activeTab ? "active" : ""} type="button" onClick={() => onChange(tab)}>{tab}</button>)}</nav>;
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
  return <section className="admin-panel metric-panel full-chart link-views-card"><div className="panel-title"><div><h2>Link Views</h2><p className="muted">Views, clicks, and CTR over time.</p></div><div className="chart-legend"><span><i className="views" />Views</span><span><i className="clicks" />Clicks</span><span><i className="ctr" />CTR</span></div></div>{loaded && meaningful < 3 && <div className="analytics-helper"><strong>Analytics will become more useful as traffic comes in.</strong><p>For now, use test campaigns or copied links to verify tracking.</p><div><a href={workspaceId ? `/dashboard/${workspaceId}/link-pages` : "/dashboard"}>Open Releases</a><a href={workspaceId ? `/dashboard/${workspaceId}/create` : "/dashboard"}>Create a Release</a><a href="#recent-events">View Recent Events</a></div></div>}{data.length ? <div className="time-series-chart" onMouseLeave={() => setTip(null)}>{data.map((point) => { const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${point.date}T12:00:00`)); const label = `${dateLabel}. Views: ${point.views}. Clicks: ${point.clicks}. CTR: ${point.ctr}%.`; return <button type="button" className="time-series-point" key={point.date} aria-label={label} onMouseEnter={(event) => activate(event, point, dateLabel)} onFocus={(event) => activate(event, point, dateLabel)} onBlur={() => setTip(null)} onClick={(event) => { activate(event, point, dateLabel); const button = event.currentTarget; button.classList.add("tap-active"); window.setTimeout(() => button.classList.remove("tap-active"), 1800); window.setTimeout(() => setTip(null), 2200); }}><span>{point.date.slice(5)}</span><div><i className="views" style={{ height: `${Math.max(point.views / max * 100, 3)}%` }} /><i className="clicks" style={{ height: `${Math.max(point.clicks / max * 100, 3)}%` }} /></div><small>{point.ctr}% CTR</small></button>; })}{tip && <div className="chart-tooltip" role="tooltip" style={{ left: tip.left, top: tip.top }}><strong>{tip.dateLabel}</strong><span>Views: {tip.point.views}</span><span>Clicks: {tip.point.clicks}</span><span>CTR: {tip.point.ctr}%</span></div>}</div> : <div className="analytics-empty"><strong>No time-series data yet</strong><p>Tracking events for this date range will appear here after page views or platform clicks are recorded.</p></div>}</section>;
}

function InsightCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="admin-panel metric-panel insight-card"><h2>{title}</h2>{children}</section>;
}

function EventLog({ data, filters, updateFilter }: { data: Analytics; filters: { recentPage: string }; updateFilter: (patch: { recentPage: string }) => void }) {
  const visibleRecent = data.recent.filter((event) => visibleEventTypes.includes(event.event_type));
  return <section className="admin-panel analytics-events-card" id="recent-events"><div className="panel-title"><div><h2>Recent activity</h2><p className="muted">Showing 50 events per page.</p></div><div className="pagination-row compact"><button disabled={filters.recentPage === "1"} onClick={() => updateFilter({ recentPage: String(Math.max(Number(filters.recentPage) - 1, 1)) })}>Previous</button><span>Page {filters.recentPage}</span><button disabled={!data.recentHasMore} onClick={() => updateFilter({ recentPage: String(Number(filters.recentPage) + 1) })}>Next</button></div></div>{visibleRecent.length ? <div className="recent-table analytics-recent">{visibleRecent.map((e) => <div key={e.id}><time>{formatWorkspaceDate(e.created_at, data.timezone, true)}</time><span className={eventBadgeClass(e.event_type)}>{displayEventType(e.event_type)}</span><strong>{e.link_pages?.title || e.releases?.title || e.songs?.title || "Unknown"}</strong><span className="mobile-event-meta">{displayPlatformName(e.platform)} · {formatCompactDateTime(e.created_at, data.timezone)}</span><span>{displayPlatformName(e.platform)}</span><span>{e.referrer || "Direct"}</span><span>{displayUtmSource(e.utm_source)}</span><span>{displayUtmCampaign(e.utm_campaign)}</span><span>{displayUtmMedium(e.utm_medium)}</span><span>{e.device_type || "Unknown"}</span></div>)}</div> : <div className="analytics-empty"><strong>No recent events yet</strong><p>Page View, Engaged View, and Platform Click events will appear here after tracking records them.</p></div>}</section>;
}

function countryFlag(country?: string | null) {
  const code = String(country || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return [...code].map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397)).join("");
}

function RecentClicks({ data }: { data: Analytics }) {
  const clicks = data.recent.filter((event) => event.event_type === "platform_click").slice(0, 8);
  return <section className="admin-panel analytics-recent-clicks"><div className="panel-title"><div><h2>Recent Clicks</h2><p className="muted">Outbound actions only. Full event log lives in Events.</p></div></div>{clicks.length ? <div className="recent-click-strip">{clicks.map((event) => {
    const platform = displayPlatformName(event.platform);
    const flag = countryFlag(event.country);
    return <article key={event.id}><span className={`platform-mini-icon platform-${event.platform || "other"}`}>{platform.slice(0, 1)}</span><div><strong>{platform} click</strong><small>{event.link_pages?.title || event.releases?.title || event.songs?.title || "Unknown"}</small><em>{formatCompactDateTime(event.created_at, data.timezone)}</em></div>{flag && <span className="country-flag" aria-label={event.country || ""}>{flag}</span>}</article>;
  })}</div> : <div className="analytics-empty"><strong>No recent platform clicks yet</strong><p>Clicks to Spotify, Apple Music, YouTube, and other destinations will appear here.</p></div>}</section>;
}

function PixelSummaryPanel({ workspaceId, pixels, loading, timezone }: { workspaceId?: string; pixels: PixelSummary[]; loading: boolean; timezone: string }) {
  return <section className="admin-panel metric-panel analytics-pixels-panel"><div className="panel-title"><div><h2>Assigned Pixels</h2><p className="muted">Read-only status for configured workspace pixel connections.</p></div>{workspaceId && <a className="admin-secondary" href={`/dashboard/${workspaceId}/pixels`}>Manage Pixels</a>}</div>{loading ? <div className="pixel-summary-list">{Array.from({ length: 3 }).map((_, index) => <span key={index} className="skeleton skeleton-line" />)}</div> : pixels.length ? <div className="pixel-summary-list">{pixels.map((pixel) => <article key={pixel.id}><span className={`pixel-provider-icon provider-${pixel.provider}`}>{pixel.providerName.slice(0, 2)}</span><div><strong>{pixel.name}</strong><small>{pixel.providerName} · {pixel.safeId || "Safe ID hidden"}</small><em>{pixel.assignmentScope.workspaceDefault ? "Workspace default" : "Assigned"} · {pixel.assignmentScope.artists} artists · {pixel.assignmentScope.releases} releases</em></div><div><span className={`pixel-status status-${pixel.status.toLowerCase() === "active" ? "verified" : pixel.status.toLowerCase() === "error" ? "error" : "pending"}`}>{pixel.status}</span><small>{pixel.events} events</small><small>Last success: {formatCompactDateTime(pixel.lastSuccessfulEvent, timezone)}</small></div></article>)}</div> : <div className="analytics-empty"><strong>No pixels are currently assigned.</strong><p>Configure workspace pixels or assign existing pixel defaults to artists/releases.</p>{workspaceId && <a className="admin-primary" href={`/dashboard/${workspaceId}/pixels`}>Configure Pixels</a>}</div>}</section>;
}

export function AnalyticsDashboard({ workspaceId, artistId = "", releaseId = "", linkPageId = "", artists = [], linkPages = [] }: { workspaceId?: string; artistId?: string; releaseId?: string; linkPageId?: string; artists?: Option[]; linkPages?: Option[] }) {
  const [data, setData] = useState<Analytics>(emptyAnalytics);
  const [loadState, setLoadState] = useState<"loading" | "loaded_with_data" | "loaded_empty" | "error">("loading");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");
  const [filters, setFilters] = useState({ range: "7", from: "", to: "", eventType: "", platform: "", utmSource: "", utmCampaign: "", artistId, releaseId, linkPageId, recentPage: "1" });
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("Overview");
  const [pixelSummaries, setPixelSummaries] = useState<PixelSummary[]>([]);
  const [pixelsLoading, setPixelsLoading] = useState(false);
  const queryBase = useMemo(() => { const q = new URLSearchParams(); if (workspaceId) q.set("workspaceId", workspaceId); q.set("range", filters.range); if (filters.range === "custom") { if (filters.from) q.set("from", new Date(`${filters.from}T00:00:00`).toISOString()); if (filters.to) q.set("to", new Date(`${filters.to}T23:59:59`).toISOString()); } q.set("recentPage", filters.recentPage); q.set("recentLimit", "50"); q.set("limit", "1000"); Object.entries(filters).forEach(([k, v]) => { if (v && !["range", "from", "to", "recentPage"].includes(k)) q.set(k, v); }); return q; }, [workspaceId, filters]);
  const buildQuery = (summary = false) => { const q = new URLSearchParams(queryBase); if (summary) q.set("summary", "1"); return q; };
  const hasMeaningfulData = (next: Analytics) => Boolean(next.summary.visits || next.summary.clicks || next.timeSeries.some((point) => point.views || point.clicks) || next.recent.length);
  const load = () => {
    setLoadState("loading"); setSummaryLoading(true); setBreakdownLoading(true); setError(""); setDetail("");
    fetch(`/api/admin/analytics?${buildQuery(true)}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `Analytics summary failed (${r.status})`); setData((current) => ({ ...current, ...j })); setSummaryLoading(false); return fetch(`/api/admin/analytics?${buildQuery(false)}`); }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `Analytics breakdown failed (${r.status})`); setData(j); setLoadState(hasMeaningfulData(j) ? "loaded_with_data" : "loaded_empty"); }).catch((e) => { setLoadState("error"); setError("Unable to load analytics."); setDetail(e instanceof Error ? e.message : "Analytics request failed."); }).finally(() => { setSummaryLoading(false); setBreakdownLoading(false); });
  };
  useEffect(load, [queryBase]);
  useEffect(() => {
    if (activeTab !== "Pixels" || !workspaceId) return;
    const q = new URLSearchParams();
    q.set("workspaceId", workspaceId);
    if (filters.range === "custom") {
      if (filters.from) q.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
      if (filters.to) q.set("to", new Date(`${filters.to}T23:59:59`).toISOString());
    }
    setPixelsLoading(true);
    fetch(`/api/admin/pixel-deliveries?${q}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Pixel status failed (${response.status})`)))
      .then((payload) => setPixelSummaries(Array.isArray(payload.summary) ? payload.summary : []))
      .catch(() => setPixelSummaries([]))
      .finally(() => setPixelsLoading(false));
  }, [activeTab, workspaceId, filters.range, filters.from, filters.to]);
  const exportHref = `/api/admin/analytics?${new URLSearchParams([...queryBase.entries(), ["export", "csv"]])}`;
  const updateFilter = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch, recentPage: patch.recentPage || "1" }));
  const loaded = loadState === "loaded_with_data" || loadState === "loaded_empty";
  const ctr = data.summary.visits ? Math.round(data.summary.clicks / data.summary.visits * 100) : null;
  const visitorBehavior = data.visitorBehavior;
  const uniqueListeners = visitorBehavior?.uniqueVisitors === null || visitorBehavior?.uniqueVisitors === undefined ? "—" : formatCount(visitorBehavior.uniqueVisitors);
  const conversionRate = ctr === null ? "—" : `${ctr}%`;
  const normalizedDevices = mergeMetrics(data.devices);
  const regionMetrics = (data.regionBreakdown || []).map((item) => ({ name: [item.region, item.country].filter(Boolean).join(", "), count: item.views }));
  const cityMetrics = (data.cityBreakdown || []).map((item) => ({ name: [item.city, item.region, item.country].filter(Boolean).join(", "), count: item.views }));
  const tabGrid = () => {
    switch (activeTab) {
      case "Audience":
        return <><div className="analytics-grid analytics-v2-grid"><InsightCard title="Visitor behavior">{visitorBehavior?.available ? <div className="visitor-metric-grid"><div><span>Unique Visitors</span><strong>{visitorBehavior.uniqueVisitors ?? "—"}</strong></div><div><span>Sessions</span><strong>{visitorBehavior.sessions ?? "—"}</strong></div><div><span>Returning Visitors</span><strong>{visitorBehavior.returningVisitors ?? "—"}</strong></div><div><span>Repeat Clickers</span><strong>{visitorBehavior.repeatClickers ?? "—"}</strong></div><div><span>Median Time to Click</span><strong>{visitorBehavior.medianTimeToClickSeconds === null ? "—" : `${Math.round(visitorBehavior.medianTimeToClickSeconds)}s`}</strong></div><div><span>Engagement Rate</span><strong>{visitorBehavior.engagementRate === null ? "—" : `${visitorBehavior.engagementRate}%`}</strong></div></div> : <div className="analytics-empty"><strong>Visitor identity metrics are collecting privately.</strong><p>Available after events include visitor_id and session_id. Historical rows without those fields are not backfilled.</p></div>}</InsightCard><CountriesCard data={data.countryBreakdown} /><Bars title="Top Regions" data={regionMetrics} emptyLabel="No region data yet" /><Bars title="Top Cities" data={cityMetrics} emptyLabel="No city data yet" /><DonutCard title="Device Breakdown" data={normalizedDevices} emptyLabel="No device data yet" /><Bars title="Browsers" data={data.browsers} /></div></>;
      case "Releases":
        return <div className="analytics-grid analytics-v2-grid"><Bars title="Release Performance" data={data.bySong} emptyLabel="No release clicks yet" /><TimeSeriesChart data={data.timeSeries} workspaceId={workspaceId} loaded={loaded} /><DonutCard title="Top Platforms" data={data.byPlatform} emptyLabel="No platform clicks yet" /></div>;
      case "Campaigns":
        return <div className="analytics-grid analytics-v2-grid"><Bars title="UTM Campaigns" data={data.campaigns} emptyLabel="No UTM campaigns yet" /><Bars title="UTM Sources" data={data.utmSources} emptyLabel="No UTM sources yet" /><DonutCard title="Campaign Platform Mix" data={data.byPlatform} emptyLabel="No campaign platform data yet" /><TimeSeriesChart data={data.timeSeries} workspaceId={workspaceId} loaded={loaded} /></div>;
      case "Platforms":
        return <div className="analytics-grid analytics-v2-grid"><DonutCard title="Top Platforms" data={data.byPlatform} emptyLabel="No platform clicks yet" /><Bars title="Platform Clicks" data={data.byPlatform} emptyLabel="No platform clicks yet" formatName={(name)=>displayPlatformName(name,name)} /><TimeSeriesChart data={data.timeSeries} workspaceId={workspaceId} loaded={loaded} /></div>;
      case "Referrers":
        return <div className="analytics-grid analytics-v2-grid"><Bars title="Top Referrers" data={data.referrers.map((item) => ({ ...item, name: item.name || "Direct" }))} emptyLabel="No referrers yet" /><Bars title="UTM Sources" data={data.utmSources} emptyLabel="No UTM sources yet" /><Bars title="UTM Campaigns" data={data.campaigns} emptyLabel="No UTM campaigns yet" /></div>;
      case "Events":
        return <EventLog data={data} filters={filters} updateFilter={updateFilter} />;
      case "Pixels":
        return <div className="analytics-grid analytics-v2-grid"><PixelSummaryPanel workspaceId={workspaceId} pixels={pixelSummaries} loading={pixelsLoading} timezone={data.timezone} /></div>;
      default:
        return <><div className="analytics-grid analytics-v2-grid"><TimeSeriesChart data={data.timeSeries} workspaceId={workspaceId} loaded={loaded} /><DonutCard title="Top Platforms" data={data.byPlatform} emptyLabel="No platform clicks yet" /><CountriesCard data={data.countryBreakdown} /><Bars title="Top Referrers" data={data.referrers.map((item) => ({ ...item, name: item.name || "Direct" }))} emptyLabel="No referrers yet" /><Bars title="Top Campaigns" data={data.campaigns} emptyLabel="No UTM campaigns yet" /><Bars title="Top Releases" data={data.bySong} /><Bars title="UTM Sources" data={data.utmSources} emptyLabel="No UTM sources yet" /><DonutCard title="Device Breakdown" data={normalizedDevices} emptyLabel="No device data yet" /><Bars title="Browsers" data={data.browsers} /></div><RecentClicks data={data} /></>;
    }
  };
  return <main className="admin-main analytics-page analytics-v2"><div className="admin-title-row analytics-v2-header"><div><h1>Analytics</h1><p>Deep insights into your audience, clicks, and campaigns.</p></div><div className="editor-actions"><select className="analytics-header-range" value={filters.range} onChange={(e) => updateFilter({ range: e.target.value })}><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option><option value="all">All time</option><option value="custom">Custom</option></select><button className="admin-secondary" type="button" disabled>Share</button>{data.canExport ? <a className="admin-primary" href={exportHref}>Export</a> : <button className="admin-primary" disabled title="CSV event-log export is available on upgraded plans.">Export</button>}</div></div><AnalyticsTabs activeTab={activeTab} onChange={setActiveTab} />{error && <AsyncError message={error} detail={detail} onRetry={load} />}
    <section className="admin-panel analytics-filters"><select value={filters.range} onChange={(e) => updateFilter({ range: e.target.value })}><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option><option value="all">All time</option><option value="custom">Custom</option></select>{filters.range === "custom" && <><input type="date" value={filters.from} onChange={(e) => updateFilter({ from: e.target.value })} /><input type="date" value={filters.to} onChange={(e) => updateFilter({ to: e.target.value })} /></>}<select value={filters.artistId} onChange={(e) => updateFilter({ artistId: e.target.value })}><option value="">All artists</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select><select value={filters.linkPageId} onChange={(e) => updateFilter({ linkPageId: e.target.value })}><option value="">All releases</option>{linkPages.map((page) => <option key={page.id} value={page.id}>{page.title || page.slug}</option>)}</select><input placeholder="Platform" value={filters.platform} onChange={(e) => updateFilter({ platform: e.target.value })} /><select value={filters.eventType} onChange={(e) => updateFilter({ eventType: e.target.value })}><option value="">All events</option>{eventTypes.map((v) => <option key={v} value={v}>{displayEventType(v)}</option>)}</select><input placeholder="UTM source" value={filters.utmSource} onChange={(e) => updateFilter({ utmSource: e.target.value })} /><input placeholder="UTM campaign" value={filters.utmCampaign} onChange={(e) => updateFilter({ utmCampaign: e.target.value })} /></section>
    {data.retentionLimited && <div className="admin-alert">This workspace is on the {data.planId || "free"} plan. {data.retentionDays ? `Analytics are limited to ${data.retentionDays} days.` : "Custom/all-time reporting is locked."} Upgrade to unlock the selected range.</div>}
    {summaryLoading ? <KpiSkeleton /> : <div className="analytics-kpi-grid"><KpiCard label="Link Views" value={formatCount(data.summary.visits)} caption="Selected range" data={data.timeSeries} icon={<FiEye />} /><KpiCard label="Total Clicks" value={formatCount(data.summary.clicks)} caption="Outbound platform clicks" data={data.timeSeries.map((point) => ({ ...point, views: point.clicks }))} icon={<FiMousePointer />} /><KpiCard label="CTR" value={ctr === null ? "—" : `${ctr}%`} caption="Clicks divided by views" data={data.timeSeries.map((point) => ({ ...point, views: point.ctr }))} icon={<FiTrendingUp />} /><KpiCard label="Unique Listeners" value={uniqueListeners} caption={visitorBehavior?.available ? "Distinct anonymous visitors" : "Available from visitor identity"} data={[]} icon={<FiUsers />} /><KpiCard label="Conversion Rate" value={conversionRate} caption="Current CTR proxy" data={data.timeSeries.map((point) => ({ ...point, views: point.ctr }))} icon={<FiTarget />} /></div>}
    {breakdownLoading ? <><BreakdownSkeleton /><RecentSkeleton /></> : tabGrid()}
  </main>;
}
