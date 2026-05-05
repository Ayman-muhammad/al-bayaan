import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const LAST_VISIT_KEY = "al-bayani-last-visit";
const DISMISS_KEY = "al-bayani-nudge-dismissed-at";

interface Props {
  onAct: () => void;
}

const ReminderNudge = ({ onAct }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [show, setShow] = useState(false);
  const [hoursAway, setHoursAway] = useState(0);

  useEffect(() => {
    const last = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
    const now = Date.now();
    localStorage.setItem(LAST_VISIT_KEY, String(now));

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (now - dismissed < 1000 * 60 * 60 * 12) return;

    if (last && now - last > 1000 * 60 * 60 * 18) {
      const h = Math.round((now - last) / (1000 * 60 * 60));
      setHoursAway(h);
      setTimeout(() => setShow(true), 2500);
    }
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!show) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-sm animate-slide-up">
      <div className="rounded-xl border border-accent/30 bg-card/95 backdrop-blur-md shadow-xl p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "حافظ على عزيمتك ✨" : "Keep your streak alive ✨"}
          </p>
          <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr
              ? `لم نرك منذ ${hoursAway} ساعة. آية واحدة تكفي اليوم.`
              : `It's been ${hoursAway}h. One ayah today keeps the flame burning.`}
          </p>
        </div>
        <Button size="sm" variant="hero" onClick={() => { close(); onAct(); }}>
          {isAr ? "ابدأ" : "Go"}
        </Button>
        <button onClick={close} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ReminderNudge;