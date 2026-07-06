import { getSupabaseAdmin } from "@/lib/supabase";
import type { ResolvedLink } from "@/lib/resolver";

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
  let artistId = draft.artistId;
  if (!artistId) {
    const artist = await db.from("artists").insert({ workspace_id: workspaceId, name: draft.newArtistName || draft.artist }).select("id,default_tiktok_pixel_id,default_meta_pixel_id,default_ga_measurement_id,default_label_name").single();
    if (artist.error) throw new Error(artist.error.message); artistId = artist.data.id;
  } else {
    const owned = await db.from("artists").select("id").eq("id", artistId).eq("workspace_id", workspaceId).maybeSingle();
    if (!owned.data) throw new Error("Artist does not belong to this workspace.");
  }
  const allocatedSlug = await uniqueSlug(db, draft.slug);
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
    tiktok_pixel_id: draft.pixels?.tiktok || null, meta_pixel_id: draft.pixels?.meta || null, ga_measurement_id: draft.pixels?.ga || null
  }).select("id,slug").single();
  if (page.error) { await db.from("releases").delete().eq("id", release.data.id).eq("workspace_id", workspaceId); throw new Error(page.error.message); }
  const selected = draft.links.filter((link) => link.selected && link.url);
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
