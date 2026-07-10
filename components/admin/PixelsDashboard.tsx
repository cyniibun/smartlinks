"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { FiActivity, FiBarChart2, FiClock, FiPlus, FiSettings, FiShare2, FiTrash2 } from "react-icons/fi";

export type PixelProvider = "all" | "meta" | "tiktok" | "google_analytics" | "google_ads" | "snapchat" | "custom" | "verification";
export type PixelStatus = "verified" | "connected" | "pending" | "disconnected" | "error";
export type PixelHealth = "good" | "warning" | "error" | "inactive";

export type PixelProviderRow = {
  id: string;
  provider: Exclude<PixelProvider, "all" | "verification">;
  providerName: string;
  providerShortName: string;
  configuredId: string | null;
  status: PixelStatus;
  health: PixelHealth;
  events: number;
  lastEventAt: string | null;
  artistsUsing: number;
  releasesUsing: number;
  workspaceAssigned: boolean;
  diagnostics: string[];
  lastAttemptedAt?: string | null;
  lastSuccessfulAt?: string | null;
  lastAcknowledgedAt?: string | null;
  lastFailureAt?: string | null;
};

export type PixelEventSummary = { eventType: string; count: number; changeLabel?: string };
export type PixelSeriesPoint = { label: string; count: number };

const tabs: Array<{ id: PixelProvider; label: string }> = [
  { id: "all", label: "All Pixels" },
  { id: "meta", label: "Meta" },
  { id: "tiktok", label: "TikTok" },
  { id: "google_analytics", label: "Google Analytics" },
  { id: "google_ads", label: "Google Ads" },
  { id: "snapchat", label: "Snapchat" },
  { id: "custom", label: "Custom" },
  { id: "verification", label: "Verification" },
];

const statusLabels: Record<PixelStatus, string> = { verified: "Verified", connected: "Connected", pending: "Pending", disconnected: "Disconnected", error: "Error" };
const healthLabels: Record<PixelHealth, string> = { good: "Good", warning: "Warning", error: "Error", inactive: "Inactive" };
const providerGlyphs: Record<PixelProviderRow["provider"], string> = {
  meta: "∞",
  tiktok: "♪",
  google_analytics: "GA",
  google_ads: "Ads",
  snapchat: "◎",
  custom: "{ }",
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.max(Math.round((new Date(value).getTime() - Date.now()) / 86400000), -30), "day");
}

