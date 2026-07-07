import { notFound, redirect } from "next/navigation";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getWorkspaceEntitlements } from "@/lib/entitlements";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveThemeSettings } from "@/lib/themes";

export default async function ThemeEditorPage({params}:{params:Promise<{workspace:string;theme:string}>}) {
  const {workspace,theme}=await params;const context=await getWorkspaceContext(workspace);if(!context)redirect("/login");
  const entitlements=await getWorkspaceEntitlements(workspace,context.user,context.role);if(!entitlements.features.theme_studio&&!entitlements.developer)redirect(`/dashboard/${workspace}/settings`);
  const db=getSupabaseAdmin();if(!db)notFound();
  const result=await db.from("themes").select("*").eq("id",theme).eq("workspace_id",workspace).eq("is_system_theme",false).maybeSingle();
  if(result.error||!result.data)notFound();
  return <ThemeEditor workspaceId={workspace} initialTheme={{...result.data,settings:resolveThemeSettings(result.data.settings)}}/>;
}
