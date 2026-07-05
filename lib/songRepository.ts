import { unstable_noStore as noStore } from "next/cache";
import { songs as fallbackSongs, type PlatformType, type SongLink, type SongPage } from "@/data/songs";
import { getSupabaseAdmin } from "@/lib/supabase";

type SongRow = {
  id: string; slug: string; title: string; artist: string; subtitle: string | null;
  artwork_url: string | null; background_image_url: string | null; release_date: string | null;
  canonical_url: string | null; seo_title: string | null; seo_description: string | null;
  og_image: string | null; published: boolean; tiktok_pixel_id: string | null;
  meta_pixel_id: string | null; ga_measurement_id: string | null; song_links?: LinkRow[];
};
type LinkRow = { platform: string; label: string; url: string; section: string; enabled: boolean; display_order: number };

function fromRow(row: SongRow): SongPage {
  return {
    id: row.id, slug: row.slug, title: row.title, artist: row.artist,
    subtitle: row.subtitle ?? undefined, artworkUrl: row.artwork_url ?? "",
    backgroundImageUrl: row.background_image_url ?? undefined,
    releaseDate: row.release_date ?? undefined,
    canonicalUrl: row.canonical_url || `https://go.cyniicalaesthetic.productions/${row.slug}`,
    shortUrl: row.canonical_url ?? undefined, published: row.published,
    trackingPixels: {
      tiktokPixelId: row.tiktok_pixel_id ?? undefined,
      metaPixelId: row.meta_pixel_id ?? undefined,
      gaMeasurementId: row.ga_measurement_id ?? undefined
    },
    links: (row.song_links ?? []).map((link) => ({
      platform: link.platform as PlatformType, label: link.label, url: link.url,
      section: link.section as SongLink["section"], enabled: link.enabled, order: link.display_order
    })).sort((a, b) => a.order - b.order),
    pixelEvents: { contentId: row.slug, contentName: row.title, artistName: row.artist },
    seo: {
      title: row.seo_title || `${row.title} by ${row.artist}`,
      description: row.seo_description || `Choose your preferred music platform to listen to ${row.title} by ${row.artist}.`,
      ogImage: row.og_image || row.artwork_url || ""
    }
  };
}

const selection = "*, song_links(*)";

export async function listSongs(includeUnpublished = false): Promise<SongPage[]> {
  noStore();
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallbackSongs.filter((song) => includeUnpublished || song.published !== false);
  let query = supabase.from("songs").select(selection).order("updated_at", { ascending: false });
  if (!includeUnpublished) query = query.eq("published", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as SongRow[]).map(fromRow);
}

export async function getSongBySlug(slug: string, includeUnpublished = false): Promise<SongPage | undefined> {
  noStore();
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallbackSongs.find((song) => song.slug === slug && (includeUnpublished || song.published !== false));
  let query = supabase.from("songs").select(selection).eq("slug", slug);
  if (!includeUnpublished) query = query.eq("published", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as SongRow) : undefined;
}

export async function saveSong(song: SongPage) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY.");
  const row = {
    slug: song.slug, title: song.title, artist: song.artist, subtitle: song.subtitle || null,
    artwork_url: song.artworkUrl || null, background_image_url: song.backgroundImageUrl || null,
    release_date: song.releaseDate || null,
    canonical_url: song.canonicalUrl || `https://go.cyniicalaesthetic.productions/${song.slug}`,
    seo_title: song.seo.title, seo_description: song.seo.description,
    og_image: song.seo.ogImage || song.artworkUrl || null, published: song.published ?? false,
    tiktok_pixel_id: song.trackingPixels?.tiktokPixelId || null,
    meta_pixel_id: song.trackingPixels?.metaPixelId || null,
    ga_measurement_id: song.trackingPixels?.gaMeasurementId || null,
    updated_at: new Date().toISOString()
  };
  const result = song.id
    ? await supabase.from("songs").update(row).eq("id", song.id).select().single()
    : await supabase.from("songs").insert(row).select().single();
  if (result.error) throw new Error(result.error.message);
  const songId = result.data.id as string;
  const deleted = await supabase.from("song_links").delete().eq("song_id", songId);
  if (deleted.error) throw new Error(deleted.error.message);
  if (song.links.length) {
    const inserted = await supabase.from("song_links").insert(song.links.map((link) => ({
      song_id: songId, platform: link.platform, label: link.label, url: link.url,
      section: link.section, enabled: link.enabled, display_order: link.order
    })));
    if (inserted.error) throw new Error(inserted.error.message);
  }
  return getSongBySlug(song.slug, true);
}

export async function deleteSong(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
