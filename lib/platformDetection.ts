import type { PlatformType, SongLink } from "@/data/songs";
export type DetectedPlatform = Pick<SongLink, "platform" | "label" | "section">;
export function detectPlatformUrl(value: string): DetectedPlatform {
  let url: URL; try { url = new URL(value); } catch { return { platform: "other", label: "Custom", section: "other" }; }
  const host = url.hostname.toLowerCase().replace(/^www\./, ""); const path = url.pathname.toLowerCase();
  if (host === "spotify.link" || (host === "open.spotify.com" && /^\/(track|album|playlist)\//.test(path))) return { platform: "spotify", label: "Spotify", section: "listen" };
  if (host === "music.youtube.com") return { platform: "youtube_music", label: "YouTube Music", section: "listen" };
  if (host === "youtu.be" || host.endsWith("youtube.com")) return { platform: "youtube", label: "YouTube", section: "watch" };
  if (host.endsWith("music.apple.com") || host === "geo.music.apple.com") return url.searchParams.get("app") === "itunes" ? { platform: "itunes", label: "iTunes", section: "buy" } : { platform: "apple_music", label: "Apple Music", section: "listen" };
  if (host.endsWith("soundcloud.com")) return { platform: "soundcloud", label: "SoundCloud", section: "listen" };
  if (host.endsWith("deezer.com")) return { platform: "deezer", label: "Deezer", section: "listen" };
  if (host.endsWith("tidal.com")) return { platform: "tidal", label: "TIDAL", section: "listen" };
  if (host === "music.amazon.com") return { platform: "amazon_music", label: "Amazon Music", section: "listen" };
  if (host.endsWith("amazon.com") && path.includes("/dp/")) return { platform: "amazon", label: "Amazon", section: "buy" };
  if (host.endsWith("pandora.com")) return { platform: "pandora", label: "Pandora", section: "listen" };
  return { platform: "other" as PlatformType, label: "Custom", section: "other" };
}
