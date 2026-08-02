import { useState } from "react";
import { Sunrise, Moon, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamilyReminders } from "@/lib/familyReminders";

interface Props {
  onNavigate: (view: string) => void;
}

/**
 * Persistent in-app Family Cycle banner.
 * Appears once a block's Fajr/Maghrib-offset trigger has passed and stays
 * visible until every activity in that block is marked done for the day.
 */
const FamilyBanner = ({ onNavigate }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { cycleId, blocks } = useFamilyReminders(user?.id);
  const [collapsed, setCollapsed] = useState(false);

  const pending = blocks.find((b) => b.enabled && b.due && !b.completed && b.total > 0);
  if (!user || !cycleId || !pending || collapsed) return null;

  const isMorning = pending.block === "morning";
  const Icon = isMorning ? Sunrise : Moon;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-3 right-3 z-40 animate-slide-up">
      <div className="mx-auto max-w-xl rounded-2xl border border-accent/30 bg-card/95 backdrop-blur shadow-xl px-3 py-2.5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </span>
        <button onClick={() => onNavigate("cycle")} className="flex-1 min-w-0 text-left">
          <p className={`text-sm font-semibold text-foreground truncate ${isAr ? "font-arabic" : ""}`}>
            {isAr
              ? isMorning ? "حان وقت ورد الصباح العائلي" : "حان وقت ورد المساء العائلي"
              : isMorning ? "Family morning block is due" : "Family evening block is due"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {pending.done}/{pending.total} {isAr ? "مكتمل" : "complete"} • {pending.anchor} +
            {" "}
            {pending.triggerLabel}
          </p>
        </button>
        <button
          onClick={() => onNavigate("cycle")}
          className="shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground px-3 py-2 text-xs font-semibold flex items-center gap-1"
        >
          {isAr ? "ابدأ" : "Open"}
          <ChevronRight className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => setCollapsed(true)}
          aria-label={isAr ? "إخفاء" : "Hide"}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FamilyBanner;