import { getSupabaseAdmin } from "@/lib/supabase";
import { getWorkspaceEntitlements } from "@/lib/entitlements";

export async function hasBillingBypass(userId: string, workspaceId?: string) {
  if (workspaceId) return (await getWorkspaceEntitlements(workspaceId, { id: userId }, undefined)).developer;
  if (process.env.BYPASS_BILLING === "true") return true;
  const db = getSupabaseAdmin(); if (!db) return false;
  const result = await db.from("profiles").select("billing_bypass").eq("id", userId).maybeSingle();
  return result.data?.billing_bypass === true;
}
