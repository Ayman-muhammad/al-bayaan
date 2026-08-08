import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Sun, Moon, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamilyMode } from "@/lib/familyMode";
import FamilyDoneButton from "@/components/FamilyDoneButton";
import { MORNING_ADHKAR, EVENING_ADHKAR, type DhikrItem } from "@/data/adhkar";

interface Props {
  onBack: () => void;
}

type Mode = "morning" | "evening";

/**
 * Morning (30) and Evening (25+) Adhkar screens with per-item counters,
 * progress bar, and family-mode "Mark as Family Done" integration via
 * ?familyCycle=<activityId>&type=morning|evening.
 */
const Adhkar = ({ onBack }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [params, setParams] = useSearchParams();
  const family = useFamilyMode();
  const initialMode = (params.get("type") as Mode) || "morning";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Persist selection in URL when user toggles.
    const next = new URLSearchParams(params);
    next.set("type", mode);
    setParams(next, { replace: true });
     
  }, [mode]);

  const items: DhikrItem[] = mode === "morning" ? MORNING_ADHKAR : EVENING_ADHKAR;
  const totalTaps = items.reduce((s, i) => s + i.count, 0);
  const doneTaps = items.reduce((s, i) => s + Math.min(counts[i.id] || 0, i.count), 0);
  const percent = Math.round((doneTaps / totalTaps) * 100);
  const completedItems = items.filter((i) => (counts[i.id] || 0) >= i.count).length;
  const allDone = completedItems === items.length;

  const tap = (id: string, max: number) => {
    if (navigator.vibrate) navigator.vibrate(6);
    setCounts((c) => ({ ...c, [id]: Math.min((c[id] || 0) + 1, max) }));
  };

  const reset = () => setCounts({});

  // Solo mode: celebrate in-app once every dhikr of the set is finished.
  useEffect(() => {
    if (allDone && !family.active) {
      toast.success(isAr ? "أكملت الأذكار ✅" : "Adhkar complete ✅");
    }
     
  }, [allDone, family.active]);

  const title = useMemo(
    () =>
      mode === "morning"
        ? isAr ? "أذكار الصباح" : "Morning Adhkar"
        : isAr ? "أذكار المساء" : "Evening Adhkar",
    [mode, isAr]
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-14 z-30 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-base font-semibold truncate ${isAr ? "font-arabic" : ""}`}>
              {title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {completedItems} / {items.length} · {percent}%
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Reset">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setMode("morning")}
              className={`flex-1 h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                mode === "morning"
                  ? "bg-accent/15 border-accent text-accent"
                  : "bg-background border-border text-muted-foreground"
              }`}
            >
              <Sun className="w-4 h-4" />
              {isAr ? "الصباح" : "Morning"}
            </button>
            <button
              onClick={() => setMode("evening")}
              className={`flex-1 h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                mode === "evening"
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-background border-border text-muted-foreground"
              }`}
            >
              <Moon className="w-4 h-4" />
              {isAr ? "المساء" : "Evening"}
            </button>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {items.map((item) => {
          const c = counts[item.id] || 0;
          const done = c >= item.count;
          return (
            <button
              key={item.id}
              onClick={() => tap(item.id, item.count)}
              disabled={done}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                done
                  ? "bg-primary/5 border-primary/40 opacity-90"
                  : "bg-card border-border hover:border-accent/40 active:scale-[0.99]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  dir="rtl"
                  className="font-arabic text-xl leading-loose text-foreground flex-1"
                >
                  {item.arabic}
                </p>
                <div
                  className={`shrink-0 min-w-[3.5rem] h-14 rounded-full flex flex-col items-center justify-center border-2 ${
                    done
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-accent/40 text-accent"
                  }`}
                >
                  {done ? <Check className="w-5 h-5" /> : (
                    <>
                      <span className="text-lg font-bold leading-none">{c}</span>
                      <span className="text-[10px] opacity-70">/ {item.count}</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground/80 mt-2">{item.translit}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.english}</p>
              <p className="text-[10px] text-accent mt-2 uppercase tracking-wider">
                {item.reference}
              </p>
            </button>
          );
        })}
      </main>

      {allDone && (
        <div
          className="sticky bottom-16 md:bottom-4 z-40 px-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="max-w-2xl mx-auto rounded-2xl bg-primary/10 border border-primary/30 px-4 py-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {family.active
                ? isAr
                  ? "تم تسجيل الأذكار للعائلة تلقائياً"
                  : "Auto-logged for your family"
                : isAr
                  ? "أكملت الأذكار — تقبّل الله"
                  : "Adhkar complete — may Allah accept it"}
            </span>
          </div>
        </div>
      )}

      <FamilyDoneButton
        family={family}
        auto
        ready={allDone}
        label={title}
      />
    </div>
  );
};

export default Adhkar;