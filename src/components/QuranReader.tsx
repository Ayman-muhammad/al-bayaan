import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, BookOpen, ChevronRight, Loader2, Eye, EyeOff, BookMarked, Download, Volume2, Pause, Lightbulb, Languages, Heart, Repeat, Gauge, Mic2, SlidersHorizontal, Rows3, ScrollText, X, Play, BookOpenText } from "lucide-react";
import { Settings2 } from "lucide-react";
import { SURAHS } from "@/data/quranData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { addBookmark, removeBookmark, listBookmarks, isAyahBookmarked, type Bookmark as BM } from "@/lib/bookmarks";
import { useToast } from "@/hooks/use-toast";
import { useQuranPrefs, FONT_FAMILY_CSS, fontSizeToPx, LINE_SPACING_CSS, WORD_SPACING_CSS } from "@/lib/quranPrefs";
import QuranPrefsSheet from "@/components/QuranPrefsSheet";
import MushafPage from "@/components/MushafPage";
import MushafPageSpread from "@/components/MushafPageSpread";
import { pageForAyah, TOTAL_MUSHAF_PAGES } from "@/lib/mushafPages";
import FamilyDoneButton from "@/components/FamilyDoneButton";
import { useFamilyMode } from "@/lib/familyMode";

interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  translation?: string;
  tafsirIbnKathir?: string;
  tafsirJalalayn?: string;
  surahName?: string;
  surahNumber?: number;
}

interface QuranReaderProps {
  onBack: () => void;
}

type Screen = "list" | "read" | "search";
type TafsirMode = "none" | "ibn-kathir" | "jalalayn";
type DisplayMode = "full" | "arabic-only";
type TranslationMode = "full" | "word";
type SearchTab = "surah" | "arabic" | "keyword";

