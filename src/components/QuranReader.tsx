import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, BookOpen, ChevronRight, Loader2, Eye, EyeOff, BookMarked, Download, Volume2, Pause, Lightbulb, Languages } from "lucide-react";
import { SURAHS } from "@/data/quranData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

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

const QuranReader = ({ onBack }: QuranReaderProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const player = useAudioPlayer();

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
  const [translationMode, setTranslationMode] = useState<TranslationMode>("full");
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

  // Per-ayah audio (Mishary Alafasy via everyayah CDN)
  const buildAyahAudioUrl = (surahId: number, ayahNumberInSurah: number) => {
    const s = String(surahId).padStart(3, "0");
    const a = String(ayahNumberInSurah).padStart(3, "0");
    return `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;
  };

  const playAyah = (surahId: number, ayahNumberInSurah: number, globalNumber: number) => {
    const url = buildAyahAudioUrl(surahId, ayahNumberInSurah);
    setActiveAyah(globalNumber);
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
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/search/${encodeURIComponent(searchQuery)}/all/en.sahih`
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
  };

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
                onClick={() => setDisplayMode(displayMode === "full" ? "arabic-only" : "full")}
                title={displayMode === "full" ? (isAr ? "عربي فقط" : "Arabic only") : (isAr ? "إظهار الكل" : "Show all")}
              >
                {displayMode === "full" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownloadSurah} disabled={downloading || ayahs.length === 0}>
                <Download className="w-4 h-4" />
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
                  placeholder={isAr ? "ابحث بالكلمات (بالإنجليزية)..." : "Search by keyword (English)..."}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              <Button type="submit" variant="hero" disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? "بحث" : "Search"}
              </Button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
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
                <p className="text-sm text-foreground leading-relaxed">{r.text}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* === READ SURAH === */}
      {screen === "read" && selectedSurah && (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Surah header */}
          <div className="text-center py-4 space-y-1 border-b border-border bg-card">
            <h2 className="font-arabic text-2xl text-foreground">{selectedSurah.name.ar}</h2>
            <p className="text-sm text-muted-foreground">{selectedSurah.name.en}</p>
            <p className="text-xs text-accent">
              {selectedSurah.verses} {isAr ? "آية" : "verses"} • {isAr ? (selectedSurah.type === "Meccan" ? "مكية" : "مدنية") : selectedSurah.type}
            </p>
          </div>

          {/* Tafsir & display controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 border-b border-border bg-card/50">
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
          </div>

          {/* Translation mode toggle */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 border-b border-border bg-card/30">
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

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
            </div>
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
                        style={{ wordSpacing: "0.05em" }}
                      >
                        {renderTajweed(ayah.text)}
                      </p>
                    )}
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
    </div>
  );
};

export default QuranReader;
