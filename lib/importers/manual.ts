import type { ImportCandidate, ImportQuery } from "./types";
import { detectPlatformUrl } from "@/lib/platformDetection";

export async function importManual(input: ImportQuery): Promise<ImportCandidate[]> {
  if (!input.url) return [];
  try { new URL(input.url); } catch { return []; }
  const detected = detectPlatformUrl(input.url);
  return [{ provider: "Manual link", title: "Untitled Release", artist: "Unknown Artist", links: [{ ...detected, url: input.url, enabled: true, order: 1 }] } as ImportCandidate];
}
