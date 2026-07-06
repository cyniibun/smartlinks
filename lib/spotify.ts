import "server-only";

let spotifyAccessToken: string | null = null;
let spotifyTokenExpires = 0;

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name?: string; images: Array<{ url: string }>; release_date: string };
  external_urls: { spotify: string };
  external_ids?: { isrc?: string };
};

export class SpotifyError extends Error {}

export async function getSpotifyAccessToken() {
  if (spotifyAccessToken && Date.now() < spotifyTokenExpires) return spotifyAccessToken;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new SpotifyError("Spotify credentials missing");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) throw new SpotifyError("Spotify token request failed");
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!result.access_token) throw new SpotifyError("Spotify token request failed");
  spotifyAccessToken = result.access_token;
  spotifyTokenExpires = Date.now() + Math.max(0, (result.expires_in ?? 3600) - 60) * 1000;
  return spotifyAccessToken;
}

async function spotifyFetch(url: string, retried = false): Promise<Response> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${await getSpotifyAccessToken()}` },
    cache: "no-store",
  });
  if (response.status === 401 && !retried) {
    spotifyAccessToken = null;
    spotifyTokenExpires = 0;
    return spotifyFetch(url, true);
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") || 1);
    if (!retried && retryAfter <= 3) {
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return spotifyFetch(url, true);
    }
    throw new SpotifyError(`Spotify rate limited; retry after ${retryAfter} seconds`);
  }
  if (!response.ok) throw new SpotifyError(`Spotify search failed (${response.status})`);
  return response;
}

export async function searchSpotifyTracks(query: string, limit: number) {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`;
  console.info("[tone-link:spotify:search]", { query, url });
  const response = await spotifyFetch(url);
  const result = await response.json() as { tracks?: { items?: SpotifyTrack[] } };
  return { url, tracks: result.tracks?.items ?? [] };
}
