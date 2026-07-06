import { NextResponse } from "next/server";
import { canDelete, canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { deleteSong, saveSong } from "@/lib/songRepository";

export async function PUT(request: Request) {
  const context = await getWorkspaceContext();
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json({ song: await saveSong(await request.json(), context.workspace.id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save song" }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context || !canDelete(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { await deleteSong((await params).id, context.workspace.id); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete song" }, { status: 400 }); }
}
