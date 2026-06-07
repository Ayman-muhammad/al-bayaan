import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { track } from "./telemetry";

const bootstrapped = new Set<string>();

export const ensureUserRecord = async (user: User | null) => {
  if (!user || bootstrapped.has(user.id)) return;

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email ||
    "Al-Bayan user";

  try {
    const { error: profileError } = await (supabase as any).rpc("ensure_user_records", {
      _display_name: displayName,
    });

    if (profileError) throw profileError;

    bootstrapped.add(user.id);
    track("auth_success", { method: "user_bootstrap" });
  } catch (error) {
    track("auth_error", { method: "user_bootstrap", msg: String((error as Error)?.message || error).slice(0, 120) });
  }
};