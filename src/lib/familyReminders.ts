import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bestEffortTimings } from "@/lib/prayerCache";
import { notifyUser } from "@/lib/notifications";

export type Block = "morning" | "evening";

export interface ReminderConfig {
  morning_enabled: boolean;
  morning_offset_minutes: number;
  evening_enabled: boolean;
  evening_offset_minutes: number;
  sound: string;
  days: string;
}

export const DEFAULT_REMINDERS: ReminderConfig = {
  morning_enabled: true,
  morning_offset_minutes: 30,
  evening_enabled: true,
  evening_offset_minutes: 30,
  sound: "signature",
  days: "daily",
};

const CFG_KEY = "al-bayan-family-reminders";
const FIRED_KEY = "al-bayan-family-reminders-fired";

const today = () => new Date().toISOString().slice(0, 10);

export function loadCachedConfig(): ReminderConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? { ...DEFAULT_REMINDERS, ...JSON.parse(raw) } : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export function cacheConfig(cfg: Partial<ReminderConfig>) {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify({ ...loadCachedConfig(), ...cfg }));
  } catch { /* quota */ }
}

function hasFired(block: Block): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
    return raw[block] === today();
  } catch {
    return false;
  }
}

function markFired(block: Block) {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
    raw[block] = today();
    localStorage.setItem(FIRED_KEY, JSON.stringify(raw));
  } catch { /* quota */ }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const fmt = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Trigger clock time for a block = anchor prayer (Fajr / Maghrib) + offset. */
export function blockTriggerTime(block: Block, cfg: ReminderConfig): { minutes: number; label: string; anchor: string } {
  const { timings } = bestEffortTimings();
  const anchor = block === "morning" ? "Fajr" : "Maghrib";
  const base = toMinutes(timings[anchor] || (block === "morning" ? "05:00" : "18:15"));
  const offset = block === "morning" ? cfg.morning_offset_minutes : cfg.evening_offset_minutes;
  const minutes = base + (offset ?? 0);
  return { minutes, label: fmt(minutes), anchor };
}

export interface BlockStatus {
  block: Block;
  enabled: boolean;
  due: boolean;        // trigger time has passed today
  completed: boolean;  // every activity in this block done today
  total: number;
  done: number;
  triggerLabel: string;
  anchor: string;
}

export interface FamilyRemindersState {
  cycleId: string | null;
  intention: string | null;
  config: ReminderConfig;
  blocks: BlockStatus[];
  refresh: () => void;
}

/**
 * Fajr/Maghrib-offset reminder scheduler.
 * Ticks every 30s, fires a push notification + signature chime once per
 * block per day, and exposes block completion so the in-app banner can stay
 * visible until the family finishes that block.
 */
export function useFamilyReminders(userId?: string | null): FamilyRemindersState {
  const [config, setConfig] = useState<ReminderConfig>(() => loadCachedConfig());
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [intention, setIntention] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<Block, { total: number; done: number }>>({
    morning: { total: 0, done: 0 },
    evening: { total: 0, done: 0 },
  });
  const [tick, setTick] = useState(0);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Load reminder config
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("family_reminders")
        .select("morning_enabled,morning_offset_minutes,evening_enabled,evening_offset_minutes,sound,days")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled || !data) return;
      const cfg = { ...DEFAULT_REMINDERS, ...(data as Partial<ReminderConfig>) };
      setConfig(cfg);
      cacheConfig(cfg);
    })();
    return () => { cancelled = true; };
  }, [userId, nonce]);

  // Load active cycle + per-block completion counts for today
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: cycle } = await supabase
        .from("family_cycles")
        .select("id,intention")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!cycle) {
        setCycleId(null);
        setIntention(null);
        setCounts({ morning: { total: 0, done: 0 }, evening: { total: 0, done: 0 } });
        return;
      }
      setCycleId(cycle.id);
      setIntention(cycle.intention);

      const { data: acts } = await supabase
        .from("cycle_activities")
        .select("id,time_slot")
        .eq("cycle_id", cycle.id);
      if (cancelled || !acts) return;

      const ids = acts.map((a) => a.id);
      let doneIds = new Set<string>();
      if (ids.length) {
        const { data: comps } = await supabase
          .from("cycle_completions")
          .select("activity_id")
          .in("activity_id", ids)
          .eq("completion_date", today());
        doneIds = new Set((comps ?? []).map((c) => c.activity_id));
      }
      if (cancelled) return;

      const next: Record<Block, { total: number; done: number }> = {
        morning: { total: 0, done: 0 },
        evening: { total: 0, done: 0 },
      };
      for (const a of acts) {
        const block: Block = a.time_slot === "evening" ? "evening" : "morning";
        next[block].total += 1;
        if (doneIds.has(a.id)) next[block].done += 1;
      }
      setCounts(next);
    })();
    return () => { cancelled = true; };
  }, [userId, nonce, tick]);

  // 30s scheduler tick
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const blocks: BlockStatus[] = (["morning", "evening"] as Block[]).map((block) => {
    const enabled = block === "morning" ? config.morning_enabled : config.evening_enabled;
    const { minutes, label, anchor } = blockTriggerTime(block, config);
    const { total, done } = counts[block];
    return {
      block,
      enabled,
      due: nowMinutes >= minutes,
      completed: total > 0 && done >= total,
      total,
      done,
      triggerLabel: label,
      anchor,
    };
  });

  // Fire notifications once per block per day
  useEffect(() => {
    if (!cycleId) return;
    for (const b of blocks) {
      if (!b.enabled || !b.due || b.completed || b.total === 0) continue;
      if (hasFired(b.block)) continue;
      markFired(b.block);
      notifyUser(
        b.block === "morning" ? "Family Cycle — Morning" : "Family Cycle — Evening",
        b.block === "morning"
          ? "Gather the family for your morning block. Baraka in beginnings."
          : "Evening block time — finish today together.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, tick, counts, config]);

  return { cycleId, intention, config, blocks, refresh };
}