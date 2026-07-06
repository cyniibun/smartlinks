import type { ImportCandidate, ImportQuery } from "./types";
import { searchSpotifyTracks, SpotifyError } from "@/lib/spotify";
const normalize = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
function similarity(a: string, b: string) { const x=normalize(a),y=normalize(b); if(x===y)return 1; const xs=new Set(x.split(" ")),ys=new Set(y.split(" ")); const common=[...xs].filter(v=>ys.has(v)).length; return common/Math.max(xs.size,ys.size,1); }

export async function resolveSpotifyMatch(input: { isrc?: string; title?: string; artist?: string }) {
  const queries = input.isrc ? [{ value: `isrc:${input.isrc}`, limit: 5 }] : [];
  if (input.title && input.artist) queries.push({ value: `track:"${input.title}" artist:"${input.artist}"`, limit: 10 });
  for (const query of queries) {
    let tracks;
    try { ({ tracks } = await searchSpotifyTracks(query.value, query.limit)); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Spotify search failed";
      console.warn("[tone-link:spotify:error]", { isrc: input.isrc || null, query: query.value, message });
      if (error instanceof SpotifyError) throw error;
      continue;
    }
    console.info("[tone-link:spotify:candidates]",tracks.map(item=>({id:item.id,title:item.name,artist:item.artists.map(a=>a.name).join(", "),isrc:item.external_ids?.isrc})));
    const exact=input.isrc?tracks.find(item=>item.external_ids?.isrc?.toUpperCase()===input.isrc?.toUpperCase()):undefined;
    const scored=tracks.map(track=>({track,titleScore:similarity(track.name,input.title||""),artistScore:similarity(track.artists.map(a=>a.name).join(" "),input.artist||"")})).sort((a,b)=>(b.titleScore+b.artistScore)-(a.titleScore+a.artistScore));
    const high=scored.find(item=>item.titleScore>=.8&&item.artistScore>=.8);
    const uncertain=high?undefined:scored.find(item=>item.titleScore>=.8);
    const selected=exact||high?.track||uncertain?.track;
    if(selected){const confidence=exact?0.98:high?0.9:0.7;console.info("[tone-link:spotify:selected]",{id:selected.id,confidence,reason:exact?"isrc":high?"title_artist":"title_only"});return {track:selected,confidence};}
    console.info("[tone-link:spotify:rejected]",{reason:"Spotify search returned no match"});
  }
  return null;
}

export async function importSpotify(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.query) return [];
  const { tracks } = await searchSpotifyTracks(input.query, 8);
  return tracks.map((item) => ({ provider: "Spotify", externalId: item.id, title: item.name, artist: item.artists.map((artist) => artist.name).join(", "), artworkUrl: item.album.images[0]?.url, releaseDate: item.album.release_date, album:item.album.name, isrc:item.external_ids?.isrc, links: [{ platform: "spotify", label: "Spotify", url: item.external_urls.spotify, section: "listen", enabled: true, order: 1 }] }));
}
