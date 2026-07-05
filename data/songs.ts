export type PlatformType =
  | "spotify" | "apple_music" | "youtube" | "youtube_music"
  | "soundcloud" | "pandora" | "deezer" | "amazon_music"
  | "tidal" | "itunes" | "amazon" | "bandcamp" | "audiomack" | "other";

export type SongLink = {
  platform: PlatformType;
  label: string;
  url: string;
  section: "listen" | "buy" | "watch" | "other";
  enabled: boolean;
  order: number;
};

export type SongPage = {
  id?: string;
  slug: string;
  title: string;
  artist: string;
  subtitle?: string;
  artworkUrl: string;
  backgroundImageUrl?: string;
  releaseDate?: string;
  canonicalUrl: string;
  shortUrl?: string;
  published?: boolean;
  trackingPixels?: {
    tiktokPixelId?: string;
    metaPixelId?: string;
    gaMeasurementId?: string;
  };
  links: SongLink[];
  pixelEvents: { contentId: string; contentName: string; artistName: string };
  seo: { title: string; description: string; ogImage: string };
};

export const songs: SongPage[] = [{
  slug: "watching-me",
  title: "Watching Me",
  artist: "Cyniical",
  artworkUrl: "/artwork/watching-me.jpg",
  canonicalUrl: "https://go.cyniicalaesthetic.productions/watching-me",
  shortUrl: "https://go.cyniicalaesthetic.productions/watching-me",
  published: true,
  pixelEvents: { contentId: "watching-me", contentName: "Watching Me", artistName: "Cyniical" },
  seo: {
    title: "Watching Me by Cyniical",
    description: "Choose your preferred music platform to listen to Watching Me by Cyniical.",
    ogImage: "/artwork/watching-me.jpg"
  },
  links: [
    { platform: "spotify", label: "Spotify", url: "https://open.spotify.com/track/24ZvlQYTeCXky7KynS1H89?si=be5fade522cc4270", section: "listen", enabled: true, order: 1 },
    { platform: "apple_music", label: "Apple Music", url: "https://geo.music.apple.com/us/album/_/1851085966?i=1851085968&mt=1&app=music&ls=1", section: "listen", enabled: true, order: 2 },
    { platform: "youtube", label: "YouTube", url: "https://www.youtube.com/watch?v=fDKialXYsTc", section: "listen", enabled: true, order: 3 },
    { platform: "youtube_music", label: "YouTube Music", url: "https://music.youtube.com/playlist?list=OLAK5uy_nIdRoop2PTi9VgMHEB7qQH-PGicf3d0bg", section: "listen", enabled: true, order: 4 },
    { platform: "soundcloud", label: "SoundCloud", url: "https://soundcloud.com/cyniical/watching-me-cyniical", section: "listen", enabled: true, order: 5 },
    { platform: "pandora", label: "Pandora", url: "https://www.pandora.com/TR:178708869", section: "listen", enabled: true, order: 6 },
    { platform: "deezer", label: "Deezer", url: "https://www.deezer.com/track/3633848602", section: "listen", enabled: true, order: 7 },
    { platform: "amazon_music", label: "Amazon Music", url: "https://music.amazon.com/albums/B0FZ2XFN9C?trackAsin=B0FZ2Z4C9H", section: "listen", enabled: true, order: 8 },
    { platform: "tidal", label: "TIDAL", url: "https://listen.tidal.com/track/471057346", section: "listen", enabled: true, order: 9 },
    { platform: "itunes", label: "iTunes", url: "https://geo.music.apple.com/us/album/_/1851085966?i=1851085968&mt=1&app=itunes&ls=1", section: "buy", enabled: true, order: 10 },
    { platform: "amazon", label: "Amazon", url: "https://amazon.com/dp/B0FZ2Z4C9H", section: "buy", enabled: true, order: 11 }
  ]
}];
