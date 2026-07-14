import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Clock, WifiOff, Compass } from "lucide-react";
import {
  bestEffortTimings, computeNextPrayer, formatCountdown,
  saveCachedPrayerTimes, type NextPrayerInfo,
} from "@/lib/prayerCache";

interface Props { onOpen: () => void }

const PRAYER_AR: Record<string, string> = {
  Fajr: "الفجر", Sunrise: "الشروق", Dhuhr: "الظهر",
  Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء",
};

const HomePrayerWidget = ({ onOpen }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [next, setNext] = useState<NextPrayerInfo | null>(null);
  const [approx, setApprox] = useState(false);
  const [city, setCity] = useState<string>("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const timingsRef = useRef<Record<string, string>>({});

  const recomputeFromLocal = useCallback(() => {
    const { timings, isApprox, city: c } = bestEffortTimings();
    timingsRef.current = timings;
    setApprox(isApprox);
    if (c) setCity(c);
    setNext(computeNextPrayer(timings, new Date(), isApprox));
  }, []);

  // Try live fetch when online, then fall back to cache/estimate.
  useEffect(() => {
    recomputeFromLocal();
    if (!navigator.onLine) return;
    if (!("geolocation" in navigator)) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const d = new Date();
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          const res = await fetch(
            `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&method=2`,
          );
          const json = await res.json();
          if (json.code !== 200 || cancelled) return;
          const t = json.data.timings as Record<string, string>;
          // Aladhan returns "HH:MM (TZ)" — trim.
          const clean: Record<string, string> = {};
          Object.keys(t).forEach((k) => (clean[k] = (t[k] || "").split(" ")[0]));
          const cityName =
            json.data.meta?.timezone?.split("/").pop()?.replace(/_/g, " ") || "";
          saveCachedPrayerTimes({
            date: new Date().toISOString().slice(0, 10),
            timings: clean,
            city: cityName,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            fetchedAt: Date.now(),
          });
          timingsRef.current = clean;
          setCity(cityName);
          setApprox(false);
          setNext(computeNextPrayer(clean, new Date(), false));
        } catch {/* keep local */}
      },
      () => {/* denied → keep local */},
      { timeout: 5000, maximumAge: 60 * 60 * 1000 },
    );
    return () => { cancelled = true; };
  }, [recomputeFromLocal]);

  // Live countdown tick.
  useEffect(() => {
    const id = setInterval(() => {
      if (!timingsRef.current || Object.keys(timingsRef.current).length === 0) return;
      setNext(computeNextPrayer(timingsRef.current, new Date(), approx));
    }, 1000);
    return () => clearInterval(id);
  }, [approx]);

  // Online/offline
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!next) return null;

  const label = isAr ? PRAYER_AR[next.name] || next.name : next.name;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-background border border-primary/25 p-4 sm:p-5 hover:border-primary/50 transition-all group animate-fade-in"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Compass className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{isAr ? "الصلاة القادمة" : "Next prayer"}</span>
            {(offline || approx) && (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <WifiOff className="w-3 h-3" /> {isAr ? "تقريبي" : "approx"}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className={`text-lg sm:text-xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {label}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">· {next.time}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-accent font-semibold tabular-nums">
              <Clock className="w-3.5 h-3.5" /> {formatCountdown(next.msUntil)}
            </span>
            {city && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" /> {city}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default HomePrayerWidget;