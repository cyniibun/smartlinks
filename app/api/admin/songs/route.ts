import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { listSongs, saveSong } from "@/lib/songRepository";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ songs: await listSongs(true) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load songs" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ song: await saveSong(await request.json()) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save song" }, { status: 400 }); }
}
