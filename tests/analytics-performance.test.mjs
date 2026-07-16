import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("analytics loads summary, primary, secondary, and events independently", async () => {
  const dashboard = await source("components/admin/AnalyticsDashboard.tsx");
  assert.match(dashboard, /fetchSection\("summary"/);
  assert.match(dashboard, /fetchSection\("primary"/);
  assert.match(dashboard, /fetchSection\("secondary"/);
  assert.match(dashboard, /q\.set\("section", "events"\)/);
  assert.match(dashboard, /responseCache/);
  assert.match(dashboard, /controller\.abort\(\)/);
});

test("summary section does not wait on geography or visitor behavior", async () => {
  const route = await source("app/api/admin/analytics/route.ts");
  const summaryStart = route.indexOf('if (section === "summary")');
  const primaryStart = route.indexOf("const loadPrimary", summaryStart);
  assert.ok(summaryStart >= 0 && primaryStart > summaryStart);
  const summaryBlock = route.slice(summaryStart, primaryStart);
  assert.match(summaryBlock, /getAnalyticsSummaryCounts/);
  assert.doesNotMatch(summaryBlock, /getAnalyticsGeoBreakdowns|getVisitorBehaviorMetrics/);
});

test("database migration supplies exact aggregate and overview RPCs", async () => {
  const migration = await source("supabase/migrations/20260716_analytics_performance_aggregation.sql");
  assert.match(migration, /get_analytics_metric_breakdown/);
  assert.match(migration, /get_analytics_timeseries/);
  assert.match(migration, /get_workspace_link_metrics/);
  assert.match(migration, /event_type in \('page_view', 'visit'\)/);
  assert.match(migration, /event_type = 'platform_click'/);
});

test("workspace overview prefers one grouped link metrics query", async () => {
  const overview = await source("lib/workspaceOverview.ts");
  assert.match(overview, /db\.rpc\("get_workspace_link_metrics"/);
  assert.match(overview, /const linkSummaries=rpcMetrics\?null:/);
});
