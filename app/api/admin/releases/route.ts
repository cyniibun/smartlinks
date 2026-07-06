import { NextResponse } from "next/server";
import { canManage, getWorkspaceContext } from "@/lib/adminAuth";
import { createRelease, listReleases } from "@/lib/releaseRepository";
export async function GET(request: Request) { const context = await getWorkspaceContext(new URL(request.url).searchParams.get("workspaceId") || undefined); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ releases: await listReleases(context.workspace.id) }); }
export async function POST(request: Request) { const body = await request.json(); const context = await getWorkspaceContext(body.workspaceId); if (!context || !canManage(context.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); try { return NextResponse.json({ page: await createRelease(context.workspace.id, body) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create release" }, { status: 400 }); } }
