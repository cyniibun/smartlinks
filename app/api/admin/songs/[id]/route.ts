import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { deleteSong, saveSong } from "@/lib/songRepository";

export async function PUT(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ song: await saveSong(await request.json()) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save song" }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await deleteSong((await params).id); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete song" }, { status: 400 }); }
}
