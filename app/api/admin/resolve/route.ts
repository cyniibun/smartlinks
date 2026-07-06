import { NextResponse } from "next/server";
import { canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { resolveLinksFromSourceUrl } from "@/lib/resolver";
export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { const { sourceUrl } = await request.json(); return NextResponse.json({ release: await resolveLinksFromSourceUrl(sourceUrl) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Resolution failed" }, { status: 400 }); }
}
