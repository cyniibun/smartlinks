import { NextResponse } from "next/server";
import { canDelete, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { deleteSong } from "@/lib/songRepository";

export async function PUT(request: Request) {
  void request;
  return NextResponse.json({ error: "The legacy song writer has been retired. Edit the migrated Smart Link instead." }, { status: 410 });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context || !canDelete(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { await deleteSong((await params).id, context.workspace.id); return NextResponse.json({ ok: true }); }
  catch (error) { return genericApiError("songs:delete:error", error, { workspaceId: context.workspace.id }, 400, "Unable to delete song."); }
}
