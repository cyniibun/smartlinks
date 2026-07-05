import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { searchImporters } from "@/lib/importers";

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json();
  if (!input.query && !input.url) return NextResponse.json({ error: "Enter a search or URL." }, { status: 400 });
  return NextResponse.json(await searchImporters(input));
}
