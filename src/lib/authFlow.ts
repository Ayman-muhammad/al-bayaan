// Bulletproof auth wrapper for low-end mobile (Tecno Spark 30 grade).
// - 15s hard timeout on every call (AbortController not supported by supabase-js v2 for auth,
//   so we race a manual timeout promise).
// - Multi-layer session mirror to survive Android low-memory eviction of localStorage.
// - Friendly, language-aware error mapping.
// - Telemetry hooks for every outcome.
import { supabase } from "@/integrations/supabase/client";
import { track } from "./telemetry";
import type { Session, AuthError } from "@supabase/supabase-js";
import { persistSessionVault } from "./mobileAuth";

const TIMEOUT_MS = 15_000;
const MIRROR_KEY = "al-bayan-session-mirror";

const withTimeout = async <T,>(p: Promise<T>, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      track("auth_network_timeout", { label });
      reject(new Error("timeout"));
    }, TIMEOUT_MS);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const mirrorSession = (session: Session | null) => {
  try {
    if (session) sessionStorage.setItem(MIRROR_KEY, JSON.stringify({ at: Date.now(), uid: session.user.id }));
    else sessionStorage.removeItem(MIRROR_KEY);
  } catch {
    return;
  }
  try {
    if (session) document.cookie = `sb-mirror=1; path=/; max-age=2592000; samesite=lax`;
  } catch {
    return;
  }
};

export interface AuthResult {
  ok: boolean;
  error?: string;
  session?: Session | null;
}

const friendly = (err: unknown, isAr: boolean): string => {
  const raw = (err as AuthError)?.message || String((err as Error)?.message || err || "");
  const m = raw.toLowerCase();
  if (m.includes("timeout")) return isAr ? "انتهت المهلة. تحقق من اتصالك" : "Request timed out. Check your connection and try again.";
  if (m.includes("failed to fetch") || m.includes("networkerror")) return isAr ? "مشكلة اتصال. تأكد من الإنترنت" : "Connection issue. Please check your internet.";
  if (m.includes("invalid login")) return isAr ? "البريد أو كلمة المرور غير صحيحة" : "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return isAr ? "تأكد من بريدك أولاً" : "Please check your email to confirm your account first.";
  if (m.includes("already") && m.includes("registered")) return isAr ? "الحساب موجود بالفعل، حاول تسجيل الدخول" : "Account already exists. Try signing in.";
  if (m.includes("rate") || m.includes("too many")) return isAr ? "محاولات كثيرة، انتظر قليلاً" : "Too many attempts. Please wait a moment.";
  if (m.includes("password") && m.includes("short")) return isAr ? "كلمة المرور قصيرة جداً" : "Password is too short.";
  return raw || (isAr ? "حدث خطأ. حاول مرة أخرى" : "Something went wrong. Please try again.");
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

export const authFlow = {
  async signIn(email: string, password: string, isAr = false): Promise<AuthResult> {
    if (!isOnline()) { track("auth_offline_attempt", { mode: "signin" }); return { ok: false, error: friendly(new Error("Failed to fetch"), isAr) }; }
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),
        "signIn",
      );
      if (error) throw error;
      mirrorSession(data.session);
      await persistSessionVault(data.session);
      track("auth_success", { method: "email" });
      return { ok: true, session: data.session };
    } catch (e) {
      track("auth_error", { method: "email", msg: String((e as Error)?.message || e).slice(0, 120) });
      return { ok: false, error: friendly(e, isAr) };
    }
  },

  async signUp(email: string, password: string, fullName: string, isAr = false): Promise<AuthResult> {
    if (!isOnline()) { track("auth_offline_attempt", { mode: "signup" }); return { ok: false, error: friendly(new Error("Failed to fetch"), isAr) }; }
    try {
      const cleaned = email.trim().toLowerCase();
      const { error } = await withTimeout(
        supabase.auth.signUp({
          email: cleaned,
          password,
          options: {
            data: { full_name: fullName || cleaned },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        }),
        "signUp",
      );
      if (error) throw error;
      // Best-effort immediate sign-in (auto-confirm projects)
      const { data: si } = await withTimeout(
        supabase.auth.signInWithPassword({ email: cleaned, password }),
        "signUp.autoSignIn",
      );
      mirrorSession(si?.session ?? null);
      await persistSessionVault(si?.session ?? null);
      track("auth_success", { method: "email_signup" });
      return { ok: true, session: si?.session ?? null };
    } catch (e) {
      track("auth_error", { method: "email_signup", msg: String((e as Error)?.message || e).slice(0, 120) });
      return { ok: false, error: friendly(e, isAr) };
    }
  },

  async sendOtp(phone: string, isAr = false): Promise<AuthResult> {
    if (!isOnline()) { track("auth_offline_attempt", { mode: "otp" }); return { ok: false, error: friendly(new Error("Failed to fetch"), isAr) }; }
    try {
      const { error } = await withTimeout(supabase.auth.signInWithOtp({ phone }), "sendOtp");
      if (error) throw error;
      track("auth_otp_sent");
      return { ok: true };
    } catch (e) {
      track("auth_error", { method: "otp_send", msg: String((e as Error)?.message || e).slice(0, 120) });
      return { ok: false, error: friendly(e, isAr) };
    }
  },

  async verifyOtp(phone: string, token: string, isAr = false): Promise<AuthResult> {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.verifyOtp({ phone, token, type: "sms" }),
        "verifyOtp",
      );
      if (error) throw error;
      mirrorSession(data.session);
      await persistSessionVault(data.session);
      track("auth_otp_verified");
      return { ok: true, session: data.session };
    } catch (e) {
      track("auth_error", { method: "otp_verify", msg: String((e as Error)?.message || e).slice(0, 120) });
      return { ok: false, error: friendly(e, isAr) };
    }
  },

  async resetPassword(email: string, isAr = false): Promise<AuthResult> {
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/`,
        }),
        "reset",
      );
      if (error) throw error;
      track("auth_forgot_sent");
      return { ok: true };
    } catch (e) {
      track("auth_error", { method: "reset", msg: String((e as Error)?.message || e).slice(0, 120) });
      return { ok: false, error: friendly(e, isAr) };
    }
  },
};