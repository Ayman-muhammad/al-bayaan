import { useEffect, useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SURAHS } from "@/data/quranData";
import {
  ArrowLeft, Flame, Star, BookOpen, GraduationCap, Sparkles,
  Trophy, Target, Zap, TrendingUp, Calendar, Award, ChevronRight,
} from "lucide-react";

interface DashboardProps {
  onBack: () => void;
  onNavigate: (view: string) => void;
}

const TOTAL_QURAN_AYAHS = 6236;

const Dashboard = ({ onBack, onNavigate }: DashboardProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";

  const [mem, setMem] = useState<any[]>([]);
  const [read, setRead] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (user) {
      const [m, r] = await Promise.all([
        supabase.from("memorization_progress").select("*").eq("user_id", user.id),
        supabase.from("reading_progress").select("*").eq("user_id", user.id),
      ]);
      setMem(m.data || []);
      setRead(r.data || []);
    } else {
      try {
        setMem(JSON.parse(localStorage.getItem("al-bayan-practice-log") || "[]").map((p: any, i: number) => ({
          id: i, surah_id: p.surah, ayah_from: p.ayah, ayah_to: p.ayah,
          accuracy_score: p.accuracy, mastered: p.accuracy >= 70, last_practiced: p.date,
        })));
      } catch { setMem([]); }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const ayahsMemorized = mem.reduce((sum, m) => sum + (m.mastered ? Math.max(1, (m.ayah_to || m.ayah_from) - m.ayah_from + 1) : 0), 0);
    const ayahsRead = read.reduce((sum, r) => sum + (r.last_ayah || 0), 0);
    const surahsCompleted = read.filter((r) => r.completed).length;
    const surahsTouched = new Set([...read.map(r => r.surah_id), ...mem.map(m => m.surah_id)]).size;
    const avgAccuracy = mem.length ? Math.round(mem.reduce((s, m) => s + (m.accuracy_score || 0), 0) / mem.length) : 0;

    // Streak
    const days = new Set<string>();
    mem.forEach((m) => m.last_practiced && days.add(new Date(m.last_practiced).toISOString().split("T")[0]));
    read.forEach((r) => r.updated_at && days.add(new Date(r.updated_at).toISOString().split("T")[0]));
    let streak = 0;
    const today = new Date();
    if (!days.has(today.toISOString().split("T")[0])) today.setDate(today.getDate() - 1);
    while (days.has(today.toISOString().split("T")[0])) {
      streak++;
      today.setDate(today.getDate() - 1);
    }

    const quranPct = Math.min(100, (ayahsMemorized / TOTAL_QURAN_AYAHS) * 100);
    const readPct = Math.min(100, (ayahsRead / TOTAL_QURAN_AYAHS) * 100);
    const xp = ayahsMemorized * 10 + ayahsRead * 2 + streak * 5;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    const xpForNext = (level * level) * 50;
    const xpForCurrent = ((level - 1) * (level - 1)) * 50;
    const levelPct = ((xp - xpForCurrent) / Math.max(1, xpForNext - xpForCurrent)) * 100;

    return { ayahsMemorized, ayahsRead, surahsCompleted, surahsTouched, avgAccuracy, streak, quranPct, readPct, xp, level, levelPct, xpForNext };
  }, [mem, read]);

  const recentSurahs = useMemo(() => {
    const map = new Map<number, { surah_id: number; ayah: number; accuracy: number; date: string }>();
    [...mem].sort((a, b) => new Date(b.last_practiced || 0).getTime() - new Date(a.last_practiced || 0).getTime())
      .forEach((m) => {
        if (!map.has(m.surah_id)) {
          map.set(m.surah_id, { surah_id: m.surah_id, ayah: m.ayah_to || m.ayah_from, accuracy: m.accuracy_score || 0, date: m.last_practiced });
        }
      });
    return Array.from(map.values()).slice(0, 5);
  }, [mem]);

  // Per-surah memorization map
  const surahProgress = useMemo(() => {
    const map = new Map<number, { memorized: number; total: number }>();
    mem.filter(m => m.mastered).forEach((m) => {
      const total = SURAHS.find(s => s.id === m.surah_id)?.verses || 0;
      const cnt = Math.max(1, (m.ayah_to || m.ayah_from) - m.ayah_from + 1);
      const cur = map.get(m.surah_id) || { memorized: 0, total };
      map.set(m.surah_id, { memorized: cur.memorized + cnt, total });
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v, pct: Math.min(100, (v.memorized / Math.max(1, v.total)) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [mem]);

  const achievements = useMemo(() => {
    return [
      { id: "first", label: isAr ? "أول آية" : "First Ayah", icon: Sparkles, unlocked: stats.ayahsMemorized >= 1 },
      { id: "streak3", label: isAr ? "3 أيام" : "3-Day Streak", icon: Flame, unlocked: stats.streak >= 3 },
      { id: "streak7", label: isAr ? "أسبوع" : "Week Warrior", icon: Flame, unlocked: stats.streak >= 7 },
      { id: "streak30", label: isAr ? "30 يوم" : "30-Day Devotee", icon: Award, unlocked: stats.streak >= 30 },
      { id: "ayah10", label: isAr ? "10 آيات" : "10 Ayahs", icon: Star, unlocked: stats.ayahsMemorized >= 10 },
      { id: "ayah50", label: isAr ? "50 آية" : "50 Ayahs", icon: Star, unlocked: stats.ayahsMemorized >= 50 },
      { id: "ayah100", label: isAr ? "100 آية" : "Centurion", icon: Trophy, unlocked: stats.ayahsMemorized >= 100 },
      { id: "surah1", label: isAr ? "سورة كاملة" : "Full Surah", icon: BookOpen, unlocked: stats.surahsCompleted >= 1 },
      { id: "accuracy90", label: isAr ? "دقة 90%" : "90% Accuracy", icon: Target, unlocked: stats.avgAccuracy >= 90 },
      { id: "level5", label: isAr ? "مستوى 5" : "Level 5", icon: GraduationCap, unlocked: stats.level >= 5 },
    ];
  }, [stats, isAr]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <Sparkles className="w-5 h-5 text-accent" />
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {isAr ? "لوحة التقدم" : "Your Dashboard"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Hero: Level + XP */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-5 text-primary-foreground shadow-xl animate-scale-in">
              <div className="absolute inset-0 islamic-pattern opacity-20 pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">{isAr ? "المستوى" : "Level"}</p>
                  <p className="text-5xl font-extrabold mt-1">{stats.level}</p>
                  <p className="text-xs opacity-90 mt-1">{stats.xp} XP</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Flame className="w-5 h-5" />
                    <span className="text-2xl font-bold">{stats.streak}</span>
                  </div>
                  <p className="text-xs opacity-90 mt-1">{isAr ? "يوم متتالي" : "day streak"}</p>
                </div>
              </div>
              <div className="relative mt-4 h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary-foreground rounded-full transition-all duration-700" style={{ width: `${stats.levelPct}%` }} />
              </div>
              <p className="relative text-[11px] opacity-80 mt-1.5">{isAr ? `${stats.xpForNext - stats.xp} XP للمستوى التالي` : `${stats.xpForNext - stats.xp} XP to next level`}</p>
            </div>

            {/* Quran progress ring */}
            <div className="bg-card border border-border rounded-2xl p-5 animate-slide-up">
              <div className="flex items-center gap-4">
                <ProgressRing pct={stats.quranPct} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>{isAr ? "تقدم الحفظ" : "Quran Memorized"}</p>
                  <p className="text-2xl font-bold text-foreground">{stats.ayahsMemorized} <span className="text-sm text-muted-foreground font-normal">/ {TOTAL_QURAN_AYAHS}</span></p>
                  <p className={`text-xs text-accent font-medium mt-1 ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? `متبقي ${TOTAL_QURAN_AYAHS - stats.ayahsMemorized} آية` : `${TOTAL_QURAN_AYAHS - stats.ayahsMemorized} ayahs remaining`}
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 h-8 gap-1" onClick={() => onNavigate("hafiz")}>
                    <GraduationCap className="w-3.5 h-3.5" />
                    {isAr ? "تابع الحفظ" : "Continue"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard icon={Star} label={isAr ? "محفوظة" : "Memorized"} value={stats.ayahsMemorized} accent />
              <StatCard icon={BookOpen} label={isAr ? "سور لُمست" : "Surahs"} value={stats.surahsTouched} />
              <StatCard icon={Target} label={isAr ? "دقة" : "Accuracy"} value={`${stats.avgAccuracy}%`} />
            </div>

            {/* Per-surah progress (Tarteel-like) */}
            {surahProgress.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? "تقدمك في كل سورة" : "Surah Progress"}
                  </h3>
                  <span className="text-xs text-muted-foreground">{surahProgress.length}</span>
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                  {surahProgress.slice(0, 10).map((s) => {
                    const surah = SURAHS.find(x => x.id === s.id);
                    return (
                      <div key={s.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
                            {surah?.name[language] || `Surah ${s.id}`}
                          </span>
                          <span className="text-muted-foreground">{s.memorized}/{s.total} • {Math.round(s.pct)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3 animate-slide-up">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent" />
                <h3 className={`text-sm font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>{isAr ? "الإنجازات" : "Achievements"}</h3>
                <span className="text-xs text-muted-foreground">{achievements.filter(a => a.unlocked).length}/{achievements.length}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {achievements.map((a) => (
                  <div key={a.id} className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-1.5 transition-all ${a.unlocked ? "bg-gradient-to-br from-accent/20 to-primary/10 border border-accent/40" : "bg-muted/40 border border-border opacity-50"}`} title={a.label}>
                    <a.icon className={`w-4 h-4 ${a.unlocked ? "text-accent" : "text-muted-foreground"}`} />
                    <span className="text-[8px] text-center leading-tight text-foreground line-clamp-2">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent + CTA */}
            {recentSurahs.length > 0 && (
              <div className="space-y-2">
                <h3 className={`text-sm font-bold text-foreground px-1 ${isAr ? "font-arabic" : ""}`}>{isAr ? "آخر تدريب" : "Recent Practice"}</h3>
                {recentSurahs.map((r) => {
                  const surah = SURAHS.find(s => s.id === r.surah_id);
                  return (
                    <button key={r.surah_id} onClick={() => onNavigate("hafiz")} className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-semibold text-foreground truncate ${isAr ? "font-arabic" : ""}`}>{surah?.name[language] || `Surah ${r.surah_id}`}</p>
                        <p className="text-xs text-muted-foreground">{isAr ? "آية" : "Ayah"} {r.ayah} • {Math.round(r.accuracy)}%</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}

            {!user && (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center space-y-2">
                <p className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "احفظ تقدمك عبر كل أجهزتك" : "Sync progress across all devices"}
                </p>
                <Button variant="hero" size="sm" onClick={() => onNavigate("auth")}>
                  {isAr ? "سجل الدخول" : "Sign In"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: boolean }) => (
  <div className={`rounded-xl p-3 text-center border ${accent ? "bg-accent/5 border-accent/20" : "bg-card border-border"}`}>
    <Icon className={`w-4 h-4 mx-auto mb-1 ${accent ? "text-accent" : "text-primary"}`} />
    <p className="text-lg font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const ProgressRing = ({ pct }: { pct: number }) => {
  const r = 32, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle cx="40" cy="40" r={r} stroke="hsl(var(--accent))" strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default Dashboard;