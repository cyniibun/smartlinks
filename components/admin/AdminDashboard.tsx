"use client";
import Link from "next/link";
import { useState } from "react";
import type { SongPage } from "@/data/songs";

export function AdminDashboard({ initialSongs, databaseReady }: { initialSongs: SongPage[]; databaseReady: boolean }) {
  const [songs, setSongs] = useState(initialSongs); const [error, setError] = useState("");
  const mutate = async (song: SongPage) => {
    const response = await fetch(`/api/admin/songs/${song.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(song) });
    const json = await response.json(); if (!response.ok) return setError(json.error);
    setSongs((current) => current.map((item) => item.id === song.id ? json.song : item));
  };
  const duplicate = async (song: SongPage) => {
    const copy = { ...song, id: undefined, slug: `${song.slug}-copy`, title: `${song.title} (Copy)`, published: false };
    const response = await fetch("/api/admin/songs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(copy) });
    const json = await response.json(); if (!response.ok) return setError(json.error);
    window.location.href = `/dashboard/edit/${json.song.slug}`;
  };
  const remove = async (song: SongPage) => {
    if (!song.id || !confirm(`Delete ${song.title}? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/songs/${song.id}`, { method: "DELETE" }); const json = await response.json();
    if (!response.ok) return setError(json.error); setSongs((current) => current.filter((item) => item.id !== song.id));
  };
  return <main className="admin-main"><div className="admin-title-row"><div><span className="admin-kicker">SMART LINKS</span><h1>Releases</h1><p>{songs.length} page{songs.length === 1 ? "" : "s"} in your catalog</p></div><Link className="admin-primary" href="/dashboard/new">+ New smart link</Link></div>{!databaseReady && <div className="admin-alert">Supabase is not configured. You can preview the existing release, but editing requires the database environment variables.</div>}{error && <div className="admin-alert error">{error}</div>}<div className="release-table">{songs.map((song) => <article key={song.slug} className="release-row"><img src={song.artworkUrl} alt="" /><div className="release-meta"><strong>{song.title}</strong><span>{song.artist} · /{song.slug}</span></div><span className={`status-pill ${song.published ? "published" : "draft"}`}>{song.published ? "Published" : "Draft"}</span><div className="row-actions"><a href={`/${song.slug}`} target="_blank">Preview</a><Link href={`/dashboard/edit/${song.slug}`}>Edit</Link><button onClick={() => void duplicate(song)}>Duplicate</button><button onClick={() => void mutate({ ...song, published: !song.published })}>{song.published ? "Unpublish" : "Publish"}</button><button className="danger" onClick={() => void remove(song)}>Delete</button></div></article>)}</div></main>;
}
