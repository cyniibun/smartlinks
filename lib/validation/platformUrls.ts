import type { PlatformType } from "@/data/songs";

export type DestinationUrlValidationOptions = {
  allowGeneric?: boolean;
  allowLocalhost?: boolean;
};

export type DestinationUrlValidationResult =
  | { ok: true; normalizedUrl: string }
  | { ok: false; error: string };

const platformDomains: Partial<Record<PlatformType | string, string[]>> = {
  spotify: ["open.spotify.com", "spotify.link"],
  apple_music: ["music.apple.com", "geo.music.apple.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be", "music.youtube.com"],
  youtube_music: ["music.youtube.com", "youtube.com", "www.youtube.com", "youtu.be"],
  soundcloud: ["soundcloud.com", "on.soundcloud.com"],
  pandora: ["pandora.com", "www.pandora.com"],
  deezer: ["deezer.page.link", "www.deezer.com", "deezer.com"],
  amazon_music: ["music.amazon.com", "amazon.com", "www.amazon.com", "amzn.to"],
  tidal: ["tidal.com", "listen.tidal.com"],
  itunes: ["music.apple.com", "geo.music.apple.com", "itunes.apple.com"],
  amazon: ["amazon.com", "www.amazon.com", "amzn.to"],
  bandcamp: ["bandcamp.com", "www.bandcamp.com"],
  audiomack: ["audiomack.com", "www.audiomack.com"],
};

const genericPlatforms = new Set(["other", "custom"]);

export function normalizeDestinationUrl(url: string) {
  return String(url || "").trim();
}

function hasUnsafeText(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value) || /<\s*\/?\s*script/i.test(value) || /[<>]/.test(value);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 0;
}

function isLocalOrPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80") ||
    isPrivateIpv4(host)
  );
}

export function isSafeHttpsUrl(url: string, options: DestinationUrlValidationOptions = {}) {
  const normalizedUrl = normalizeDestinationUrl(url);
  if (!normalizedUrl) return { ok: false as const, error: "Enter a destination URL." };
  if (hasUnsafeText(normalizedUrl)) return { ok: false as const, error: "URL contains unsafe characters." };

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return { ok: false as const, error: "Enter a valid URL." };
  }

  if (parsed.protocol !== "https:") return { ok: false as const, error: "Only secure HTTPS links are allowed." };
  if (!options.allowLocalhost && isLocalOrPrivateHostname(parsed.hostname)) {
    return { ok: false as const, error: "Localhost and private network URLs are not allowed." };
  }

  return { ok: true as const, normalizedUrl: parsed.toString(), hostname: parsed.hostname.toLowerCase(), pathname: parsed.pathname };
}

function domainMatches(hostname: string, allowed: string) {
  const host = hostname.toLowerCase();
  const domain = allowed.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

export function isAllowedPlatformDomain(platform: string, hostname: string, pathname = "") {
  const key = String(platform || "other").toLowerCase();
  if (key === "amazon_music" && (hostname === "amazon.com" || hostname === "www.amazon.com")) {
    return pathname.startsWith("/music");
  }
  if (key === "bandcamp") return hostname === "bandcamp.com" || hostname === "www.bandcamp.com" || hostname.endsWith(".bandcamp.com");
  const allowed = platformDomains[key];
  if (!allowed?.length) return false;
  return allowed.some((domain) => domainMatches(hostname, domain));
}

export function validateDestinationUrl(platform: string, url: string, options: DestinationUrlValidationOptions = {}): DestinationUrlValidationResult {
  const safe = isSafeHttpsUrl(url, options);
  if (!safe.ok) return safe;

  const platformKey = String(platform || "other").toLowerCase();
  if (genericPlatforms.has(platformKey)) {
    return options.allowGeneric
      ? { ok: true, normalizedUrl: safe.normalizedUrl }
      : { ok: false, error: "Custom links require Pro." };
  }

  if (!isAllowedPlatformDomain(platformKey, safe.hostname, safe.pathname)) {
    const label = platformKey.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    return { ok: false, error: `Enter a valid ${label} URL.` };
  }

  return { ok: true, normalizedUrl: safe.normalizedUrl };
}
