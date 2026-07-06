import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { listReleases } from "@/lib/releaseRepository";
export default async function ReleasesPage({ params }: { params: Promise<{ workspace: string }> }) {
  const id = (await params).workspace; const context = await getWorkspaceContext(id); if (!context) redirect("/login");
  const releases = await listReleases(id);
  return <main className="admin-main"><div className="admin-title-row"><div><span className="admin-kicker">CATALOG</span><h1>Releases</h1><p>Singles, albums, podcasts, presaves, events, and more.</p></div><Link className="admin-primary" href={`/dashboard/${id}/releases/new`}>+ New release</Link></div><div className="release-table">{releases.map((release) => <article className="release-row" key={release.id}><img src={release.artwork_url || "/artwork/watching-me.jpg"} alt="" /><div className="release-meta"><strong>{release.title}</strong><span>{release.artists?.name || release.primary_artist_name} · {release.release_type.replaceAll("_", " ")}</span></div><span className={`status-pill ${release.import_status === "published" ? "published" : "draft"}`}>{release.import_status}</span><div className="row-actions">{release.link_pages?.[0] && <a href={`/${release.link_pages[0].slug}`} target="_blank">Preview</a>}</div></article>)}</div></main>;
}
