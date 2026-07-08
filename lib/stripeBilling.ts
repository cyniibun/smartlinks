import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { PlanId } from "@/lib/entitlements";

export type PaidPlanId = "basic" | "pro";
export type BillingInterval = "monthly" | "annual";
export type StripePriceMapping = { plan: PlanId; interval: BillingInterval };

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient ||= new Stripe(key);
  return stripeClient;
}

export function normalizeBillingInterval(value: unknown): BillingInterval {
  return value === "annual" ? "annual" : "monthly";
}

export function priceIdForPlan(plan: string, interval: BillingInterval = "monthly") {
  const explicitPrices: Record<PaidPlanId, Record<BillingInterval, string | undefined>> = {
    basic: {
      monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || process.env.STRIPE_BASIC_PRICE_ID,
      annual: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID,
    },
    pro: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
      annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    },
  };
  return explicitPrices[plan as PaidPlanId]?.[interval] || null;
}

export function subscriptionMappingForPriceId(priceId?: string | null): StripePriceMapping {
  if (!priceId) return { plan: "free", interval: "monthly" };
  const mappings: Array<[string | undefined, StripePriceMapping]> = [
    [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || process.env.STRIPE_BASIC_PRICE_ID, { plan: "basic", interval: "monthly" }],
    [process.env.STRIPE_BASIC_ANNUAL_PRICE_ID, { plan: "basic", interval: "annual" }],
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID, { plan: "pro", interval: "monthly" }],
    [process.env.STRIPE_PRO_ANNUAL_PRICE_ID, { plan: "pro", interval: "annual" }],
  ];
  return mappings.find(([candidate]) => Boolean(candidate) && candidate === priceId)?.[1] || { plan: "free", interval: "monthly" };
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
  const mapping = subscriptionMappingForPriceId(priceId);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const workspaceId = workspaceIdHint || subscription.metadata?.workspaceId || null;
  const periodStart = (subscription as unknown as { current_period_start?: number }).current_period_start;
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

  const patch = {
    plan: isPaidSubscriptionStatus(subscription.status) ? mapping.plan : "free",
    status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId || null,
    billing_interval: mapping.interval,
    current_period_starts_at: periodStart ? new Date(periodStart * 1000).toISOString() : null,
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