const QuranReader = ({ onBack }: QuranReaderProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const player = useAudioPlayer();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<BM[]>([]);
  const { prefs } = useQuranPrefs();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const family = useFamilyMode();
  const [params] = useSearchParams();
  const [mushafMode, setMushafMode] = useState<boolean>(
    () => localStorage.getItem("al-bayan-mushaf-mode") !== "off",
  );
  /** Physical printed-Mushaf paging (604 pages) — the real book layout. */
  const [pageMode, setPageMode] = useState<boolean>(
    () => localStorage.getItem("al-bayan-page-mode") === "on",
  );
  const [mushafPageNum, setMushafPageNum] = useState<number>(
    () => Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, Number(localStorage.getItem("al-bayan-page-num")) || 1)),
  );
  const [controlsOpen, setControlsOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>("keyword");
  const deepLinkDone = useRef(false);

  useEffect(() => {
    localStorage.setItem("al-bayan-mushaf-mode", mushafMode ? "on" : "off");
  }, [mushafMode]);

  useEffect(() => {
    localStorage.setItem("al-bayan-page-mode", pageMode ? "on" : "off");
  }, [pageMode]);

  useEffect(() => {
    localStorage.setItem("al-bayan-page-num", String(mushafPageNum));
  }, [mushafPageNum]);

  useEffect(() => {
    listBookmarks(user?.id).then(setBookmarks);
  }, [user]);

  const toggleAyahFavorite = async (ayah: Ayah, surahName: string) => {
    if (!selectedSurahId) return;
    const existing = isAyahBookmarked(bookmarks, selectedSurahId, ayah.numberInSurah);
    if (existing) {
      await removeBookmark(user?.id, existing.id);
      setBookmarks((b) => b.filter((x) => x.id !== existing.id));
      toast({ title: isAr ? "تمت الإزالة" : "Removed from favorites", duration: 1500 });
    } else {
      const created = await addBookmark(user?.id, "ayahs", {
        arabic: ayah.text,
        translation: ayah.translation,
        reference: `${surahName} ${selectedSurahId}:${ayah.numberInSurah}`,
        surahId: selectedSurahId,
        ayahNumber: ayah.numberInSurah,
      });
      setBookmarks((b) => [created, ...b]);
      toast({ title: isAr ? "تمت الإضافة للمفضلة" : "Added to favorites", duration: 1500 });
    }
  };

  const [screen, setScreen] = useState<Screen>("list");
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahFilter, setSurahFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Ayah[]>([]);
  const [searching, setSearching] = useState(false);
  const [tafsirMode, setTafsirMode] = useState<TafsirMode>("none");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");
  const [loadingTafsir, setLoadingTafsir] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [activeMeta, setActiveMeta] = useState<{ surah: number; ayah: number } | null>(null);
  const [translationMode, setTranslationMode] = useState<TranslationMode>("full");
  // Per-surah reciter + playback controls
  const RECITERS = [
    { id: "Alafasy_128kbps", name: "Mishary Alafasy" },
    { id: "Husary_128kbps", name: "Mahmoud Al-Husary" },
    { id: "Abdul_Basit_Murattal_192kbps", name: "Abdul Basit" },
    { id: "Minshawy_Murattal_128kbps", name: "Al-Minshawi" },
    { id: "Saood_ash-Shuraym_128kbps", name: "Saud Ash-Shuraim" },
    { id: "Sudais_128kbps", name: "Abdur-Rahman As-Sudais" },
  ];
  const [reciterId, setReciterId] = useState<string>(() => localStorage.getItem("al-bayan-reciter") || "Alafasy_128kbps");
  useEffect(() => { localStorage.setItem("al-bayan-reciter", reciterId); }, [reciterId]);
  const [tadabburOpen, setTadabburOpen] = useState<Record<number, boolean>>({});
  const [wordsByAyah, setWordsByAyah] = useState<Record<number, { ar: string; en: string }[]>>({});
  const [loadingWords, setLoadingWords] = useState(false);

  const fetchWordByWord = useCallback(async (id: number) => {
    setLoadingWords(true);
    try {
      const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${id}?words=true&word_translation_language=en&per_page=300&fields=text_uthmani`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, { ar: string; en: string }[]> = {};
        (data.verses || []).forEach((v: any) => {
          map[v.verse_number] = (v.words || [])
            .filter((w: any) => w.char_type_name === "word")
            .map((w: any) => ({ ar: w.text_uthmani || w.text || "", en: w.translation?.text || "" }));
        });
        setWordsByAyah(map);
      }
    } catch (e) {
      console.error("Word-by-word fetch failed:", e);
    } finally {
      setLoadingWords(false);
    }
  }, []);

  const handleTranslationModeChange = (mode: TranslationMode) => {
    setTranslationMode(mode);
    if (mode === "word" && selectedSurahId && Object.keys(wordsByAyah).length === 0) {
      fetchWordByWord(selectedSurahId);
    }
  };

  // Generate simple, universal tadabbur reflection prompts
  const tadabburQuestions = (ayahNumberInSurah: number, translation: string): string[] => {
    const en = (translation || "").toLowerCase();
    const out: string[] = [];
    out.push("What is Allah teaching you in this verse?");
    if (/\b(forgive|mercy|merciful|rahm)/.test(en)) out.push("How does Allah's mercy show up in your life right now?");
    if (/\b(believe|faith|imaan|trust)/.test(en)) out.push("Where can your faith and trust in Allah grow stronger?");
    if (/\b(patient|patience|sabr|hardship|trial)/.test(en)) out.push("Which trial are you currently being asked to be patient with?");
    if (/\b(pray|prayer|salah|worship|remember)/.test(en)) out.push("How can you bring this verse into your next prayer?");
    if (/\b(thank|grateful|bounty|favor)/.test(en)) out.push("What blessing have you been overlooking that this verse points to?");
    if (/\b(fear|warning|punish|hellfire|wrath)/.test(en)) out.push("What habit is this verse calling you to leave behind?");
    out.push("Write one action you will take today because of ayah " + ayahNumberInSurah + ".");
    return out.slice(0, 4);
  };

  // Per-ayah audio via everyayah CDN; reciter is user-selectable.
  const buildAyahAudioUrl = (surahId: number, ayahNumberInSurah: number) => {
    const s = String(surahId).padStart(3, "0");
    const a = String(ayahNumberInSurah).padStart(3, "0");
    return `https://everyayah.com/data/${reciterId}/${s}${a}.mp3`;
  };

  const playAyah = (surahId: number, ayahNumberInSurah: number, globalNumber: number) => {
    const url = buildAyahAudioUrl(surahId, ayahNumberInSurah);
    setActiveAyah(globalNumber);
    setActiveMeta({ surah: surahId, ayah: ayahNumberInSurah });
    player.toggle(url);
  };

  // Word-level tajweed colorization. Splits on whitespace only so Arabic
  // letter shaping inside each word is preserved (no isolated forms).
  // Detects rules contextually via regex; applies a subtle colored
  // text-shadow + underline so the base glyph still renders normally.
  const renderTajweed = (text: string) => {
    // Diacritics
    const SUKUN = "\u0652";        // ْ
    const SHADDA = "\u0651";       // ّ
    const FATHA = "\u064E";
    const KASRA = "\u0650";
    const DAMMA = "\u064F";
    const FATHATAN = "\u064B";
    const KASRATAN = "\u064D";
    const DAMMATAN = "\u064C";
    const DAGGER_ALIF = "\u0670"; // ٰ
    const MADDA_ABOVE = "\u0653"; // ٓ

    // Letters
    const QALQALAH = "[\u0642\u0637\u0628\u062C\u062F]"; // ق ط ب ج د
    const NUN = "\u0646";
    const MEEM = "\u0645";
    const ALIF = "\u0627";
    const WAW = "\u0648";
    const YA = "\u064A";
    const ALEF_MADDA = "\u0622"; // آ

    // Detection regexes (test against the whole word)
    // Ghunna: shadda on ن or م
    const reGhunna = new RegExp(`[${NUN}${MEEM}]${SHADDA}`);
    // Qalqalah: any qalqalah letter carrying sukun (or end of word with sukun-like state)
    const reQalqalah = new RegExp(`${QALQALAH}${SUKUN}`);
    // Madd: alif madda, dagger alif, madda mark, or madd letters following matching short vowel
    const reMadd = new RegExp(
      `${ALEF_MADDA}|${DAGGER_ALIF}|${MADDA_ABOVE}|${FATHA}${ALIF}|${KASRA}${YA}|${DAMMA}${WAW}`
    );

    // Split keeping whitespace tokens so we don't lose spacing.
    const tokens = text.split(/(\s+)/);
    return tokens.map((tok, i) => {
      if (!tok || /^\s+$/.test(tok)) return <span key={i}>{tok}</span>;

      const classes: string[] = [];
      // Priority: madd > ghunna > qalqalah (visually, madd dominates if all present)
      const hasMadd = reMadd.test(tok);
      const hasGhunna = reGhunna.test(tok);
      const hasQalqalah = reQalqalah.test(tok);

      if (hasMadd) classes.push("tajweed-madd");
      if (hasGhunna) classes.push("tajweed-ghunna");
      if (hasQalqalah) classes.push("tajweed-qalqalah");

      if (classes.length === 0) return <span key={i}>{tok}</span>;
      return (
        <span key={i} className={classes.join(" ")}>
          {tok}
        </span>
      );
    });
  };

  const selectedSurah = SURAHS.find((s) => s.id === selectedSurahId);

  const filteredSurahs = !surahFilter.trim()
    ? SURAHS
    : SURAHS.filter(
        (s) =>
          s.name.en.toLowerCase().includes(surahFilter.toLowerCase()) ||
          s.name.ar.includes(surahFilter) ||
          String(s.id).includes(surahFilter)
      );

  const fetchTafsir = useCallback(async (surahId: number, mode: TafsirMode) => {
    if (mode === "none") return;
    setLoadingTafsir(true);
    try {
      // Ibn Kathir: en.ibn-kathir, Jalalayn: ar.jalalayn
      const edition = mode === "ibn-kathir" ? "en.ibn-kathir" : "ar.jalalayn";
      const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/${edition}/${surahId}.json`);
      if (res.ok) {
        const data = await res.json();
        const tafsirTexts: Record<number, string> = {};
        if (data.chapter) {
          data.chapter.forEach((v: any) => {
            tafsirTexts[v.verse] = v.text;
          });
        }
        setAyahs(prev => prev.map(a => ({
          ...a,
          ...(mode === "ibn-kathir" ? { tafsirIbnKathir: tafsirTexts[a.numberInSurah] || "" } : { tafsirJalalayn: tafsirTexts[a.numberInSurah] || "" })
        })));
      }
    } catch (e) {
      console.error("Failed to fetch tafsir:", e);
    } finally {
      setLoadingTafsir(false);
    }
  }, []);

  const fetchSurah = useCallback(async (id: number) => {
    setLoading(true);
    setAyahs([]);
    try {
      const [arRes, enRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${id}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/surah/${id}/en.sahih`),
      ]);
      const arData = await arRes.json();
      const enData = await enRes.json();
      if (arData.code === 200 && enData.code === 200) {
        const newAyahs = arData.data.ayahs.map((a: any, i: number) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          translation: enData.data.ayahs[i]?.text || "",
        }));
        setAyahs(newAyahs);
      }
    } catch (e) {
      console.error("Failed to fetch surah:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (searchTab === "surah") return;
    setSearching(true);
    setSearchResults([]);
    try {
      const edition = searchTab === "arabic" ? "quran-uthmani" : "en.sahih";
      const res = await fetch(
        `https://api.alquran.cloud/v1/search/${encodeURIComponent(searchQuery)}/all/${edition}`
      );
      const data = await res.json();
      if (data.code === 200 && data.data?.matches) {
        setSearchResults(
          data.data.matches.map((m: any) => ({
            number: m.number,
            numberInSurah: m.numberInSurah,
            text: m.text,
            surahName: m.surah?.englishName || "",
            surahNumber: m.surah?.number || 0,
          }))
        );
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setSearching(false);
    }
  };

  const openSurah = (id: number) => {
    setSelectedSurahId(id);
    setScreen("read");
    setTafsirMode("none");
    setTranslationMode("full");
    setWordsByAyah({});
    setTadabburOpen({});
    fetchSurah(id);
    // Keep the printed-page view in sync with the surah the user picked.
    void pageForAyah(id, 1).then(setMushafPageNum).catch(() => {});
  };

  // Deep link: /?view=quran&surah=67&ayah=1 (used by Family Cycle bridging)
  useEffect(() => {
    if (deepLinkDone.current) return;
    const s = parseInt(params.get("surah") || "", 10);
    if (!s || s < 1 || s > 114) return;
    deepLinkDone.current = true;
    openSurah(s);
  }, [params]);

  // Highlight the requested ayah once the surah is loaded.
  useEffect(() => {
    const a = parseInt(params.get("ayah") || "", 10);
    if (!a || ayahs.length === 0) return;
    const target = ayahs.find((x) => x.numberInSurah === a);
    if (target) setActiveAyah(target.number);
  }, [ayahs, params]);

  const handleTafsirChange = (mode: TafsirMode) => {
    setTafsirMode(mode);
    if (mode !== "none" && selectedSurahId) {
      fetchTafsir(selectedSurahId, mode);
    }
  };

  const handleDownloadSurah = async () => {
    if (!selectedSurahId || !selectedSurah || ayahs.length === 0) return;
    setDownloading(true);
    try {
      let content = `${selectedSurah.name.ar} - ${selectedSurah.name.en}\n`;
      content += `${"=".repeat(50)}\n\n`;
      ayahs.forEach((ayah) => {
        content += `[${ayah.numberInSurah}] ${ayah.text}\n`;
        if (displayMode === "full" && ayah.translation) {
          content += `Translation: ${ayah.translation}\n`;
        }
        if (tafsirMode === "ibn-kathir" && ayah.tafsirIbnKathir) {
          content += `Tafsir Ibn Kathir: ${ayah.tafsirIbnKathir}\n`;
        }
        if (tafsirMode === "jalalayn" && ayah.tafsirJalalayn) {
          content += `Tafsir Al-Jalalayn: ${ayah.tafsirJalalayn}\n`;
        }
        content += "\n";
      });
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `surah-${selectedSurahId}-${selectedSurah.name.en.replace(/\s+/g, "-").toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const goBack = () => {
    if (screen === "read" || screen === "search") setScreen("list");
    else onBack();
  };

  const currentTafsirKey = tafsirMode === "ibn-kathir" ? "tafsirIbnKathir" : tafsirMode === "jalalayn" ? "tafsirJalalayn" : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground truncate ${isAr ? "font-arabic" : ""}`}>
          {screen === "list" && (isAr ? "القرآن الكريم" : "Quran Reader")}
          {screen === "read" && selectedSurah?.name[language]}
          {screen === "search" && (isAr ? "بحث في القرآن" : "Search Quran")}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          {screen === "read" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPageMode((v) => !v)}
                title={pageMode ? (isAr ? "عرض السورة" : "Surah view") : (isAr ? "صفحات المصحف" : "Mushaf pages")}
                className={pageMode ? "text-accent" : ""}
              >
                <BookOpenText className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMushafMode(!mushafMode)}
                disabled={pageMode}
                title={mushafMode ? (isAr ? "عرض الآيات" : "Verse view") : (isAr ? "عرض المصحف" : "Mushaf view")}
              >
                {mushafMode ? <Rows3 className="w-4 h-4" /> : <ScrollText className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setControlsOpen((v) => !v)}
                title={isAr ? "أدوات القراءة" : "Reading tools"}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setPrefsOpen(true)} title={isAr ? "إعدادات القراءة" : "Reading preferences"}>
                <Settings2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {screen === "list" && (
            <Button variant="ghost" size="icon" onClick={() => setScreen("search")}>
              <Search className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Family Cycle mode banner — never a dead end */}
      {family.active && (
        <div className="shrink-0 px-4 py-2 bg-gradient-to-r from-accent/20 to-primary/15 border-b border-accent/30 flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {isAr ? "وضع العائلة" : "Family Cycle"}
            {family.dayNumber ? ` • ${isAr ? "يوم" : "Day"} ${family.dayNumber}${family.durationDays ? `/${family.durationDays}` : ""}` : ""}
          </span>
          <button onClick={family.exit} className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <X className="w-3 h-3" /> {isAr ? "خروج" : "Exit"}
          </button>
        </div>
      )}

      {/* === SURAH LIST === */}
      {screen === "list" && (
        <>
          <div className="p-4 border-b border-border bg-card shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={surahFilter}
                onChange={(e) => setSurahFilter(e.target.value)}
                placeholder={isAr ? "ابحث عن سورة..." : "Search surahs..."}
                className={`w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${isAr ? "font-arabic text-right pr-10 pl-4" : ""}`}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredSurahs.map((surah) => (
              <button
                key={surah.id}
                onClick={() => openSurah(surah.id)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {surah.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm">{surah.name.en}</h3>
                    <h3 className="font-arabic text-foreground text-sm">{surah.name.ar}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {surah.verses} {isAr ? "آية" : "verses"} • {isAr ? (surah.type === "Meccan" ? "مكية" : "مدنية") : surah.type}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 ${isAr ? "rotate-180" : ""}`} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* === SEARCH === */}
      {screen === "search" && (
        <>
          <div className="p-4 border-b border-border bg-card shrink-0">
            <div className="flex gap-1.5 mb-3">
              {([
                { id: "surah", en: "Surah", ar: "سورة" },
                { id: "arabic", en: "Ayah (Arabic)", ar: "آية (عربي)" },
                { id: "keyword", en: "Keyword (EN)", ar: "كلمة (إنجليزي)" },
              ] as Array<{ id: SearchTab; en: string; ar: string }>).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSearchTab(t.id); setSearchResults([]); }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                    searchTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {isAr ? t.ar : t.en}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchTab === "surah"
                      ? (isAr ? "اسم السورة أو رقمها..." : "Surah name or number...")
                      : searchTab === "arabic"
                        ? (isAr ? "ابحث في نص الآية..." : "Search Arabic ayah text...")
                        : (isAr ? "ابحث بالكلمات (بالإنجليزية)..." : "Search by keyword (English)...")
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              {searchTab !== "surah" && (
                <Button type="submit" variant="hero" disabled={searching || !searchQuery.trim()}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "بحث" : "Search"}
                </Button>
              )}
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {searchTab === "surah" && (
              <div className="space-y-1.5">
                {SURAHS.filter((s) => {
                  const q = searchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return s.name.en.toLowerCase().includes(q) || s.name.ar.includes(searchQuery) || String(s.id).includes(q);
                }).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSurah(s.id)}
                    className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 hover:border-primary/40 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{s.id}</span>
                    <span className="text-sm font-medium text-foreground">{s.name.en}</span>
                    <span className="ml-auto font-arabic text-sm text-foreground">{s.name.ar}</span>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{isAr ? "جاري البحث..." : "Searching..."}</p>
              </div>
            )}
            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-center text-muted-foreground text-sm py-8">
                {isAr ? "لم يتم العثور على نتائج" : "No results found"}
              </p>
            )}
            {searchResults.map((r) => (
              <button
                key={r.number}
                onClick={() => r.surahNumber && openSurah(r.surahNumber)}
                className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-colors space-y-2"
              >
                <div className="flex items-center gap-2 text-xs text-accent font-medium">
                  <BookOpen className="w-3 h-3" />
                  {r.surahName} — {isAr ? "آية" : "Ayah"} {r.numberInSurah}
                </div>
                <p
                  className={`text-sm text-foreground leading-relaxed ${searchTab === "arabic" ? "font-arabic text-right text-lg leading-[2]" : ""}`}
                  dir={searchTab === "arabic" ? "rtl" : "ltr"}
                >
                  {r.text}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* === READ SURAH === */}
      {screen === "read" && selectedSurah && (
        <div className={`flex-1 overflow-y-auto scrollbar-thin mushaf-theme-${prefs.page_theme} mushaf-surface`}>
          {!mushafMode && (
            <div className="text-center py-4 space-y-1 border-b border-border/40">
              <h2 className="font-arabic text-2xl">{selectedSurah.name.ar}</h2>
              <p className="text-sm opacity-70">{selectedSurah.name.en}</p>
              <p className="text-xs" style={{ color: "var(--mushaf-accent)" }}>
                {selectedSurah.verses} {isAr ? "آية" : "verses"} • {isAr ? (selectedSurah.type === "Meccan" ? "مكية" : "مدنية") : selectedSurah.type}
              </p>
            </div>
          )}

          {/* Tafsir & display controls (collapsed by default for a clean page) */}
          {controlsOpen && (
          <>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 border-b border-border/40 bg-card/60">
            <BookMarked className="w-4 h-4 text-primary shrink-0" />
            <span className={`text-xs font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "التفسير:" : "Tafsir:"}
            </span>
            {(["none", "ibn-kathir", "jalalayn"] as TafsirMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleTafsirChange(mode)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                  tafsirMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {mode === "none" ? (isAr ? "بدون" : "None") : mode === "ibn-kathir" ? (isAr ? "ابن كثير" : "Ibn Kathir") : (isAr ? "الجلالين" : "Al-Jalalayn")}
              </button>
            ))}
            <button
              onClick={() => setDisplayMode(displayMode === "full" ? "arabic-only" : "full")}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground hover:bg-muted/80"
            >
              {displayMode === "full" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {displayMode === "full" ? (isAr ? "عربي فقط" : "Arabic only") : (isAr ? "إظهار الكل" : "Show all")}
            </button>
            <button
              onClick={handleDownloadSurah}
              disabled={downloading || ayahs.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {isAr ? "تحميل" : "Save"}
            </button>
          </div>

          {/* Translation mode toggle */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 border-b border-border/40 bg-card/40">
            <Languages className="w-4 h-4 text-accent shrink-0" />
            <span className={`text-xs font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "الترجمة:" : "Translation:"}
            </span>
            {(["full", "word"] as TranslationMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleTranslationModeChange(mode)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                  translationMode === mode
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {mode === "full" ? (isAr ? "كاملة" : "Full") : (isAr ? "كلمة بكلمة" : "Word-by-word")}
              </button>
            ))}
            {translationMode === "word" && loadingWords && (
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {isAr ? "جاري التحميل" : "Loading"}
              </span>
            )}
          </div>

          {/* Reciter + speed + repeat */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 border-b border-border/40 bg-card/60">
            <Mic2 className="w-4 h-4 text-primary shrink-0" />
            <select
              value={reciterId}
              onChange={(e) => setReciterId(e.target.value)}
              className="text-[11px] sm:text-xs bg-muted text-foreground rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="inline-flex items-center gap-1 ml-1">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => player.setPlaybackRate(rate)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                    player.playbackRate === rate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >{rate}×</button>
              ))}
            </div>
            <button
              onClick={() => player.setRepeat(!player.repeat)}
              className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
                player.repeat ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              title={isAr ? "تكرار" : "Repeat"}
            >
              <Repeat className="w-3.5 h-3.5" /> {isAr ? "تكرار" : "Repeat"}
            </button>
          </div>
          </>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
            </div>
          ) : mushafMode ? (
            <>
              <MushafPage
                ayahs={ayahs}
                prefs={prefs}
                activeAyah={activeAyah}
                renderText={renderTajweed}
                showBismillah={selectedSurahId !== 9 && selectedSurahId !== 1}
                surahNameAr={selectedSurah.name.ar}
                surahNameEn={selectedSurah.name.en}
                meta={`${selectedSurah.verses} ${isAr ? "آية" : "verses"} • ${isAr ? (selectedSurah.type === "Meccan" ? "مكية" : "مدنية") : selectedSurah.type}`}
                onAyahTap={(a) => {
                  if (selectedSurahId) playAyah(selectedSurahId, a.numberInSurah, a.number);
                }}
              />

              {/* Active-ayah detail panel: translation, tafsir, tadabbur, favorite */}
              {(() => {
                const ayah = ayahs.find((a) => a.number === activeAyah);
                if (!ayah) return null;
                const fav = selectedSurahId ? isAyahBookmarked(bookmarks, selectedSurahId, ayah.numberInSurah) : undefined;
                const showTadabbur = !!tadabburOpen[ayah.numberInSurah];
                return (
                  <div className="mx-3 sm:mx-5 mb-32 rounded-2xl border border-border/50 bg-card/90 backdrop-blur p-4 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-accent">
                        {selectedSurah.name.en} {selectedSurahId}:{ayah.numberInSurah}
                      </span>
                      <button
                        onClick={() => toggleAyahFavorite(ayah, selectedSurah.name.en)}
                        className={`ml-auto p-1.5 rounded-full ${fav ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground hover:text-rose-400"}`}
                        aria-label={fav ? "Unfavorite" : "Favorite"}
                      >
                        <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
                      </button>
                    </div>
                    {ayah.translation && (
                      <p className="text-sm text-foreground/85 leading-[1.75]">{ayah.translation}</p>
                    )}
                    {currentTafsirKey && ayah[currentTafsirKey] && (
                      <div className="border-t border-border/50 pt-3">
                        <p className="text-xs font-medium text-accent mb-1">
                          {tafsirMode === "ibn-kathir" ? (isAr ? "تفسير ابن كثير" : "Tafsir Ibn Kathir") : (isAr ? "تفسير الجلالين" : "Tafsir Al-Jalalayn")}
                        </p>
                        <p className={`text-sm leading-[1.8] text-foreground/80 ${tafsirMode === "jalalayn" ? "font-arabic text-right" : ""}`} dir={tafsirMode === "jalalayn" ? "rtl" : "ltr"}>
                          {ayah[currentTafsirKey]}
                        </p>
                      </div>
                    )}
                    <div className="border-t border-border/50 pt-3">
                      <button
                        onClick={() => setTadabburOpen((p) => ({ ...p, [ayah.numberInSurah]: !p[ayah.numberInSurah] }))}
                        className="inline-flex items-center gap-2 text-xs font-medium text-accent hover:text-primary"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        {isAr ? "تدبّر" : "Tadabbur"}
                        <ChevronRight className={`w-3 h-3 transition-transform ${showTadabbur ? "rotate-90" : ""}`} />
                      </button>
                      {showTadabbur && (
                        <ul className="mt-2 space-y-1.5 animate-fade-in">
                          {tadabburQuestions(ayah.numberInSurah, ayah.translation || "").map((q, i) => (
                            <li key={i} className="text-sm text-foreground/85 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent">
                              {q}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="p-4 space-y-4">
              {selectedSurahId !== 9 && selectedSurahId !== 1 && (
                <p className="text-center text-xl font-arabic text-primary leading-loose py-2">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </p>
              )}
              {loadingTafsir && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">{isAr ? "جاري تحميل التفسير..." : "Loading tafsir..."}</span>
                </div>
              )}
              {ayahs.map((ayah) => {
                const isActive = activeAyah === ayah.number;
                const isPlayingThis = isActive && player.isPlaying;
                const wbw = wordsByAyah[ayah.numberInSurah];
                const showTadabbur = !!tadabburOpen[ayah.numberInSurah];
                return (
                <div
                  key={ayah.number}
                  className={`quran-page rounded-xl p-4 sm:p-6 space-y-3 transition-all duration-300 ${
                    isActive
                      ? "ring-2 ring-accent/40 shadow-[0_8px_30px_-10px_hsl(var(--accent)/0.4)]"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <button
                      onClick={() => selectedSurahId && playAyah(selectedSurahId, ayah.numberInSurah, ayah.number)}
                      className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                      aria-label={isPlayingThis ? "Pause ayah" : "Play ayah"}
                    >
                      {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : isActive ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : ayah.numberInSurah}
                    </button>
                    {translationMode === "word" && wbw ? (
                      <div className="flex-1" dir="rtl">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {wbw.map((w, i) => (
                            <span
                              key={i}
                              className="inline-flex flex-col items-center px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors group"
                            >
                              <span className="font-arabic text-xl sm:text-2xl leading-[1.6] text-foreground">{w.ar}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-accent">{w.en}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-right font-arabic text-xl sm:text-2xl leading-[2.4] text-foreground flex-1"
                        dir="rtl"
                        style={{
                          wordSpacing: WORD_SPACING_CSS[prefs.word_spacing],
                          fontFamily: FONT_FAMILY_CSS[prefs.font_family],
                          fontSize: `${fontSizeToPx(prefs.font_size_level)}px`,
                          lineHeight: LINE_SPACING_CSS[prefs.line_spacing],
                          color: "inherit",
                        }}
                      >
                        {renderTajweed(ayah.text)}
                      </p>
                    )}
                    {(() => {
                      const fav = selectedSurahId ? isAyahBookmarked(bookmarks, selectedSurahId, ayah.numberInSurah) : undefined;
                      return (
                        <button
                          onClick={() => toggleAyahFavorite(ayah, selectedSurah?.name.en || "")}
                          aria-label={fav ? "Unfavorite" : "Favorite"}
                          className={`shrink-0 p-1.5 rounded-full transition-colors ${
                            fav ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground hover:text-rose-400 hover:bg-rose-500/5"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
                        </button>
                      );
                    })()}
                  </div>
                  {displayMode === "full" && translationMode === "full" && ayah.translation && (
                    <p className="text-sm text-muted-foreground leading-[1.7] sm:pl-11 border-t border-border/50 pt-3">
                      {ayah.translation}
                    </p>
                  )}
                  {displayMode === "full" && currentTafsirKey && ayah[currentTafsirKey] && (
                    <div className="sm:pl-11 border-t border-border/50 pt-3">
                      <p className="text-xs font-medium text-accent mb-1">
                        {tafsirMode === "ibn-kathir" ? (isAr ? "تفسير ابن كثير" : "Tafsir Ibn Kathir") : (isAr ? "تفسير الجلالين" : "Tafsir Al-Jalalayn")}
                      </p>
                      <p className={`text-sm leading-[1.8] text-foreground/80 ${tafsirMode === "jalalayn" ? "font-arabic text-right" : ""}`} dir={tafsirMode === "jalalayn" ? "rtl" : "ltr"}>
                        {ayah[currentTafsirKey]}
                      </p>
                    </div>
                  )}
                  {/* Tadabbur */}
                  {displayMode === "full" && (
                    <div className="sm:pl-11 border-t border-border/50 pt-3">
                      <button
                        onClick={() => setTadabburOpen((prev) => ({ ...prev, [ayah.numberInSurah]: !prev[ayah.numberInSurah] }))}
                        className="inline-flex items-center gap-2 text-xs font-medium text-accent hover:text-primary transition-colors"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        {isAr ? "تدبّر" : "Tadabbur"}
                        <ChevronRight className={`w-3 h-3 transition-transform ${showTadabbur ? "rotate-90" : ""}`} />
                      </button>
                      {showTadabbur && (
                        <ul className="mt-2 space-y-1.5 animate-fade-in">
                          {tadabburQuestions(ayah.numberInSurah, ayah.translation || "").map((q, i) => (
                            <li key={i} className="text-sm text-foreground/85 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent">
                              {q}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );})}

              {/* Tajweed legend (always on) */}
              <div className="bg-muted/40 rounded-xl p-3 text-xs flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-tajweed-qalqalah" /> {isAr ? "قلقلة" : "Qalqalah"}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-tajweed-ghunna" /> {isAr ? "غنة" : "Ghunna"}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-tajweed-madd" /> {isAr ? "مد" : "Madd"}</span>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Minimal floating audio bar */}
      {screen === "read" && activeAyah !== null && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-[80] flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/95 backdrop-blur border border-border shadow-xl">
          <button
            onClick={() => {
              const a = ayahs.find((x) => x.number === activeAyah);
              if (a && selectedSurahId) playAyah(selectedSurahId, a.numberInSurah, a.number);
            }}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            aria-label={player.isPlaying ? "Pause" : "Play"}
          >
            {player.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <span className="text-xs font-medium text-foreground">
            {isAr ? "آية" : "Ayah"} {ayahs.find((x) => x.number === activeAyah)?.numberInSurah}
          </span>
          <button
            onClick={() => player.setRepeat(!player.repeat)}
            className={`p-1.5 rounded-full ${player.repeat ? "text-accent bg-accent/10" : "text-muted-foreground"}`}
            aria-label="Repeat"
          >
            <Repeat className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveAyah(null)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Close player">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <FamilyDoneButton
        family={family}
        label={
          selectedSurah
            ? `${isAr ? "سورة" : "Surah"} ${isAr ? selectedSurah.name.ar : selectedSurah.name.en}`
            : isAr ? "قراءة القرآن" : "Quran reading"
        }
      />
      <QuranPrefsSheet open={prefsOpen} onOpenChange={setPrefsOpen} />
    </div>
  );
};

export default QuranReader;
