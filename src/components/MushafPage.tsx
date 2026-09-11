import { type ReactNode } from "react";
import {
  FONT_FAMILY_CSS,
  fontSizeToPx,
  LINE_SPACING_CSS,
  WORD_SPACING_CSS,
  type QuranPrefs,
} from "@/lib/quranPrefs";

export interface MushafAyah {
  number: number;
  numberInSurah: number;
  text: string;
}

interface Props {
  ayahs: MushafAyah[];
  prefs: QuranPrefs;
  activeAyah: number | null;
  /** Tajweed-aware renderer supplied by the reader. */
  renderText: (text: string) => ReactNode;
  onAyahTap: (ayah: MushafAyah) => void;
  showBismillah: boolean;
  surahNameAr: string;
  surahNameEn: string;
  meta: string;
}

const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

/**
 * Madinah-Mushaf style page: ornate surah banner, calligraphic Bismillah and
 * one continuous justified RTL text block where ayahs are separated by
 * decorative medallions instead of cards.
 */
const MushafPage = ({
  ayahs,
  prefs,
  activeAyah,
  renderText,
  onAyahTap,
  showBismillah,
  surahNameAr,
  surahNameEn,
  meta,
}: Props) => {
  return (
    <div className="px-3 sm:px-5 pb-10 pt-4">
      <div className="quran-page overflow-hidden">
        {/* Ornate surah banner */}
        <div className="surah-banner px-4 py-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="mushaf-divider flex-1 max-w-[70px]" />
            <h2
              className="font-arabic text-2xl sm:text-3xl leading-tight"
              style={{ color: "var(--mushaf-accent)" }}
            >
              سورة {surahNameAr}
            </h2>
            <span className="mushaf-divider flex-1 max-w-[70px]" />
          </div>
          <p className="text-[11px] tracking-wide mt-1" style={{ color: "var(--mushaf-muted)" }}>
            {surahNameEn} • {meta}
          </p>
        </div>

        {showBismillah && (
          <p
            className="font-arabic text-center py-5 px-4 leading-[1.9]"
            style={{
              color: "var(--mushaf-accent)",
              fontFamily: FONT_FAMILY_CSS[prefs.font_family],
              fontSize: `${fontSizeToPx(prefs.font_size_level) * 1.05}px`,
            }}
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
          </p>
        )}

        <div className="mushaf-divider mx-6" />

        {/* Continuous justified flow */}
        <div
          className="mushaf-flow quran-arabic font-arabic px-4 sm:px-6 py-6"
          style={{
            fontFamily: FONT_FAMILY_CSS[prefs.font_family],
            fontSize: `${fontSizeToPx(prefs.font_size_level)}px`,
            lineHeight: LINE_SPACING_CSS[prefs.line_spacing],
            wordSpacing: WORD_SPACING_CSS[prefs.word_spacing],
          }}
        >
          {ayahs.map((ayah) => (
            <span
              key={ayah.number}
              role="button"
              tabIndex={0}
              onClick={() => onAyahTap(ayah)}
              onKeyDown={(e) => e.key === "Enter" && onAyahTap(ayah)}
              className={`mushaf-ayah ${activeAyah === ayah.number ? "is-active" : ""}`}
            >
              {renderText(ayah.text)}
              <span className="ayah-medallion">{toArabicDigits(ayah.numberInSurah)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MushafPage;

export { toArabicDigits };