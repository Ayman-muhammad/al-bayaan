import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MushafFont =
  | "uthmani"
  | "amiri"
  | "scheherazade"
  | "indopak"
  | "qalam";

export type PageTheme = "madinah" | "sepia" | "dark" | "night" | "forest";

/** Older stored values are normalised so existing rows keep working. */
const LEGACY_THEMES: Record<string, PageTheme> = {
  default: "madinah",
  parchment: "sepia",
  emerald: "forest",
  night: "night",
  sepia: "sepia",
};
const LEGACY_FONTS: Record<string, MushafFont> = {
  "noto-naskh": "indopak",
  "reem-kufi": "qalam",
};

const normalize = (p: Partial<QuranPrefs>): Partial<QuranPrefs> => ({
  ...p,
  page_theme: (LEGACY_THEMES[p.page_theme as string] ?? p.page_theme) as PageTheme,
  font_family: (LEGACY_FONTS[p.font_family as string] ?? p.font_family) as MushafFont,
});

export interface QuranPrefs {
  font_family: MushafFont;
  font_size_level: number;
  line_spacing: "compact" | "normal" | "relaxed" | "loose";
  word_spacing: "tight" | "normal" | "wide";
  page_theme: PageTheme;
  show_translation: boolean;
  show_tafsir: boolean;
  reciter_name: string;
}

const DEFAULTS: QuranPrefs = {
  font_family: "uthmani",
  font_size_level: 5,
  line_spacing: "relaxed",
  word_spacing: "normal",
  page_theme: "madinah",
  show_translation: true,
  show_tafsir: false,
  reciter_name: "Alafasy_128kbps",
};

const LS_KEY = "al-bayan-quran-prefs";

function readLocal(): QuranPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...normalize(JSON.parse(raw)) };
  } catch { return DEFAULTS; }
}
function writeLocal(p: QuranPrefs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}

export function useQuranPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<QuranPrefs>(() => readLocal());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_quran_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const merged: QuranPrefs = { ...DEFAULTS, ...normalize(data as any) };
        setPrefs(merged);
        writeLocal(merged);
      }
    })();
  }, [user]);

  const update = useCallback(
    async (patch: Partial<QuranPrefs>) => {
      const next = { ...prefs, ...patch };
      setPrefs(next);
      writeLocal(next);
      if (user) {
        await supabase
          .from("user_quran_prefs")
          .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      }
    },
    [prefs, user]
  );

  return { prefs, update };
}

export const FONT_FAMILY_CSS: Record<MushafFont, string> = {
  uthmani: "'Amiri Quran', 'Scheherazade New', 'Amiri', serif",
  amiri: "'Amiri', 'Amiri Quran', serif",
  scheherazade: "'Scheherazade New', 'Amiri', serif",
  indopak: "'Noto Naskh Arabic', 'Scheherazade New', serif",
  qalam: "'Amiri Quran', 'Amiri', serif",
};

export const FONT_LABELS: Record<MushafFont, { en: string; ar: string }> = {
  uthmani: { en: "Uthmani", ar: "عثماني" },
  amiri: { en: "Amiri", ar: "أميري" },
  scheherazade: { en: "Scheherazade", ar: "شهرزاد" },
  indopak: { en: "Indo-Pak", ar: "هندي باكستاني" },
  qalam: { en: "Qalam", ar: "قلم" },
};

export const THEME_LABELS: Record<PageTheme, { en: string; ar: string }> = {
  madinah: { en: "Madinah Cream", ar: "كريمي المدينة" },
  sepia: { en: "Sepia", ar: "بني" },
  dark: { en: "Dark", ar: "داكن" },
  night: { en: "Night Blue", ar: "أزرق ليلي" },
  forest: { en: "Forest", ar: "أخضر غابي" },
};

export function fontSizeToPx(level: number): number {
  const l = Math.max(1, Math.min(10, level));
  return 16 + l * 2; // 18px → 36px
}

export const LINE_SPACING_CSS: Record<QuranPrefs["line_spacing"], string> = {
  compact: "1.9",
  normal: "2.2",
  relaxed: "2.5",
  loose: "2.9",
};

export const WORD_SPACING_CSS: Record<QuranPrefs["word_spacing"], string> = {
  tight: "0em",
  normal: "0.05em",
  wide: "0.15em",
};
