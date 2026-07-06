import { redirect } from "next/navigation";
import { ReleaseReview } from "@/components/admin/ReleaseReview";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { listArtists } from "@/lib/releaseRepository";

export default async function ReviewPage({params}:{params:Promise<{workspace:string}>}) {
  const workspaceId=(await params).workspace;
  if(!await getWorkspaceContext(workspaceId))redirect("/login");
  return <ReleaseReview workspaceId={workspaceId} artists={await listArtists(workspaceId)}/>;
}
