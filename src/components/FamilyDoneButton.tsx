import { useState } from "react";
import { Check, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FamilyModeState } from "@/lib/familyMode";

interface Props {
  family: FamilyModeState;
  /** Label of what is being completed, e.g. "Surah Al-Mulk". */
  label: string;
  /** When false the button renders disabled (e.g. dhikr target not reached). */
  ready?: boolean;
  /** Hint shown when not ready. */
  notReadyHint?: string;
}

/**
 * Floating gold "Mark as Family Done" action + member selector sheet +
 * confetti + auto-return to the Family Cycle. Shared by every bridged screen.
 */
const FamilyDoneButton = ({ family, label, ready = true, notReadyHint }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  if (!family.active) return null;

  const memberIds = family.members.map((m) => m.id);
  const chosen = selected ?? memberIds;

  const toggle = (id: string) =>
    setSelected(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

  const confirm = async () => {
    setSaving(true);
    const ok = await family.complete(chosen);
    setSaving(false);
    if (!ok) {
      toast.error(isAr ? "تعذّر التسجيل" : "Could not save completion");
      return;
    }
    setOpen(false);
    setCelebrate(true);
    const names = family.members.filter((m) => chosen.includes(m.id)).map((m) => m.name);
    toast.success(
      isAr
        ? `✅ ${label} — تم للعائلة${names.length ? ` (${names.join("، ")})` : ""}`
        : `✅ ${label} marked complete${names.length ? ` for ${names.join(", ")}` : ""}!`,
    );
    if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
    setTimeout(() => family.exit(), 2000);
  };

  return (
    <>
      {celebrate && (
        <div className="fixed inset-0 z-[120] pointer-events-none overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 97) % 100}%`,
                animationDelay: `${(i % 7) * 90}ms`,
                background: ["#D4AF37", "#0D7377", "#E8C25A", "#059669", "#F5F1E8"][i % 5],
              }}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => (ready ? setOpen(true) : toast.info(notReadyHint || ""))}
        aria-label={isAr ? "علّم كمكتمل للعائلة" : "Mark as Family Done"}
        className={`fixed right-4 bottom-28 md:bottom-8 z-[90] h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-transform active:scale-95 ${
          ready
            ? "bg-gradient-to-br from-accent to-primary text-accent-foreground hover:scale-105 animate-pulse-slow"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Check className="w-7 h-7" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className={isAr ? "font-arabic" : ""}>
              {isAr ? "من أكمل هذا النشاط؟" : "Who completed this activity?"}
            </SheetTitle>
          </SheetHeader>

          <p className="text-xs text-muted-foreground mb-4">{label}</p>

          {family.members.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Users className="w-4 h-4" />
              {isAr ? "لا يوجد أعضاء — سيُسجّل للعائلة" : "No members yet — logging for the family"}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
              {family.members.map((m) => {
                const on = chosen.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className="shrink-0 flex flex-col items-center gap-1.5 w-[72px]"
                  >
                    <span
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                        on ? "scale-100" : "opacity-40 scale-95"
                      }`}
                      style={{ borderColor: m.color, backgroundColor: `${m.color}22` }}
                    >
                      {m.avatar_emoji}
                    </span>
                    <span className="text-[11px] truncate w-full text-center">{m.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pb-2">
            <Button
              onClick={confirm}
              disabled={saving}
              className="flex-1 h-14 rounded-2xl text-base font-semibold bg-gradient-to-r from-accent to-primary"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (isAr ? "تأكيد" : "Confirm")}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="h-14 rounded-2xl">
              {isAr ? "متابعة القراءة" : "Stay"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FamilyDoneButton;