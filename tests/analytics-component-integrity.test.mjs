import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("database aggregates use explicit view and click populations", async () => {
  const migration = await source("supabase/migrations/20260818_analytics_component_integrity.sql");
  assert.match(migration, /get_analytics_summary_v2/);
  assert.match(migration, /p_population = 'views'.*event\.event_type in \('page_view', 'visit'\)/s);
  assert.match(migration, /p_population = 'clicks'.*event\.event_type = 'platform_click'/s);
  assert.match(migration, /p_population = 'views' or p_platform is null/);
  assert.match(migration, /get_analytics_timeseries_v2/);
});

test("secondary acquisition and audience breakdowns are view based", async () => {
  const route = await source("app/api/admin/analytics/route.ts");
  for (const dimension of ["referrer", "utm_source", "utm_campaign", "device", "browser"]) {
    assert.match(route, new RegExp(`"${dimension}", \\{ population: "views" \\}`));
  }
  assert.match(route, /"campaign_platform", \{ population: "clicks"/);
  assert.doesNotMatch(route, /fetchEvents\(filters, 1000\)/);
});

test("charts receive truthful units and preserve zero values", async () => {
  const dashboard = await source("components/admin/AnalyticsDashboard.tsx");
  assert.match(dashboard, /title="Device Breakdown"[^>]+unit="views"/);
  assert.match(dashboard, /title="Top Platforms"[^>]+unit="clicks"/);
  assert.match(dashboard, /<small>\{unit\}<\/small>/);
  assert.match(dashboard, /point\.views \? .* : "0%"/);
  assert.match(dashboard, /merged\.slice\(4\).*reduce/s);
});

test("event type filtering happens before event-log pagination", async () => {
  const route = await source("app/api/admin/analytics/route.ts");
  const dashboard = await source("components/admin/AnalyticsDashboard.tsx");
  assert.match(route, /query = query\.in\("event_type", allowedEventTypes\)/);
  assert.match(route, /fetchEvents\(filters, recentLimit, offset, VISIBLE_EVENT_TYPES\)/);
  assert.match(dashboard, /if \(filters\.eventType\) q\.set\("eventType", filters\.eventType\)/);
  assert.match(dashboard, /activeTab === "Events" && <select/);
});

test("legacy visit cannot be newly ingested", async () => {
  const route = await source("app/api/click/route.ts");
  assert.match(route, /ACCEPTED_PUBLIC_EVENT_TYPES/);
  assert.doesNotMatch(route.match(/const ACCEPTED_PUBLIC_EVENT_TYPES[\s\S]*?\]\);/)?.[0] || "", /"visit"/);
  assert.match(route, /Unsupported analytics event type/);
});

test("pixel summaries use preset ranges and exact database aggregation", async () => {
  const route = await source("app/api/admin/pixel-deliveries/route.ts");
  const dashboard = await source("components/admin/AnalyticsDashboard.tsx");
  assert.match(route, /getWorkspaceDateRange\(selectedRange, timezone\)/);
  assert.match(route, /get_pixel_delivery_summary_v2/);
  assert.doesNotMatch(route, /allForSummaryQuery|limit\(5000\)/);
  assert.match(dashboard, /q\.set\("range", filters\.range\)/);
});
