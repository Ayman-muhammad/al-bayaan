import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, Play, Pause, User, Search, ChevronRight, ChevronLeft,
  SkipForward, SkipBack, Volume2, VolumeX, MapPin, X
} from "lucide-react";
import { SURAHS, RECITERS, getSurahAudioUrl, type Reciter } from "@/data/quranData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

interface AudioLibraryProps {
  onBack: () => void;
}

type Screen = "reciters" | "surahs" | "player";

const AudioLibrary = ({ onBack }: AudioLibraryProps) => {
  const { t, language } = useLanguage();
  const isAr = language === "ar";
  const player = useAudioPlayer();

  const [screen, setScreen] = useState<Screen>("reciters");
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [surahSearch, setSurahSearch] = useState("");

  // Filtered reciters
  const filteredReciters = useMemo(() => {
    if (!searchQuery.trim()) return RECITERS;
    const q = searchQuery.toLowerCase();
    return RECITERS.filter(
      (r) => r.name.en.toLowerCase().includes(q) || r.name.ar.includes(q)
    );
  }, [searchQuery]);

  // Filtered surahs
  const filteredSurahs = useMemo(() => {
    if (!surahSearch.trim()) return SURAHS;
    const q = surahSearch.toLowerCase();
    return SURAHS.filter(
      (s) => s.name.en.toLowerCase().includes(q) || s.name.ar.includes(q) || String(s.id).includes(q)
    );
  }, [surahSearch]);

  const selectedSurah = SURAHS.find((s) => s.id === selectedSurahId);

  const currentAudioUrl =
    selectedReciter && selectedSurahId
      ? getSurahAudioUrl(selectedReciter.server, selectedSurahId)
      : null;

  const isCurrentlyPlaying = currentAudioUrl === player.currentSrc && player.isPlaying;

  const handleReciterSelect = (reciter: Reciter) => {
    setSelectedReciter(reciter);
    setSurahSearch("");
    setScreen("surahs");
  };

  const handleSurahSelect = (surahId: number) => {
    setSelectedSurahId(surahId);
    setScreen("player");
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
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {screen === "reciters" && t("audioLibrary")}
          {screen === "surahs" && selectedReciter?.name[language]}
          {screen === "player" && selectedSurah?.name[language]}
        </h1>
      </header>

      {/* Reciters Screen */}
      {screen === "reciters" && (
        <>
          {/* Search */}
          <div className="p-4 border-b border-border bg-card">
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

          {/* Reciter list */}
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
                    <span className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                      {reciter.country[language]}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className={`text-xs text-accent font-medium ${isAr ? "font-arabic" : ""}`}>
                      {reciter.style[language]}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground shrink-0 ${isAr ? "rotate-180" : ""}`} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Surahs Screen */}
      {screen === "surahs" && (
        <>
          <div className="p-4 border-b border-border bg-card">
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
                    <h3 className={`font-medium text-foreground text-sm ${isAr ? "font-arabic" : ""}`}>
                      {surah.name[language]}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {surah.verses} {isAr ? "آية" : "verses"} • {isAr ? (surah.type === "Meccan" ? "مكية" : "مدنية") : surah.type}
                    </p>
                  </div>
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Play className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Player Screen */}
      {screen === "player" && selectedReciter && selectedSurah && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          {/* Surah info */}
          <div className="text-center space-y-2">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-primary font-arabic">{selectedSurah.id}</span>
            </div>
            <h2 className={`text-2xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {selectedSurah.name[language]}
            </h2>
            <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
              {selectedReciter.name[language]}
            </p>
            <p className="text-xs text-accent">
              {selectedSurah.verses} {isAr ? "آية" : "verses"} • {isAr ? (selectedSurah.type === "Meccan" ? "مكية" : "مدنية") : selectedSurah.type}
            </p>
          </div>

          {/* Progress */}
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

          {/* Controls */}
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevSurah}
              disabled={!selectedSurahId || selectedSurahId <= 1}
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <button
              onClick={() => currentAudioUrl && player.toggle(currentAudioUrl)}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
            >
              {player.isLoading ? (
                <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : isCurrentlyPlaying ? (
                <Pause className="w-7 h-7 text-primary-foreground" />
              ) : (
                <Play className="w-7 h-7 text-primary-foreground ml-1" />
              )}
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextSurah}
              disabled={!selectedSurahId || selectedSurahId >= 114}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {player.error && (
            <p className="text-xs text-destructive text-center">{player.error}</p>
          )}
        </div>
      )}

      {/* Mini player bar (when not on player screen but audio is playing) */}
      {screen !== "player" && player.currentSrc && selectedReciter && selectedSurah && (
        <div
          className="border-t border-border bg-card px-4 py-3 flex items-center gap-3 cursor-pointer"
          onClick={() => setScreen("player")}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary font-arabic">{selectedSurahId}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium text-foreground truncate ${isAr ? "font-arabic" : ""}`}>
              {selectedSurah.name[language]}
            </p>
            <p className={`text-xs text-muted-foreground truncate ${isAr ? "font-arabic" : ""}`}>
              {selectedReciter.name[language]}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (currentAudioUrl) player.toggle(currentAudioUrl);
            }}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
          >
            {player.isPlaying ? (
              <Pause className="w-5 h-5 text-primary" />
            ) : (
              <Play className="w-5 h-5 text-primary ml-0.5" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              player.stop();
            }}
            className="shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioLibrary;
