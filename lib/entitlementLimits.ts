import type { User } from "@supabase/supabase-js";
import type { ReleaseDraft } from "@/lib/releaseRepository";
import type { WorkspaceRole } from "@/lib/adminAuth";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";

export class EntitlementLimitError extends Error {
  status = 403;
}

function willCreateArtist(draft: Pick<ReleaseDraft, "artistId" | "newArtistName" | "artist">) {
  return !String(draft.artistId || "").trim() && Boolean(String(draft.newArtistName || draft.artist || "").trim());
}

async function countWorkspaceRows(table: "artists" | "link_pages", workspaceId: string) {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Supabase is not configured.");

  const result = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (result.error) throw new Error(result.error.message);
  return result.count || 0;
}

export async function assertCanCreateRelease(
  workspaceId: string,
  draft: ReleaseDraft,
  user: Pick<User, "id" | "email"> | null,
  role: WorkspaceRole,
) {
  const entitlements = await getWorkspaceEntitlements(workspaceId, user, role);
  const smartLinkLimit = entitlements.limits.smart_links;

  if (smartLinkLimit !== null) {
    const currentSmartLinks = await countWorkspaceRows("link_pages", workspaceId);
    if (currentSmartLinks >= smartLinkLimit) {
      throw new EntitlementLimitError(`Smart-link limit reached for this workspace (${smartLinkLimit}).`);
    }
  }

  const artistLimit = entitlements.limits.artists;
  if (artistLimit !== null && willCreateArtist(draft)) {
    const currentArtists = await countWorkspaceRows("artists", workspaceId);
    if (currentArtists >= artistLimit) {
      throw new EntitlementLimitError(`Artist limit reached for this workspace (${artistLimit}).`);
    }
  }
}
