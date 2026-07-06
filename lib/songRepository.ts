import { unstable_noStore as noStore } from "next/cache";
import { songs as fallbackSongs, type PlatformType, type SongLink, type SongPage } from "@/data/songs";
import { getSupabaseAdmin } from "@/lib/supabase";
import { validateHeadEntries } from "@/lib/headEntries";

type SongRow = {
  id: string; slug: string; title: string; artist: string; subtitle: string | null;
  artwork_url: string | null; background_image_url: string | null; release_date: string | null;
  canonical_url: string | null; seo_title: string | null; seo_description: string | null;
  og_image: string | null; published: boolean; tiktok_pixel_id: string | null;
  meta_pixel_id: string | null; ga_measurement_id: string | null; head_entries: unknown; song_links?: LinkRow[];
};
type LinkRow = { platform: string; label: string; url: string; section: string; enabled: boolean; display_order: number };
type LinkPageRow = {
  id: string; workspace_id: string; artist_id: string | null; release_id: string | null; slug: string;
  title: string; subtitle: string | null; artist_display_name: string | null; label_name: string | null;
  artwork_url: string | null; background_image_url: string | null; canonical_url: string | null;
  seo_title: string | null; seo_description: string | null; og_image: string | null; published: boolean;
  tiktok_pixel_id: string | null; meta_pixel_id: string | null; ga_measurement_id: string | null; head_entries: unknown;
  page_links?: Array<LinkRow & { confidence?: number; review_status?: string }>;
  artists?: { name: string; default_label_name: string | null; default_tiktok_pixel_id: string | null; default_meta_pixel_id: string | null; default_ga_measurement_id: string | null; default_head_entries: unknown } | null;
  releases?: { release_date: string | null; label_name: string | null } | null;
};
type WorkspaceDefaults={default_tiktok_pixel_id:string|null;default_meta_pixel_id:string|null;default_ga_measurement_id:string|null};

const PUBLIC_ORIGIN = "https://link.tone-link.com";

function publicSongUrl(url: string | null, slug: string) {
  return (url || `${PUBLIC_ORIGIN}/${slug}`).replace("https://go.cyniicalaesthetic.productions", PUBLIC_ORIGIN);
}

