import "server-only";
import type { HeadEntry, PlatformType, SongLink } from "@/data/songs";
import { validateHeadEntries } from "@/lib/headEntries";
import { getSupabaseAdmin } from "@/lib/supabase";

export type SmartLinkEditorLink = {
  id?: string;
  platform: PlatformType;
  label: string;
  url: string;
  section: SongLink["section"];
  enabled: boolean;
  order: number;
};

export type SmartLinkEditorPage = {
  id: string;
  releaseId?: string;
  slug: string;
  title: string;
  subtitle: string;
  artist: string;
  labelName: string;
  artworkUrl: string;
  backgroundImageUrl: string;
  canonicalUrl: string;
  releaseDate: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  published: boolean;
  tiktokPixelId: string;
  metaPixelId: string;
  gaMeasurementId: string;
  headEntries: HeadEntry[];
  links: SmartLinkEditorLink[];
};

const sections = new Set(["listen", "watch", "buy", "podcast", "merch", "tickets", "other"]);
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function getSmartLinkEditorPage(id: string, workspaceId: string): Promise<SmartLinkEditorPage | null> {
  const db = getSupabaseAdmin(); if (!db) throw new Error("Supabase is not configured.");
  const result = await db.from("link_pages")
    .select("*, page_links(*), releases(release_date,label_name)")
    .eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  if (result.error) throw new Error(result.error.message); if (!result.data) return null;
  const row = result.data as Record<string, unknown> & { page_links?: Array<Record<string, unknown>>; releases?: Record<string, unknown> | Array<Record<string, unknown>> | null };
  const release = Array.isArray(row.releases) ? row.releases[0] : row.releases;
  return {
    id: String(row.id), releaseId: row.release_id ? String(row.release_id) : undefined,
    slug: String(row.slug || ""), title: String(row.title || ""), subtitle: String(row.subtitle || ""),
    artist: String(row.artist_display_name || ""), labelName: String(row.label_name || release?.label_name || ""),
    artworkUrl: String(row.artwork_url || ""), backgroundImageUrl: String(row.background_image_url || ""),
    canonicalUrl: String(row.canonical_url || `https://link.tone-link.com/${row.slug}`), releaseDate: String(release?.release_date || ""),
    seoTitle: String(row.seo_title || ""), seoDescription: String(row.seo_description || ""), ogImage: String(row.og_image || ""),
    published: Boolean(row.published), tiktokPixelId: String(row.tiktok_pixel_id || ""), metaPixelId: String(row.meta_pixel_id || ""), gaMeasurementId: String(row.ga_measurement_id || ""),
    headEntries: validateHeadEntries(row.head_entries),
    links: (row.page_links || []).map((link) => ({
      id: String(link.id), platform: String(link.platform) as PlatformType, label: String(link.label || ""), url: String(link.url || ""),
      section: String(link.section || "listen") as SongLink["section"], enabled: link.enabled !== false, order: Number(link.display_order || 0),
    })).sort((a, b) => a.order - b.order),
  };
}

