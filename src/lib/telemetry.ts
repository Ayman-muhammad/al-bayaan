// Lightweight user interactivity tracker.
// Persists locally (IndexedDB unavailable on memory-pressured Androids — use localStorage fallback)
// and pushes to Supabase when authenticated. Never blocks the UI.
import { supabase } from "@/integrations/supabase/client";

export type TrackEvent =
  | "auth_view"
  | "auth_submit"
  | "auth_success"
  | "auth_error"
  | "auth_oauth_start"
  | "auth_oauth_redirect"
  | "auth_guest"
  | "auth_otp_sent"
  | "auth_otp_verified"
  | "auth_forgot_sent"
  | "auth_double_submit_blocked"
  | "auth_network_timeout"
  | "auth_offline_attempt";

const KEY = "al-bayan-telemetry";
const MAX_LOCAL = 200;

interface TrackPayload {
  event: TrackEvent;
  ts: number;
  meta?: Record<string, unknown>;
  ua?: string;
  online?: boolean;
}

const readLocal = (): TrackPayload[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const writeLocal = (events: TrackPayload[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_LOCAL))); } catch {}
};

export const track = (event: TrackEvent, meta?: Record<string, unknown>) => {
  const payload: TrackPayload = {
    event,
    ts: Date.now(),
    meta,
    ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : undefined,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
  };
  // Local-first
  const all = readLocal();
  all.push(payload);
  writeLocal(all);

  // Dev breadcrumb
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[track]", event, meta || "");
  }

  // Best-effort remote — never throws, never blocks
  try {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      // Fire & forget; ignore if table doesn't exist
      (supabase as any)
        .from("user_events")
        .insert({ user_id: data.user.id, event, meta: meta ?? {}, ua: payload.ua })
        .then(() => {}, () => {});
    }).catch(() => {});
  } catch {}
};

export const getRecentEvents = (limit = 50): TrackPayload[] =>
  readLocal().slice(-limit).reverse();