function fromRow(row: SongRow): SongPage {
  const canonicalUrl = publicSongUrl(row.canonical_url, row.slug);
  return {
    id: row.id, slug: row.slug, title: row.title, artist: row.artist,
    subtitle: row.subtitle ?? undefined, artworkUrl: row.artwork_url ?? "",
    backgroundImageUrl: row.background_image_url ?? undefined,
    releaseDate: row.release_date ?? undefined,
    canonicalUrl,
    shortUrl: canonicalUrl, published: row.published,
    trackingPixels: {
      tiktokPixelId: row.tiktok_pixel_id ?? undefined,
      metaPixelId: row.meta_pixel_id ?? undefined,
      gaMeasurementId: row.ga_measurement_id ?? undefined
    },
    headEntries: validateHeadEntries(row.head_entries),
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

function fromLinkPage(row: LinkPageRow,workspaceDefaults?:WorkspaceDefaults|null): SongPage {
  const artist = row.artist_display_name || row.artists?.name || "";
  const canonicalUrl = publicSongUrl(row.canonical_url, row.slug);
  return {
    id: row.id, workspaceId: row.workspace_id, artistId: row.artist_id ?? undefined,
    releaseId: row.release_id ?? undefined, linkPageId: row.id, slug: row.slug,
    title: row.title, artist, subtitle: row.subtitle ?? undefined,
    labelName: row.label_name || row.releases?.label_name || row.artists?.default_label_name || undefined,
    artworkUrl: row.artwork_url ?? "", backgroundImageUrl: row.background_image_url ?? undefined,
    releaseDate: row.releases?.release_date ?? undefined, canonicalUrl, shortUrl: canonicalUrl, published: row.published,
    trackingPixels: {
      tiktokPixelId: row.tiktok_pixel_id || row.artists?.default_tiktok_pixel_id || workspaceDefaults?.default_tiktok_pixel_id || undefined,
      metaPixelId: row.meta_pixel_id || row.artists?.default_meta_pixel_id || workspaceDefaults?.default_meta_pixel_id || undefined,
      gaMeasurementId: row.ga_measurement_id || row.artists?.default_ga_measurement_id || workspaceDefaults?.default_ga_measurement_id || undefined
    },
    headEntries: validateHeadEntries((Array.isArray(row.head_entries) && row.head_entries.length ? row.head_entries : row.artists?.default_head_entries)),
    links: (row.page_links ?? []).filter((link) => !link.review_status || link.review_status === "approved").map((link) => ({
      platform: link.platform as PlatformType, label: link.label, url: link.url,
      section: link.section as SongLink["section"], enabled: link.enabled, order: link.display_order
    })).sort((a, b) => a.order - b.order),
    pixelEvents: { contentId: row.slug, contentName: row.title, artistName: artist },
    seo: { title: row.seo_title || `${row.title} by ${artist}`, description: row.seo_description || `Choose your preferred platform for ${row.title} by ${artist}.`, ogImage: row.og_image || row.artwork_url || "" }
  };
}

const selection = "*, song_links(*)";

export async function listSongs(includeUnpublished = false, workspaceId?: string): Promise<SongPage[]> {
  noStore();
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallbackSongs.filter((song) => includeUnpublished || song.published !== false);
  let query = supabase.from("songs").select(selection).order("updated_at", { ascending: false });
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  if (!includeUnpublished) query = query.eq("published", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as SongRow[]).map(fromRow);
}

export async function getSongBySlug(slug: string, includeUnpublished = false, workspaceId?: string): Promise<SongPage | undefined> {
  noStore();
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallbackSongs.find((song) => song.slug === slug && (includeUnpublished || song.published !== false));
  let pageQuery = supabase.from("link_pages").select("*, page_links(*), artists(name,default_label_name,default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id,default_head_entries), releases(release_date,label_name)").eq("slug", slug);
  if (workspaceId) pageQuery = pageQuery.eq("workspace_id", workspaceId);
  if (!includeUnpublished) pageQuery = pageQuery.eq("published", true);
  const page = await pageQuery.maybeSingle();
  if (!page.error && page.data) {const defaults=await supabase.from("workspaces").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("id",page.data.workspace_id).maybeSingle();return fromLinkPage(page.data as unknown as LinkPageRow,defaults.error?null:defaults.data);}
  let query = supabase.from("songs").select(selection).eq("slug", slug);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  if (!includeUnpublished) query = query.eq("published", true);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as SongRow) : undefined;
}

export async function getSongByLinkPageId(id: string, workspaceId: string): Promise<SongPage | undefined> {
  noStore();
  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;
  const result = await supabase.from("link_pages")
    .select("*, page_links(*), artists(name,default_label_name,default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id,default_head_entries), releases(release_date,label_name)")
    .eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if(!result.data)return undefined;const defaults=await supabase.from("workspaces").select("default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id").eq("id",workspaceId).maybeSingle();return fromLinkPage(result.data as unknown as LinkPageRow,defaults.error?null:defaults.data);
}

export async function saveSong(song: SongPage, workspaceId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY.");
  const headEntries = validateHeadEntries(song.headEntries);
  const row = {
    workspace_id: workspaceId,
    slug: song.slug, title: song.title, artist: song.artist, subtitle: song.subtitle || null,
    artwork_url: song.artworkUrl || null, background_image_url: song.backgroundImageUrl || null,
    release_date: song.releaseDate || null,
    canonical_url: publicSongUrl(song.canonicalUrl || null, song.slug),
    seo_title: song.seo.title, seo_description: song.seo.description,
    og_image: song.seo.ogImage || song.artworkUrl || null, published: song.published ?? false,
    tiktok_pixel_id: song.trackingPixels?.tiktokPixelId || null,
    meta_pixel_id: song.trackingPixels?.metaPixelId || null,
    ga_measurement_id: song.trackingPixels?.gaMeasurementId || null,
    head_entries: headEntries,
    updated_at: new Date().toISOString()
  };
  const result = song.id
    ? await supabase.from("songs").update(row).eq("id", song.id).eq("workspace_id", workspaceId).select().single()
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
  return getSongBySlug(song.slug, true, workspaceId);
}

export async function deleteSong(id: string, workspaceId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("songs").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}
