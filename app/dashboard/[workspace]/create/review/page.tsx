import { redirect } from "next/navigation";
import { ReleaseReview } from "@/components/admin/ReleaseReview";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getWorkspaceEntitlements, requiredFeatureForReleaseType } from "@/lib/entitlements";
import { listArtists } from "@/lib/releaseRepository";

const releaseTypes=["single","album","ep","playlist","podcast","podcast_episode","audiobook","youtube_video","merch","event","ticket_page","presave","artist_bio","short_link","custom"];

export default async function ReviewPage({params}:{params:Promise<{workspace:string}>}) {
  const workspaceId=(await params).workspace;
  const context=await getWorkspaceContext(workspaceId);
  if(!context)redirect("/login");
  const entitlements=await getWorkspaceEntitlements(workspaceId,context.user,context.role);
  const allowedReleaseTypes=releaseTypes.filter(type=>{const feature=requiredFeatureForReleaseType(type);return !feature||entitlements.features[feature]||entitlements.developer});
  return <ReleaseReview workspaceId={workspaceId} artists={await listArtists(workspaceId)} allowedReleaseTypes={allowedReleaseTypes} canUseCustomDestinations={entitlements.features.custom_destinations||entitlements.developer}/>;
}
