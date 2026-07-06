import type { ImportCandidate, ImportQuery } from "./types";

type AppleSearchResult = Record<string, string | number>;
const normalize=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
function similarity(a:string,b:string){const left=normalize(a),right=normalize(b);if(left===right)return 1;const x=new Set(left.split(" ").filter(Boolean)),y=new Set(right.split(" ").filter(Boolean));const common=[...x].filter(token=>y.has(token)).length;return common/Math.max(x.size,y.size,1)}
const qualifiers=["remix","live","sped up","instrumental"];
function qualifierCompatible(source:string,candidate:string){const sourceText=normalize(source),candidateText=normalize(candidate);return qualifiers.every(qualifier=>!candidateText.includes(qualifier)||sourceText.includes(qualifier))}
function appleUrls(trackViewUrl:string){let appleMusicUrl=trackViewUrl,iTunesUrl:string|undefined;try{const music=new URL(trackViewUrl);music.searchParams.set("app","music");appleMusicUrl=music.toString();const store=new URL(trackViewUrl);store.searchParams.set("app","itunes");iTunesUrl=store.toString()}catch{/* The original result remains usable as Apple Music. */}return{appleMusicUrl,iTunesUrl}}

async function searchApple(term:string,countryOverride?:string) {
  const country=(countryOverride||process.env.APPLE_MUSIC_COUNTRY||"US").toUpperCase();
  const params=new URLSearchParams({term,entity:"song",media:"music",limit:"10",country});
  const response=await fetch(`https://itunes.apple.com/search?${params}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`Apple Music search failed (${response.status}).`);
  const json=await response.json() as {results:AppleSearchResult[]};return json.results;
}

function toCandidate(item:AppleSearchResult):ImportCandidate {
  const {appleMusicUrl,iTunesUrl}=appleUrls(String(item.trackViewUrl));
  const links:ImportCandidate["links"]=[{platform:"apple_music",label:"Apple Music",url:appleMusicUrl,section:"listen",enabled:true,order:1}];
  if(iTunesUrl)links.push({platform:"itunes",label:"iTunes",url:iTunesUrl,section:"buy",enabled:true,order:2});
  return {provider:"apple_music",externalId:String(item.trackId),title:String(item.trackName),artist:String(item.artistName),artworkUrl:String(item.artworkUrl100).replace("100x100bb","1200x1200bb"),releaseDate:String(item.releaseDate).slice(0,10),album:item.collectionName?String(item.collectionName):undefined,isrc:item.isrc?String(item.isrc):undefined,labelName:item.copyright?String(item.copyright):undefined,copyright:item.copyright?String(item.copyright):undefined,appleMusicUrl,iTunesUrl,links};
}

export async function resolveAppleMusicLinks(input:{title?:string;artist?:string;isrc?:string;album?:string;country?:string}) {
  if(!input.title||!input.artist)return null;
  const results=await searchApple(`${input.artist} ${input.title}`,input.country);
  const scored=results.filter(item=>qualifierCompatible(input.title||"",String(item.trackName||""))).map(item=>({item,title:similarity(String(item.trackName||""),input.title||""),artist:similarity(String(item.artistName||""),input.artist||""),album:input.album?similarity(String(item.collectionName||""),input.album):0,isrc:Boolean(input.isrc&&item.isrc&&String(item.isrc).toUpperCase()===input.isrc.toUpperCase())})).sort((a,b)=>(Number(b.isrc)*10+b.title+b.artist+b.album*.25)-(Number(a.isrc)*10+a.title+a.artist+a.album*.25));
  const match=scored.find(item=>item.isrc)||scored.find(item=>item.title>=.8&&item.artist>=.75&&(input.album?item.album>=.45:true));
  if(!match){console.info("[tone-link:apple:rejected]",{title:input.title,artist:input.artist,isrc:input.isrc||null,candidates:results.length});return null}
  const candidate=toCandidate(match.item);const confidence=match.isrc?.98:.9;
  console.info("[tone-link:apple:selected]",{trackId:candidate.externalId,confidence,reason:match.isrc?"isrc":"title_artist_album"});
  return {candidate,confidence,reason:match.isrc?"ISRC match":"Title + artist match"};
}

export async function importApple(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.query) return [];
  return (await searchApple(input.query)).slice(0,8).map(toCandidate);
}
