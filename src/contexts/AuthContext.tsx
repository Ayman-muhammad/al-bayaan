import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mirrorSession } from "@/lib/authFlow";
import { track } from "@/lib/telemetry";
import { clearSessionVault, getSessionWithRestore, persistSessionVault } from "@/lib/mobileAuth";
import { ensureUserRecord } from "@/lib/userBootstrap";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      mirrorSession(session);
      persistSessionVault(session);
      ensureUserRecord(session?.user ?? null);
      track("auth_view", { event });
    });

    getSessionWithRestore().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      mirrorSession(session);
      ensureUserRecord(session?.user ?? null);
    }).catch(() => setLoading(false));

    const onResume = () => {
      if (document.visibilityState !== "visible") return;
      getSessionWithRestore().then((next) => {
        setSession(next);
        setUser(next?.user ?? null);
        mirrorSession(next);
        ensureUserRecord(next?.user ?? null);
      }).catch(() => {});
    };

    const onOnline = () => onResume();

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("online", onOnline);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    mirrorSession(null);
    await clearSessionVault();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
