import { NextResponse } from "next/server";
import { canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { listSongs, saveSong } from "@/lib/songRepository";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ songs: await listSongs(true, context.workspace.id) }); }
  catch (error) { return genericApiError("songs:list:error", error, { workspaceId: context.workspace.id }, 500, "Unable to load songs."); }
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json({ song: await saveSong(await request.json(), context.workspace.id) }); }
  catch (error) { return genericApiError("songs:save:error", error, { workspaceId: context.workspace.id }, 400, "Unable to save song."); }
}
