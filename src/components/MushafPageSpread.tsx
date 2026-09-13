import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  fetchMushafPage,
  prefetchAround,
  toArabicDigits,
  TOTAL_MUSHAF_PAGES,
  type MushafPageData,
  type PageAyah,
} from "@/lib/mushafPages";
import {
  FONT_FAMILY_CSS,
  fontSizeToPx,
  LINE_SPACING_CSS,
  WORD_SPACING_CSS,
  type QuranPrefs,
} from "@/lib/quranPrefs";

export interface PageMeta {
  page: number;
  juz: number;
  surahNameAr: string;
  surahNameEn: string;
}

interface Props {
  page: number;
  onPageChange: (page: number) => void;
  prefs: QuranPrefs;
  isAr: boolean;
  activeAyah: number | null;
  renderText: (text: string) => ReactNode;
  onAyahTap: (ayah: PageAyah) => void;
  /** Reports the loaded page's juz/surah so the parent can render chips. */
  onPageMeta?: (meta: PageMeta) => void;
}

/**
 * One page of the printed Madinah Mushaf: ruled paper frame, running
 * juz/surah header, inline surah banners with the Basmalah, a single
 * justified RTL text block and the page number in a footer rosette.
 * Swipe (or the arrows) turns the page exactly like the physical book.
 */
const MushafPageSpread = ({
  page,
  onPageChange,
  prefs,
  isAr,
  activeAyah,
  renderText,
  onAyahTap,
  onPageMeta,
}: Props) => {
  const [data, setData] = useState<MushafPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [turn, setTurn] = useState<"next" | "prev" | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchMushafPage(page)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        prefetchAround(page);
        onPageMeta?.({
          page: d.page,
          juz: d.juz,
          surahNameAr: d.ayahs[0]?.surahNameAr ?? "",
          surahNameEn: d.ayahs[0]?.surahNameEn ?? "",
        });
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, onPageMeta]);

  const go = (delta: number) => {
    const next = page + delta;
    if (next < 1 || next > TOTAL_MUSHAF_PAGES) return;
    setTurn(delta > 0 ? "next" : "prev");
    window.setTimeout(() => setTurn(null), 320);
    onPageChange(next);
  };

  const surahHeader = data?.ayahs[0];

  return (
    <div
      className="px-2 sm:px-5 pb-28 pt-3"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) < 55) return;
        // RTL book: swiping right (towards the spine) moves forward.
        go(dx > 0 ? 1 : -1);
      }}
    >
      <div
        className={`quran-page overflow-hidden ${
          turn === "next" ? "animate-page-turn-next" : turn === "prev" ? "animate-page-turn-prev" : ""
        }`}
      >
        {/* Running header: juz • surah */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-2 text-[11px] tracking-wide"
          style={{ color: "var(--mushaf-muted)", borderBottom: "1px solid color-mix(in srgb, var(--mushaf-accent) 25%, transparent)" }}
        >
          <span>{isAr ? `الجزء ${toArabicDigits(data?.juz ?? 1)}` : `Juz ${data?.juz ?? 1}`}</span>
          <span className="font-arabic text-sm" style={{ color: "var(--mushaf-accent)" }}>
            {surahHeader ? `سورة ${surahHeader.surahNameAr}` : ""}
          </span>
        </div>

        {loading && !data && (
          <div className="flex flex-col items-center gap-3 py-24">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--mushaf-accent)" }} />
            <p className="text-xs" style={{ color: "var(--mushaf-muted)" }}>
              {isAr ? "جاري فتح الصفحة…" : "Opening page…"}
            </p>
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-sm" style={{ color: "var(--mushaf-muted)" }}>
            {isAr ? "تعذّر تحميل الصفحة. تحقّق من الاتصال." : "Could not load this page. Check your connection."}
          </div>
        )}

        {data && (
          <div
            className="mushaf-flow quran-arabic font-arabic px-3 sm:px-6 py-5"
            style={{
              fontFamily: FONT_FAMILY_CSS[prefs.font_family],
              fontSize: `${fontSizeToPx(prefs.font_size_level)}px`,
              lineHeight: LINE_SPACING_CSS[prefs.line_spacing],
              wordSpacing: WORD_SPACING_CSS[prefs.word_spacing],
            }}
          >
            {data.ayahs.map((ayah) => (
              <span key={ayah.number}>
                {ayah.startsSurah && (
                  <span className="block my-3" style={{ fontSize: "1rem" }}>
                    <span className="surah-banner block rounded-lg px-3 py-2 text-center">
                      <span
                        className="font-arabic block text-xl sm:text-2xl leading-tight"
                        style={{ color: "var(--mushaf-accent)" }}
                      >
                        سورة {ayah.surahNameAr}
                      </span>
                      <span className="block text-[10px] tracking-wide" style={{ color: "var(--mushaf-muted)" }}>
                        {ayah.surahNameEn} • {ayah.surahAyahCount} {isAr ? "آية" : "ayat"} •{" "}
                        {ayah.revelationType}
                      </span>
                    </span>
                    {ayah.surahNumber !== 1 && ayah.surahNumber !== 9 && (
                      <span
                        className="font-arabic block text-center py-2"
                        style={{
                          color: "var(--mushaf-accent)",
                          fontSize: `${fontSizeToPx(prefs.font_size_level) * 0.95}px`,
                        }}
                      >
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </span>
                    )}
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => onAyahTap(ayah)}
                  onKeyDown={(e) => e.key === "Enter" && onAyahTap(ayah)}
                  className={`mushaf-ayah ${activeAyah === ayah.number ? "is-active" : ""}`}
                >
                  {renderText(ayah.text)}
                  <span className="ayah-medallion">{toArabicDigits(ayah.numberInSurah)}</span>
                  {ayah.sajda && (
                    <span className="text-[0.5em] align-super" style={{ color: "var(--mushaf-accent)" }}>
                      ۩
                    </span>
                  )}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Footer rosette with the printed page number */}
        <div
          className="flex items-center justify-center gap-3 px-6 py-3"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--mushaf-accent) 25%, transparent)" }}
        >
          <span className="mushaf-divider flex-1" />
          <span className="page-rosette">{toArabicDigits(page)}</span>
          <span className="mushaf-divider flex-1" />
        </div>
      </div>

      {/* Page turners */}
      <div className="flex items-center justify-between gap-3 mt-4">
        <button
          onClick={() => go(-1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full text-xs font-semibold bg-card/80 border border-border disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> {isAr ? "السابقة" : "Previous"}
        </button>
        <div className="text-[11px]" style={{ color: "var(--mushaf-muted)" }}>
          {isAr ? `صفحة ${page} من ${TOTAL_MUSHAF_PAGES}` : `Page ${page} of ${TOTAL_MUSHAF_PAGES}`}
        </div>
        <button
          onClick={() => go(1)}
          disabled={page >= TOTAL_MUSHAF_PAGES}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full text-xs font-semibold bg-card/80 border border-border disabled:opacity-40"
        >
          {isAr ? "التالية" : "Next"} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MushafPageSpread;
