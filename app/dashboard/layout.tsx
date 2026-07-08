import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getCurrentUser, getWorkspaceContext } from "@/lib/adminAuth";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";
import { dashboardThemeCssVars, resolveThemeSettings, systemThemes, toneLinkTheme } from "@/lib/themes";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  if (!user.email_confirmed_at) redirect(`/check-email?email=${encodeURIComponent(user.email || "")}`);
  const context = await getWorkspaceContext(); if (!context) redirect("/login");
  const entitlements = await getWorkspaceEntitlements(context.workspace.id, context.user, context.role);
  const db = getSupabaseAdmin();
  let displaySettings = toneLinkTheme;
  if (db) {
    const workspace = await db.from("workspaces").select("workspace_display_theme_id").eq("id", context.workspace.id).maybeSingle();
    const displayThemeId = workspace.data?.workspace_display_theme_id || "tonelink";
    const systemTheme = systemThemes.find((theme) => theme.id === displayThemeId);
    if (systemTheme) displaySettings = systemTheme.settings;
    else {
      const theme = await db.from("themes").select("settings").eq("id", displayThemeId).eq("workspace_id", context.workspace.id).maybeSingle();
      displaySettings = resolveThemeSettings(theme.data?.settings);
    }
  }
  return <div className="admin-shell" style={dashboardThemeCssVars(displaySettings)}><AdminNav workspaceName={context.workspace.name} workspaceId={context.workspace.id} plan={entitlements.developer ? "developer" : entitlements.plan} />{children}</div>;
}
