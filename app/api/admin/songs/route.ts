import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { listSongs } from "@/lib/songRepository";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ songs: await listSongs(true, context.workspace.id) }); }
  catch (error) { return genericApiError("songs:list:error", error, { workspaceId: context.workspace.id }, 500, "Unable to load songs."); }
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: "The legacy song writer has been retired. Create releases through the current Create / Search workflow." }, { status: 410 });
}
