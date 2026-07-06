import type { ImportCandidate, ImportQuery } from "./types";

export async function importApple(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.query) return [];
  const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(input.query)}&entity=song&limit=8`, { cache: "no-store" });
  if (!response.ok) throw new Error("Apple Music search is unavailable.");
  const json = await response.json() as { results: Array<Record<string, string | number>> };
  return json.results.map((item) => {
    const appleMusicUrl=String(item.trackViewUrl);
    let iTunesUrl:string|undefined;
    try { const parsed=new URL(appleMusicUrl); parsed.searchParams.set("app","itunes"); iTunesUrl=parsed.toString(); } catch { /* Preserve Apple Music even if its URL cannot be transformed. */ }
    const links:ImportCandidate["links"]=[{ platform: "apple_music", label: "Apple Music", url: appleMusicUrl, section: "listen", enabled: true, order: 1 }];
    if(iTunesUrl)links.push({platform:"itunes",label:"iTunes",url:iTunesUrl,section:"buy",enabled:true,order:2});
    return {
      provider: "apple_music", externalId: String(item.trackId), title: String(item.trackName), artist: String(item.artistName),
      artworkUrl: String(item.artworkUrl100).replace("100x100bb", "1200x1200bb"), releaseDate: String(item.releaseDate).slice(0, 10), album: item.collectionName ? String(item.collectionName) : undefined, isrc: item.isrc ? String(item.isrc) : undefined,
      labelName:item.copyright?String(item.copyright):undefined,copyright:item.copyright?String(item.copyright):undefined,appleMusicUrl,iTunesUrl,links
    };
  });
}
