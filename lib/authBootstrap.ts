import type { User } from "@supabase/supabase-js";
import { DEFAULT_WORKSPACE_TIMEZONE } from "@/lib/timezone";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getEmailPrefix, slugifyWorkspaceName } from "@/lib/authUrls";

export type WorkspaceBootstrapResult = {
  workspaceId: string;
  createdWorkspace: boolean;
};

export async function ensureUserWorkspace(user: User): Promise<WorkspaceBootstrapResult> {
  const admin = getSupabaseAdmin();
  const email = user.email?.trim();
  if (!admin) throw new Error("Supabase admin client is not configured.");
  if (!email) throw new Error("Authenticated user does not have an email address.");

  const fullName = String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim() || null;
  const profile = await admin.from("profiles").upsert({
    id: user.id,
    email,
    full_name: fullName,
  }, { onConflict: "id" });
  if (profile.error) throw new Error(`Unable to create profile: ${profile.error.message}`);

  const existing = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(`Unable to check workspace membership: ${existing.error.message}`);
  if (existing.data?.workspace_id) return { workspaceId: existing.data.workspace_id, createdWorkspace: false };

  const emailPrefix = getEmailPrefix(email);
  const workspaceName = `${emailPrefix}'s Workspace`;
  const workspaceSlug = `${slugifyWorkspaceName(workspaceName)}-${user.id.slice(0, 6)}`;
  const created = await admin
    .from("workspaces")
    .insert({
      name: workspaceName,
      slug: workspaceSlug,
      owner_id: user.id,
      timezone: DEFAULT_WORKSPACE_TIMEZONE,
      default_timezone: DEFAULT_WORKSPACE_TIMEZONE,
      default_market: "US",
    })
    .select("id")
    .single();
  if (created.error || !created.data) throw new Error(`Unable to create workspace: ${created.error?.message || "missing workspace row"}`);

  const membership = await admin.from("workspace_members").insert({
    workspace_id: created.data.id,
    user_id: user.id,
    role: "owner",
  });
  if (membership.error) {
    await admin.from("workspaces").delete().eq("id", created.data.id);
    throw new Error(`Unable to assign workspace owner: ${membership.error.message}`);
  }

  await admin.from("workspace_subscriptions").insert({
    workspace_id: created.data.id,
    plan: "free",
    status: "active",
  });

  return { workspaceId: created.data.id, createdWorkspace: true };
}
