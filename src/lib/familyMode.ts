import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FamilyModeMember {
  id: string;
  name: string;
  avatar_emoji: string;
  color: string;
}

export interface FamilyModeState {
  active: boolean;
  activityId: string | null;
  members: FamilyModeMember[];
  dayNumber: number | null;
  durationDays: number | null;
  /** Assigned portion for this bridged activity, when the deep link carries one. */
  range: { surah: number | null; from: number | null; to: number | null };
  /** Dhikr target carried by the deep link, when present. */
  dhikrTarget: number | null;
  /** True once this session has logged the completion (prevents duplicates). */
  completed: boolean;
  complete: (memberIds: string[]) => Promise<boolean>;
  exit: () => void;
}

/**
 * Reads the family-cycle deep-link contract from the URL and exposes
 * everything a target screen (Quran / Adhkar / Dhikr) needs to render the
 * floating "Mark as Family Done" flow with zero dead ends.
 *
 * Contract: ?familyMode=true&activityId=<uuid>  (legacy: ?familyCycle=<uuid>)
 */
export function useFamilyMode(): FamilyModeState {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activityId = params.get("activityId") || params.get("familyCycle");
  const active = params.get("familyMode") === "true" || !!params.get("familyCycle");

  const [members, setMembers] = useState<FamilyModeMember[]>([]);
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  const num = (v: string | null) => (v && !Number.isNaN(Number(v)) ? Number(v) : null);
  const range = {
    surah: num(params.get("surah")),
    from: num(params.get("ayah")),
    to: num(params.get("toAyah")),
  };
  const dhikrTarget = num(params.get("target"));

  useEffect(() => {
    if (!active || !activityId || !user) return;
    let cancelled = false;
    (async () => {
      const { data: activity } = await supabase
        .from("cycle_activities")
        .select("cycle_id")
        .eq("id", activityId)
        .maybeSingle();
      if (cancelled || !activity?.cycle_id) return;

      const [{ data: ms }, { data: cycle }] = await Promise.all([
        supabase
          .from("family_members")
          .select("id,name,avatar_emoji,color")
          .eq("cycle_id", activity.cycle_id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("family_cycles")
          .select("start_date,duration_days")
          .eq("id", activity.cycle_id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setMembers((ms as FamilyModeMember[]) ?? []);
      if (cycle) {
        const day = Math.max(
          1,
          Math.floor((Date.now() - new Date(cycle.start_date).getTime()) / 86400000) + 1,
        );
        setDayNumber(day);
        setDurationDays(cycle.duration_days);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, activityId, user]);

  const complete = useCallback(
    async (memberIds: string[]) => {
      if (!activityId || !user) return false;
      const today = new Date().toISOString().slice(0, 10);
      const rows = (memberIds.length ? memberIds : [null]).map((memberId) => ({
        activity_id: activityId,
        member_id: memberId,
        completion_date: today,
        completed_by: user.id,
      }));
      const { error } = await supabase.from("cycle_completions").insert(rows);
      if (!error) setCompleted(true);
      return !error;
    },
    [activityId, user],
  );

  const exit = useCallback(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  return {
    active,
    activityId,
    members,
    dayNumber,
    durationDays,
    range,
    dhikrTarget,
    completed,
    complete,
    exit,
  };
}

/** Builds the deep link for an activity so bridging stays consistent everywhere. */
export function buildFamilyDeepLink(activity: {
  id: string;
  activity_type: string;
  surah_number?: number | null;
  start_ayah?: number | null;
  end_ayah?: number | null;
  dhikr_target?: number | null;
}): { view: string; search: string } {
  const p = new URLSearchParams({ familyMode: "true", activityId: activity.id });
  switch (activity.activity_type) {
    case "quran":
      if (activity.surah_number) p.set("surah", String(activity.surah_number));
      if (activity.start_ayah) p.set("ayah", String(activity.start_ayah));
      if (activity.end_ayah) p.set("toAyah", String(activity.end_ayah));
      return { view: "quran", search: p.toString() };
    case "adhkar_morning":
      p.set("type", "morning");
      return { view: "adhkar", search: p.toString() };
    case "adhkar_evening":
      p.set("type", "evening");
      return { view: "adhkar", search: p.toString() };
    case "dhikr":
      p.set("target", String(activity.dhikr_target ?? 100));
      return { view: "dhikr", search: p.toString() };
    default:
      return { view: "cycle", search: p.toString() };
  }
}