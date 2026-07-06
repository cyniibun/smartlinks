"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformType, SongLink, SongPage } from "@/data/songs";
import { HeadEntriesEditor } from "@/components/admin/HeadEntriesEditor";

const blankLink: SongLink = { platform: "other", label: "New platform", url: "", section: "listen", enabled: true, order: 1 };
export function SongEditor({ initialSong }: { initialSong?: SongPage }) {
  const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [song, setSong] = useState<SongPage>(initialSong || { slug: "", title: "", artist: "Cyniical", artworkUrl: "", canonicalUrl: "", published: false, links: [], pixelEvents: { contentId: "", contentName: "", artistName: "" }, seo: { title: "", description: "", ogImage: "" } });
  useEffect(() => { if (!initialSong) { const draft = sessionStorage.getItem("cyniical-import-draft"); if (draft) { setSong(JSON.parse(draft)); sessionStorage.removeItem("cyniical-import-draft"); } } }, [initialSong]);
  const set = (key: keyof SongPage, value: unknown) => setSong((current) => ({ ...current, [key]: value }));
  const setSeo = (key: keyof SongPage["seo"], value: string) => setSong((current) => ({ ...current, seo: { ...current.seo, [key]: value } }));
  const setPixel = (key: "tiktokPixelId" | "metaPixelId" | "gaMeasurementId", value: string) => setSong((current) => ({ ...current, trackingPixels: { ...current.trackingPixels, [key]: value.trim() } }));
  const updateLink = (index: number, patch: Partial<SongLink>) => setSong((current) => ({ ...current, links: current.links.map((link, i) => i === index ? { ...link, ...patch } : link) }));
  const moveLink = (index: number, direction: -1 | 1) => setSong((current) => { const links = [...current.links]; const target = index + direction; if (target < 0 || target >= links.length) return current; [links[index], links[target]] = [links[target], links[index]]; return { ...current, links: links.map((link, i) => ({ ...link, order: i + 1 })) }; });
  const save = async (publish?: boolean) => {
    setSaving(true); setError(""); const finalSong = { ...song, published: publish ?? song.published, canonicalUrl: song.canonicalUrl || `https://link.tone-link.com/${song.slug}`, pixelEvents: { contentId: song.slug, contentName: song.title, artistName: song.artist }, seo: { title: song.seo.title || `${song.title} by ${song.artist}`, description: song.seo.description || `Choose your preferred music platform to listen to ${song.title} by ${song.artist}.`, ogImage: song.seo.ogImage || song.artworkUrl } };
    const response = await fetch(song.id ? `/api/admin/songs/${song.id}` : "/api/admin/songs", { method: song.id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(finalSong) }); const json = await response.json();
    if (!response.ok) { setError(json.error); setSaving(false); return; } setSong(json.song); setSaving(false); router.push("/admin"); router.refresh();
  };
  return <main className="admin-main editor">
    <div className="admin-title-row">
      <div><span className="admin-kicker">{song.id ? "EDIT RELEASE" : "NEW RELEASE"}</span><h1>{song.title || "Untitled smart link"}</h1></div>
      <div className="editor-actions"><a href={song.slug ? `/${song.slug}` : "#"} target="_blank">Preview</a><button className="admin-secondary" onClick={() => void save(false)} disabled={saving}>Save draft</button><button className="admin-primary" onClick={() => void save(true)} disabled={saving}>Publish</button></div>
    </div>
    {error && <div className="admin-alert error">{error}</div>}
    <section className="admin-panel"><h2>Release details</h2><div className="form-grid">
      <label>Slug<input value={song.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} required /></label>
      <label>Title<input value={song.title} onChange={(e) => set("title", e.target.value)} /></label>
      <label>Artist<input value={song.artist} onChange={(e) => set("artist", e.target.value)} /></label>
      <label>Subtitle<input value={song.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} /></label>
      <label>Artwork URL<input value={song.artworkUrl} onChange={(e) => set("artworkUrl", e.target.value)} placeholder="https://… or /artwork/file.jpg" /></label>
      <label>Background image URL<input value={song.backgroundImageUrl || ""} onChange={(e) => set("backgroundImageUrl", e.target.value)} /></label>
      <label>Release date<input type="date" value={song.releaseDate || ""} onChange={(e) => set("releaseDate", e.target.value)} /></label>
      <label>Canonical URL<input value={song.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder={`https://link.tone-link.com/${song.slug}`} /></label>
    </div></section>
    <section className="admin-panel"><h2>Search & social</h2><div className="form-grid">
      <label>SEO title<input value={song.seo.title} onChange={(e) => setSeo("title", e.target.value)} /></label>
      <label>OG image<input value={song.seo.ogImage} onChange={(e) => setSeo("ogImage", e.target.value)} /></label>
      <label className="full">SEO description<textarea value={song.seo.description} onChange={(e) => setSeo("description", e.target.value)} /></label>
    </div></section>
    <section className="admin-panel pixel-panel">
      <div className="panel-title"><div><h2>Campaign pixels</h2><p>Optional per-release IDs override the global environment pixels on this song page.</p></div><span className="status-pill draft">Server stored</span></div>
      <div className="form-grid pixel-grid">
        <label>TikTok Pixel ID<input value={song.trackingPixels?.tiktokPixelId || ""} onChange={(e) => setPixel("tiktokPixelId", e.target.value)} placeholder="CXXXXXXXXXXXXXXXXX" autoComplete="off" /></label>
        <label>Meta Pixel ID<input value={song.trackingPixels?.metaPixelId || ""} onChange={(e) => setPixel("metaPixelId", e.target.value)} placeholder="123456789012345" autoComplete="off" /></label>
        <label>GA4 Measurement ID<input value={song.trackingPixels?.gaMeasurementId || ""} onChange={(e) => setPixel("gaMeasurementId", e.target.value)} placeholder="G-XXXXXXXXXX" autoComplete="off" /></label>
      </div>
      <p className="field-help">Paste only the platform ID, not the full script code. Page views and platform clicks use these IDs automatically.</p>
    </section>
    <HeadEntriesEditor entries={song.headEntries || []} onChange={(headEntries) => set("headEntries", headEntries)} />
    <section className="admin-panel"><div className="panel-title"><h2>Platform links</h2><button className="admin-secondary" onClick={() => setSong((current) => ({ ...current, links: [...current.links, { ...blankLink, order: current.links.length + 1 }] }))}>+ Add platform</button></div>
      <div className="link-editor-list">{song.links.map((link, index) => <div className="link-editor" key={`${index}-${link.platform}`}><span className="drag-order">{index + 1}</span><input aria-label="Platform" value={link.platform} onChange={(e) => updateLink(index, { platform: e.target.value as PlatformType })} /><input aria-label="Label" value={link.label} onChange={(e) => updateLink(index, { label: e.target.value })} /><input aria-label="Destination URL" className="link-url" value={link.url} onChange={(e) => updateLink(index, { url: e.target.value })} /><select aria-label="Section" value={link.section} onChange={(e) => updateLink(index, { section: e.target.value as SongLink["section"] })}><option>listen</option><option>buy</option><option>watch</option><option>other</option></select><label className="toggle"><input type="checkbox" checked={link.enabled} onChange={(e) => updateLink(index, { enabled: e.target.checked })} /> On</label><button onClick={() => moveLink(index, -1)} aria-label="Move up">↑</button><button onClick={() => moveLink(index, 1)} aria-label="Move down">↓</button><button className="danger" onClick={() => setSong((current) => ({ ...current, links: current.links.filter((_, i) => i !== index) }))}>Remove</button></div>)}</div>
    </section>
  </main>;
}
