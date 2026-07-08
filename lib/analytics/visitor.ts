"use client";

const VISITOR_ID_KEY = "tonelink_visitor_id";
const SESSION_ID_KEY = "tonelink_session_id";
const CLICK_IDS_KEY = "tonelink_click_ids";
const UTM_KEY = "tonelink_utm";

const CLICK_ID_PARAMS = ["ttclid", "fbclid", "gclid", "msclkid", "twclid", "li_fat_id"] as const;
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type ClickIdKey = (typeof CLICK_ID_PARAMS)[number];
export type UtmParamKey = (typeof UTM_PARAMS)[number];

export type StoredClickIds = Partial<Record<ClickIdKey, string>> & {
  first_seen_at?: string;
  last_seen_at?: string;
};

export type StoredUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  first_seen_at?: string;
  last_seen_at?: string;
};

export type MarketingCookies = {
  ttp: string | null;
  fbp: string | null;
  fbc: string | null;
  ga: string | null;
  gcl_aw: string | null;
};

export type VisitorIdentityPayload = {
  visitor_id: string;
  external_id: string;
  session_id: string;
  click_ids: StoredClickIds;
  ttclid: string | null;
  fbclid: string | null;
  gclid: string | null;
  msclkid: string | null;
  twclid: string | null;
  li_fat_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  normalized_referrer: string;
  referrer: string;
  marketing_cookies: MarketingCookies;
  ttp: string | null;
  fbp: string | null;
  fbc: string | null;
  ga: string | null;
  gcl_aw: string | null;
  event_id: string;
  event_timestamp: string;
};

function safeUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in strict privacy contexts. Events still proceed.
  }
}

export function getOrCreateVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const visitorId = safeUuid();
    window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
    return visitorId;
  } catch {
    return safeUuid();
  }
}

export function getOrCreateSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const sessionId = safeUuid();
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    return sessionId;
  } catch {
    return safeUuid();
  }
}

export function persistClickIds(params: URLSearchParams) {
  const stored = readJson<StoredClickIds>(CLICK_IDS_KEY, {});
  const now = new Date().toISOString();
  let changed = false;

  for (const key of CLICK_ID_PARAMS) {
    const value = params.get(key)?.trim();
    if (value) {
      stored[key] = value;
      changed = true;
    }
  }

  if (changed) {
    stored.first_seen_at ||= now;
    stored.last_seen_at = now;
    writeJson(CLICK_IDS_KEY, stored);
  }

  return stored;
}

export function persistUtm(params: URLSearchParams) {
  const stored = readJson<StoredUtm>(UTM_KEY, {});
  const now = new Date().toISOString();
  let changed = false;
  const mapping: Record<UtmParamKey, keyof StoredUtm> = {
    utm_source: "source",
    utm_medium: "medium",
    utm_campaign: "campaign",
    utm_content: "content",
    utm_term: "term"
  };

  for (const key of UTM_PARAMS) {
    const value = params.get(key)?.trim();
    if (value) {
      stored[mapping[key]] = value;
      changed = true;
    }
  }

  if (changed) {
    stored.first_seen_at ||= now;
    stored.last_seen_at = now;
    writeJson(UTM_KEY, stored);
  }

  return stored;
}

export function normalizeReferrer(referrer: string, currentHostname = window.location.hostname) {
  const raw = referrer.trim();
  if (!raw) return "Direct";

  try {
    const hostname = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    const current = currentHostname.replace(/^www\./, "").toLowerCase();
    if (!hostname || hostname === current) return "Internal";
    if (hostname.includes("tiktok")) return "TikTok";
    if (hostname.includes("instagram") || hostname.includes("facebook") || hostname === "fb.com" || hostname.includes("meta.com")) return "Meta";
    if (hostname.includes("google")) return "Google";
    if (hostname.includes("youtube") || hostname === "youtu.be") return "YouTube";
    return hostname;
  } catch {
    return raw || "Direct";
  }
}

function readCookie(name: string) {
  try {
    const cookie = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
  } catch {
    return null;
  }
}

export function getMarketingCookies(): MarketingCookies {
  return {
    ttp: readCookie("_ttp"),
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    ga: readCookie("_ga"),
    gcl_aw: readCookie("_gcl_aw")
  };
}

export function getVisitorIdentity(): VisitorIdentityPayload {
  const params = new URLSearchParams(window.location.search);
  const clickIds = persistClickIds(params);
  const utm = persistUtm(params);
  const cookies = getMarketingCookies();
  const visitorId = getOrCreateVisitorId();

  return {
    visitor_id: visitorId,
    external_id: visitorId,
    session_id: getOrCreateSessionId(),
    click_ids: clickIds,
    ttclid: clickIds.ttclid ?? null,
    fbclid: clickIds.fbclid ?? null,
    gclid: clickIds.gclid ?? null,
    msclkid: clickIds.msclkid ?? null,
    twclid: clickIds.twclid ?? null,
    li_fat_id: clickIds.li_fat_id ?? null,
    utm_source: utm.source ?? null,
    utm_medium: utm.medium ?? null,
    utm_campaign: utm.campaign ?? null,
    utm_content: utm.content ?? null,
    utm_term: utm.term ?? null,
    normalized_referrer: normalizeReferrer(document.referrer),
    referrer: document.referrer,
    marketing_cookies: cookies,
    ttp: cookies.ttp,
    fbp: cookies.fbp,
    fbc: cookies.fbc,
    ga: cookies.ga,
    gcl_aw: cookies.gcl_aw,
    event_id: safeUuid(),
    event_timestamp: new Date().toISOString()
  };
}
