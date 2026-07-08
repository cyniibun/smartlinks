import { NextResponse } from "next/server";
import { canAdmin, getWorkspaceContext } from "@/lib/adminAuth";
import { genericApiError } from "@/lib/apiSecurity";
import { getSiteUrl } from "@/lib/authUrls";
import { ensureStripeCustomer, getStripe, normalizeBillingInterval, priceIdForPlan } from "@/lib/stripeBilling";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workspaceId = String(body.workspaceId || "");
    const plan = String(body.plan || "");
    if (!["monthly","annual"].includes(String(body.interval || "monthly"))) return NextResponse.json({ error: "Choose monthly or annual billing." }, { status: 400 });
    const interval = normalizeBillingInterval(body.interval);
    const context = await getWorkspaceContext(workspaceId);
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAdmin(context.role)) return NextResponse.json({ error: "Only workspace owners and admins can manage billing." }, { status: 403 });
    if (!["basic","pro"].includes(plan)) return NextResponse.json({ error: "Choose Basic or Pro." }, { status: 400 });
    if (context.role === "developer") return NextResponse.json({ bypass: true, url: `/dashboard/${context.workspace.id}/settings/billing?developer=true` });

    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY." }, { status: 500 });
    const price = priceIdForPlan(plan, interval);
    if (!price) return NextResponse.json({ error: `Stripe price ID is missing for ${plan} ${interval}.` }, { status: 400 });

    const customer = await ensureStripeCustomer(context.workspace.id, context.user.email);
    const siteUrl = getSiteUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${siteUrl}/dashboard/${context.workspace.id}/settings/billing?success=true`,
      cancel_url: `${siteUrl}/dashboard/${context.workspace.id}/settings/billing?canceled=true`,
      metadata: { workspaceId: context.workspace.id, userId: context.user.id, plan, interval },
      subscription_data: { metadata: { workspaceId: context.workspace.id, userId: context.user.id, plan, interval } },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return genericApiError("billing:checkout:error", error, {}, 500, "Checkout failed.");
  }
}
