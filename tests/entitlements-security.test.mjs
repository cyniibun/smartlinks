import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("Free, Enterprise, and Developer policies remain intentionally separated", async () => {
  const entitlements = await source("lib/entitlements.ts");
  assert.match(entitlements, /free:\s*\{\s*artists:\s*1,\s*smart_links:\s*3/);
  assert.match(entitlements, /const enterpriseFeatures[\s\S]*\.\.\.proFeatures,[\s\S]*api_access:\s*true/);
  assert.match(entitlements, /developer:\s*Object\.fromEntries\(featureKeys\.map/);
  assert.match(entitlements, /subscribedPlan === "developer" \? "free" : subscribedPlan/);
  assert.match(entitlements, /return entitlementsForPlan\("free", "active", true, false\)/);
});

test("database migration blocks client-side plan and developer-role escalation", async () => {
  const migration = await source("supabase/migrations/20260716_entitlement_security_hardening.sql");
  assert.match(migration, /drop policy if exists "workspace_subscriptions_manage"/);
  assert.match(migration, /role <> 'developer'/);
  assert.match(migration, /to_regclass\(format\('public\.%I', table_name\)\)/);
  assert.match(migration, /revoke insert, update, delete on table public\.%I from authenticated, anon/);
  for (const table of ["artists", "releases", "link_pages", "page_links", "themes", "workspace_domains", "workspace_pixel_configurations"]) {
    assert.match(migration, new RegExp(`'${table}'`));
  }
});

test("current release writers enforce premium capabilities", async () => {
  const createRoute = await source("app/api/admin/releases/route.ts");
  const editorRoute = await source("app/api/admin/link-pages/[id]/route.ts");
  const legacyCreate = await source("app/api/admin/songs/route.ts");
  const legacyUpdate = await source("app/api/admin/songs/[id]/route.ts");
  assert.match(createRoute, /requiredFeatureForReleaseType/);
  assert.match(createRoute, /standard_pixels/);
  assert.match(editorRoute, /remove_branding/);
  assert.match(editorRoute, /custom_themes/);
  assert.match(editorRoute, /header_injection/);
  assert.match(legacyCreate, /legacy song writer has been retired/);
  assert.match(legacyUpdate, /legacy song writer has been retired/);
});
