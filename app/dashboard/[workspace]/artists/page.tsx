import { redirect } from "next/navigation";
import { ArtistsManager } from "@/components/admin/ArtistsManager";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getAnalyticsSummaryCounts } from "@/lib/analyticsAggregation";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { listArtists } from "@/lib/releaseRepository";
import { getSupabaseAdmin } from "@/lib/supabase";
import { systemThemes } from "@/lib/themes";

type LinkPageRow = {
  id: string;
  artist_id: string | null;
  title: string;
  slug: string;
  artwork_url?: string | null;
  published?: boolean | null;
  updated_at?: string | null;
};

async function pageSummary(db: NonNullable<ReturnType<typeof getSupabaseAdmin>>, workspaceId: string, page: LinkPageRow) {
  const summary = await getAnalyticsSummaryCounts(db, { workspaceId, linkPageId: page.id });
  return {
    id: page.id,
    title: page.title || page.slug,
    slug: page.slug,
    artwork_url: page.artwork_url,
    published: page.published,
    updated_at: page.updated_at,
    views: summary.views,
    clicks: summary.clicks,
    ctr: summary.ctr,
  };
}

export default async function ArtistsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const id = (await params).workspace;
  const context = await getWorkspaceContext(id);
  if (!context) redirect("/login");

  const db = getSupabaseAdmin();
  if (!db) return null;

  const [artists, pagesResult, themesResult, entitlements] = await Promise.all([
    listArtists(id),
    db.from("link_pages").select("id,artist_id,title,slug,artwork_url,published,updated_at").eq("workspace_id", id).order("updated_at", { ascending: false }).limit(500),
    db.from("themes").select("*").or(`is_system_theme.eq.true,workspace_id.eq.${id}`).order("is_system_theme", { ascending: false }).order("name"),
    getWorkspaceEntitlements(id, context.user, context.role),
  ]);

  const pages = (pagesResult.data || []) as LinkPageRow[];
  const pagesByArtist = new Map<string, LinkPageRow[]>();
  pages.forEach((page) => {
    if (!page.artist_id) return;
    pagesByArtist.set(page.artist_id, [...(pagesByArtist.get(page.artist_id) || []), page]);
  });

  const artistsWithStats = await Promise.all(artists.map(async (artist) => {
    const artistPages = pagesByArtist.get(artist.id) || [];
    const [summary, releaseSummaries] = await Promise.all([
      getAnalyticsSummaryCounts(db, { workspaceId: id, artistId: artist.id }),
      Promise.all(artistPages.slice(0, 12).map((page) => pageSummary(db, id, page))),
    ]);
    const sorted = [...releaseSummaries].sort((a, b) => b.clicks - a.clicks || b.views - a.views);
    return {
      ...artist,
      stats: {
        releaseCount: artistPages.length,
        views: summary.views,
        clicks: summary.clicks,
        ctr: summary.ctr,
        topRelease: sorted[0] || null,
        recentReleases: releaseSummaries.slice(0, 4),
      },
    };
  }));

  return <ArtistsManager workspaceId={id} initialArtists={artistsWithStats} themes={themesResult.data?.length ? themesResult.data : systemThemes} entitlements={entitlements} />;
}
