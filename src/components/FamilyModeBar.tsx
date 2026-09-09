import { Check, X, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FamilyModeState } from "@/lib/familyMode";

interface Props {
  family: FamilyModeState;
  /** What the user is currently doing, e.g. "Surah Al-Mulk 1–10". */
  label?: string;
  /** Live progress of the in-app activity (0–100) when the screen can measure it. */
  percent?: number;
}

/**
 * Shared Family Cycle bar shown at the top of every bridged screen
 * (Quran / Adhkar / Dhikr). Shows the cycle day, the assigned portion,
 * live per-member "finished today" chips and an always-available exit.
 */
const FamilyModeBar = ({ family, label, percent }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";

  if (!family.active) return null;

  const done = family.doneMemberIds;
  const total = family.members.length;
  const doneCount = family.members.filter((m) => done.includes(m.id)).length;

  return (
    <div className="shrink-0 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/15 border-b border-accent/30">
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Users className="w-3.5 h-3.5 text-accent" />
          {isAr ? "وضع العائلة" : "Family Cycle"}
          {family.dayNumber
            ? ` • ${isAr ? "يوم" : "Day"} ${family.dayNumber}${
                family.durationDays ? `/${family.durationDays}` : ""
              }`
            : ""}
        </span>

        {label && (
          <span className={`text-xs text-muted-foreground truncate max-w-[45%] ${isAr ? "font-arabic" : ""}`}>
            {label}
          </span>
        )}

        {total > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {doneCount}/{total} {isAr ? "أكملوا اليوم" : "done today"}
          </span>
        )}

        <button
          onClick={family.exit}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <X className="w-3 h-3" /> {isAr ? "خروج" : "Exit"}
        </button>
      </div>

      {total > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {family.members.map((m) => {
            const on = done.includes(m.id);
            return (
              <span
                key={m.id}
                title={m.name}
                className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-all ${
                  on ? "border-primary bg-primary/15 text-foreground" : "border-border bg-background/60 text-muted-foreground opacity-70"
                }`}
                style={on ? { borderColor: m.color } : undefined}
              >
                <span className="text-sm leading-none">{m.avatar_emoji}</span>
                <span className="max-w-[70px] truncate">{m.name}</span>
                {on && <Check className="w-3 h-3 text-primary" />}
              </span>
            );
          })}
        </div>
      )}

      {typeof percent === "number" && (
        <div className="h-1 bg-background/40">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default FamilyModeBar;
