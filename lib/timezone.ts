export type AnalyticsRange = "today" | "yesterday" | "7" | "28" | "90" | "365" | "all";

export const DEFAULT_WORKSPACE_TIMEZONE = "America/New_York";

export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Australia/Sydney",
  "Asia/Tokyo",
];

export function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }, timeZone: string) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
  const firstPass = new Date(utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone));
  return new Date(utcGuess - timeZoneOffsetMs(firstPass, timeZone));
}

function addLocalDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function getWorkspaceDateRange(range: AnalyticsRange | string, timezone = DEFAULT_WORKSPACE_TIMEZONE, now = new Date()) {
  const safeTimezone = isValidTimeZone(timezone) ? timezone : DEFAULT_WORKSPACE_TIMEZONE;
  if (range === "all") return {};
  const today = zonedParts(now, safeTimezone);
  const todayDate = { year: today.year, month: today.month, day: today.day };
  if (range === "yesterday") {
    const startDay = addLocalDays(todayDate, -1);
    return {
      start: zonedDateTimeToUtc(startDay, safeTimezone).toISOString(),
      end: zonedDateTimeToUtc(todayDate, safeTimezone).toISOString(),
    };
  }
  const days = range === "today" ? 1 : Number(range);
  const startDay = addLocalDays(todayDate, -Math.max((Number.isFinite(days) ? days : 7) - 1, 0));
  return {
    start: zonedDateTimeToUtc(startDay, safeTimezone).toISOString(),
    end: now.toISOString(),
  };
}

export function formatWorkspaceDate(value: string | null | undefined, timezone = DEFAULT_WORKSPACE_TIMEZONE, includeTime = false) {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: isValidTimeZone(timezone) ? timezone : DEFAULT_WORKSPACE_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}
