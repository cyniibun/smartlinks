import { listSongs } from "@/lib/songRepository";

export default async function Home() {
  const songs = await listSongs();
  return <main className="simple-page"><span className="eyebrow">tone-link</span><h1>Pick a release.</h1><div className="release-list">{songs.map((song) => <a href={`/${song.slug}`} key={song.slug}>{song.title}<span>{song.artist} →</span></a>)}</div></main>;
}
