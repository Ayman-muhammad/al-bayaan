import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Loader2, RefreshCw, Navigation, Bell, BellOff, Settings, Volume2, VolumeX, X, Download } from "lucide-react";
import {
  MUEZZINS, DUA_AFTER_ADHAN, ADHAN_REPLY,
  loadAdhanSettings, saveAdhanSettings, preCacheAdhan,
  type AdhanSettings, type PrayerKey, type Muezzin,
} from "@/lib/adhan";
import { useToast } from "@/hooks/use-toast";

interface PrayerTimesProps {
  onBack: () => void;
}

interface PrayerTime {
  name: string;
  nameAr: string;
  time: string;
  icon: string;
}

const PrayerTimes = ({ onBack }: PrayerTimesProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState("");
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [nextPrayer, setNextPrayer] = useState<string>("");
  const [settings, setSettings] = useState<AdhanSettings>(loadAdhanSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [activeAdhan, setActiveAdhan] = useState<PrayerKey | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firedToday = useRef<Set<string>>(new Set());

  const muezzin: Muezzin =
    MUEZZINS.find((m) => m.id === settings.muezzinId) || MUEZZINS[0];

  const updateSettings = (next: AdhanSettings) => {
    setSettings(next);
    saveAdhanSettings(next);
  };

  // Pre-cache selected muezzin for offline
  useEffect(() => {
    preCacheAdhan(muezzin);
  }, [muezzin]);

  const playAdhan = useCallback(
    (prayer: PrayerKey) => {
      const url = prayer === "Fajr" && muezzin.fajrUrl ? muezzin.fajrUrl : muezzin.url;
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {
        toast({
          title: isAr ? "اضغط للسماح بصوت الأذان" : "Tap to allow adhan sound",
          description: isAr ? "المتصفح يمنع التشغيل التلقائي" : "Browser blocked autoplay",
        });
      });
      setActiveAdhan(prayer);
      // Vibrate
      if ("vibrate" in navigator) navigator.vibrate([300, 150, 300, 150, 600]);
      // Notification
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(isAr ? `حان وقت ${prayer}` : `It's time for ${prayer}`, {
            body: isAr ? "حيّ على الصلاة" : "Hayya 'ala-s-Salah",
            icon: "/icons/icon-192.png",
            tag: `adhan-${prayer}`,
          });
        } catch {/* */}
      }
    },
    [muezzin, isAr, toast],
  );

  const stopAdhan = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Schedule check every 20s
  useEffect(() => {
    if (!settings.enabled || prayers.length === 0) return;
    const tick = () => {
      const now = new Date();
      const todayKey = now.toDateString();
      const minutes = now.getHours() * 60 + now.getMinutes();
      for (const p of prayers) {
        if (p.name === "Sunrise") continue;
        const key = p.name as PrayerKey;
        const cfg = settings.perPrayer[key];
        if (!cfg?.enabled) continue;
        const [h, m] = p.time.split(":").map(Number);
        const target = h * 60 + m + (cfg.offsetMin || 0);
        const fireKey = `${todayKey}-${key}`;
        if (minutes === target && !firedToday.current.has(fireKey)) {
          firedToday.current.add(fireKey);
          playAdhan(key);
        }
      }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [settings, prayers, playAdhan]);

  const requestNotifPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const calculateQibla = (lat: number, lng: number) => {
    const kaabaLat = 21.4225;
    const kaabaLng = 39.8262;
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const kaabaLatRad = (kaabaLat * Math.PI) / 180;
    const kaabaLngRad = (kaabaLng * Math.PI) / 180;
    const dLng = kaabaLngRad - lngRad;
    const x = Math.sin(dLng);
    const y = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(dLng);
    let qibla = (Math.atan2(x, y) * 180) / Math.PI;
    if (qibla < 0) qibla += 360;
    return qibla;
  };

  const fetchPrayerTimes = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError("");
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=2`
      );
      const data = await res.json();
      if (data.code === 200) {
        const t = data.data.timings;
        const meta = data.data.meta;
        setCityName(meta?.timezone?.split("/").pop()?.replace(/_/g, " ") || "");
        const prayerList: PrayerTime[] = [
          { name: "Fajr", nameAr: "الفجر", time: t.Fajr, icon: "🌅" },
          { name: "Sunrise", nameAr: "الشروق", time: t.Sunrise, icon: "☀️" },
          { name: "Dhuhr", nameAr: "الظهر", time: t.Dhuhr, icon: "🌤️" },
          { name: "Asr", nameAr: "العصر", time: t.Asr, icon: "🌇" },
          { name: "Maghrib", nameAr: "المغرب", time: t.Maghrib, icon: "🌆" },
          { name: "Isha", nameAr: "العشاء", time: t.Isha, icon: "🌙" },
        ];
        setPrayers(prayerList);

        // Find next prayer
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        for (const p of prayerList) {
          const [h, m] = p.time.split(":").map(Number);
          if (h * 60 + m > nowMinutes) {
            setNextPrayer(p.name);
            break;
          }
        }
      }
    } catch {
      setError(isAr ? "فشل في تحميل مواقيت الصلاة" : "Failed to load prayer times");
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          setQiblaDirection(calculateQibla(loc.lat, loc.lng));
          fetchPrayerTimes(loc.lat, loc.lng);
        },
        () => {
          setError(isAr ? "يرجى السماح بالوصول إلى الموقع" : "Please allow location access");
          setLoading(false);
        }
      );
    } else {
      setError(isAr ? "الموقع غير مدعوم" : "Geolocation not supported");
      setLoading(false);
    }
  }, [fetchPrayerTimes, isAr]);

  // Device compass
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if ((e as any).webkitCompassHeading != null) {
        setDeviceHeading((e as any).webkitCompassHeading);
      } else if (e.alpha != null) {
        setDeviceHeading(360 - e.alpha);
      }
    };
    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, []);

  const qiblaRotation = qiblaDirection != null && deviceHeading != null
    ? qiblaDirection - deviceHeading
    : qiblaDirection || 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {isAr ? "مواقيت الصلاة" : "Prayer Times"}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updateSettings({ ...settings, enabled: !settings.enabled })}
            title={settings.enabled ? "Adhan on" : "Adhan off"}
            aria-label="Toggle adhan"
          >
            {settings.enabled ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setShowSettings(true); requestNotifPermission(); }} aria-label="Adhan settings">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{isAr ? "جاري تحديد موقعك..." : "Detecting your location..."}</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 space-y-4">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" /> {isAr ? "إعادة المحاولة" : "Retry"}
            </Button>
          </div>
        ) : (
          <>
            {/* Location */}
            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{cityName || `${location?.lat.toFixed(2)}, ${location?.lng.toFixed(2)}`}</span>
            </div>

            {/* Adhan banner */}
            <div className={`rounded-xl border p-3 flex items-center gap-3 text-xs ${settings.enabled ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"}`}>
              {settings.enabled ? <Volume2 className="w-4 h-4 text-primary shrink-0" /> : <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />}
              <div className="flex-1">
                <p className={`font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
                  {settings.enabled
                    ? (isAr ? `الأذان: ${muezzin.nameAr}` : `Adhan: ${muezzin.nameEn}`)
                    : (isAr ? "الأذان متوقف" : "Adhan muted")}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {isAr ? "يعمل دون اتصال • قابل للتعديل" : "Works offline • Customizable"}
                </p>
              </div>
              <button onClick={() => playAdhan("Dhuhr")} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20">
                {isAr ? "اختبر" : "Test"}
              </button>
            </div>

            {/* Prayer Times Cards */}
            <div className="space-y-2">
              {prayers.map((p) => (
                <div
                  key={p.name}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    nextPrayer === p.name
                      ? "bg-primary/10 border-primary/40 shadow-md"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className={`font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
                        {isAr ? p.nameAr : p.name}
                      </p>
                      {nextPrayer === p.name && (
                        <span className={`text-xs text-primary font-medium ${isAr ? "font-arabic" : ""}`}>
                          {isAr ? "الصلاة القادمة" : "Next Prayer"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.name !== "Sunrise" && settings.perPrayer[p.name as PrayerKey] && !settings.perPrayer[p.name as PrayerKey].enabled && (
                      <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="text-lg font-semibold text-foreground tabular-nums">{p.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Qibla Compass */}
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
              <h3 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "اتجاه القبلة" : "Qibla Direction"}
              </h3>
              <div className="relative w-48 h-48 mx-auto">
                {/* Compass circle */}
                <div className="absolute inset-0 rounded-full border-2 border-border" />
                {/* Cardinal directions */}
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-foreground">N</span>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground">S</span>
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">E</span>
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">W</span>
                {/* Qibla needle */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${qiblaRotation}deg)` }}
                >
                  <div className="flex flex-col items-center">
                    <Navigation className="w-8 h-8 text-primary fill-primary" />
                    <span className="text-xs font-bold text-primary mt-1">🕋</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {qiblaDirection != null
                  ? `${Math.round(qiblaDirection)}° ${isAr ? "من الشمال" : "from North"}`
                  : isAr ? "جاري الحساب..." : "Calculating..."}
              </p>
              {deviceHeading == null && (
                <p className="text-xs text-muted-foreground">
                  {isAr ? "افتح على هاتفك للبوصلة الحية" : "Open on mobile for live compass"}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Active Adhan overlay with post-adhan dua */}
      {activeAdhan && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative max-w-md w-full bg-card border border-accent/40 rounded-2xl p-6 space-y-5 shadow-2xl">
            <button
              onClick={() => { stopAdhan(); setActiveAdhan(null); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <Volume2 className="w-7 h-7 text-primary-foreground" />
              </div>
              <h2 className={`text-xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? `حان وقت ${activeAdhan === "Fajr" ? "الفجر" : activeAdhan === "Dhuhr" ? "الظهر" : activeAdhan === "Asr" ? "العصر" : activeAdhan === "Maghrib" ? "المغرب" : "العشاء"}` : `It's time for ${activeAdhan}`}
              </h2>
              <p className="text-xs text-muted-foreground">{isAr ? muezzin.nameAr : muezzin.nameEn}</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                {isAr ? "الدعاء بعد الأذان" : "Du'a after the Adhan"}
              </p>
              <p className="font-arabic text-base text-foreground leading-loose text-right" dir="rtl">
                {DUA_AFTER_ADHAN.ar}
              </p>
              <p className="text-xs italic text-muted-foreground">{DUA_AFTER_ADHAN.translit}</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{DUA_AFTER_ADHAN.en}</p>
              <p className="text-[10px] text-accent">{DUA_AFTER_ADHAN.reference}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { stopAdhan(); }}>
                <VolumeX className="w-4 h-4 mr-2" /> {isAr ? "إيقاف" : "Stop"}
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => { stopAdhan(); setActiveAdhan(null); }}>
                {isAr ? "تم" : "Done"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setShowSettings(false)}>
          <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "إعدادات الأذان" : "Adhan Settings"}
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Master toggle */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
              <div>
                <p className={`text-sm font-medium ${isAr ? "font-arabic" : ""}`}>{isAr ? "تفعيل الأذان" : "Enable Adhan"}</p>
                <p className="text-xs text-muted-foreground">{isAr ? "تشغيل الأذان عند دخول وقت الصلاة" : "Ring at each prayer time"}</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSettings({ ...settings, enabled: e.target.checked })}
                className="w-5 h-5 accent-primary"
              />
            </label>

            {/* Muezzin */}
            <div className="space-y-2">
              <p className={`text-xs uppercase tracking-wider font-semibold text-accent ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "صوت المؤذن" : "Muezzin"}
              </p>
              <div className="grid gap-2">
                {MUEZZINS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateSettings({ ...settings, muezzinId: m.id })}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      settings.muezzinId === m.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.nameEn}</p>
                      <p className="font-arabic text-xs text-muted-foreground">{m.nameAr}</p>
                    </div>
                    {settings.muezzinId === m.id && <Download className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Per-prayer */}
            <div className="space-y-2">
              <p className={`text-xs uppercase tracking-wider font-semibold text-accent ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "الصلوات والتعديل" : "Prayers & Adjust"}
              </p>
              {(["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as PrayerKey[]).map((pk) => {
                const cfg = settings.perPrayer[pk];
                return (
                  <div key={pk} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) =>
                        updateSettings({
                          ...settings,
                          perPrayer: { ...settings.perPrayer, [pk]: { ...cfg, enabled: e.target.checked } },
                        })
                      }
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium text-foreground flex-1">{pk}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateSettings({
                            ...settings,
                            perPrayer: { ...settings.perPrayer, [pk]: { ...cfg, offsetMin: cfg.offsetMin - 1 } },
                          })
                        }
                        className="w-7 h-7 rounded-lg bg-card border border-border text-sm"
                      >−</button>
                      <span className="w-12 text-center text-xs tabular-nums text-foreground">
                        {cfg.offsetMin > 0 ? `+${cfg.offsetMin}` : cfg.offsetMin} min
                      </span>
                      <button
                        onClick={() =>
                          updateSettings({
                            ...settings,
                            perPrayer: { ...settings.perPrayer, [pk]: { ...cfg, offsetMin: cfg.offsetMin + 1 } },
                          })
                        }
                        className="w-7 h-7 rounded-lg bg-card border border-border text-sm"
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              {isAr ? "يتم تخزين الأذان للعمل دون اتصال" : "Adhan is cached for offline use"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrayerTimes;
