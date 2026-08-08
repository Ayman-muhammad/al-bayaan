import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Target, CheckCircle2, Award, BookOpen, Headphones } from "lucide-react";
import badgeFirstStep from "@/assets/badges/badge-first-step.png";
import badgeStreak from "@/assets/badges/badge-streak.png";
import badgeDevotee from "@/assets/badges/badge-devotee.png";
import badgeReader from "@/assets/badges/badge-reader.png";
import badgeMilestone from "@/assets/badges/badge-milestone.png";
import badgeMaster from "@/assets/badges/badge-master.png";

// Daily challenges are derived from the same activity signals MyJourney uses.
// Progress is inferred so this component is self-contained.
export interface ChallengeStats {
  ayahsToday: number;
  listenedMinutesToday: number;
  reflectionsToday: number;
  streak: number;
  totalMastered: number;
  surahsRead: number;
}

interface Props { stats: ChallengeStats }

interface Challenge {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: { en: string; ar: string };
  target: number;
  progress: number;
  unit: { en: string; ar: string };
}

interface Badge {
  id: string;
  /** Illustrated medallion artwork (no emojis anywhere in the badge system). */
  art: string;
  title: { en: string; ar: string };
  earned: boolean;
  hint?: { en: string; ar: string };
}

const DailyChallenges = ({ stats }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});

  // Reset claims daily
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem("al-bayan-daily-claims");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === today) setClaimed(parsed.claimed || {});
      } catch {/* */}
    }
  }, []);

  const claim = (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const next = { ...claimed, [id]: true };
    setClaimed(next);
    localStorage.setItem("al-bayan-daily-claims", JSON.stringify({ date: today, claimed: next }));
  };

  const challenges: Challenge[] = useMemo(() => [
    {
      id: "read-10",
      icon: BookOpen,
      title: { en: "Read 10 ayahs", ar: "اقرأ ١٠ آيات" },
      target: 10, progress: stats.ayahsToday,
      unit: { en: "ayahs", ar: "آية" },
    },
    {
      id: "listen-5",
      icon: Headphones,
      title: { en: "Listen for 5 minutes", ar: "استمع ٥ دقائق" },
      target: 5, progress: stats.listenedMinutesToday,
      unit: { en: "min", ar: "د" },
    },
    {
      id: "reflect-1",
      icon: Target,
      title: { en: "Reflect on 1 ayah", ar: "تدبّر آية واحدة" },
      target: 1, progress: stats.reflectionsToday,
      unit: { en: "reflection", ar: "تدبّر" },
    },
  ], [stats]);

  const badges: Badge[] = useMemo(() => [
    { id: "first-step", art: badgeFirstStep, title: { en: "First Step", ar: "الخطوة الأولى" }, earned: stats.totalMastered >= 1, hint: { en: "Master your first ayah", ar: "أتقن أول آية" } },
    { id: "week-warrior", art: badgeStreak, title: { en: "7-Day Streak", ar: "٧ أيام" }, earned: stats.streak >= 7, hint: { en: "Practice 7 days in a row", ar: "تدرّب ٧ أيام" } },
    { id: "month-devotee", art: badgeDevotee, title: { en: "30-Day Devotee", ar: "٣٠ يوم" }, earned: stats.streak >= 30, hint: { en: "One full month", ar: "شهر كامل" } },
    { id: "juz-30", art: badgeReader, title: { en: "Juz 30 Reader", ar: "قارئ جزء عمّ" }, earned: stats.surahsRead >= 37, hint: { en: "Read every surah of Juz 30", ar: "اقرأ سور جزء عم" } },
    { id: "hafiz-10", art: badgeMilestone, title: { en: "10 Ayahs Mastered", ar: "١٠ آيات" }, earned: stats.totalMastered >= 10, hint: { en: "Master 10 ayahs", ar: "أتقن ١٠ آيات" } },
    { id: "hafiz-100", art: badgeMaster, title: { en: "100 Ayahs Mastered", ar: "١٠٠ آية" }, earned: stats.totalMastered >= 100, hint: { en: "Master 100 ayahs", ar: "أتقن ١٠٠ آية" } },
  ], [stats]);

  return (
    <div className="space-y-4">
      {/* Daily challenges */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "تحديات اليوم" : "Today's Challenges"}
          </h3>
        </div>
        <div className="space-y-2.5">
          {challenges.map((c) => {
            const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
            const done = c.progress >= c.target;
            const isClaimed = claimed[c.id];
            return (
              <div key={c.id} className="rounded-xl border border-border/70 p-3 bg-background/60">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${done ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"}`}>
                    <c.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
                      {isAr ? c.title.ar : c.title.en}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {c.progress}/{c.target} {isAr ? c.unit.ar : c.unit.en}
                    </p>
                  </div>
                  {done && (
                    <button
                      onClick={() => !isClaimed && claim(c.id)}
                      disabled={isClaimed}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                        isClaimed
                          ? "bg-emerald-500/10 text-emerald-500 cursor-default"
                          : "bg-accent text-accent-foreground hover:opacity-90"
                      }`}
                    >
                      {isClaimed ? (isAr ? "✓ تم" : "✓ Claimed") : (isAr ? "استلم" : "Claim")}
                    </button>
                  )}
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                  <div className={`h-full ${done ? "bg-emerald-500" : "bg-primary"} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-accent" />
          <h3 className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "الشارات" : "Badges"}
          </h3>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {badges.filter((b) => b.earned).length}/{badges.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl p-3 text-center border transition-all ${
                b.earned
                  ? "border-accent/40 bg-gradient-to-br from-accent/15 to-primary/5 shadow-sm"
                  : "border-border bg-muted/30 opacity-60"
              }`}
              title={b.hint ? (isAr ? b.hint.ar : b.hint.en) : ""}
            >
              <div className="w-12 h-12 mx-auto mb-1.5 flex items-center justify-center">
                <img
                  src={b.art}
                  alt={isAr ? b.title.ar : b.title.en}
                  loading="lazy"
                  width={512}
                  height={512}
                  className={`w-12 h-12 object-contain transition-all duration-500 ${
                    b.earned
                      ? "drop-shadow-[0_2px_10px_hsl(var(--accent)/0.45)]"
                      : "grayscale opacity-50"
                  }`}
                />
              </div>
              <p className={`text-[11px] font-semibold text-foreground leading-tight ${isAr ? "font-arabic" : ""}`}>
                {isAr ? b.title.ar : b.title.en}
              </p>
              {b.earned && <CheckCircle2 className="w-3 h-3 text-emerald-500 mx-auto mt-1" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyChallenges;