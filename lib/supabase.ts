import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

export function hasSupabaseConfig() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // `ws` implements the runtime contract; its constructor overloads differ from the DOM type.
    realtime: { transport: WebSocket as never }
  });
}

export function getSupabasePublic() {
  const url = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL].find((value) => {
    try { return Boolean(value && ["http:", "https:"].includes(new URL(value.trim()).protocol)); } catch { return false; }
  })?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
