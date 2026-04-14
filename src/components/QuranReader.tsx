import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, BookOpen, ChevronRight, Loader2, Eye, EyeOff, BookMarked, Download } from "lucide-react";
import { SURAHS } from "@/data/quranData";

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

const QuranReader = ({ onBack }: QuranReaderProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";

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
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
            <BookMarked className="w-4 h-4 text-primary shrink-0" />
            <span className={`text-xs font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "التفسير:" : "Tafsir:"}
            </span>
            {(["none", "ibn-kathir", "jalalayn"] as TafsirMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleTafsirChange(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tafsirMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {mode === "none" ? (isAr ? "بدون" : "None") : mode === "ibn-kathir" ? (isAr ? "ابن كثير" : "Ibn Kathir") : (isAr ? "الجلالين" : "Al-Jalalayn")}
              </button>
            ))}
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
              {ayahs.map((ayah) => (
                <div key={ayah.number} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {ayah.numberInSurah}
                    </span>
                    <p className="text-right font-arabic text-lg leading-[2.2] text-foreground flex-1" dir="rtl">
                      {ayah.text}
                    </p>
                  </div>
                  {displayMode === "full" && ayah.translation && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-11 border-t border-border/50 pt-3">
                      {ayah.translation}
                    </p>
                  )}
                  {displayMode === "full" && currentTafsirKey && ayah[currentTafsirKey] && (
                    <div className="pl-11 border-t border-border/50 pt-3">
                      <p className="text-xs font-medium text-accent mb-1">
                        {tafsirMode === "ibn-kathir" ? (isAr ? "تفسير ابن كثير" : "Tafsir Ibn Kathir") : (isAr ? "تفسير الجلالين" : "Tafsir Al-Jalalayn")}
                      </p>
                      <p className={`text-sm leading-relaxed text-foreground/80 ${tafsirMode === "jalalayn" ? "font-arabic text-right" : ""}`} dir={tafsirMode === "jalalayn" ? "rtl" : "ltr"}>
                        {ayah[currentTafsirKey]}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuranReader;
