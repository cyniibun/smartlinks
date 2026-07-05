import type { ImportCandidate, ImportQuery } from "./types";

export async function importManual(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.url) return [];
  let host = "other";
  try { host = new URL(input.url).hostname.replace("www.", "").split(".")[0]; } catch { return []; }
  const platform = host.includes("spotify") ? "spotify" : host.includes("apple") ? "apple_music" : host.includes("youtube") || host === "youtu" ? "youtube" : "other";
  return [{ provider: "Manual link", title: "Untitled Release", artist: "Unknown Artist", links: [{ platform, label: platform === "apple_music" ? "Apple Music" : platform.charAt(0).toUpperCase() + platform.slice(1), url: input.url, section: "listen", enabled: true, order: 1 }] } as ImportCandidate];
}
