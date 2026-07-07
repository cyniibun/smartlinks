const UTM_PLACEHOLDERS = new Set([
  "__campaign_name__",
  "campaign_name",
  "{{campaign.name}}",
  "{campaign_name}",
  "undefined",
  "null",
]);

export function normalizeUtmValue(value: unknown) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (UTM_PLACEHOLDERS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function displayUtmSource(value: unknown) {
  return normalizeUtmValue(value) || "Direct";
}

export function displayUtmMedium(value: unknown) {
  return normalizeUtmValue(value) || "—";
}

export function displayUtmCampaign(value: unknown) {
  return normalizeUtmValue(value) || "Unassigned";
}
