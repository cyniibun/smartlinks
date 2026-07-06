import { NextResponse } from "next/server";
import { canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { resolveLinksFromSourceUrl } from "@/lib/resolver";
import { getSupabaseAdmin } from "@/lib/supabase";
export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { const { sourceUrl, title, artist, album, isrc, importSource, selectedResult, fallbackOnly } = await request.json();const marketResult=await getSupabaseAdmin()?.from("workspaces").select("default_market").eq("id",context.workspace.id).maybeSingle();const market=marketResult?.data?.default_market||process.env.APPLE_MUSIC_COUNTRY||"US";return NextResponse.json({ release: await resolveLinksFromSourceUrl(sourceUrl, { title, artist, album, isrc, market, importSource, selectedResult, fallbackOnly }) }); }
  catch (error) { const message=error instanceof Error ? error.message : "Resolution failed"; console.error("[tone-link:resolver:error]",message); return NextResponse.json({ error: message }, { status: 400 }); }
}
