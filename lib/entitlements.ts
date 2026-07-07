import type { User } from "@supabase/supabase-js";
import type { WorkspaceRole } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isPaidSubscriptionStatus } from "@/lib/stripeBilling";

export type PlanId = "free" | "basic" | "pro" | "enterprise" | "developer";
export type FeatureKey =
  | "theme_studio"
  | "custom_themes"
  | "custom_domains"
  | "advanced_analytics"
  | "analytics_export"
  | "unlimited_links"
  | "unlimited_artists"
  | "remove_branding"
  | "team_members"
  | "api_access"
  | "podcast_pages"
  | "merch_pages"
  | "event_pages"
  | "bio_pages";

export type FeatureLimitKey =
  | "artists"
  | "smart_links"
  | "custom_domains"
  | "team_members"
  | "analytics_retention_days";

export type FeatureLimits = Record<FeatureLimitKey, number | null>;

export type WorkspaceEntitlements = {
  plan: PlanId;
  status: string;
  billingEnabled: boolean;
  developer: boolean;
  features: Record<FeatureKey, boolean>;
  limits: FeatureLimits;
};

const featureKeys: FeatureKey[] = ["theme_studio","custom_themes","custom_domains","advanced_analytics","analytics_export","unlimited_links","unlimited_artists","remove_branding","team_members","api_access","podcast_pages","merch_pages","event_pages","bio_pages"];

const planFeatures: Record<PlanId, Partial<Record<FeatureKey, boolean>>> = {
  free: {},
  basic: { analytics_export: true },
  pro: { theme_studio: true, custom_themes: true, custom_domains: true, advanced_analytics: true, analytics_export: true, unlimited_links: true, unlimited_artists: true, remove_branding: true, team_members: true, podcast_pages: true, merch_pages: true, event_pages: true, bio_pages: true },
  enterprise: Object.fromEntries(featureKeys.map(key => [key, true])) as Record<FeatureKey, boolean>,
  developer: Object.fromEntries(featureKeys.map(key => [key, true])) as Record<FeatureKey, boolean>,
};

const planLimits: Record<PlanId, WorkspaceEntitlements["limits"]> = {
  free: { artists: 1, smart_links: 5, custom_domains: 0, team_members: 1, analytics_retention_days: 7 },
  basic: { artists: 5, smart_links: 50, custom_domains: 0, team_members: 3, analytics_retention_days: 90 },
  pro: { artists: null, smart_links: null, custom_domains: 1, team_members: null, analytics_retention_days: null },
  enterprise: { artists: null, smart_links: null, custom_domains: null, team_members: null, analytics_retention_days: null },
  developer: { artists: null, smart_links: null, custom_domains: null, team_members: null, analytics_retention_days: null },
};

function normalizePlan(value: unknown): PlanId {
  return ["free","basic","pro","enterprise","developer"].includes(String(value)) ? String(value) as PlanId : "free";
}

export function featuresForPlan(plan: PlanId) {
  const enabled = planFeatures[plan];
  return Object.fromEntries(featureKeys.map(key => [key, Boolean(enabled[key])])) as Record<FeatureKey, boolean>;
}

export function entitlementsForPlan(plan: PlanId, status = "active", billingEnabled = true, developer = false): WorkspaceEntitlements {
  const effectivePlan = developer ? "developer" : plan;
  return {
    plan: effectivePlan,
    status,
    billingEnabled: developer ? false : billingEnabled,
    developer,
    features: featuresForPlan(effectivePlan),
    limits: planLimits[effectivePlan],
  };
}

export async function getWorkspaceEntitlements(workspaceId: string, user?: Pick<User, "id" | "email"> | null, role?: WorkspaceRole): Promise<WorkspaceEntitlements> {
  const db = getSupabaseAdmin();
  const devOwnerEmail = process.env.DEV_OWNER_EMAIL || process.env.OWNER_EMAIL;
  const envDeveloper = Boolean(user?.email && devOwnerEmail && user.email.toLowerCase() === devOwnerEmail.toLowerCase());
  if (!db) return entitlementsForPlan(envDeveloper || role === "developer" ? "developer" : "free", "active", !envDeveloper, envDeveloper || role === "developer");

  const membership = user?.id ? await db.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle() : null;
  const actualRole = (membership?.data?.role || role || "viewer") as WorkspaceRole;
  const developer = actualRole === "developer" || envDeveloper;
  if (developer) return entitlementsForPlan("developer", "active", false, true);

  const subscription = await db.from("workspace_subscriptions").select("plan,status").eq("workspace_id", workspaceId).maybeSingle();
  if (!subscription.error && subscription.data) {
    const status = String(subscription.data.status || "active");
    return entitlementsForPlan(isPaidSubscriptionStatus(status) ? normalizePlan(subscription.data.plan) : "free", status, true, false);
  }

  const workspace = await db.from("workspaces").select("plan_id").eq("id", workspaceId).maybeSingle();
  return entitlementsForPlan(normalizePlan(workspace.data?.plan_id), "active", true, false);
}

export async function hasFeature(workspaceId: string, feature: FeatureKey, user?: Pick<User, "id" | "email"> | null, role?: WorkspaceRole) {
  return (await getWorkspaceEntitlements(workspaceId, user, role)).features[feature];
}

export async function getFeatureLimit(workspaceId: string, feature: FeatureLimitKey, user?: Pick<User, "id" | "email"> | null, role?: WorkspaceRole) {
  return (await getWorkspaceEntitlements(workspaceId, user, role)).limits[feature];
}
