import type { ImportCandidate, ImportQuery } from "./types";

async function token() {
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store" });
  if (!response.ok) return null;
  return ((await response.json()) as { access_token: string }).access_token;
}

type SpotifyTrack = { id: string; name: string; artists: { name: string }[]; album: { name?: string; images: { url: string }[]; release_date: string }; external_urls: { spotify: string }; external_ids?: { isrc?: string } };
const normalize = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
function similarity(a: string, b: string) { const x=normalize(a),y=normalize(b); if(x===y)return 1; const xs=new Set(x.split(" ")),ys=new Set(y.split(" ")); const common=[...xs].filter(v=>ys.has(v)).length; return common/Math.max(xs.size,ys.size,1); }

export async function resolveSpotifyMatch(input: { isrc?: string; title?: string; artist?: string }) {
  const accessToken = await token(); if (!accessToken) { console.info("[tone-link:spotify] skipped: credentials unavailable"); return null; }
  const queries = input.isrc ? [`isrc:${input.isrc}`] : [];
  if (input.title && input.artist) queries.push(`track:${input.title} artist:${input.artist}`);
  for (const query of queries) {
    const url=`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`;
    console.info("[tone-link:spotify]",{isrc:input.isrc||null,query,url});
    const response=await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`},cache:"no-store"}); if(!response.ok){console.warn("[tone-link:spotify] search rejected",response.status);continue;}
    const json=await response.json() as {tracks:{items:SpotifyTrack[]}}; console.info("[tone-link:spotify] candidates",json.tracks.items.map(item=>({id:item.id,title:item.name,artist:item.artists.map(a=>a.name).join(", "),isrc:item.external_ids?.isrc})));
    const exact=input.isrc?json.tracks.items.find(item=>item.external_ids?.isrc?.toUpperCase()===input.isrc?.toUpperCase()):undefined;
    const selected=exact||json.tracks.items.find(item=>similarity(item.name,input.title||"")>=.8&&similarity(item.artists.map(a=>a.name).join(" "),input.artist||"")>=.8);
    if(selected){const confidence=exact?0.95:0.9;console.info("[tone-link:spotify] selected",{id:selected.id,confidence,reason:exact?"isrc":"title_artist"});return {track:selected,confidence};}
    console.info("[tone-link:spotify] rejected",{reason:"no high-similarity candidate"});
  }
  return null;
}

export async function importSpotify(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.query) return [];
  const accessToken = await token();
  if (!accessToken) return [];
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(input.query)}&type=track&limit=8`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Spotify search is unavailable.");
  const json = await response.json() as { tracks: { items: SpotifyTrack[] } };
  return json.tracks.items.map((item) => ({ provider: "Spotify", externalId: item.id, title: item.name, artist: item.artists.map((artist) => artist.name).join(", "), artworkUrl: item.album.images[0]?.url, releaseDate: item.album.release_date, album:item.album.name, isrc:item.external_ids?.isrc, links: [{ platform: "spotify", label: "Spotify", url: item.external_urls.spotify, section: "listen", enabled: true, order: 1 }] }));
}
