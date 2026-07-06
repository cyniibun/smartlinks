import { importOdesli } from "@/lib/importers/odesli";
import type { SongLink } from "@/data/songs";
import { resolveSpotifyMatch } from "@/lib/importers/spotify";
import type { ImportCandidate } from "@/lib/importers/types";

export type ResolvedLink = Omit<SongLink, "enabled" | "order"> & {
  confidence: number; source: string; enabledByDefault: boolean;
};
export type ResolvedRelease = {
  title: string; artist: string; album?: string; artworkUrl?: string; releaseDate?: string;
  labelName?: string; isrc?: string; upc?: string; sourceImportUrl?: string;
  provider: string; confidence: number; links: ResolvedLink[];
  report?: Array<{ platform: string; status: "matched" | "review" | "missing"; reason: string }>;
};

function confidenceFor(provider: string, platform: string, isSubmitted: boolean) {
  if (isSubmitted) return 1;
  if (/songlink|odesli/i.test(provider)) return 0.96;
  if (["spotify", "youtube", "youtube_music", "soundcloud"].includes(platform)) return 0.75;
  return 0.85;
}

type ResolverHints = { title?: string; artist?: string; isrc?: string; importSource?: { provider?: string }; selectedResult?: Partial<ImportCandidate> };

function resolvedSourceLink(link: {platform:SongLink["platform"];label:string;url:string;section:SongLink["section"]}, source="selected_source_result"):ResolvedLink {
  return {...link,confidence:1,source,enabledByDefault:true};
}

export function ensureSourcePlatformLink(importSource:ResolverHints["importSource"],selectedResult:ResolverHints["selectedResult"],resolvedLinks:ResolvedLink[]) {
  if(!selectedResult)return resolvedLinks;
  const provider=(importSource?.provider||selectedResult.provider||"").toLowerCase().replace(/[\s-]+/g,"_");
  const sourceLinks:ResolvedLink[]=[];
  if(provider==="apple_music"||provider==="apple") {
    const appleMusicUrl=selectedResult.appleMusicUrl||selectedResult.links?.find(link=>link.platform==="apple_music")?.url||selectedResult.links?.[0]?.url;
    if(appleMusicUrl)sourceLinks.push(resolvedSourceLink({platform:"apple_music",label:"Apple Music",section:"listen",url:appleMusicUrl},"selected_apple_result"));
    const iTunesUrl=selectedResult.iTunesUrl||selectedResult.links?.find(link=>link.platform==="itunes")?.url;
    if(iTunesUrl)sourceLinks.push(resolvedSourceLink({platform:"itunes",label:"iTunes",section:"buy",url:iTunesUrl},"selected_apple_result"));
  } else {
    for(const link of selectedResult.links||[])sourceLinks.push(resolvedSourceLink({platform:link.platform,label:link.label,url:link.url,section:link.section}));
  }
  return mergeResolvedLinks([...sourceLinks,...resolvedLinks]);
}

function linkPriority(link:ResolvedLink) {
  if(link.source==="selected_apple_result"||link.source==="selected_source_result")return 300;
  if(link.source==="spotify_isrc")return 200;
  return Math.round(link.confidence*100);
}

export function mergeResolvedLinks(links:ResolvedLink[]) {
  const merged=new Map<string,ResolvedLink>();
  for(const link of links) {
    const key=`${link.platform}:${link.section}`;const current=merged.get(key);
    if(!current||linkPriority(link)>linkPriority(current))merged.set(key,link);
  }
  return [...merged.values()];
}

export async function resolveLinksFromSourceUrl(sourceUrl: string, hints: ResolverHints = {}): Promise<ResolvedRelease> {
  const report: NonNullable<ResolvedRelease["report"]> = [];
  const selected=hints.selectedResult;
  const metadata={title:selected?.title||hints.title,artist:selected?.artist||hints.artist,isrc:selected?.isrc||hints.isrc};
  const sourceSeed=ensureSourcePlatformLink(hints.importSource,selected,[]);
  const trySpotify = async (input: Pick<ResolverHints,"title"|"artist"|"isrc">) => {
    try { return await resolveSpotifyMatch(input); }
    catch (error) { report.push({ platform: "Spotify", status: "missing", reason: error instanceof Error ? error.message : "Spotify search failed" }); return null; }
  };
  const spotifyFirst = metadata.isrc ? await trySpotify(metadata) : null;
  const candidates = await importOdesli({ url: sourceUrl });
  const candidate = candidates[0];
  const spotifyFallback = spotifyFirst || (!candidate?.links.some((link) => link.platform === "spotify") ? await trySpotify({ isrc: metadata.isrc || candidate?.isrc, title: metadata.title || candidate?.title, artist: metadata.artist || candidate?.artist }) : null);
  if (!candidate && !spotifyFallback && !sourceSeed.length) throw new Error("No cross-platform matches were returned. Continue manually and review each destination.");
  let submittedHost="";try{submittedHost=new URL(sourceUrl).hostname.replace(/^www\./, "")}catch{/* Selected source links still remain available. */}
  const candidateLinks = candidate?.links || [];
  let links = candidateLinks.map((link) => {
    let host = ""; try { host = new URL(link.url).hostname.replace(/^www\./, ""); } catch { /* invalid URLs are left for review */ }
    const provider=candidate?.provider||"resolver";const confidence = confidenceFor(provider, link.platform, host === submittedHost);
    return { platform: link.platform, label: link.label, url: link.url, section: link.section, confidence, source: provider.toLowerCase().includes("songlink") ? "odesli" : provider, enabledByDefault: confidence >= 0.95 };
  });
  if (spotifyFallback) links.unshift({platform:"spotify",label:"Spotify",url:spotifyFallback.track.external_urls.spotify,section:"listen",confidence:spotifyFallback.confidence,source:spotifyFallback.confidence===.98?"spotify_isrc":"spotify_search",enabledByDefault:spotifyFallback.confidence>=.9});
  links=ensureSourcePlatformLink(hints.importSource,selected,links);
  for (const link of links) report.push({ platform: link.label, status: link.enabledByDefault ? "matched" : "review", reason: link.source === "spotify_isrc" ? "ISRC match" : link.confidence >= .95 ? "Provider match" : "Title + artist match" });
  if (!links.some(link => link.platform === "spotify") && !report.some(item => item.platform === "Spotify")) report.push({ platform: "Spotify", status: "missing", reason: "Spotify search returned no match" });
  const spotifyTrack=spotifyFallback?.track;
  return { title: selected?.title || candidate?.title || spotifyTrack?.name || hints.title || "Untitled Release", artist: selected?.artist || candidate?.artist || spotifyTrack?.artists.map(item=>item.name).join(", ") || hints.artist || "Unknown Artist", album:selected?.album||candidate?.album||spotifyTrack?.album.name, artworkUrl:selected?.artworkUrl||candidate?.artworkUrl || spotifyTrack?.album.images[0]?.url, releaseDate:selected?.releaseDate||candidate?.releaseDate || spotifyTrack?.album.release_date, labelName:selected?.labelName||selected?.copyright, isrc:selected?.isrc||hints.isrc||candidate?.isrc||spotifyTrack?.external_ids?.isrc, sourceImportUrl: sourceUrl, provider: selected?.provider||candidate?.provider || "Spotify", confidence: links.length ? Math.max(...links.map((link) => link.confidence)) : 0, links, report };
}
