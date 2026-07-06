import { importOdesli } from "@/lib/importers/odesli";
import type { SongLink } from "@/data/songs";

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

export async function resolveLinksFromSourceUrl(sourceUrl: string): Promise<ResolvedRelease> {
  const candidates = await importOdesli({ url: sourceUrl });
  const candidate = candidates[0];
  if (!candidate) throw new Error("No cross-platform matches were returned. Continue manually and review each destination.");
  const submittedHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const links = candidate.links.map((link) => {
    let host = ""; try { host = new URL(link.url).hostname.replace(/^www\./, ""); } catch { /* invalid URLs are left for review */ }
    const confidence = confidenceFor(candidate.provider, link.platform, host === submittedHost);
    return { platform: link.platform, label: link.label, url: link.url, section: link.section, confidence, source: candidate.provider.toLowerCase().includes("songlink") ? "odesli" : candidate.provider, enabledByDefault: confidence >= 0.95 };
  });
  return { title: candidate.title, artist: candidate.artist, artworkUrl: candidate.artworkUrl, releaseDate: candidate.releaseDate, sourceImportUrl: sourceUrl, provider: candidate.provider, confidence: links.length ? Math.max(...links.map((link) => link.confidence)) : 0, links };
}
