import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { PlanId } from "@/lib/entitlements";

export type PaidPlanId = "basic" | "pro";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient ||= new Stripe(key);
  return stripeClient;
}

export function priceIdForPlan(plan: string) {
  const prices: Record<PaidPlanId, string | undefined> = {
    basic: process.env.STRIPE_BASIC_PRICE_ID,
    pro: process.env.STRIPE_PRO_PRICE_ID,
  };
  return prices[plan as PaidPlanId] || null;
}

export function planForPriceId(priceId?: string | null): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_BASIC_PRICE_ID) return "basic";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

export function isPaidSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export async function ensureStripeCustomer(workspaceId: string, email?: string | null) {
  const stripe = getStripe();
  const db = getSupabaseAdmin();
  if (!stripe) throw new Error("Stripe is not configured.");
  if (!db) throw new Error("Supabase is not configured.");

  const existing = await db.from("workspace_subscriptions").select("stripe_customer_id,plan,status").eq("workspace_id", workspaceId).maybeSingle();
  if (existing.data?.stripe_customer_id) return existing.data.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { workspaceId },
  });

  if (existing.data) {
    const updated = await db.from("workspace_subscriptions").update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
    if (updated.error) throw new Error(updated.error.message);
  } else {
    const inserted = await db.from("workspace_subscriptions").insert({ workspace_id: workspaceId, plan: "free", status: "active", stripe_customer_id: customer.id });
    if (inserted.error) throw new Error(inserted.error.message);
  }
  return customer.id;
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, workspaceIdHint?: string | null) {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Supabase is not configured.");
  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  const plan = planForPriceId(priceId);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const workspaceId = workspaceIdHint || subscription.metadata?.workspaceId || null;
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

  const patch = {
    plan: isPaidSubscriptionStatus(subscription.status) ? plan : "free",
    status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (workspaceId) {
    const result = await db.from("workspace_subscriptions").upsert({ workspace_id: workspaceId, ...patch }, { onConflict: "workspace_id" });
    if (result.error) throw new Error(result.error.message);
    return;
  }

  const result = await db.from("workspace_subscriptions").update(patch).eq("stripe_customer_id", customerId);
  if (result.error) throw new Error(result.error.message);
}
