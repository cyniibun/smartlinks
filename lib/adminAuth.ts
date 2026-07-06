import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin, getSupabasePublic } from "@/lib/supabase";

export const ACCESS_COOKIE = "tone_link_access_token";
export const REFRESH_COOKIE = "tone_link_refresh_token";
export const WORKSPACE_COOKIE = "tone_link_workspace";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceContext = {
  user: User;
  workspace: { id: string; name: string; owner_id: string };
  role: WorkspaceRole;
};

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const supabase = getSupabasePublic();
  if (!accessToken || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (!error) return data.user;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const refreshed = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshed.error || !refreshed.data.session) return null;
  try {
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    cookieStore.set(ACCESS_COOKIE, refreshed.data.session.access_token, { ...options, maxAge: refreshed.data.session.expires_in });
    cookieStore.set(REFRESH_COOKIE, refreshed.data.session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
  } catch { /* Server Components cannot always persist refreshed cookies; route requests will retry. */ }
  return refreshed.data.user;
}

export async function getWorkspaceContext(requestedWorkspaceId?: string): Promise<WorkspaceContext | null> {
  const user = await getCurrentUser();
  const admin = getSupabaseAdmin();
  if (!user || !admin) return null;
  const preferred = requestedWorkspaceId || (await cookies()).get(WORKSPACE_COOKIE)?.value;
  let query = admin.from("workspace_members").select("role, workspaces!inner(id,name,owner_id)").eq("user_id", user.id);
  if (preferred) query = query.eq("workspace_id", preferred);
  let { data, error } = await query.limit(1).maybeSingle();
  if ((!data || error) && preferred && !requestedWorkspaceId) {
    const fallback = await admin.from("workspace_members").select("role, workspaces!inner(id,name,owner_id)").eq("user_id", user.id).limit(1).maybeSingle();
    data = fallback.data; error = fallback.error;
  }
  if ((!data || error) && user.email && process.env.OWNER_EMAIL?.toLowerCase() === user.email.toLowerCase()) {
    let workspaceQuery = admin.from("workspaces").select("id,name,owner_id").limit(1);
    if (requestedWorkspaceId) workspaceQuery = workspaceQuery.eq("id", requestedWorkspaceId);
    const emergency = await workspaceQuery.maybeSingle();
    if (emergency.data) return { user, workspace: emergency.data, role: "owner" };
  }
  if (error || !data) return null;
  const workspace = Array.isArray(data.workspaces) ? data.workspaces[0] : data.workspaces;
  if (!workspace) return null;
  return { user, workspace, role: data.role as WorkspaceRole };
}

export async function isAdmin() {
  const context = await getWorkspaceContext();
  return Boolean(context && ["owner", "admin", "member"].includes(context.role));
}

export function canManage(role: WorkspaceRole) { return ["owner", "admin", "member"].includes(role); }
export function canDelete(role: WorkspaceRole) { return ["owner", "admin"].includes(role); }
