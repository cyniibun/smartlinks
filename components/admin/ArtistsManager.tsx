"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { WorkspaceEntitlements } from "@/lib/entitlements";
import type { ThemeRecord } from "@/lib/themes";

type Artist = {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
  brand_color?: string | null;
  bio?: string | null;
  status?: string | null;
  default_label_name?: string | null;
  default_tiktok_pixel_id?: string | null;
  default_meta_pixel_id?: string | null;
  default_ga_measurement_id?: string | null;
  default_theme_id?: string | null;
  default_platform_order?: string[] | null;
  default_enabled_platforms?: string[] | null;
  default_footer_text?: string | null;
  default_slug_pattern?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  spotify_artist_url?: string | null;
  apple_artist_url?: string | null;
  bio_link_enabled?: boolean | null;
  bio_link_slug?: string | null;
  bio_link_theme_id?: string | null;
  bio_link_sections?: unknown[] | null;
};

type ReleaseSummary = { id: string; title: string; slug: string; artwork_url?: string | null; published?: boolean | null; updated_at?: string | null; views: number; clicks: number; ctr: number };
type ArtistStats = { releaseCount: number; views: number; clicks: number; ctr: number; topRelease?: ReleaseSummary | null; recentReleases: ReleaseSummary[] };
type ArtistWithStats = Artist & { stats: ArtistStats };
type Tab = "Overview" | "Branding" | "Defaults" | "Team" | "Settings";

const tabs: Tab[] = ["Overview", "Branding", "Defaults", "Team", "Settings"];
const platformKeys = ["spotify","apple_music","youtube","youtube_music","soundcloud","pandora","deezer","amazon_music","tidal","itunes","amazon"];

