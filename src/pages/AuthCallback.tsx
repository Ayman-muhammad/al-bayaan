import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { consumeOAuthState, getSessionWithRestore, persistSessionVault, withAuthTimeout } from "@/lib/mobileAuth";
import { track } from "@/lib/telemetry";

type CallbackStatus = "processing" | "success" | "error";

const readParam = (key: string) => {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.get(key) || hash.get(key);
};

const AuthCallback = () => {
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [message, setMessage] = useState("Completing sign in…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const complete = async () => {
      try {
        track("auth_view", { mode: "callback" });
        const error = readParam("error_description") || readParam("error");
        if (error) throw new Error(decodeURIComponent(error.replace(/\+/g, " ")));

        const state = readParam("state");
        if (!consumeOAuthState(state)) throw new Error("The sign-in session expired. Please try again.");

        const accessToken = readParam("access_token");
        const refreshToken = readParam("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await withAuthTimeout(
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
            "callback.setSession",
          );
          if (sessionError) throw sessionError;
          if (data.session) await persistSessionVault(data.session);
        }

        const session = await getSessionWithRestore();
        if (!session) throw new Error("No session was returned. Please try signing in again.");

        if (cancelled) return;
        setStatus("success");
        setMessage("Welcome back. Opening Al-Bayan…");
        track("auth_success", { method: "callback" });
        window.history.replaceState({}, "", "/");
        window.setTimeout(() => setDone(true), 450);
      } catch (err) {
        if (cancelled) return;
        const msg = (err as Error)?.message || "Sign in failed. Please try again.";
        setStatus("error");
        setMessage(msg);
        track("auth_error", { method: "callback", msg: msg.slice(0, 120) });
        window.setTimeout(() => setDone(true), 1800);
      }
    };

    const timer = window.setTimeout(complete, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (done) return <Navigate to="/" replace />;

  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-sm text-center space-y-5" aria-live="polite">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {status === "processing" && <BookOpen className="h-8 w-8 animate-pulse" />}
          {status === "success" && <CheckCircle2 className="h-8 w-8" />}
          {status === "error" && <XCircle className="h-8 w-8 text-destructive" />}
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{status === "error" ? "Sign in needs another try" : "Al-Bayan"}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </section>
    </main>
  );
};

export default AuthCallback;