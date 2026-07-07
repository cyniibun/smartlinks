import { NextResponse } from "next/server";
import { canAdmin, getWorkspaceContext } from "@/lib/adminAuth";
import { getSiteUrl } from "@/lib/authUrls";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripeBilling";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const context = await getWorkspaceContext(String(body.workspaceId || ""));
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAdmin(context.role)) return NextResponse.json({ error: "Only workspace owners and admins can manage billing." }, { status: 403 });
    if (context.role === "developer") return NextResponse.json({ bypass: true, url: `/dashboard/${context.workspace.id}/settings/billing?developer=true` });

    const stripe = getStripe();
    const db = getSupabaseAdmin();
    if (!stripe) return NextResponse.json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY." }, { status: 500 });
    if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

    const subscription = await db.from("workspace_subscriptions").select("stripe_customer_id").eq("workspace_id", context.workspace.id).maybeSingle();
    const customer = subscription.data?.stripe_customer_id;
    if (!customer) return NextResponse.json({ error: "No Stripe customer exists for this workspace yet." }, { status: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${getSiteUrl(request)}/dashboard/${context.workspace.id}/settings/billing?portal_return=true`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[tone-link:billing:portal]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Billing portal failed." }, { status: 500 });
  }
}
