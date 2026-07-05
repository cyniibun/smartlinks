import type { PlatformType, SongLink } from "@/data/songs";
import type { ImportCandidate, ImportQuery } from "./types";

const platformMap: Record<string, { platform: PlatformType; label: string }> = {
  spotify: { platform: "spotify", label: "Spotify" }, appleMusic: { platform: "apple_music", label: "Apple Music" },
  youtube: { platform: "youtube", label: "YouTube" }, youtubeMusic: { platform: "youtube_music", label: "YouTube Music" },
  soundcloud: { platform: "soundcloud", label: "SoundCloud" }, pandora: { platform: "pandora", label: "Pandora" },
  deezer: { platform: "deezer", label: "Deezer" }, amazonMusic: { platform: "amazon_music", label: "Amazon Music" },
  tidal: { platform: "tidal", label: "TIDAL" }, itunes: { platform: "itunes", label: "iTunes" }, amazonStore: { platform: "amazon", label: "Amazon" }
};

function classifySonglinkUrl(url: string): Omit<SongLink, "url" | "enabled" | "order"> | null {
  let parsed: URL; try { parsed = new URL(url); } catch { return null; }
  const host = parsed.hostname.replace(/^www\./, ""); const path = parsed.pathname;
  if (host === "open.spotify.com") return { platform: "spotify", label: "Spotify", section: "listen" };
  if (host.includes("music.apple.com")) return { platform: parsed.searchParams.get("app") === "itunes" ? "itunes" : "apple_music", label: parsed.searchParams.get("app") === "itunes" ? "iTunes" : "Apple Music", section: parsed.searchParams.get("app") === "itunes" ? "buy" : "listen" };
  if (host === "music.youtube.com") return { platform: "youtube_music", label: "YouTube Music", section: "listen" };
  if (host.endsWith("youtube.com") || host === "youtu.be") return { platform: "youtube", label: "YouTube", section: "listen" };
  if (host.includes("soundcloud.com")) return { platform: "soundcloud", label: "SoundCloud", section: "listen" };
  if (host.includes("pandora.com")) return { platform: "pandora", label: "Pandora", section: "listen" };
  if (host.includes("deezer.com")) return { platform: "deezer", label: "Deezer", section: "listen" };
  if (host === "music.amazon.com") return { platform: "amazon_music", label: "Amazon Music", section: "listen" };
  if (host.endsWith("amazon.com") && path.includes("/dp/")) return { platform: "amazon", label: "Amazon", section: "buy" };
  if (host.includes("tidal.com")) return { platform: "tidal", label: "TIDAL", section: "listen" };
  return null;
}

export async function importOdesli(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.url) return [];
  let resolvableUrl = input.url;
  let directSonglinkLinks: SongLink[] = [];
  try {
    const submitted = new URL(input.url);
    if (submitted.hostname === "song.link" || submitted.hostname.endsWith(".song.link") || submitted.hostname === "odesli.co") {
      const page = await fetch(input.url, { cache: "no-store" });
      const html = await page.text();
      const rawUrls = [...html.matchAll(/https:\/\/[^"'< ]+/g)].map((match) => match[0].replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&"));
      const seen = new Set<PlatformType>();
      directSonglinkLinks = rawUrls.flatMap((url) => {
        const mapped = classifySonglinkUrl(url); if (!mapped || seen.has(mapped.platform)) return [];
        seen.add(mapped.platform); return [{ ...mapped, url, enabled: true, order: seen.size }];
      });
      const providerMatch = directSonglinkLinks.find((link) => link.platform === "spotify")?.url || directSonglinkLinks[0]?.url;
      if (providerMatch) resolvableUrl = providerMatch;
    }
  } catch { /* The API call below will provide the normal fallback. */ }
  const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(resolvableUrl)}`, { cache: "no-store" });
  if (!response.ok) return [];
  const json = await response.json() as { entityUniqueId: string; entitiesByUniqueId: Record<string, { title?: string; artistName?: string; thumbnailUrl?: string }>; linksByPlatform: Record<string, { url: string; entityUniqueId?: string }> };
  const entity = json.entitiesByUniqueId[json.entityUniqueId] || Object.values(json.entitiesByUniqueId)[0];
  if (!entity) return [];
  const resolvedLinks: SongLink[] = Object.entries(json.linksByPlatform).flatMap(([key, value], index) => {
    const mapped = platformMap[key]; if (!mapped) return [];
    return [{ ...mapped, url: value.url, section: mapped.platform === "itunes" || mapped.platform === "amazon" ? "buy" as const : "listen" as const, enabled: true, order: index + 1 }];
  });
  const links = [...directSonglinkLinks, ...resolvedLinks.filter((link) => !directSonglinkLinks.some((direct) => direct.platform === link.platform))].map((link, index) => ({ ...link, order: index + 1 }));
  return [{ provider: "Songlink / Odesli", externalId: json.entityUniqueId, title: entity.title || "Untitled Release", artist: entity.artistName || "Unknown Artist", artworkUrl: entity.thumbnailUrl, links }];
}
