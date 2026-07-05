import { songs } from "@/data/songs";

export function getSong(slug: string) {
  return songs.find((song) => song.slug === slug);
}
