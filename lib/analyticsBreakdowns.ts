import { displayUtmCampaign, displayUtmSource, normalizeUtmValue } from "@/lib/utm";

export type AnalyticsEventRow = Record<string, any>;
export type AnalyticsMetric = { name: string; count: number };

export function groupAnalyticsEvents(items: AnalyticsEventRow[], value: (item: AnalyticsEventRow) => string) {
  return Object.entries(items.reduce<Record<string, number>>((acc, item) => {
    const key = value(item) || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function getReferrerDomain(value: unknown) {
  const normalized = normalizeUtmValue(value);
  if (!normalized) return "Direct";
  try {
    return new URL(normalized).hostname || "Direct";
  } catch {
    return normalized;
  }
}

export function getReferrerBreakdown(events: AnalyticsEventRow[]): AnalyticsMetric[] {
  return groupAnalyticsEvents(events, (event) => getReferrerDomain(event.referrer)).slice(0, 10);
}

export function getUtmSourceBreakdown(events: AnalyticsEventRow[]): AnalyticsMetric[] {
  return groupAnalyticsEvents(events, (event) => displayUtmSource(event.utm_source) || "Unassigned").slice(0, 10);
}

export function getUtmCampaignBreakdown(events: AnalyticsEventRow[]): AnalyticsMetric[] {
  return groupAnalyticsEvents(events, (event) => displayUtmCampaign(event.utm_campaign) || "Unassigned").slice(0, 10);
}

export function getCampaignTimeseries(_events: AnalyticsEventRow[] = []) {
  return [];
}

export function getReferrerTimeseries(_events: AnalyticsEventRow[] = []) {
  return [];
}
