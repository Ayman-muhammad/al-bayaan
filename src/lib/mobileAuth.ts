import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { track } from "./telemetry";

const DB_NAME = "al-bayan-auth-vault";
const STORE_NAME = "session";
const SESSION_KEY = "latest";
const OAUTH_STATE_KEY = "al-bayan-oauth-state";
const AUTH_TIMEOUT_MS = 15_000;

type StoredSession = Pick<Session, "access_token" | "refresh_token" | "expires_at" | "token_type"> & {
  userId: string;
  savedAt: number;
};

let memorySession: StoredSession | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

const canUseBrowserStorage = () => typeof window !== "undefined";

const openDb = (): Promise<IDBDatabase | null> => {
  if (!canUseBrowserStorage() || !("indexedDB" in window)) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
  });

  return dbPromise;
};

const readLocalCopy = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(`${DB_NAME}:${SESSION_KEY}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeLocalCopy = (session: StoredSession | null) => {
  try {
    if (session) localStorage.setItem(`${DB_NAME}:${SESSION_KEY}`, JSON.stringify(session));
    else localStorage.removeItem(`${DB_NAME}:${SESSION_KEY}`);
  } catch {}
};

const readVault = async (): Promise<StoredSession | null> => {
  if (memorySession) return memorySession;
  const db = await openDb();

  if (db) {
    try {
      const value = await new Promise<StoredSession | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(SESSION_KEY);
        req.onsuccess = () => resolve((req.result as StoredSession | undefined) ?? null);
        req.onerror = () => resolve(null);
      });
      if (value) {
        memorySession = value;
        return value;
      }
    } catch {}
  }

  memorySession = readLocalCopy();
  return memorySession;
};

export const withAuthTimeout = async <T,>(promise: Promise<T>, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      track("auth_network_timeout", { label });
      reject(new Error("timeout"));
    }, AUTH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const persistSessionVault = async (session: Session | null) => {
  const stored: StoredSession | null = session
    ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        token_type: session.token_type,
        userId: session.user.id,
        savedAt: Date.now(),
      }
    : null;

  memorySession = stored;
  writeLocalCopy(stored);

  const db = await openDb();
  if (!db) return;

  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = stored ? store.put(stored, SESSION_KEY) : store.delete(SESSION_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
};

export const clearSessionVault = () => persistSessionVault(null);

export const restoreSessionFromVault = async (): Promise<Session | null> => {
  const stored = await readVault();
  if (!stored?.access_token || !stored.refresh_token) return null;

  try {
    const { data, error } = await withAuthTimeout(
      supabase.auth.setSession({ access_token: stored.access_token, refresh_token: stored.refresh_token }),
      "restoreSessionFromVault",
    );
    if (error) throw error;
    if (data.session) await persistSessionVault(data.session);
    track("auth_success", { method: "session_restore" });
    return data.session;
  } catch (error) {
    track("auth_error", { method: "session_restore", msg: String((error as Error)?.message || error).slice(0, 120) });
    await clearSessionVault();
    return null;
  }
};

export const getSessionWithRestore = async (): Promise<Session | null> => {
  try {
    const { data } = await withAuthTimeout(supabase.auth.getSession(), "getSession");
    if (data.session) {
      await persistSessionVault(data.session);
      return data.session;
    }
  } catch {}

  return restoreSessionFromVault();
};

export const isMobileAuthDevice = () => {
  if (!canUseBrowserStorage()) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

const createState = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const consumeOAuthState = (state: string | null) => {
  try {
    const expected = sessionStorage.getItem(OAUTH_STATE_KEY) || localStorage.getItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    localStorage.removeItem(OAUTH_STATE_KEY);
    return !expected || !state || expected === state;
  } catch {
    return true;
  }
};

export const beginMobileOAuthRedirect = (provider: "google" | "apple") => {
  const state = createState();
  const redirectUri = `${window.location.origin}/auth/callback`;
  try {
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    localStorage.setItem(OAUTH_STATE_KEY, state);
  } catch {}

  const params = new URLSearchParams({ provider, redirect_uri: redirectUri, state });
  if (provider === "google") {
    params.set("prompt", "select_account");
    params.set("access_type", "offline");
  }

  track("auth_oauth_redirect", { provider, mobile: true });
  const href = `/~oauth/initiate?${params.toString()}`;
  try {
    window.top?.location.assign(href);
  } catch {
    window.location.assign(href);
  }
};