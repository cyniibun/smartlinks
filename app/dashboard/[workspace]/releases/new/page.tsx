import { notFound, redirect } from "next/navigation";
import { ReleaseWizard } from "@/components/admin/ReleaseWizard";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getWorkspaceEntitlements, requiredFeatureForReleaseType } from "@/lib/entitlements";
import { listArtists } from "@/lib/releaseRepository";
const releaseTypes = ["single","album","ep","playlist","podcast","podcast_episode","audiobook","youtube_video","merch","event","ticket_page","presave","artist_bio","short_link","custom"];
export default async function NewReleasePage({ params }: { params: Promise<{ workspace: string }> }) {
  const workspaceId = (await params).workspace; const context = await getWorkspaceContext(workspaceId);
  if (!context) redirect("/login"); if (context.role === "viewer") notFound();
  const entitlements=await getWorkspaceEntitlements(workspaceId,context.user,context.role);
  const allowedReleaseTypes=releaseTypes.filter(type=>{const feature=requiredFeatureForReleaseType(type);return !feature||entitlements.features[feature]||entitlements.developer});
  return <ReleaseWizard workspaceId={workspaceId} artists={await listArtists(workspaceId)} allowedReleaseTypes={allowedReleaseTypes} canUsePixels={entitlements.features.standard_pixels||entitlements.developer} canUseCustomDestinations={entitlements.features.custom_destinations||entitlements.developer} />;
}
