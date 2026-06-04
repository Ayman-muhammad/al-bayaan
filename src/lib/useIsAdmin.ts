import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useIsAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    setLoading(true);
    (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancel) { setIsAdmin(!!data); setLoading(false); }
      }, () => { if (!cancel) { setIsAdmin(false); setLoading(false); } });
    return () => { cancel = true; };
  }, [user?.id]);

  return { isAdmin, loading };
};