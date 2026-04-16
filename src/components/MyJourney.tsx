import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SURAHS } from "@/data/quranData";
import {
  ArrowLeft, Trophy, Target, Flame, BookOpen, BarChart3,
  Calendar, TrendingUp, Star, Zap
} from "lucide-react";

interface MyJourneyProps {
  onBack: () => void;
  onNavigate: (view: string) => void;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

// Local storage keys for anonymous progress tracking
const LS_PRACTICE_KEY = "al-bayan-practice-log";

const getLocalPractice = (): { date: string; surah: number; ayah: number; accuracy: number }[] => {
  try { return JSON.parse(localStorage.getItem(LS_PRACTICE_KEY) || "[]"); } catch { return []; }
};

const MyJourney = ({ onBack, onNavigate }: MyJourneyProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";

  const [memProgress, setMemProgress] = useState<any[]>([]);
  const [readProgress, setReadProgress] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastPosition, setLastPosition] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let memData: any[] = [];
    let readData: any[] = [];

    if (user) {
      const [memRes, readRes] = await Promise.all([
        supabase.from("memorization_progress").select("*").eq("user_id", user.id).order("last_practiced", { ascending: false }),
        supabase.from("reading_progress").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);
      memData = memRes.data || [];
      readData = readRes.data || [];
    } else {
      // Use local storage for anonymous users
      const localPractice = getLocalPractice();
      memData = localPractice.map((p, i) => ({
        id: `local-${i}`,
        surah_id: p.surah,
        ayah_from: p.ayah,
        ayah_to: p.ayah,
        accuracy_score: p.accuracy,
        mastered: p.accuracy >= 70,
        repetitions: 1,
        last_practiced: p.date,
      }));
    }

    setMemProgress(memData);
    setReadProgress(readData);

    // Calculate streak
    const practicedays = new Set<string>();
    memData.forEach((m: any) => {
      if (m.last_practiced) practicedays.add(new Date(m.last_practiced).toISOString().split("T")[0]);
    });
    readData.forEach((r: any) => {
      if (r.updated_at) practicedays.add(new Date(r.updated_at).toISOString().split("T")[0]);
    });

    // Heatmap (last 90 days)
    const heatmap: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      heatmap[d.toISOString().split("T")[0]] = 0;
    }
    memData.forEach((m: any) => {
      if (m.last_practiced) {
        const key = new Date(m.last_practiced).toISOString().split("T")[0];
        if (heatmap[key] !== undefined) heatmap[key]++;
      }
    });
    readData.forEach((r: any) => {
      if (r.updated_at) {
        const key = new Date(r.updated_at).toISOString().split("T")[0];
        if (heatmap[key] !== undefined) heatmap[key]++;
      }
    });
    setHeatmapData(heatmap);

    // Streak
    let streakCount = 0;
    const today = new Date().toISOString().split("T")[0];
    let checkDate = new Date();
    if (!practicedays.has(today)) checkDate.setDate(checkDate.getDate() - 1);
    while (practicedays.has(checkDate.toISOString().split("T")[0])) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    setStreak(streakCount);

