export type AnalyticsGeo = {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
};

function clean(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function decodeHeaderValue(value: string | null) {
  const normalized = clean(value);
  if (!normalized) return null;
  try {
    return decodeURIComponent(normalized.replace(/\+/g, "%20")).trim() || null;
  } catch {
    return normalized;
  }
}

export function getGeoFromHeaders(headers: Headers): AnalyticsGeo {
  const country = clean(headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry"));
  return {
    country: country ? country.toUpperCase() : null,
    region: decodeHeaderValue(headers.get("x-vercel-ip-country-region")),
    city: decodeHeaderValue(headers.get("x-vercel-ip-city")),
    timezone: clean(headers.get("x-vercel-ip-timezone")),
  };
}
