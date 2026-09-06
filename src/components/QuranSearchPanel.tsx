import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, X, Sparkles, BookOpen, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { addBookmark } from "@/lib/bookmarks";
import {
  SEARCH_LANGUAGES,
  searchQuran,
  fetchAyahArabic,
  type QuranSearchHit,
} from "@/lib/quranSearch";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Sends the chosen ayah into the assistant as a question. */
  onAsk: (prompt: string) => void;
}

/**
 * Realtime Quran search that lives inside the assistant: type in any of ten
 * languages and matching ayat stream in as you type, ready to be opened in the
 * Mushaf, saved, or handed to the AI for explanation.
 */
const QuranSearchPanel = ({ open, onClose, onAsk }: Props) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAr = language === "ar";

  const [q, setQ] = useState("");
  const [langCode, setLangCode] = useState(isAr ? "ar" : "en");
  const [hits, setHits] = useState<QuranSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  const lang = useMemo(
    () => SEARCH_LANGUAGES.find((l) => l.code === langCode) ?? SEARCH_LANGUAGES[0],
    [langCode],
  );

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Debounced live search — every keystroke refreshes results.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      setError(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    const timer = setTimeout(async () => {
      try {
        const found = await searchQuran(term, lang.edition);
        if (id !== reqId.current) return;
        setHits(found);
        // Enrich the first few hits with the original Arabic.
        const enriched = await Promise.all(
          found.slice(0, 8).map(async (h) => ({
            ...h,
            arabic: lang.code === "ar" ? h.text : await fetchAyahArabic(h.surahNumber, h.ayahNumber),
          })),
        );
        if (id !== reqId.current) return;
        setHits((prev) => enriched.concat(prev.slice(enriched.length)));
      } catch {
        if (id === reqId.current) {
          setHits([]);
          setError(true);
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q, lang, open]);

  if (!open) return null;

  const openInReader = (h: QuranSearchHit) => {
    navigate(`/?view=quran&surah=${h.surahNumber}&ayah=${h.ayahNumber}`);
  };

  const save = async (h: QuranSearchHit) => {
    await addBookmark(user?.id, "ayahs", {
      arabic: h.arabic,
      translation: h.text,
      reference: `${h.surahNameEn} ${h.surahNumber}:${h.ayahNumber}`,
      surahId: h.surahNumber,
      ayahNumber: h.ayahNumber,
    });
    toast.success(isAr ? "أُضيفت إلى المفضلة" : "Saved to Favorites");
  };

  const ask = (h: QuranSearchHit) => {
    onAsk(
      isAr
        ? `اشرح لي هذه الآية بالتفسير والسياق: ${h.surahNameAr} ${h.surahNumber}:${h.ayahNumber} — "${h.text}"`
        : `Explain this ayah with tafsir and context: ${h.surahNameEn} ${h.surahNumber}:${h.ayahNumber} — "${h.text}"`,
    );
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background/98 backdrop-blur-sm">
      <div className="px-4 pt-3 pb-2 border-b border-border bg-card/80">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              dir={lang.rtl ? "rtl" : "ltr"}
              placeholder={
                isAr ? "ابحث في القرآن بأي لغة…" : "Search the Quran in any language…"
              }
              className={`w-full h-11 rounded-xl bg-background border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                lang.rtl ? "font-arabic text-right" : ""
              }`}
            />
          </div>
          <button
            onClick={onClose}
            aria-label={isAr ? "إغلاق" : "Close"}
            className="h-11 w-11 rounded-xl border border-border flex items-center justify-center hover:bg-accent/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 -mx-1 px-1 scrollbar-thin">
          {SEARCH_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLangCode(l.code)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                l.code === langCode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isAr ? "جارٍ البحث…" : "Searching…"}
          </div>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-muted-foreground py-6">
            {isAr ? "تعذّر البحث، حاول مرة أخرى" : "Search unavailable — please try again."}
          </p>
        )}

        {!loading && !error && q.trim().length >= 2 && hits.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            {isAr ? "لا نتائج" : "No matching ayat"}
          </p>
        )}

        {q.trim().length < 2 && (
          <p className="text-center text-xs text-muted-foreground py-6">
            {isAr
              ? "اكتب كلمة مثل «الصبر» أو «mercy» للبحث الفوري"
              : "Type a word like “mercy”, “patience” or “rahma” for instant results"}
          </p>
        )}

        {hits.map((h) => (
          <div key={h.key} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {h.surahNumber}:{h.ayahNumber}
              </span>
              <span className={isAr ? "font-arabic" : ""}>
                {isAr ? h.surahNameAr : h.surahNameEn}
              </span>
            </div>
            {h.arabic && (
              <p className="font-arabic text-right text-lg leading-loose text-foreground" dir="rtl">
                {h.arabic}
              </p>
            )}
            {(!h.arabic || h.text !== h.arabic) && (
              <p
                dir={lang.rtl ? "rtl" : "ltr"}
                className={`text-sm text-muted-foreground leading-relaxed ${lang.rtl ? "font-arabic text-right" : ""}`}
              >
                {h.text}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => ask(h)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-accent to-primary text-accent-foreground"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAr ? "اسأل الذكاء" : "Ask AI"}
              </button>
              <button
                onClick={() => openInReader(h)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent/10"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {isAr ? "افتح في المصحف" : "Open in Mushaf"}
              </button>
              <button
                onClick={() => save(h)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent/10"
              >
                <Bookmark className="w-3.5 h-3.5" />
                {isAr ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuranSearchPanel;
