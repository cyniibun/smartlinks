import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("automatic view content is not used as visitor engagement", async () => {
  const migration = await source("supabase/migrations/20260716_visitor_active_time_integrity.sql");
  assert.doesNotMatch(migration, /has_engaged_view|engagement_rate/);
  assert.match(migration, /event_type = 'page_engagement'/);
  assert.match(migration, /avg\(duration_ms\) \/ 1000\.0/);
});

test("active view time is checkpointed with a stable page-view identity", async () => {
  const page = await source("components/SongSmartLinkPage.tsx");
  assert.match(page, /pageViewId = viewIdentity\.event_id/);
  assert.match(page, /sendInternalEvent\("page_engagement"/);
  assert.match(page, /visibilitychange/);
  assert.match(page, /pagehide/);
  assert.match(page, /15_000/);
});

test("server records page engagement through the idempotent database function", async () => {
  const route = await source("app/api/click/route.ts");
  const migration = await source("supabase/migrations/20260716_visitor_active_time_integrity.sql");
  assert.match(route, /supabase\.rpc\("record_page_engagement"/);
  assert.match(migration, /on conflict \(workspace_id, page_view_id, event_type\)/);
  assert.match(migration, /greatest\(coalesce\(click_events\.active_duration_ms, 0\), excluded\.active_duration_ms\)/);
});

test("dashboard replaces misleading engagement and conversion metrics", async () => {
  const dashboard = await source("components/admin/AnalyticsDashboard.tsx");
  assert.match(dashboard, /Average Active View Time/);
  assert.match(dashboard, /label="Sessions"/);
  assert.doesNotMatch(dashboard, /Engagement Rate|Conversion Rate|Current CTR proxy/);
});
