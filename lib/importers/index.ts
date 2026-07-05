import { importApple } from "./apple";
import { importManual } from "./manual";
import { importOdesli } from "./odesli";
import { importSpotify } from "./spotify";
import type { ImportCandidate, ImportQuery } from "./types";

export async function searchImporters(input: ImportQuery): Promise<{ candidates: ImportCandidate[]; warnings: string[] }> {
  const providers = input.url ? [importOdesli, importManual] : [importSpotify, importApple];
  const results = await Promise.allSettled(providers.map((provider) => provider(input)));
  return {
    candidates: results.flatMap((result) => result.status === "fulfilled" ? result.value : []),
    warnings: results.flatMap((result) => result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : "Provider failed"] : [])
  };
}
