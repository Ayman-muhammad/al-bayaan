// Lightweight prayer-time cache with offline estimation fallback.
// Stores the most recently fetched Aladhan response and can approximate
// today's timings from yesterday's cache when the device is offline.

export interface CachedPrayerTimes {
  date: string;                 // ISO yyyy-mm-dd
  timings: Record<string, string>; // "Fajr" -> "HH:MM"
  city?: string;
  lat?: number;
  lng?: number;
  fetchedAt: number;
}

const KEY = "al-bayan-prayer-cache";

// Fallback timings used when we have zero cache and zero network.
// Reasonable global averages; the UI will label them as approximate.
export const FALLBACK_TIMINGS: Record<string, string> = {
  Fajr: "05:00",
  Sunrise: "06:15",
  Dhuhr: "12:30",
  Asr: "15:45",
  Maghrib: "18:15",
  Isha: "19:45",
};

export function loadCachedPrayerTimes(): CachedPrayerTimes | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CachedPrayerTimes) : null;
  } catch {
    return null;
  }
}

export function saveCachedPrayerTimes(data: CachedPrayerTimes): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {/* quota */}
}

export interface NextPrayerInfo {
  name: string;
  time: string;      // "HH:MM"
  msUntil: number;   // ms remaining
  isApprox: boolean; // true when computed from cache/fallback
}

const ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export function computeNextPrayer(
  timings: Record<string, string>,
  now: Date = new Date(),
  isApprox = false,
): NextPrayerInfo {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const name of ORDER) {
    const t = timings[name];
    if (!t) continue;
    const [h, m] = t.split(":").map(Number);
    const target = h * 60 + m;
    if (target > nowMin) {
      const ms = (target - nowMin) * 60_000 - now.getSeconds() * 1000;
      return { name, time: t, msUntil: ms, isApprox };
    }
  }
  // After Isha → next is tomorrow's Fajr.
  const fajr = timings.Fajr || FALLBACK_TIMINGS.Fajr;
  const [h, m] = fajr.split(":").map(Number);
  const remainToday = (24 * 60 - nowMin) * 60_000 - now.getSeconds() * 1000;
  const ms = remainToday + (h * 60 + m) * 60_000;
  return { name: "Fajr", time: fajr, msUntil: ms, isApprox };
}

/** Best-effort timings for right now: cache if fresh, else fallback. */
export function bestEffortTimings(): { timings: Record<string, string>; isApprox: boolean; city?: string } {
  const cached = loadCachedPrayerTimes();
  const today = new Date().toISOString().slice(0, 10);
  if (cached?.date === today) {
    return { timings: cached.timings, isApprox: false, city: cached.city };
  }
  if (cached) {
    // Reuse yesterday's timings; they drift by only a couple of minutes.
    return { timings: cached.timings, isApprox: true, city: cached.city };
  }
  return { timings: FALLBACK_TIMINGS, isApprox: true };
}

export function formatCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}