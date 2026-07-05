import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const event = await request.json();
    console.info("[smart-link-click]", event);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }
}
