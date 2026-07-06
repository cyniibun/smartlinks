import type { SongLink } from "@/data/songs";

export type ImportCandidate = {
  provider: string; externalId?: string; title: string; artist: string;
  artworkUrl?: string; releaseDate?: string; album?: string; isrc?: string; upc?: string;
  labelName?: string; copyright?: string; appleMusicUrl?: string; iTunesUrl?: string; links: SongLink[];
};
export type ImportQuery = { query?: string; url?: string };
