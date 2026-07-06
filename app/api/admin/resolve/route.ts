import { NextResponse } from "next/server";
import { canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { resolveLinksFromSourceUrl } from "@/lib/resolver";
export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { const { sourceUrl, title, artist, album, isrc, importSource, selectedResult, fallbackOnly } = await request.json(); return NextResponse.json({ release: await resolveLinksFromSourceUrl(sourceUrl, { title, artist, album, isrc, importSource, selectedResult, fallbackOnly }) }); }
  catch (error) { const message=error instanceof Error ? error.message : "Resolution failed"; console.error("[tone-link:resolver:error]",message); return NextResponse.json({ error: message }, { status: 400 }); }
}
