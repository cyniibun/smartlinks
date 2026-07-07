import { getSupabaseAdmin } from "@/lib/supabase";
import type { ResolvedLink } from "@/lib/resolver";
import { validateHeadEntries } from "@/lib/headEntries";

export type ReleaseDraft = {
  artistId?: string; newArtistName?: string; title: string; artist: string; releaseType: string;
  slug: string; artworkUrl?: string; releaseDate?: string; labelName?: string; sourceImportUrl?: string;
  importProvider?: string; importConfidence?: number; published: boolean;
  pixels?: { tiktok?: string; meta?: string; ga?: string }; links: Array<ResolvedLink & { selected: boolean }>;
};

async function uniqueSlug(db: NonNullable<ReturnType<typeof getSupabaseAdmin>>, requested: string) {
  const base = requested.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "link";
  const matches = await db.from("link_pages").select("slug").or(`slug.eq.${base},slug.like.${base}-%`);
  if (matches.error) throw new Error(matches.error.message);
  const used = new Set((matches.data || []).map((row) => row.slug)); if (!used.has(base)) return base;
  let suffix = 2; while (used.has(`${base}-${suffix}`)) suffix += 1; return `${base}-${suffix}`;
}
const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const asStringArray=(value:unknown)=>Array.isArray(value)?value.map(item=>String(item).trim()).filter(Boolean):[];
function applySlugPattern(pattern:string,title:string,artist:string){const raw=pattern==="{artist}-{title}"?`${artist}-${title}`:title;return slugify(raw)}
function sortLinksByTemplate<T extends {platform:string}>(links:T[],order:string[]){if(!order.length)return links;const rank=new Map(order.map((platform,index)=>[platform,index]));return [...links].sort((a,b)=>(rank.get(a.platform)??999)-(rank.get(b.platform)??999))}

export async function listArtists(workspaceId: string) {
  const db = getSupabaseAdmin(); if (!db) throw new Error("Supabase is not configured.");
  const result = await db.from("artists").select("*").eq("workspace_id", workspaceId).order("name");
  if (result.error) throw new Error(result.error.message); return result.data || [];
}
export async function listReleases(workspaceId: string) {
  const db = getSupabaseAdmin(); if (!db) throw new Error("Supabase is not configured.");
  const result = await db.from("releases").select("*, artists(name), link_pages(id,slug,published)").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
  if (result.error) throw new Error(result.error.message); return result.data || [];
}
export async function createRelease(workspaceId: string, draft: ReleaseDraft) {
  const db = getSupabaseAdmin(); if (!db) throw new Error("Supabase is not configured.");
  const workspaceResult=await db.from("workspaces").select("*").eq("id",workspaceId).single();if(workspaceResult.error)throw new Error(workspaceResult.error.message);const publicDomain=String(workspaceResult.data.default_public_domain||"link.tone-link.com").replace(/^https?:\/\//,"").replace(/\/$/,"");
  let artistId = draft.artistId;let artistDefaults:Record<string,unknown>|null=null;
  if (!artistId) {
    const artist = await db.from("artists").insert({ workspace_id: workspaceId, name: draft.newArtistName || draft.artist }).select("*").single();
    if (artist.error) throw new Error(artist.error.message); artistId = artist.data.id;
  } else {
    const owned = await db.from("artists").select("*").eq("id", artistId).eq("workspace_id", workspaceId).maybeSingle();
    if (!owned.data) throw new Error("Artist does not belong to this workspace.");
    artistDefaults=owned.data as Record<string,unknown>;
  }
  const templateSlug=artistDefaults?.default_slug_pattern?applySlugPattern(String(artistDefaults.default_slug_pattern),draft.title,draft.artist):draft.slug;
  const allocatedSlug = await uniqueSlug(db, draft.slug || templateSlug);
  const templateHeadEntries=validateHeadEntries(artistDefaults?.default_head_entries);
  const templatePlatformOrder=asStringArray(artistDefaults?.default_platform_order);
  const templateEnabledPlatforms=asStringArray(artistDefaults?.default_enabled_platforms);
  const release = await db.from("releases").insert({
    workspace_id: workspaceId, artist_id: artistId, title: draft.title, release_type: draft.releaseType,
    primary_artist_name: draft.artist, label_name: draft.labelName || null, release_date: draft.releaseDate || null,
    artwork_url: draft.artworkUrl || null, source_import_url: draft.sourceImportUrl || null,
    import_provider: draft.importProvider || "manual", import_confidence: draft.importConfidence || 0,
    import_status: draft.published ? "published" : "approved"
  }).select("id").single();
  if (release.error) throw new Error(release.error.message);
  const page = await db.from("link_pages").insert({
    workspace_id: workspaceId, artist_id: artistId, release_id: release.data.id, slug: allocatedSlug,
    title: draft.title, artist_display_name: draft.artist, label_name: draft.labelName || null,
    artwork_url: draft.artworkUrl || null, canonical_url: `https://${publicDomain}/${allocatedSlug}`,
    seo_title: `${draft.title} by ${draft.artist}`, seo_description: `Choose your preferred platform for ${draft.title} by ${draft.artist}.`,
    og_image: draft.artworkUrl || null, published: draft.published,
    tiktok_pixel_id: draft.pixels?.tiktok || null, meta_pixel_id: draft.pixels?.meta || null, ga_measurement_id: draft.pixels?.ga || null,
    head_entries: templateHeadEntries,
    layout_settings: { themeId: artistDefaults?.default_theme_id || null, footerText: artistDefaults?.default_footer_text || null }
  }).select("id,slug").single();
  if (page.error) { await db.from("releases").delete().eq("id", release.data.id).eq("workspace_id", workspaceId); throw new Error(page.error.message); }
  const selected = sortLinksByTemplate(draft.links.filter((link) => link.selected && link.url).map(link=>({...link,selected:templateEnabledPlatforms.length?templateEnabledPlatforms.includes(link.platform):link.selected})).filter(link=>link.selected),templatePlatformOrder);
  if (selected.length) {
    const inserted = await db.from("page_links").insert(selected.map((link, index) => ({
      workspace_id: workspaceId, link_page_id: page.data.id, platform: link.platform, label: link.label,
      url: link.url, section: link.section, enabled: true, display_order: index + 1,
      confidence: link.confidence, source: link.source, review_status: "approved"
    })));
    if (inserted.error) { await db.from("releases").delete().eq("id", release.data.id).eq("workspace_id", workspaceId); throw new Error(inserted.error.message); }
  }
  const verified = await db.from("link_pages").select("id,slug,published,release_id,page_links(id)").eq("id", page.data.id).eq("workspace_id", workspaceId).single();
  if (verified.error || !verified.data || verified.data.release_id !== release.data.id || (verified.data.page_links?.length || 0) !== selected.length) {
    await db.from("releases").delete().eq("id", release.data.id).eq("workspace_id", workspaceId);
    throw new Error(verified.error?.message || "Save verification failed; no partial Link Page was kept.");
  }
  return { id: verified.data.id, slug: verified.data.slug, published: verified.data.published, publicUrl: `https://${publicDomain}/${verified.data.slug}` };
}