function arrayText(value?: string[] | null) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function parseArrayText(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function statusLabel(value?: string | null) {
  const status = value || "active";
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function ArtistAvatar({ artist, size = 44 }: { artist: Artist; size?: number }) {
  if (artist.image_url) return <Image src={artist.image_url} alt="" width={size} height={size} className="artist-v2-avatar-img" unoptimized />;
  return <span className="artist-v2-avatar-fallback" style={{ width: size, height: size, background: artist.brand_color || undefined }}>{artist.name.slice(0, 1).toUpperCase()}</span>;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return <span className="artist-v2-metric"><small>{label}</small><strong>{value}</strong></span>;
}

function ArtistDefaultsEditor({ artist, themes, canAdvancedDefaults, canBioLinks, onPatch }: { artist: ArtistWithStats; themes: ThemeRecord[]; canAdvancedDefaults: boolean; canBioLinks: boolean; onPatch: (patch: Partial<Artist>) => void }) {
  return <div className="artist-defaults-editor">
    <div className="editor-grid">
      <label>Default release theme<select value={artist.default_theme_id || ""} onChange={(event) => onPatch({ default_theme_id: event.target.value || null })} disabled={!canAdvancedDefaults}><option value="">Inherit release default</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
      <label>Slug pattern<select value={artist.default_slug_pattern || "{title}"} onChange={(event) => onPatch({ default_slug_pattern: event.target.value })}><option value="{title}">{"{title}"}</option><option value="{artist}-{title}">{"{artist}-{title}"}</option></select></label>
      <label>Default label name<input value={artist.default_label_name || ""} onChange={(event) => onPatch({ default_label_name: event.target.value })} /></label>
      <label>Default footer text<input value={artist.default_footer_text || ""} onChange={(event) => onPatch({ default_footer_text: event.target.value })} disabled={!canAdvancedDefaults} /></label>
      <label>TikTok Pixel ID<input value={artist.default_tiktok_pixel_id || ""} onChange={(event) => onPatch({ default_tiktok_pixel_id: event.target.value })} disabled={!canAdvancedDefaults} /></label>
      <label>Meta Pixel ID<input value={artist.default_meta_pixel_id || ""} onChange={(event) => onPatch({ default_meta_pixel_id: event.target.value })} disabled={!canAdvancedDefaults} /></label>
      <label>GA4 Measurement ID<input value={artist.default_ga_measurement_id || ""} onChange={(event) => onPatch({ default_ga_measurement_id: event.target.value })} disabled={!canAdvancedDefaults} /></label>
      <label className="full">Default platform order<input value={arrayText(artist.default_platform_order)} onChange={(event) => onPatch({ default_platform_order: parseArrayText(event.target.value) })} placeholder={platformKeys.slice(0, 8).join(", ")} disabled={!canAdvancedDefaults} /></label>
      <label className="full">Default enabled platforms<input value={arrayText(artist.default_enabled_platforms)} onChange={(event) => onPatch({ default_enabled_platforms: parseArrayText(event.target.value) })} placeholder="Leave blank to keep imported links enabled" disabled={!canAdvancedDefaults} /></label>
      <label>Bio link theme<select value={artist.bio_link_theme_id || ""} onChange={(event) => onPatch({ bio_link_theme_id: event.target.value || null })} disabled={!canBioLinks}><option value="">Inherit release default</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
      <label>Bio link slug<input value={artist.bio_link_slug || artist.slug || ""} onChange={(event) => onPatch({ bio_link_slug: event.target.value })} disabled={!canBioLinks} /></label>
      <label className="artist-toggle-row"><input type="checkbox" checked={Boolean(artist.bio_link_enabled)} onChange={(event) => onPatch({ bio_link_enabled: event.target.checked })} disabled={!canBioLinks} /> Enable artist bio link</label>
    </div>
    {!canAdvancedDefaults && <p className="muted">Advanced artist defaults are available on Pro. Basic release identity fields remain editable.</p>}
    {!canBioLinks && <p className="muted">Bio links are available on Pro. Fields are shown now so the data model is ready.</p>}
  </div>;
}

function ArtistPanel({ workspaceId, artist, themes, entitlements, onClose, onSaved }: { workspaceId: string; artist: ArtistWithStats; themes: ThemeRecord[]; entitlements: WorkspaceEntitlements; onClose: () => void; onSaved: (artist: ArtistWithStats) => void }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [draft, setDraft] = useState(artist);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canAdvancedDefaults = entitlements.developer || entitlements.features.custom_themes || entitlements.features.unlimited_artists;
  const canBioLinks = entitlements.developer || entitlements.features.bio_pages;
  const analyticsHref = `/dashboard/${workspaceId}/analytics?artistId=${artist.id}`;
  const save = async () => {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/artists/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({
        workspaceId, name: draft.name, slug: draft.slug, imageUrl: draft.image_url, brandColor: draft.brand_color, status: draft.status,
        defaultLabelName: draft.default_label_name, tiktokPixelId: draft.default_tiktok_pixel_id, metaPixelId: draft.default_meta_pixel_id,
        gaMeasurementId: draft.default_ga_measurement_id, defaultThemeId: draft.default_theme_id, defaultPlatformOrder: draft.default_platform_order,
        defaultEnabledPlatforms: draft.default_enabled_platforms, defaultFooterText: draft.default_footer_text, defaultSlugPattern: draft.default_slug_pattern,
        bio: draft.bio, websiteUrl: draft.website_url, instagramUrl: draft.instagram_url, tiktokUrl: draft.tiktok_url, youtubeUrl: draft.youtube_url,
        spotifyArtistUrl: draft.spotify_artist_url, appleArtistUrl: draft.apple_artist_url, bioLinkEnabled: draft.bio_link_enabled,
        bioLinkSlug: draft.bio_link_slug, bioLinkThemeId: draft.bio_link_theme_id, bioLinkSections: draft.bio_link_sections || [],
      }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || `Save failed (${response.status})`);
      onSaved({ ...draft, ...json.artist, stats: draft.stats });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save artist.");
    } finally {
      setSaving(false);
    }
  };
  const patch = (patch: Partial<Artist>) => setDraft((current) => ({ ...current, ...patch }));
  return <aside className="artist-detail-panel">
    <div className="artist-panel-head">
      <ArtistAvatar artist={draft} size={74} />
      <div><h2>{draft.name}</h2><p>{draft.stats.releaseCount} releases · {statusLabel(draft.status)}</p></div>
      <button type="button" onClick={onClose} aria-label="Close artist panel">×</button>
    </div>
    <nav className="artist-panel-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {error && <div className="admin-alert">{error}</div>}
    {tab === "Overview" && <div className="artist-panel-section">
      <div className="artist-performance-card">
        <div><span>Views</span><strong>{formatCount(draft.stats.views)}</strong></div>
        <div><span>Clicks</span><strong>{formatCount(draft.stats.clicks)}</strong></div>
        <div><span>CTR</span><strong>{draft.stats.ctr}%</strong></div>
      </div>
      <Link className="admin-secondary artist-wide-link" href={analyticsHref}>View analytics →</Link>
      <section><h3>Top release</h3>{draft.stats.topRelease ? <div className="artist-release-mini"><strong>{draft.stats.topRelease.title}</strong><span>{formatCount(draft.stats.topRelease.views)} views · {formatCount(draft.stats.topRelease.clicks)} clicks</span></div> : <p className="muted">No release activity yet.</p>}</section>
      <section><h3>Recent releases</h3>{draft.stats.recentReleases.length ? <div className="artist-release-list">{draft.stats.recentReleases.map((release) => <Link key={release.id} href={`/dashboard/${workspaceId}/link-pages/${release.id}`}><strong>{release.title}</strong><span>{release.published ? "Published" : "Draft"} · {formatCount(release.views)} views</span></Link>)}</div> : <p className="muted">No releases yet.</p>}</section>
    </div>}
    {tab === "Branding" && <div className="artist-panel-section"><div className="editor-grid">
      <label>Display name<input value={draft.name} onChange={(event) => patch({ name: event.target.value })} /></label>
      <label>Slug<input value={draft.slug || ""} onChange={(event) => patch({ slug: event.target.value })} /></label>
      <label>Avatar URL<input value={draft.image_url || ""} onChange={(event) => patch({ image_url: event.target.value })} /></label>
      <label>Brand color<input type="color" value={draft.brand_color || "#ff4f93"} onChange={(event) => patch({ brand_color: event.target.value })} /></label>
      <label className="full">Bio<textarea value={draft.bio || ""} onChange={(event) => patch({ bio: event.target.value })} /></label>
      <label>Website<input value={draft.website_url || ""} onChange={(event) => patch({ website_url: event.target.value })} /></label>
      <label>Instagram<input value={draft.instagram_url || ""} onChange={(event) => patch({ instagram_url: event.target.value })} /></label>
      <label>TikTok<input value={draft.tiktok_url || ""} onChange={(event) => patch({ tiktok_url: event.target.value })} /></label>
      <label>YouTube<input value={draft.youtube_url || ""} onChange={(event) => patch({ youtube_url: event.target.value })} /></label>
      <label>Spotify artist URL<input value={draft.spotify_artist_url || ""} onChange={(event) => patch({ spotify_artist_url: event.target.value })} /></label>
      <label>Apple artist URL<input value={draft.apple_artist_url || ""} onChange={(event) => patch({ apple_artist_url: event.target.value })} /></label>
    </div></div>}
    {tab === "Defaults" && <div className="artist-panel-section"><ArtistDefaultsEditor artist={draft} themes={themes} canAdvancedDefaults={canAdvancedDefaults} canBioLinks={canBioLinks} onPatch={patch} /></div>}
    {tab === "Team" && <div className="artist-panel-section"><div className="analytics-empty"><strong>Artist collaborators are coming later.</strong><p>Workspace team permissions remain the source of truth for now.</p></div></div>}
    {tab === "Settings" && <div className="artist-panel-section"><label>Status<select value={draft.status || "active"} onChange={(event) => patch({ status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label><div className="admin-alert">Delete/archive workflows will be hardened in a future pass. Set status to Archived for now.</div></div>}
    {tab !== "Overview" && <div className="artist-panel-actions"><button className="admin-primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save artist"}</button></div>}
  </aside>;
}

export function ArtistsManager({ workspaceId, initialArtists, themes, entitlements }: { workspaceId: string; initialArtists: ArtistWithStats[]; themes: ThemeRecord[]; entitlements: WorkspaceEntitlements }) {
  const [artists, setArtists] = useState(initialArtists);
  const [selectedId, setSelectedId] = useState(initialArtists[0]?.id || "");
  const selected = selectedId ? artists.find((artist) => artist.id === selectedId) : null;
  const totals = useMemo(() => ({
    artists: artists.length,
    active: artists.filter((artist) => (artist.status || "active") === "active").length,
    views: artists.reduce((sum, artist) => sum + artist.stats.views, 0),
    clicks: artists.reduce((sum, artist) => sum + artist.stats.clicks, 0),
  }), [artists]);
  const saveArtist = (next: ArtistWithStats) => setArtists((current) => current.map((artist) => artist.id === next.id ? next : artist));
  return <main className="admin-main artists-v2">
    <div className="admin-title-row"><div><span className="admin-kicker">ARTISTS</span><h1>Artists</h1><p>Manage artist identities, branding, defaults, and performance.</p></div><div className="editor-actions"><Link className="admin-secondary" href={`/dashboard/${workspaceId}/create`}>Create release</Link></div></div>
    <div className="stat-grid artist-kpi-strip"><article><span>Total artists</span><strong>{formatCount(totals.artists)}</strong></article><article><span>Active artists</span><strong>{formatCount(totals.active)}</strong></article><article><span>Total link views</span><strong>{formatCount(totals.views)}</strong></article><article><span>Total clicks</span><strong>{formatCount(totals.clicks)}</strong></article></div>
    <div className="artists-v2-layout">
      <section className="admin-panel artists-v2-list"><div className="panel-title"><h2>All Artists</h2></div>{artists.length ? <div className="artists-v2-table">
        <div className="artists-v2-row header"><span>Artist</span><span>Releases</span><span>Views</span><span>Clicks</span><span>CTR</span><span>Status</span><span>Actions</span></div>
        {artists.map((artist) => <button type="button" key={artist.id} className={`artists-v2-row ${selected?.id === artist.id ? "selected" : ""}`} onClick={() => setSelectedId(artist.id)}>
          <span className="artist-v2-identity"><ArtistAvatar artist={artist} /><span><strong>{artist.name}</strong><small>{artist.default_label_name || artist.slug || "No label default"}</small></span></span>
          <span>{artist.stats.releaseCount}</span><span>{formatCount(artist.stats.views)}</span><span>{formatCount(artist.stats.clicks)}</span><span>{artist.stats.ctr}%</span><span><i className={`status-dot status-${artist.status || "active"}`} />{statusLabel(artist.status)}</span><span>View</span>
        </button>)}
      </div> : <div className="empty-state">No artists yet. Create one while building a release.</div>}</section>
      {selected && <ArtistPanel workspaceId={workspaceId} artist={selected} themes={themes} entitlements={entitlements} onClose={() => setSelectedId("")} onSaved={saveArtist} />}
    </div>
  </main>;
}
