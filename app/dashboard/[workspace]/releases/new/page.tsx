import { notFound, redirect } from "next/navigation";
import { ReleaseWizard } from "@/components/admin/ReleaseWizard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { listArtists } from "@/lib/releaseRepository";
export default async function NewReleasePage({ params }: { params: Promise<{ workspace: string }> }) {
  const workspaceId = (await params).workspace; const context = await getWorkspaceContext(workspaceId);
  if (!context) redirect("/login"); if (context.role === "viewer") notFound();
  return <ReleaseWizard workspaceId={workspaceId} artists={await listArtists(workspaceId)} />;
}
