"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportCandidate } from "@/lib/importers/types";

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export function ImportTool() {
  const router = useRouter();
  const [mode, setMode] = useState<"songlink" | "search">("songlink");
  const [value, setValue] = useState(""); const [results, setResults] = useState<ImportCandidate[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const search = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(""); setResults([]);
    const response = await fetch("/api/admin/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mode === "songlink" ? { url: value } : { query: value }) });
    const json = await response.json(); if (!response.ok) setError(json.error); else { setResults(json.candidates); setWarnings(json.warnings || []); } setLoading(false);
  };
  const cloneCandidate = (candidate: ImportCandidate) => {
    const slug = slugify(candidate.title);
    const draft = { slug, title: candidate.title, artist: candidate.artist, artworkUrl: candidate.artworkUrl || "", releaseDate: candidate.releaseDate, canonicalUrl: "", published: false, links: candidate.links, pixelEvents: { contentId: slug, contentName: candidate.title, artistName: candidate.artist }, seo: { title: `${candidate.title} by ${candidate.artist}`, description: `Choose your preferred music platform to listen to ${candidate.title} by ${candidate.artist}.`, ogImage: candidate.artworkUrl || "" }, trackingPixels: {}, headEntries: [] };
    sessionStorage.setItem("cyniical-import-draft", JSON.stringify(draft)); router.push("/dashboard/new?import=1");
  };
  return <main className="admin-main">
    <div className="admin-title-row"><div><span className="admin-kicker">RELEASE CLONER</span><h1>Clone a smart link</h1><p>Paste a Songlink page to copy its metadata and platform destinations into an editable draft.</p></div></div>
    <section className="admin-panel import-panel"><div className="mode-switch"><button className={mode === "songlink" ? "active" : ""} onClick={() => setMode("songlink")}>Clone Songlink URL</button><button className={mode === "search" ? "active" : ""} onClick={() => setMode("search")}>Search artist + title</button></div><form onSubmit={search} className="import-form"><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "songlink" ? "https://song.link/… (or Spotify / Apple / YouTube URL)" : "Cyniical Watching Me"} required /><button className="admin-primary" disabled={loading}>{loading ? "Resolving…" : mode === "songlink" ? "Clone release" : "Search providers"}</button></form>{mode === "songlink" && <p className="import-hint">Songlink URLs are resolved back to their release, then all available platform links are imported through Odesli.</p>}{error && <div className="admin-alert error">{error}</div>}{warnings.map((warning) => <p className="provider-warning" key={warning}>{warning}</p>)}</section>
    <div className="candidate-grid">{results.map((candidate, index) => <article className="candidate-card" key={`${candidate.provider}-${candidate.externalId || index}`}>{candidate.artworkUrl ? <img src={candidate.artworkUrl} alt="" /> : <div className="art-placeholder">♪</div>}<div><span className="provider-label">{candidate.provider}</span><h2>{candidate.title}</h2><p>{candidate.artist}</p>{candidate.releaseDate && <small>{candidate.releaseDate}</small>}<p className="link-count">{candidate.links.length} platform link{candidate.links.length === 1 ? "" : "s"} found</p><button className="admin-primary" onClick={() => cloneCandidate(candidate)}>Clone into editor</button></div></article>)}</div>
    {!loading && value && results.length === 0 && !error && <div className="empty-state"><h2>No exact match yet.</h2><p>You can still create the release manually and paste platform links.</p><button className="admin-secondary" onClick={() => router.push("/admin/new")}>Open manual editor</button></div>}
  </main>;
}
