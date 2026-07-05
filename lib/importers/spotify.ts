import type { ImportCandidate, ImportQuery } from "./types";

async function token() {
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store" });
  if (!response.ok) return null;
  return ((await response.json()) as { access_token: string }).access_token;
}

export async function importSpotify(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.query) return [];
  const accessToken = await token();
  if (!accessToken) return [];
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(input.query)}&type=track&limit=8`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Spotify search is unavailable.");
  const json = await response.json() as { tracks: { items: Array<{ id: string; name: string; artists: { name: string }[]; album: { images: { url: string }[]; release_date: string }; external_urls: { spotify: string } }> } };
  return json.tracks.items.map((item) => ({ provider: "Spotify", externalId: item.id, title: item.name, artist: item.artists.map((artist) => artist.name).join(", "), artworkUrl: item.album.images[0]?.url, releaseDate: item.album.release_date, links: [{ platform: "spotify", label: "Spotify", url: item.external_urls.spotify, section: "listen", enabled: true, order: 1 }] }));
}
