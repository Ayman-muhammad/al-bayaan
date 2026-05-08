import { useEffect, useState } from "react";
import { ArrowLeft, Check, Lock, Sparkles, Award, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Journey {
  id: string;
  titleEn: string; titleAr: string;
  descEn: string; descAr: string;
  days: { titleEn: string; titleAr: string; lessonEn: string; lessonAr: string; actionEn: string; actionAr: string; }[];
}

const JOURNEYS: Journey[] = [
  {
    id: "mulk",
    titleEn: "Memorize Surah Al-Mulk",
    titleAr: "حفظ سورة الملك",
    descEn: "30 ayahs in 30 days — your shield in the grave.",
    descAr: "٣٠ آية في ٣٠ يوماً — شفيعك في القبر.",
    days: Array.from({ length: 30 }, (_, i) => ({
      titleEn: `Day ${i + 1} — Ayah ${i + 1}`, titleAr: `اليوم ${i + 1} — الآية ${i + 1}`,
      lessonEn: `Listen, repeat, and reflect on ayah ${i + 1}. Recite it 10 times after Fajr and Maghrib.`,
      lessonAr: `استمع وكرر وتدبر الآية ${i + 1}. اقرأها ١٠ مرات بعد الفجر والمغرب.`,
      actionEn: `Recite ayah ${i + 1} from memory tonight.`,
      actionAr: `اتلُ الآية ${i + 1} من الحفظ الليلة.`,
    })),
  },
  {
    id: "salah",
    titleEn: "Understand Salah",
    titleAr: "افهم الصلاة",
    descEn: "Discover the meaning of every word in your prayer.",
    descAr: "اكتشف معنى كل كلمة في صلاتك.",
    days: Array.from({ length: 30 }, (_, i) => ({
      titleEn: `Day ${i + 1} — Pillar ${i + 1}`, titleAr: `اليوم ${i + 1} — ركن ${i + 1}`,
      lessonEn: `Today's focus: understand a key part of salah and pray it with khushū'.`,
      lessonAr: `تركيز اليوم: افهم جزءاً أساسياً من الصلاة وصلِّها بخشوع.`,
      actionEn: `Pray today's salah with full presence.`,
      actionAr: `صلِّ صلاة اليوم بحضور كامل.`,
    })),
  },
  {
    id: "adhkar",
    titleEn: "Morning Adhkar Mastery",
    titleAr: "إتقان أذكار الصباح",
    descEn: "Build a 30-day habit of prophetic morning remembrance.",
    descAr: "ابنِ عادة أذكار الصباح النبوية لمدة ٣٠ يوماً.",
    days: Array.from({ length: 30 }, (_, i) => ({
      titleEn: `Day ${i + 1}`, titleAr: `اليوم ${i + 1}`,
      lessonEn: `Recite the morning adhkar with understanding. Reflect on one du'a today.`,
      lessonAr: `اقرأ أذكار الصباح بفهم. تأمل دعاءً واحداً اليوم.`,
      actionEn: `Mark today's adhkar complete in the Dhikr screen.`,
      actionAr: `أكمل أذكار اليوم في صفحة الأذكار.`,
    })),
  },
];

const KEY = (id: string) => `journey-${id}`;

const Journeys = ({ onBack }: { onBack: () => void }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [active, setActive] = useState<Journey | null>(null);
  const [progress, setProgress] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const p: Record<string, number[]> = {};
    JOURNEYS.forEach((j) => {
      try { p[j.id] = JSON.parse(localStorage.getItem(KEY(j.id)) || "[]"); }
      catch { p[j.id] = []; }
    });
    setProgress(p);
  }, []);

  const completeDay = (jid: string, day: number) => {
    const cur = new Set(progress[jid] || []);
    cur.add(day);
    const arr = [...cur].sort((a, b) => a - b);
    localStorage.setItem(KEY(jid), JSON.stringify(arr));
    setProgress({ ...progress, [jid]: arr });
    toast({ title: isAr ? "أحسنت!" : "Excellent!", description: isAr ? "تم تسجيل اليوم" : "Day marked complete" });
  };

  if (active) {
    const done = new Set(progress[active.id] || []);
    const completedAll = done.size === active.days.length;
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setActive(null)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className={`font-semibold flex-1 truncate ${isAr ? "font-arabic" : ""}`}>{isAr ? active.titleAr : active.titleEn}</h1>
          <span className="text-xs text-muted-foreground">{done.size}/{active.days.length}</span>
        </header>
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {completedAll && (
            <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-primary/10 to-accent/10 p-5 text-center space-y-2">
              <Award className="w-12 h-12 text-accent mx-auto" />
              <h2 className="text-lg font-bold text-gradient-gold">{isAr ? "شهادة الإتمام" : "Certificate of Completion"}</h2>
              <p className="text-xs text-muted-foreground">{isAr ? "أكملت رحلة ٣٠ يوماً" : "You completed a 30-day journey"}</p>
              <Button size="sm" variant="hero" className="gap-2" onClick={() => {
                if (navigator.share) navigator.share({ title: "Al-Bayan", text: `Alhamdulillah — I completed: ${active.titleEn}` });
                else toast({ title: "Copy", description: `I completed: ${active.titleEn}` });
              }}><Share2 className="w-4 h-4" />{isAr ? "شارك" : "Share"}</Button>
            </div>
          )}
          {active.days.map((d, i) => {
            const day = i + 1;
            const isDone = done.has(day);
            const isLocked = !isDone && day > 1 && !done.has(day - 1);
            return (
              <div key={day} className={`rounded-xl border p-4 ${isDone ? "border-primary/40 bg-primary/5" : isLocked ? "border-border bg-muted/30 opacity-60" : "border-border bg-card"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <Check className="w-5 h-5" /> : isLocked ? <Lock className="w-4 h-4" /> : <span className="text-sm font-bold">{day}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold ${isAr ? "font-arabic" : ""}`}>{isAr ? d.titleAr : d.titleEn}</h3>
                    <p className={`text-xs text-muted-foreground mt-1 ${isAr ? "font-arabic" : ""}`}>{isAr ? d.lessonAr : d.lessonEn}</p>
                    <p className={`text-xs text-accent mt-2 font-medium ${isAr ? "font-arabic" : ""}`}>✓ {isAr ? d.actionAr : d.actionEn}</p>
                    {!isDone && !isLocked && (
                      <Button size="sm" variant="hero" className="mt-3 h-8" onClick={() => completeDay(active.id, day)}>
                        {isAr ? "أكملت" : "Mark complete"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <Sparkles className="w-5 h-5 text-accent" />
        <h1 className={`font-semibold ${isAr ? "font-arabic" : ""}`}>{isAr ? "رحلة ٣٠ يوماً" : "30-Day Transformation"}</h1>
      </header>
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
          {isAr ? "برامج موجهة — درس صغير وعمل واحد كل يوم." : "Guided programs — one micro-lesson + one action every day."}
        </p>
        {JOURNEYS.map((j) => {
          const done = (progress[j.id] || []).length;
          const pct = Math.round((done / j.days.length) * 100);
          return (
            <button key={j.id} onClick={() => setActive(j)} className="w-full rounded-2xl border border-border hover:border-primary/40 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <h3 className={`font-bold ${isAr ? "font-arabic" : ""}`}>{isAr ? j.titleAr : j.titleEn}</h3>
              <p className={`text-xs text-muted-foreground mt-1 ${isAr ? "font-arabic" : ""}`}>{isAr ? j.descAr : j.descEn}</p>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{done}/{j.days.length} • {pct}%</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Journeys;