export async function updateSmartLinkEditorPage(id: string, workspaceId: string, input: SmartLinkEditorPage) {
  const db = getSupabaseAdmin(); if (!db) throw new Error("Supabase is not configured.");
  const current = await getSmartLinkEditorPage(id, workspaceId); if (!current) throw new Error("Smart Link not found.");
  const slug = slugify(input.slug); if (!slug) throw new Error("Enter a valid slug.");
  if (!input.title.trim()) throw new Error("Title is required.");
  const duplicate = await db.from("link_pages").select("id").eq("slug", slug).neq("id", id).maybeSingle();
  if (duplicate.error) throw new Error(duplicate.error.message); if (duplicate.data) throw new Error(`The slug “${slug}” is already in use.`);
  const headEntries = validateHeadEntries(input.headEntries);
  const links = input.links.map((link, index) => {
    if (!link.url.trim()) throw new Error(`${link.label || `Platform ${index + 1}`}: URL is required.`);
    try { new URL(link.url); } catch { throw new Error(`${link.label || `Platform ${index + 1}`}: enter a valid URL.`); }
    if (!sections.has(link.section)) throw new Error(`${link.label}: unsupported section.`);
    return { ...link, label: link.label.trim() || link.platform, url: link.url.trim(), order: index + 1 };
  });
  const pageRow = {
    slug, title: input.title.trim(), subtitle: input.subtitle.trim() || null, artist_display_name: input.artist.trim(), label_name: input.labelName.trim() || null,
    artwork_url: input.artworkUrl.trim() || null, background_image_url: input.backgroundImageUrl.trim() || null,
    canonical_url: input.canonicalUrl.trim() || `https://link.tone-link.com/${slug}`,
    seo_title: input.seoTitle.trim() || `${input.title.trim()} by ${input.artist.trim()}`,
    seo_description: input.seoDescription.trim() || `Choose your preferred platform for ${input.title.trim()} by ${input.artist.trim()}.`,
    og_image: input.ogImage.trim() || input.artworkUrl.trim() || null, published: Boolean(input.published),
    tiktok_pixel_id: input.tiktokPixelId.trim() || null, meta_pixel_id: input.metaPixelId.trim() || null, ga_measurement_id: input.gaMeasurementId.trim() || null,
    head_entries: headEntries, updated_at: new Date().toISOString(),
  };
  const updated = await db.from("link_pages").update(pageRow).eq("id", id).eq("workspace_id", workspaceId).select("id").single();
  if (updated.error) throw new Error(updated.error.message);
  try {
    if (current.releaseId) {
      const release = await db.from("releases").update({ title: input.title.trim(), primary_artist_name: input.artist.trim(), label_name: input.labelName.trim() || null, artwork_url: input.artworkUrl.trim() || null, release_date: input.releaseDate || null, import_status: input.published ? "published" : "approved", updated_at: new Date().toISOString() }).eq("id", current.releaseId).eq("workspace_id", workspaceId);
      if (release.error) throw new Error(release.error.message);
    }
    const removed = await db.from("page_links").delete().eq("link_page_id", id).eq("workspace_id", workspaceId); if (removed.error) throw new Error(removed.error.message);
    if (links.length) {
      const inserted = await db.from("page_links").insert(links.map((link) => ({ workspace_id: workspaceId, link_page_id: id, platform: link.platform, label: link.label, url: link.url, section: link.section, enabled: link.enabled, display_order: link.order, confidence: 1, source: "smart_link_editor", review_status: "approved" })));
      if (inserted.error) throw new Error(inserted.error.message);
    }
  } catch (error) {
    await db.from("link_pages").update({ slug: current.slug, title: current.title, subtitle: current.subtitle || null, artist_display_name: current.artist, label_name: current.labelName || null, artwork_url: current.artworkUrl || null, background_image_url: current.backgroundImageUrl || null, canonical_url: current.canonicalUrl, seo_title: current.seoTitle, seo_description: current.seoDescription, og_image: current.ogImage || null, published: current.published, tiktok_pixel_id: current.tiktokPixelId || null, meta_pixel_id: current.metaPixelId || null, ga_measurement_id: current.gaMeasurementId || null, head_entries: current.headEntries }).eq("id", id).eq("workspace_id", workspaceId);
    if (current.releaseId) await db.from("releases").update({ title: current.title, primary_artist_name: current.artist, label_name: current.labelName || null, artwork_url: current.artworkUrl || null, release_date: current.releaseDate || null, import_status: current.published ? "published" : "approved", updated_at: new Date().toISOString() }).eq("id", current.releaseId).eq("workspace_id", workspaceId);
    await db.from("page_links").delete().eq("link_page_id", id).eq("workspace_id", workspaceId);
    if (current.links.length) await db.from("page_links").insert(current.links.map((link, index) => ({ workspace_id: workspaceId, link_page_id: id, platform: link.platform, label: link.label, url: link.url, section: link.section, enabled: link.enabled, display_order: index + 1, confidence: 1, source: "smart_link_editor_rollback", review_status: "approved" })));
    throw error;
  }
  const saved = await getSmartLinkEditorPage(id, workspaceId); if (!saved) throw new Error("Smart Link save verification failed.");
  return saved;
}
