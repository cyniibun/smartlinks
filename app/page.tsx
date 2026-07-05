import Link from "next/link";
import { songs } from "@/data/songs";

export default function Home() {
  return <main className="simple-page"><span className="eyebrow">CYNiiCAL SMART LINKS</span><h1>Pick a release.</h1><div className="release-list">{songs.map((song) => <Link href={`/${song.slug}`} key={song.slug}>{song.title}<span>{song.artist} →</span></Link>)}</div></main>;
}
