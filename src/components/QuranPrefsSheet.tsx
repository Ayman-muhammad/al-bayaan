import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useQuranPrefs,
  FONT_LABELS,
  THEME_LABELS,
  fontSizeToPx,
  type MushafFont,
  type PageTheme,
} from "@/lib/quranPrefs";
import { Type, Palette, AlignJustify } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const QuranPrefsSheet = ({ open, onOpenChange }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { prefs, update } = useQuranPrefs();

  const fonts: MushafFont[] = ["uthmani", "amiri", "scheherazade", "noto-naskh", "reem-kufi"];
  const themes: PageTheme[] = ["default", "parchment", "night", "sepia", "emerald"];
  const lineOpts: Array<{ id: any; en: string; ar: string }> = [
    { id: "compact", en: "Compact", ar: "متضام" },
    { id: "normal", en: "Normal", ar: "عادي" },
    { id: "relaxed", en: "Relaxed", ar: "مريح" },
    { id: "loose", en: "Loose", ar: "متسع" },
  ];
  const wordOpts: Array<{ id: any; en: string; ar: string }> = [
    { id: "tight", en: "Tight", ar: "ضيق" },
    { id: "normal", en: "Normal", ar: "عادي" },
    { id: "wide", en: "Wide", ar: "متسع" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={isAr ? "font-arabic" : ""}>
            {isAr ? "إعدادات القراءة" : "Reading Preferences"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
              <Type className="w-3.5 h-3.5" />
              {isAr ? "الخط" : "Font"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fonts.map((f) => (
                <button
                  key={f}
                  onClick={() => update({ font_family: f })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    prefs.font_family === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {FONT_LABELS[f][isAr ? "ar" : "en"]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
              <span className="flex items-center gap-2">
                <AlignJustify className="w-3.5 h-3.5" />
                {isAr ? "حجم الخط" : "Font size"}
              </span>
              <span className="text-primary">
                {prefs.font_size_level} ({Math.round(fontSizeToPx(prefs.font_size_level))}px)
                {prefs.font_size_level >= 5 && (
                  <span className="ml-2 text-accent">{isAr ? "نص كبير" : "Big Text"}</span>
                )}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={prefs.font_size_level}
              onChange={(e) => update({ font_size_level: parseInt(e.target.value, 10) })}
              className="w-full accent-primary"
            />
          </section>

          <section>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {isAr ? "تباعد الأسطر" : "Line spacing"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lineOpts.map((o) => (
                <button
                  key={o.id}
                  onClick={() => update({ line_spacing: o.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    prefs.line_spacing === o.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {isAr ? o.ar : o.en}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              {isAr ? "تباعد الكلمات" : "Word spacing"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {wordOpts.map((o) => (
                <button
                  key={o.id}
                  onClick={() => update({ word_spacing: o.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    prefs.word_spacing === o.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {isAr ? o.ar : o.en}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
              <Palette className="w-3.5 h-3.5" />
              {isAr ? "مظهر الصفحة" : "Page theme"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => update({ page_theme: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mushaf-theme-${t} ${
                    prefs.page_theme === t ? "ring-2 ring-primary" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  {THEME_LABELS[t][isAr ? "ar" : "en"]}
                </button>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuranPrefsSheet;
