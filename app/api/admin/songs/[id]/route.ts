import { NextResponse } from "next/server";
import { canDelete, canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { deleteSong, saveSong } from "@/lib/songRepository";

export async function PUT(request: Request) {
  const context = await getWorkspaceContext();
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json({ song: await saveSong(await request.json(), context.workspace.id) }); }
  catch (error) { return genericApiError("songs:update:error", error, { workspaceId: context.workspace.id }, 400, "Unable to save song."); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context || !canDelete(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { await deleteSong((await params).id, context.workspace.id); return NextResponse.json({ ok: true }); }
  catch (error) { return genericApiError("songs:delete:error", error, { workspaceId: context.workspace.id }, 400, "Unable to delete song."); }
}
