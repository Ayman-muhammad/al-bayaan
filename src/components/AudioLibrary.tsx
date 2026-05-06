import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, Play, Pause, User, Search, ChevronRight,
  SkipForward, SkipBack, Volume2, MapPin, X, BookOpen, ChevronDown, ChevronUp,
  Repeat, Gauge, Heart
} from "lucide-react";
import { SURAHS, RECITERS, getSurahAudioUrl, type Reciter } from "@/data/quranData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addBookmark, removeBookmark, listBookmarks, isAudioBookmarked, type Bookmark as BM } from "@/lib/bookmarks";

interface AudioLibraryProps {
  onBack: () => void;
}

type Screen = "reciters" | "surahs" | "player";

interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  translation?: string;
}

const AudioLibrary = ({ onBack }: AudioLibraryProps) => {
  const { t, language } = useLanguage();
  const isAr = language === "ar";
  const player = useAudioPlayer();
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<BM[]>([]);
  useEffect(() => { listBookmarks(user?.id).then(setBookmarks); }, [user]);

  const toggleAudioFav = async () => {
    if (!selectedReciter || !selectedSurah || !selectedSurahId) return;
    const existing = isAudioBookmarked(bookmarks, selectedSurahId, selectedReciter.id);
    if (existing) {
      await removeBookmark(user?.id, existing.id);
      setBookmarks((b) => b.filter((x) => x.id !== existing.id));
      toast({ title: isAr ? "تمت الإزالة" : "Removed", duration: 1500 });
    } else {
      const created = await addBookmark(user?.id, "audio", {
        surahId: selectedSurahId,
        surahName: selectedSurah.name.en,
        reciterName: selectedReciter.name.en,
        reciterId: selectedReciter.id,
      });
      setBookmarks((b) => [created, ...b]);
      toast({ title: isAr ? "تمت الإضافة للمفضلة" : "Added to favorites", duration: 1500 });
    }
  };

  const [screen, setScreen] = useState<Screen>("reciters");
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [surahSearch, setSurahSearch] = useState("");
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingText, setLoadingText] = useState(false);
  const [showQuranText, setShowQuranText] = useState(true);
  const [autoplayNext, setAutoplayNext] = useState(true);

  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

  // Filtered reciters
  const filteredReciters = !searchQuery.trim()
    ? RECITERS
    : RECITERS.filter(
        (r) => r.name.en.toLowerCase().includes(searchQuery.toLowerCase()) || r.name.ar.includes(searchQuery)
      );

  // Filtered surahs
  const filteredSurahs = !surahSearch.trim()
    ? SURAHS
    : SURAHS.filter(
        (s) =>
          s.name.en.toLowerCase().includes(surahSearch.toLowerCase()) ||
          s.name.ar.includes(surahSearch) ||
          String(s.id).includes(surahSearch)
      );

  const selectedSurah = SURAHS.find((s) => s.id === selectedSurahId);
  const currentAudioUrl =
    selectedReciter && selectedSurahId
      ? getSurahAudioUrl(selectedReciter.server, selectedSurahId)
      : null;
  const isCurrentlyPlaying = currentAudioUrl === player.currentSrc && player.isPlaying;

  // Fetch surah text when entering player
  const fetchSurahText = useCallback(async (surahId: number) => {
    setLoadingText(true);
    setAyahs([]);
    try {
      const [arRes, enRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahId}/en.sahih`),
      ]);
      const arData = await arRes.json();
      const enData = await enRes.json();

      if (arData.code === 200 && enData.code === 200) {
        const arAyahs = arData.data.ayahs;
        const enAyahs = enData.data.ayahs;
        const merged: Ayah[] = arAyahs.map((a: any, i: number) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          translation: enAyahs[i]?.text || "",
        }));
        setAyahs(merged);
      }
    } catch (e) {
      console.error("Failed to fetch surah text:", e);
    } finally {
      setLoadingText(false);
    }
  }, []);

  const handleReciterSelect = (reciter: Reciter) => {
    setSelectedReciter(reciter);
    setSurahSearch("");
    setScreen("surahs");
  };

  const handleSurahSelect = (surahId: number) => {
    setSelectedSurahId(surahId);
    setScreen("player");
    fetchSurahText(surahId);
    if (selectedReciter) {
      const url = getSurahAudioUrl(selectedReciter.server, surahId);
      player.play(url);
    }
  };

  const handleNextSurah = () => {
    if (!selectedSurahId || selectedSurahId >= 114) return;
    handleSurahSelect(selectedSurahId + 1);
  };
  const handlePrevSurah = () => {
    if (!selectedSurahId || selectedSurahId <= 1) return;
    handleSurahSelect(selectedSurahId - 1);
  };

  // Auto-advance to next surah on end
  useEffect(() => {
    player.onEnded(() => {
      if (!autoplayNext) return;
      if (selectedSurahId && selectedSurahId < 114) {
        handleSurahSelect(selectedSurahId + 1);
      }
    });
    return () => player.onEnded(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayNext, selectedSurahId, selectedReciter]);

  // Update lock-screen / Media Session metadata
  useEffect(() => {
    if (selectedReciter && selectedSurah) {
      player.setMediaMetadata({
        title: selectedSurah.name.en,
        artist: selectedReciter.name.en,
        album: "Al Bayani — Quran",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurahId, selectedReciter]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const goBack = () => {
    if (screen === "player") setScreen("surahs");
    else if (screen === "surahs") { setScreen("reciters"); setSelectedReciter(null); }
    else onBack();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground truncate ${isAr ? "font-arabic" : ""}`}>
          {screen === "reciters" && t("audioLibrary")}
          {screen === "surahs" && selectedReciter?.name[language]}
          {screen === "player" && selectedSurah?.name[language]}
        </h1>
      </header>

      {/* === RECITERS === */}
      {screen === "reciters" && (
        <>
          <div className="p-4 border-b border-border bg-card shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث عن قارئ..." : "Search reciters..."}
                className={`w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${isAr ? "font-arabic text-right pr-10 pl-4" : ""}`}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
            {filteredReciters.map((reciter) => (
              <button
                key={reciter.id}
                onClick={() => handleReciterSelect(reciter)}
                className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all duration-200 flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-foreground text-sm ${isAr ? "font-arabic" : ""}`}>
                    {reciter.name[language]}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>{reciter.country[language]}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className={`text-xs text-accent font-medium ${isAr ? "font-arabic" : ""}`}>{reciter.style[language]}</span>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground shrink-0 ${isAr ? "rotate-180" : ""}`} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* === SURAHS === */}
      {screen === "surahs" && (
        <>
          <div className="p-4 border-b border-border bg-card shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={surahSearch}
                onChange={(e) => setSurahSearch(e.target.value)}
                placeholder={isAr ? "ابحث عن سورة..." : "Search surahs..."}
                className={`w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${isAr ? "font-arabic text-right pr-10 pl-4" : ""}`}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredSurahs.map((surah) => {
              const url = selectedReciter ? getSurahAudioUrl(selectedReciter.server, surah.id) : "";
              const isCurrent = player.currentSrc === url;
              const isPlaying = isCurrent && player.isPlaying;
              return (
                <button
                  key={surah.id}
                  onClick={() => handleSurahSelect(surah.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/5 transition-colors text-left ${isCurrent ? "bg-primary/5" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isPlaying ? <Volume2 className="w-4 h-4 animate-pulse" /> : surah.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-foreground text-sm ${isAr ? "font-arabic" : ""}`}>{surah.name[language]}</h3>
                    <p className="text-xs text-muted-foreground">
                      {surah.verses} {isAr ? "آية" : "verses"} • {isAr ? (surah.type === "Meccan" ? "مكية" : "مدنية") : surah.type}
                    </p>
                  </div>
                  {isPlaying ? <Pause className="w-4 h-4 text-primary shrink-0" /> : <Play className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* === PLAYER + QURAN TEXT === */}
      {screen === "player" && selectedReciter && selectedSurah && (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Player controls */}
          <div className="flex flex-col items-center p-6 gap-4 bg-card border-b border-border">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary font-arabic">{selectedSurah.id}</span>
            </div>
            <div className="text-center">
              <h2 className={`text-xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>{selectedSurah.name[language]}</h2>
              <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>{selectedReciter.name[language]}</p>
              <p className="text-xs text-accent mt-1">
                {selectedSurah.verses} {isAr ? "آية" : "verses"} • {isAr ? (selectedSurah.type === "Meccan" ? "مكية" : "مدنية") : selectedSurah.type}
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2">
              <Slider
                value={[player.currentTime]}
                max={player.duration || 100}
                step={1}
                onValueChange={([v]) => player.seek(v)}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(player.currentTime)}</span>
                <span>{formatTime(player.duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Button variant="ghost" size="icon" onClick={handlePrevSurah} disabled={!selectedSurahId || selectedSurahId <= 1}>
                <SkipBack className="w-5 h-5" />
              </Button>
              <button
                onClick={() => currentAudioUrl && player.toggle(currentAudioUrl)}
                className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
              >
                {player.isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : isCurrentlyPlaying ? (
                  <Pause className="w-6 h-6 text-primary-foreground" />
                ) : (
                  <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                )}
              </button>
              <Button variant="ghost" size="icon" onClick={handleNextSurah} disabled={!selectedSurahId || selectedSurahId >= 114}>
                <SkipForward className="w-5 h-5" />
              </Button>
              {(() => {
                const fav = selectedSurahId && selectedReciter ? isAudioBookmarked(bookmarks, selectedSurahId, selectedReciter.id) : undefined;
                return (
                  <Button variant="ghost" size="icon" onClick={toggleAudioFav} aria-label="Favorite">
                    <Heart className={`w-5 h-5 ${fav ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
                  </Button>
                );
              })()}
            </div>

            {/* Speed / Repeat / Autoplay row */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1">
                <Gauge className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
                {SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    onClick={() => player.setPlaybackRate(sp)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                      player.playbackRate === sp
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label={`${sp}x speed`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>
              <button
                onClick={() => player.setRepeat(!player.repeat)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                  player.repeat
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Toggle repeat"
              >
                <Repeat className="w-3.5 h-3.5" />
                {isAr ? "تكرار" : "Repeat"}
              </button>
              <button
                onClick={() => setAutoplayNext(!autoplayNext)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                  autoplayNext
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Toggle autoplay next surah"
              >
                <SkipForward className="w-3.5 h-3.5" />
                {isAr ? "التالي تلقائياً" : "Auto-next"}
              </button>
            </div>
            {player.error && <p className="text-xs text-destructive">{player.error}</p>}
          </div>

          {/* Quran Text Toggle */}
          <button
            onClick={() => setShowQuranText(!showQuranText)}
            className="w-full flex items-center justify-between px-4 py-3 bg-card/50 border-b border-border text-sm font-medium text-foreground"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className={isAr ? "font-arabic" : ""}>{isAr ? "النص القرآني والترجمة" : "Quran Text & Translation"}</span>
            </div>
            {showQuranText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Quran Text */}
          {showQuranText && (
            <div className="p-4 space-y-4">
              {loadingText ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">{isAr ? "جاري تحميل النص..." : "Loading text..."}</p>
                </div>
              ) : ayahs.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">{isAr ? "لم يتم العثور على نص" : "No text found"}</p>
              ) : (
                <>
                  {/* Bismillah for surahs other than At-Tawbah */}
                  {selectedSurahId !== 9 && selectedSurahId !== 1 && (
                    <p className="text-center text-xl font-arabic text-primary leading-loose py-2">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                    </p>
                  )}
                  {ayahs.map((ayah) => (
                    <div
                      key={ayah.number}
                      className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors"
                    >
                      {/* Ayah number badge */}
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {ayah.numberInSurah}
                        </span>
                        <p className="text-right font-arabic text-lg leading-[2.2] text-foreground flex-1" dir="rtl">
                          {ayah.text}
                        </p>
                      </div>
                      {/* Translation */}
                      {ayah.translation && (
                        <p className="text-sm text-muted-foreground leading-relaxed pl-11 border-t border-border/50 pt-3">
                          {ayah.translation}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mini player (when navigating away from player but audio is playing) */}
      {screen !== "player" && player.currentSrc && selectedReciter && selectedSurah && (
        <div
          className="border-t border-border bg-card px-4 py-3 flex items-center gap-3 cursor-pointer shrink-0"
          onClick={() => setScreen("player")}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary font-arabic">{selectedSurahId}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium text-foreground truncate ${isAr ? "font-arabic" : ""}`}>{selectedSurah.name[language]}</p>
            <p className={`text-xs text-muted-foreground truncate ${isAr ? "font-arabic" : ""}`}>{selectedReciter.name[language]}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); if (currentAudioUrl) player.toggle(currentAudioUrl); }} className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {player.isPlaying ? <Pause className="w-5 h-5 text-primary" /> : <Play className="w-5 h-5 text-primary ml-0.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); player.stop(); }} className="shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioLibrary;
