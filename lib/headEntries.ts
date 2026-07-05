import type { HeadEntry } from "@/data/songs";

const forbiddenInlinePatterns: Array<[RegExp, string]> = [
  [/document\s*\.\s*write\s*\(/i, "document.write is not allowed"],
  [/document\s*\.\s*(body|documentElement)\s*\.\s*innerHTML/i, "replacing the page HTML is not allowed"],
  [/(window\s*\.)?location\s*=/i, "automatic redirects are not allowed"],
  [/document\s*\.\s*cookie/i, "direct cookie access is not allowed"],
  [/\beval\s*\(/i, "eval is not allowed"],
  [/new\s+Function\s*\(/i, "dynamic function construction is not allowed"],
  [/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;/i, "unbounded loops are not allowed"]
];

export function validateHeadEntries(value: unknown): HeadEntry[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error("Custom header entries must be a list.");
  if (value.length > 20) throw new Error("A release can have at most 20 custom header entries.");
  return value.map((raw, index) => {
    const entry = raw as Partial<HeadEntry>;
    const label = String(entry.label || `Header entry ${index + 1}`).trim().slice(0, 80);
    const id = String(entry.id || `head-${index}-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    if (!entry.type || !["meta", "external_script", "inline_script"].includes(entry.type)) throw new Error(`${label}: unsupported entry type.`);
    if (entry.type === "meta") {
      const metaKey = String(entry.metaKey || "").trim(); const content = String(entry.content || "").trim();
      if (!/^[a-zA-Z][a-zA-Z0-9:_-]{0,99}$/.test(metaKey)) throw new Error(`${label}: enter a valid meta name or property.`);
      if (!content || content.length > 1000) throw new Error(`${label}: meta content is required and must be under 1,000 characters.`);
      return { id, label, type: entry.type, enabled: entry.enabled !== false, metaAttribute: entry.metaAttribute === "property" ? "property" : "name", metaKey, content };
    }
    if (entry.type === "external_script") {
      const scriptUrl = String(entry.scriptUrl || "").trim();
      let url: URL; try { url = new URL(scriptUrl); } catch { throw new Error(`${label}: enter a valid script URL.`); }
      if (url.protocol !== "https:") throw new Error(`${label}: external scripts must use HTTPS.`);
      return { id, label, type: entry.type, enabled: entry.enabled !== false, scriptUrl: url.toString() };
    }
    const inlineCode = String(entry.inlineCode || "").trim();
    if (!inlineCode || inlineCode.length > 12000) throw new Error(`${label}: inline JavaScript is required and must be under 12,000 characters.`);
    for (const [pattern, reason] of forbiddenInlinePatterns) if (pattern.test(inlineCode)) throw new Error(`${label}: ${reason}.`);
    try { new Function(inlineCode); } catch (error) { throw new Error(`${label}: JavaScript syntax error — ${error instanceof Error ? error.message : "invalid code"}.`); }
    return { id, label, type: entry.type, enabled: entry.enabled !== false, inlineCode };
  });
}
