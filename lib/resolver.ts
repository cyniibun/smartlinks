import { importOdesli } from "@/lib/importers/odesli";
import type { SongLink } from "@/data/songs";
import { resolveSpotifyMatch } from "@/lib/importers/spotify";

export type ResolvedLink = Omit<SongLink, "enabled" | "order"> & {
  confidence: number; source: string; enabledByDefault: boolean;
};
export type ResolvedRelease = {
  title: string; artist: string; album?: string; artworkUrl?: string; releaseDate?: string;
  labelName?: string; isrc?: string; upc?: string; sourceImportUrl?: string;
  provider: string; confidence: number; links: ResolvedLink[];
};

function confidenceFor(provider: string, platform: string, isSubmitted: boolean) {
  if (isSubmitted) return 1;
  if (/songlink|odesli/i.test(provider)) return 0.96;
  if (["spotify", "youtube", "youtube_music", "soundcloud"].includes(platform)) return 0.75;
  return 0.85;
}

export async function resolveLinksFromSourceUrl(sourceUrl: string, hints: { title?: string; artist?: string; isrc?: string } = {}): Promise<ResolvedRelease> {
  const spotifyFirst = hints.isrc ? await resolveSpotifyMatch(hints) : null;
  const candidates = await importOdesli({ url: sourceUrl });
  const candidate = candidates[0];
  const spotifyFallback = spotifyFirst || (!candidate?.links.some((link) => link.platform === "spotify") ? await resolveSpotifyMatch({ isrc: hints.isrc || candidate?.isrc, title: hints.title || candidate?.title, artist: hints.artist || candidate?.artist }) : null);
  if (!candidate && !spotifyFallback) throw new Error("No cross-platform matches were returned. Continue manually and review each destination.");
  const submittedHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const candidateLinks = candidate?.links || [];
  const links = candidateLinks.map((link) => {
    let host = ""; try { host = new URL(link.url).hostname.replace(/^www\./, ""); } catch { /* invalid URLs are left for review */ }
    const confidence = confidenceFor(candidate.provider, link.platform, host === submittedHost);
    return { platform: link.platform, label: link.label, url: link.url, section: link.section, confidence, source: candidate.provider.toLowerCase().includes("songlink") ? "odesli" : candidate.provider, enabledByDefault: confidence >= 0.95 };
  });
  if (spotifyFallback && !links.some((link) => link.platform === "spotify")) links.unshift({platform:"spotify",label:"Spotify",url:spotifyFallback.track.external_urls.spotify,section:"listen",confidence:spotifyFallback.confidence,source:spotifyFallback.confidence===.95?"spotify_isrc":"spotify_search",enabledByDefault:spotifyFallback.confidence>=.95});
  const spotifyTrack=spotifyFallback?.track;
  return { title: candidate?.title || spotifyTrack?.name || hints.title || "Untitled Release", artist: candidate?.artist || spotifyTrack?.artists.map(item=>item.name).join(", ") || hints.artist || "Unknown Artist", album:candidate?.album||spotifyTrack?.album.name, artworkUrl: candidate?.artworkUrl || spotifyTrack?.album.images[0]?.url, releaseDate: candidate?.releaseDate || spotifyTrack?.album.release_date, isrc:hints.isrc||candidate?.isrc||spotifyTrack?.external_ids?.isrc, sourceImportUrl: sourceUrl, provider: candidate?.provider || "Spotify", confidence: links.length ? Math.max(...links.map((link) => link.confidence)) : 0, links };
}
