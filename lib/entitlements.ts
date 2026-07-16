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
  | "bio_pages"
  | "standard_pixels"
  | "advanced_pixels"
  | "header_injection"
  | "custom_destinations"
  | "internal_experiments";

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

const featureKeys: FeatureKey[] = ["theme_studio","custom_themes","custom_domains","advanced_analytics","analytics_export","unlimited_links","unlimited_artists","remove_branding","team_members","api_access","podcast_pages","merch_pages","event_pages","bio_pages","standard_pixels","advanced_pixels","header_injection","custom_destinations","internal_experiments"];

const proFeatures: Partial<Record<FeatureKey, boolean>> = {
  theme_studio: true,
  custom_themes: true,
  custom_domains: true,
  advanced_analytics: true,
  analytics_export: true,
  unlimited_links: true,
  unlimited_artists: true,
  remove_branding: true,
  team_members: true,
  podcast_pages: true,
  merch_pages: true,
  event_pages: true,
  bio_pages: true,
  standard_pixels: true,
  advanced_pixels: true,
  header_injection: true,
  custom_destinations: true,
};

// Enterprise is an explicit superset of stable Pro features. New experimental
// features remain Developer-only until they are deliberately promoted here.
const enterpriseFeatures: Partial<Record<FeatureKey, boolean>> = {
  ...proFeatures,
  api_access: true,
};

const planFeatures: Record<PlanId, Partial<Record<FeatureKey, boolean>>> = {
  free: {},
  basic: { analytics_export: true, standard_pixels: true },
  pro: proFeatures,
  enterprise: enterpriseFeatures,
  developer: Object.fromEntries(featureKeys.map(key => [key, true])) as Record<FeatureKey, boolean>,
};

const planLimits: Record<PlanId, WorkspaceEntitlements["limits"]> = {
  free: { artists: 1, smart_links: 3, custom_domains: 0, team_members: 1, analytics_retention_days: 7 },
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

  const subscription = await db.from("workspace_subscriptions").select("plan,status,current_period_ends_at").eq("workspace_id", workspaceId).maybeSingle();
  if (!subscription.error && subscription.data) {
    const status = String(subscription.data.status || "active");
    const periodEnd = subscription.data.current_period_ends_at ? new Date(subscription.data.current_period_ends_at).getTime() : null;
    const periodValid = periodEnd === null || periodEnd > Date.now();
    const subscribedPlan = normalizePlan(subscription.data.plan);
    // Developer access is granted only by a trusted membership/environment
    // identity above, never by changing a subscription plan value.
    const safePlan = subscribedPlan === "developer" ? "free" : subscribedPlan;
    return entitlementsForPlan(isPaidSubscriptionStatus(status) && periodValid ? safePlan : "free", status, true, false);
  }

  // Subscription rows are created during workspace bootstrap. Never trust the
  // legacy, workspace-editable plan_id column as an entitlement source.
  return entitlementsForPlan("free", "active", true, false);
}

export function requiredFeatureForReleaseType(releaseType: unknown): FeatureKey | null {
  const type = String(releaseType || "single").trim().toLowerCase();
  if (["podcast", "podcast_episode", "audiobook"].includes(type)) return "podcast_pages";
  if (type === "merch") return "merch_pages";
  if (["event", "ticket_page"].includes(type)) return "event_pages";
  if (type === "artist_bio") return "bio_pages";
  if (type === "custom") return "custom_destinations";
  return null;
}

export async function hasFeature(workspaceId: string, feature: FeatureKey, user?: Pick<User, "id" | "email"> | null, role?: WorkspaceRole) {
  return (await getWorkspaceEntitlements(workspaceId, user, role)).features[feature];
}

export async function getFeatureLimit(workspaceId: string, feature: FeatureLimitKey, user?: Pick<User, "id" | "email"> | null, role?: WorkspaceRole) {
  return (await getWorkspaceEntitlements(workspaceId, user, role)).limits[feature];
}
