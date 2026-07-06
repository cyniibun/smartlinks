import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { listArtists } from "@/lib/releaseRepository";
export async function GET(request: Request) { const context = await getWorkspaceContext(new URL(request.url).searchParams.get("workspaceId") || undefined); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ artists: await listArtists(context.workspace.id) }); }