    // Last position
    if (readData.length > 0) setLastPosition(readData[0]);
    const savedPos = localStorage.getItem("al-bayan-last-position");
    if (savedPos && !readData.length) {
      try { setLastPosition(JSON.parse(savedPos)); } catch {}
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalMastered = memProgress.filter((m) => m.mastered).length;
  const totalPracticed = memProgress.length;
  const avgAccuracy = totalPracticed > 0
    ? Math.round(memProgress.reduce((sum, m) => sum + (m.accuracy_score || 0), 0) / totalPracticed)
    : 0;
  const surahs_read = new Set(readProgress.map((r) => r.surah_id)).size;

  // Heatmap rendering
  const heatmapWeeks: string[][] = [];
  const sortedDays = Object.keys(heatmapData).sort();
  const last84 = sortedDays.slice(-84);
  for (let w = 0; w < 12; w++) {
    heatmapWeeks.push(last84.slice(w * 7, (w + 1) * 7));
  }

  const getHeatColor = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count <= 1) return "bg-primary/20";
    if (count <= 3) return "bg-primary/40";
    if (count <= 5) return "bg-primary/60";
    return "bg-primary";
  };

  const nextMilestone = STREAK_MILESTONES.find((m) => m > streak) || streak + 10;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <TrendingUp className="w-5 h-5 text-primary" />
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {isAr ? "رحلتي" : "My Journey"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Streak Card */}
            <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border border-primary/20 rounded-2xl p-5 text-center space-y-2 animate-scale-in">
              <div className="flex items-center justify-center gap-2">
                <Flame className={`w-8 h-8 ${streak > 0 ? "text-accent animate-pulse" : "text-muted-foreground"}`} />
                <span className="text-4xl font-bold text-foreground">{streak}</span>
              </div>
              <p className={`text-sm font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "أيام متتالية" : "Day Streak"}
              </p>
              {streak > 0 && (
                <div className="space-y-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden max-w-[200px] mx-auto">
                    <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${Math.min((streak / nextMilestone) * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? `${nextMilestone - streak} أيام للإنجاز التالي` : `${nextMilestone - streak} days to next milestone`}
                  </p>
                </div>
              )}
              {streak === 0 && (
                <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "ابدأ اليوم! اقرأ أو احفظ آية واحدة" : "Start today! Read or memorize one ayah"}
                </p>
              )}
            </div>

            {/* Sign in prompt for anonymous users */}
            {!user && totalPracticed > 0 && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 text-center animate-fade-in">
                <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "سجّل الدخول لحفظ تقدمك عبر الأجهزة" : "Sign in to sync your progress across devices"}
                </p>
                <Button variant="outline" size="sm" onClick={() => onNavigate("auth")} className="mt-2">
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </Button>
              </div>
            )}

            {/* Resume card */}
            {lastPosition && (
              <button onClick={() => onNavigate("quran")} className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all text-left animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
                      {isAr ? "أكمل من حيث توقفت" : "Continue where you left off"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SURAHS.find((s) => s.id === lastPosition.surah_id)?.name[language] || ""} — {isAr ? "آية" : "Ayah"} {lastPosition.last_ayah}
                    </p>
                  </div>
                  <Zap className="w-5 h-5 text-accent" />
                </div>
              </button>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: totalMastered, label: isAr ? "آيات محفوظة" : "Mastered", icon: Star, color: "text-accent" },
                { value: totalPracticed, label: isAr ? "آيات مُتدرب عليها" : "Practiced", icon: Target, color: "text-primary" },
                { value: `${avgAccuracy}%`, label: isAr ? "متوسط الدقة" : "Avg. Accuracy", icon: BarChart3, color: "text-primary" },
                { value: surahs_read, label: isAr ? "سور مقروءة" : "Surahs Read", icon: BookOpen, color: "text-accent" },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>
                  <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Heatmap */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "نشاطك (آخر 12 أسبوع)" : "Activity (Last 12 Weeks)"}
                </h3>
              </div>
              <div className="flex gap-1 justify-center flex-wrap">
                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day) => (
                      <div key={day} className={`w-3 h-3 rounded-[3px] transition-colors ${getHeatColor(heatmapData[day] || 0)}`} title={`${day}: ${heatmapData[day] || 0} activities`} />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <span>{isAr ? "أقل" : "Less"}</span>
                {[0, 1, 3, 5, 7].map((n) => (
                  <div key={n} className={`w-3 h-3 rounded-[3px] ${getHeatColor(n)}`} />
                ))}
                <span>{isAr ? "أكثر" : "More"}</span>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-2 animate-slide-up" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
              <p className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                💡 {isAr ? "اقتراح ذكي" : "Smart Suggestion"}
              </p>
              {(() => {
                const weak = memProgress.filter((m) => !m.mastered && (m.accuracy_score || 0) < 70);
                if (weak.length > 0) {
                  const item = weak[0];
                  const surah = SURAHS.find((s) => s.id === item.surah_id);
                  return (
                    <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                      {isAr
                        ? `راجع ${surah?.name.ar || ""} الآية ${item.ayah_from} — دقتك ${Math.round(item.accuracy_score)}%`
                        : `Review ${surah?.name.en || ""} Ayah ${item.ayah_from} — your accuracy was ${Math.round(item.accuracy_score)}%`}
                    </p>
                  );
                }
                return (
                  <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? "ابدأ حفظ سورة جديدة اليوم!" : "Start memorizing a new surah today!"}
                  </p>
                );
              })()}
              <Button variant="outline" size="sm" onClick={() => onNavigate("hafiz")} className="w-full">
                {isAr ? "ابدأ التدريب" : "Start Practice"} →
              </Button>
            </div>

            {/* Recent practice */}
            {memProgress.length > 0 && (
              <div className="space-y-2">
                <h3 className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "التدريب الأخير" : "Recent Practice"}
                </h3>
                {memProgress.slice(0, 10).map((item, i) => {
                  const surah = SURAHS.find((s) => s.id === item.surah_id);
                  return (
                    <div key={item.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${(i + 5) * 60}ms`, animationFillMode: "both" }}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.mastered ? "bg-accent/10" : "bg-muted"}`}>
                        {item.mastered ? <Star className="w-4 h-4 text-accent" /> : <Target className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {surah?.name[language] || `Surah ${item.surah_id}`} — {isAr ? "آية" : "Ayah"} {item.ayah_from}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.repetitions} {isAr ? "تكرار" : "reps"} • {Math.round(item.accuracy_score || 0)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyJourney;