function displayEventType(value: string) {
  const normalized = String(value || "unknown");
  if (normalized === "ViewContent") return "Content View";
  if (normalized === "ClickButton") return "Click Button";
  if (normalized === "MusicPlatformClick") return "Platform Click";
  if (normalized === "SmartLinkUtilityClick") return "Utility Click";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PixelIcon({ provider }: { provider: PixelProviderRow["provider"] }) {
  return <span className={`pixel-provider-icon provider-${provider}`}>{providerGlyphs[provider]}</span>;
}

function StatusPill({ status }: { status: PixelStatus }) {
  return <span className={`pixel-status status-${status}`}>{statusLabels[status]}</span>;
}

function HealthDot({ health }: { health: PixelHealth }) {
  return <span className={`pixel-health health-${health}`}><i />{healthLabels[health]}</span>;
}

function EventsArea({ series }: { series: PixelSeriesPoint[] }) {
  const [tip, setTip] = useState<{ left: number; top: number; point: PixelSeriesPoint } | null>(null);
  const max = Math.max(...series.map((point) => point.count), 1);
  const coords = series.map((point, index) => {
    const x = series.length <= 1 ? 0 : (index / (series.length - 1)) * 100;
    const y = 94 - (point.count / max) * 78;
    return { point, x, y };
  });
  const path = coords.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  function activate(event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>, point: PixelSeriesPoint) {
    const button = event.currentTarget;
    const chart = button.closest(".pixel-events-chart") as HTMLElement | null;
    if (!chart) return;
    const chartRect = chart.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    const left = Math.max(10, Math.min(rect.left - chartRect.left + rect.width / 2 - 72, chartRect.width - 154));
    const top = Math.max(8, Math.min(rect.top - chartRect.top - 54, chartRect.height - 74));
    setTip({ left, top, point });
  }
  return <div className="pixel-events-chart" aria-label="Events over time" onMouseLeave={() => setTip(null)}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
      <path d={area} className="pixel-chart-area" />
      <path d={path} className="pixel-chart-line" />
    </svg>
    <div className="pixel-chart-points">{coords.map(({ point, x, y }) => <button key={point.label} type="button" style={{ left: `${x}%`, top: `${y}%` }} aria-label={`${point.label}: ${point.count} pixel events`} onMouseEnter={(event) => activate(event, point)} onFocus={(event) => activate(event, point)} onBlur={() => setTip(null)}><span /></button>)}</div>
    {tip && <div className="pixel-chart-tooltip" role="tooltip" style={{ left: tip.left, top: tip.top }}><strong>{tip.point.label}</strong><span>{formatCount(tip.point.count)} events</span></div>}
    <div className="pixel-chart-axis">{series.map((point) => <span key={point.label}>{point.label}</span>)}</div>
  </div>;
}

function HealthDonut({ rows }: { rows: PixelProviderRow[] }) {
  const counts: Array<{ key: PixelHealth; label: string; count: number }> = (["good", "warning", "error", "inactive"] as PixelHealth[]).map((key) => ({ key, label: healthLabels[key], count: rows.filter((row) => row.health === key).length }));
  const total = Math.max(counts.reduce((sum, item) => sum + item.count, 0), 1);
  let offset = 25;
  return <div className="pixel-health-card-body">
    <svg className="pixel-health-donut" viewBox="0 0 42 42" role="img" aria-label="Pixel health distribution">
      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
      {counts.map((item) => {
        const dash = (item.count / total) * 100;
        const segment = <circle key={item.key} className={`health-ring health-${item.key}`} cx="21" cy="21" r="15.915" fill="transparent" strokeWidth="7" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={offset} />;
        offset -= dash;
        return segment;
      })}
    </svg>
    <div className="pixel-health-legend">{counts.map((item) => <div key={item.key}><span className={`legend-dot health-${item.key}`} /> <strong>{item.label}</strong><span>{item.count}</span><small>{Math.round((item.count / total) * 100)}%</small></div>)}</div>
  </div>;
}

function TopEvents({ events }: { events: PixelEventSummary[] }) {
  const max = Math.max(...events.map((event) => event.count), 1);
  return <div className="pixel-top-events">{events.map((event) => <div key={event.eventType}>
    <span>{displayEventType(event.eventType)}</span><strong>{formatCount(event.count)}</strong><i style={{ width: `${Math.max((event.count / max) * 100, 6)}%` }} /><small>{event.changeLabel || "—"}</small>
  </div>)}</div>;
}

function ProviderPanel({ row, onClose }: { row: PixelProviderRow; onClose: () => void }) {
  const [tab, setTab] = useState<"Overview" | "Configuration" | "Diagnostics" | "Events">("Overview");
  return <aside className="pixel-provider-panel">
    <div className="pixel-provider-head"><PixelIcon provider={row.provider} /><div><h2>{row.providerName}</h2><p>{row.configuredId ? `ID: ${row.configuredId}` : "No credential configured"}</p></div><button onClick={onClose} aria-label="Close provider details">×</button></div>
    <div className="pixel-panel-status"><StatusPill status={row.status} /><HealthDot health={row.health} /></div>
    <nav className="pixel-panel-tabs">{(["Overview","Configuration","Diagnostics","Events"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Overview" && <section className="pixel-panel-section"><div className="pixel-detail-grid"><div><span>Workspace assignment</span><strong>{row.workspaceAssigned ? "Enabled" : "Not set"}</strong></div><div><span>Artists using it</span><strong>{row.artistsUsing}</strong></div><div><span>Releases using it</span><strong>{row.releasesUsing}</strong></div><div><span>Last attempted</span><strong>{formatDate(row.lastAttemptedAt || row.lastEventAt)}</strong></div><div><span>Last successful</span><strong>{formatDate(row.lastSuccessfulAt || row.lastEventAt)}</strong></div><div><span>Last acknowledged</span><strong>{formatDate(row.lastAcknowledgedAt || null)}</strong></div></div><p className="muted">Provider acknowledgement is only shown when ToneLink has an API/provider confirmation. Browser pixels are tracked as delivery attempts.</p></section>}
    {tab === "Configuration" && <section className="pixel-panel-section"><div className="editor-grid"><label>{row.providerName} ID<input value={row.configuredId || ""} readOnly /></label><label>Access token<input value="" readOnly placeholder="Conversions API token — future" /></label><label>Dataset / conversion label<input value="" readOnly placeholder="Provider-specific field — future" /></label></div></section>}
    {tab === "Diagnostics" && <section className="pixel-panel-section">{row.diagnostics.map((item) => <div className="pixel-diagnostic-row" key={item}>{item}</div>)}</section>}
    {tab === "Events" && <section className="pixel-panel-section"><div className="pixel-live-log"><div><span>Now</span><strong>{row.events ? "Events received" : "Waiting for events"}</strong><small>{row.events ? `${formatCount(row.events)} events in selected range` : "No recent matching activity"}</small></div></div></section>}
  </aside>;
}

export function PixelsDashboard({ rows, events, series, canUseAdvancedPixels = false }: { rows: PixelProviderRow[]; events: PixelEventSummary[]; series: PixelSeriesPoint[]; canUseAdvancedPixels?: boolean }) {
  const [activeTab, setActiveTab] = useState<PixelProvider>("all");
  const [selectedId, setSelectedId] = useState("");
  const visibleTabs = useMemo(() => canUseAdvancedPixels ? tabs : tabs.filter((tab) => tab.id !== "snapchat" && tab.id !== "custom"), [canUseAdvancedPixels]);
  const filteredRows = useMemo(() => activeTab === "all" || activeTab === "verification" ? rows : rows.filter((row) => row.provider === activeTab), [activeTab, rows]);
  const selected = rows.find((row) => row.id === selectedId) || null;
  const configured = rows.filter((row) => row.configuredId);
  const verified = configured.filter((row) => row.status === "verified" || row.events > 0);
  const totalEvents = events.reduce((sum, event) => sum + event.count, 0);
  const activeEvents = events.filter((event) => event.count > 0).length;

  return <main className="admin-main pixels-v2">
    <div className="admin-title-row pixels-header"><div><span className="admin-kicker">TRACKING</span><h1>Pixels</h1><p>Manage your tracking pixels and monitor event activity.</p></div><div className="editor-actions"><button className="admin-secondary"><FiClock /> Last 7 days</button><button className="admin-secondary"><FiShare2 /> Share</button><button className="admin-primary"><FiPlus /> Add Pixel</button></div></div>
    <div className="stat-grid pixels-kpis"><article><span>Total Pixels</span><strong>{configured.length}</strong><small>Configured integrations</small></article><article><span>Events Fired</span><strong>{formatCount(totalEvents)}</strong><small>Sent/acknowledged deliveries · 7d</small></article><article><span>Verified Pixels</span><strong>{verified.length} / {configured.length}</strong><small>{configured.length ? Math.round((verified.length / configured.length) * 100) : 0}% configured verified</small></article><article><span>Active Events</span><strong>{activeEvents}</strong><small>{events.slice(0,3).map((event) => displayEventType(event.eventType)).join(", ") || "No delivery records yet"}</small></article></div>
    {!canUseAdvancedPixels && <div className="admin-alert">Custom Pixel and Snapchat Pixel are available on Pro.</div>}
    <nav className="pixels-tabs">{visibleTabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>
    {activeTab === "verification" ? <section className="admin-panel pixels-verification"><div className="panel-title"><div><h2>Verification</h2><p className="muted">Primary diagnostics for event receiving, provider credentials, and future Conversions API readiness.</p></div></div>{rows.map((row) => <article key={row.id}><PixelIcon provider={row.provider} /><div><strong>{row.providerName}</strong><p>{row.diagnostics[0]}</p></div><StatusPill status={row.status} /><HealthDot health={row.health} /><span>{formatDate(row.lastEventAt)}</span></article>)}</section> : <div className="pixels-v2-layout">
      <section className="admin-panel pixels-table-panel"><div className="pixels-toolbar"><label><span>Search pixels</span><input placeholder="Search pixels..." readOnly /></label><button><FiBarChart2 /> Filters</button><select defaultValue="all"><option value="all">All Status</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="error">Error</option></select></div><div className="pixels-table"><div className="pixels-row header"><span>Provider</span><span>Status</span><span>Events (7d)</span><span>Last Event</span><span>Health</span><span>Actions</span></div>{filteredRows.map((row) => <button className="pixels-row" key={row.id} onClick={() => setSelectedId(row.id)}><span className="pixel-provider-cell"><PixelIcon provider={row.provider} /><span><strong>{row.providerName}</strong><small>{row.configuredId ? `ID: ${row.configuredId}` : "Not configured"}</small></span></span><StatusPill status={row.status} /><span><strong>{formatCount(row.events)}</strong><small>{row.events ? "Receiving events" : "No recent events"}</small></span><span>{formatDate(row.lastEventAt)}</span><HealthDot health={row.health} /><span className="pixel-actions"><i title="Open diagnostics"><FiActivity /></i><i title="Configure"><FiSettings /></i><i title="Delete"><FiTrash2 /></i></span></button>)}</div><p className="muted pixel-table-foot">Showing {filteredRows.length} of {rows.length} pixel providers</p></section>
      <aside className="pixels-side-stack"><section className="admin-panel"><div className="panel-title"><h2>Events Over Time</h2><select defaultValue="7d"><option value="7d">Last 7 days</option></select></div><EventsArea series={series} /></section><section className="admin-panel"><div className="panel-title"><h2>Pixel Health</h2></div><HealthDonut rows={rows} /></section><section className="admin-panel"><div className="panel-title"><h2>Top Events</h2><button>View all events</button></div><TopEvents events={events} /></section></aside>
    </div>}
    {selected && <div className="pixel-drawer-backdrop" onClick={() => setSelectedId("")}><div onClick={(event) => event.stopPropagation()}><ProviderPanel row={selected} onClose={() => setSelectedId("")} /></div></div>}
  </main>;
}
