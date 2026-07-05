import type { PlatformType, SongLink } from "@/data/songs";
import type { ImportCandidate, ImportQuery } from "./types";

const platformMap: Record<string, { platform: PlatformType; label: string }> = {
  spotify: { platform: "spotify", label: "Spotify" }, appleMusic: { platform: "apple_music", label: "Apple Music" },
  youtube: { platform: "youtube", label: "YouTube" }, youtubeMusic: { platform: "youtube_music", label: "YouTube Music" },
  soundcloud: { platform: "soundcloud", label: "SoundCloud" }, pandora: { platform: "pandora", label: "Pandora" },
  deezer: { platform: "deezer", label: "Deezer" }, amazonMusic: { platform: "amazon_music", label: "Amazon Music" },
  tidal: { platform: "tidal", label: "TIDAL" }, itunes: { platform: "itunes", label: "iTunes" }, amazonStore: { platform: "amazon", label: "Amazon" }
};

export async function importOdesli(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.url) return [];
  const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(input.url)}`, { cache: "no-store" });
  if (!response.ok) return [];
  const json = await response.json() as { entityUniqueId: string; entitiesByUniqueId: Record<string, { title?: string; artistName?: string; thumbnailUrl?: string }>; linksByPlatform: Record<string, { url: string; entityUniqueId?: string }> };
  const entity = json.entitiesByUniqueId[json.entityUniqueId] || Object.values(json.entitiesByUniqueId)[0];
  if (!entity) return [];
  const links: SongLink[] = Object.entries(json.linksByPlatform).flatMap(([key, value], index) => {
    const mapped = platformMap[key]; if (!mapped) return [];
    return [{ ...mapped, url: value.url, section: mapped.platform === "itunes" || mapped.platform === "amazon" ? "buy" as const : "listen" as const, enabled: true, order: index + 1 }];
  });
  return [{ provider: "Songlink / Odesli", externalId: json.entityUniqueId, title: entity.title || "Untitled Release", artist: entity.artistName || "Unknown Artist", artworkUrl: entity.thumbnailUrl, links }];
}
