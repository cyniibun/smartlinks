import { notFound, redirect } from "next/navigation";
import { SongSmartLinkPage } from "@/components/SongSmartLinkPage";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSongByLinkPageId } from "@/lib/songRepository";

export default async function DraftPreview({params}:{params:Promise<{linkPageId:string}>}) {
  const context=await getWorkspaceContext();
  if(!context)redirect("/login");
  const song=await getSongByLinkPageId((await params).linkPageId,context.workspace.id);
  if(!song)notFound();
  return <><div className="draft-preview-banner">Private draft preview · Only workspace members can view this page.</div><SongSmartLinkPage song={song}/></>;
}
