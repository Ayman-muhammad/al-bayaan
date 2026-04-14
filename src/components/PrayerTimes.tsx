import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Compass, Loader2, RefreshCw, Navigation } from "lucide-react";

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

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState("");
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [nextPrayer, setNextPrayer] = useState<string>("");

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
                  <span className="text-lg font-semibold text-foreground tabular-nums">{p.time}</span>
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
    </div>
  );
};

export default PrayerTimes;
