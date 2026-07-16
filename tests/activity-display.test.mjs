import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("platform display names cover stored analytics identifiers", async () => {
  const source = await readFile(new URL("lib/activityDisplay.ts", root), "utf8");
  const expected = {
    spotify: "Spotify",
    apple_music: "Apple Music",
    youtube_music: "YouTube Music",
    soundcloud: "SoundCloud",
    amazon_music: "Amazon Music",
    tidal: "TIDAL",
  };

  for (const [identifier, label] of Object.entries(expected)) {
    assert.match(source, new RegExp(`${identifier}: ["']${label}["']`));
  }
});

test("overview and platform analytics use the shared display formatter", async () => {
  const [overview, analytics] = await Promise.all([
    readFile(new URL("components/admin/WorkspaceOverview.tsx", root), "utf8"),
    readFile(new URL("components/admin/AnalyticsDashboard.tsx", root), "utf8"),
  ]);

  assert.match(overview, /displayPlatformName\(data\.topPlatform\.name/);
  assert.match(analytics, /title="Platform Clicks"[\s\S]*formatName=\{\(name\)=>displayPlatformName\(name,name\)\}/);
});
