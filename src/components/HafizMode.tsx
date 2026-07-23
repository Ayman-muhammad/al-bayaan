import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SURAHS } from "@/data/quranData";
import {
  ArrowLeft, Mic, MicOff, Play, Pause, RotateCcw, Eye, EyeOff,
  CheckCircle2, XCircle, Trophy, Target, BookOpen, ChevronRight,
  BarChart3, Search, Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HafizModeProps {
  onBack: () => void;
}

interface Ayah {
  numberInSurah: number;
  text: string;
  translation?: string;
}

type Screen = "menu" | "surah-select" | "practice" | "dashboard";

const MOTIVATING_QUOTES_SUCCESS = [
  { text: "Whoever recites the Quran and acts upon it, his parents will be crowned with a light brighter than the sun.", ref: "Abu Dawud 1453" },
  { text: "The best of you are those who learn the Quran and teach it.", ref: "Sahih al-Bukhari 5027" },
  { text: "Read the Quran, for it will come as an intercessor on the Day of Resurrection.", ref: "Sahih Muslim 804" },
  { text: "The one who is proficient in the Quran will be with the noble and obedient angels.", ref: "Sahih al-Bukhari 4937" },
];

const MOTIVATING_QUOTES_RETRY = [
  { text: "The one who recites the Quran and struggles with it will have a double reward.", ref: "Sahih al-Bukhari 4937" },
  { text: "Do not give up. The beginning is always the hardest.", ref: "Islamic Wisdom" },
  { text: "Verily, with hardship comes ease.", ref: "Quran 94:6" },
  { text: "Allah does not burden a soul beyond that it can bear.", ref: "Quran 2:286" },
];

const HafizMode = ({ onBack }: HafizModeProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedSurahId, setSelectedSurahId] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [surahFilter, setSurahFilter] = useState("");

  // Practice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showAyah, setShowAyah] = useState(true);
  const [repetitions, setRepetitions] = useState(0);
  const [targetReps, setTargetReps] = useState(5);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<"success" | "retry" | null>(null);
  const [mode, setMode] = useState<"listen-repeat" | "memorize">("listen-repeat");

  // Tarteel-style live tracking
  // Per-word state: 0 = pending, 1 = correct, 2 = mistake (skipped/mispronounced)
  const [wordStates, setWordStates] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0); // index of next expected word
  const cursorRef = useRef(0);
  const wordStatesRef = useRef<number[]>([]);
  const ayahWordsRef = useRef<string[]>([]);
  const seenTokensRef = useRef<Set<string>>(new Set());

  // Word mask (memorization aid): hide random words behind a mask; tap to reveal.
  const [maskEnabled, setMaskEnabled] = useState(false);
  const [maskPct, setMaskPct] = useState(30); // 10..70
  const [maskedIdx, setMaskedIdx] = useState<Set<number>>(new Set());
  const [revealedIdx, setRevealedIdx] = useState<Set<number>>(new Set());

  // Recompute mask when the ayah or settings change
  useEffect(() => {
    if (!maskEnabled) {
      setMaskedIdx(new Set());
      setRevealedIdx(new Set());
      return;
    }
    const current = ayahs[currentAyahIndex];
    if (!current) return;
    const words = current.text.split(/\s+/).filter(Boolean);
    const n = words.length;
    const target = Math.max(1, Math.round((maskPct / 100) * n));
    const idxs = Array.from({ length: n }, (_, i) => i);
    // Fisher-Yates
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    setMaskedIdx(new Set(idxs.slice(0, target)));
    setRevealedIdx(new Set());
  }, [maskEnabled, maskPct, currentAyahIndex, ayahs]);

  // Dashboard
  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [totalMastered, setTotalMastered] = useState(0);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Speech recognition
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const selectedSurah = SURAHS.find((s) => s.id === selectedSurahId);

  const filteredSurahs = !surahFilter.trim()
    ? SURAHS
    : SURAHS.filter(
        (s) =>
          s.name.en.toLowerCase().includes(surahFilter.toLowerCase()) ||
          s.name.ar.includes(surahFilter) ||
          String(s.id).includes(surahFilter)
      );

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("memorization_progress")
      .select("*")
      .eq("user_id", user.id)
      .order("last_practiced", { ascending: false });
    if (data) {
      setDashboardData(data);
      setTotalMastered(data.filter((d: any) => d.mastered).length);
    }
  }, [user]);

  const fetchSurah = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/quran-uthmani`);
      const data = await res.json();
      if (data.code === 200) {
        setAyahs(data.data.ayahs.map((a: any) => ({
          numberInSurah: a.numberInSurah,
          text: a.text,
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (surahId: number) => {
    setSelectedSurahId(surahId);
    setCurrentAyahIndex(0);
    setRepetitions(0);
    setAccuracy(null);
    setShowResult(null);
    setTranscript("");
    setShowAyah(true);
    setScreen("practice");
    fetchSurah(surahId);
  };

  // Aggressive Arabic normalization for STT vs Uthmani comparison.
  // Strips diacritics, unifies alif/hamza/ya/ta-marbuta variants, removes
  // tatweel and non-letter chars. This is what makes matching tolerant.
  const normalizeArabic = (s: string): string => {
    return s
      .replace(/[\u064B-\u065F\u0670\u0610-\u061A\u06D6-\u06ED]/g, "") // diacritics, tanwin, dagger alif, quranic marks
      .replace(/\u0640/g, "")                       // tatweel
      .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // آ أ إ ٱ → ا
      .replace(/\u0649/g, "\u064A")                  // ى → ي
      .replace(/\u0629/g, "\u0647")                  // ة → ه
      .replace(/\u0624/g, "\u0648")                  // ؤ → و
      .replace(/\u0626/g, "\u064A")                  // ئ → ي
      .replace(/[^\u0621-\u064A\s]/g, "")            // strip punctuation/numbers
      .trim()
      .toLowerCase();
  };

  const tokenize = (s: string): string[] =>
    normalizeArabic(s).split(/\s+/).filter(Boolean);

  // Levenshtein distance for fuzzy single-word match (handles 1-2 char STT errors)
  const lev = (a: string, b: string): number => {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = tmp;
      }
    }
    return dp[n];
  };

  // Fuzzy word equality: identical, prefix match, or small edit distance.
  const wordMatches = (heard: string, expected: string): boolean => {
    if (!heard || !expected) return false;
    if (heard === expected) return true;
    // Allow prefix/suffix match for short stems (STT often clips endings)
    if (expected.length >= 4 && heard.length >= 3) {
      if (expected.startsWith(heard) || heard.startsWith(expected)) return true;
    }
    const maxLen = Math.max(heard.length, expected.length);
    const tolerance = maxLen <= 4 ? 1 : maxLen <= 7 ? 2 : 3;
    return lev(heard, expected) <= tolerance;
  };

  // Reset live tracking when ayah changes
  useEffect(() => {
    if (!ayahs[currentAyahIndex]) return;
    const words = tokenize(ayahs[currentAyahIndex].text);
    ayahWordsRef.current = words;
    wordStatesRef.current = new Array(words.length).fill(0);
    setWordStates(wordStatesRef.current.slice());
    cursorRef.current = 0;
    setCursor(0);
    seenTokensRef.current = new Set();
    setTranscript("");
    setAccuracy(null);
    setShowResult(null);
  }, [currentAyahIndex, ayahs]);

  // Process newly-heard words against the expected sequence (Tarteel-style).
  const processHeardTokens = (heardTokens: string[]) => {
    const words = ayahWordsRef.current;
    if (!words.length) return;

    // De-dupe: only process tokens we haven't seen before (interim results
    // re-emit accumulated transcripts, so we track which we've consumed).
    let advanced = false;
    let mistake = false;

    for (let t = 0; t < heardTokens.length; t++) {
      const tok = heardTokens[t];
      const key = `${t}:${tok}`;
      if (seenTokensRef.current.has(key)) continue;
      seenTokensRef.current.add(key);

      let i = cursorRef.current;
      if (i >= words.length) break;

      // 1) exact next word?
      if (wordMatches(tok, words[i])) {
        wordStatesRef.current[i] = 1;
        cursorRef.current = i + 1;
        advanced = true;
        continue;
      }
      // 2) look ahead up to 2 words (skipped a word)
      let found = -1;
      for (let k = 1; k <= 2 && i + k < words.length; k++) {
        if (wordMatches(tok, words[i + k])) { found = i + k; break; }
      }
      if (found !== -1) {
        // mark skipped words as mistake
        for (let s = i; s < found; s++) wordStatesRef.current[s] = 2;
        wordStatesRef.current[found] = 1;
        cursorRef.current = found + 1;
        advanced = true;
        mistake = true;
      } else {
        // unmatched token — leave cursor; mark current expected as mistake hint
        // (only the first unmatched stroke per cursor position)
        if (wordStatesRef.current[i] === 0) {
          wordStatesRef.current[i] = 2;
          mistake = true;
        }
      }
    }

    if (advanced || mistake) {
      setWordStates(wordStatesRef.current.slice());
      setCursor(cursorRef.current);
    }
    if (mistake && "vibrate" in navigator) {
      try { navigator.vibrate?.(40); } catch {}
    }

    // Auto-complete: all words matched
    if (cursorRef.current >= words.length) {
      const correct = wordStatesRef.current.filter((s) => s === 1).length;
      const acc = Math.round((correct / words.length) * 100);
      finalizeAttempt(acc);
    }
  };

  const finalizeAttempt = (acc: number) => {
    setAccuracy(acc);
    if (acc >= 70) {
      setShowResult("success");
      setRepetitions((r) => {
        const next = r + 1;
        if (user && selectedSurahId && ayahs[currentAyahIndex]) {
          supabase.from("memorization_progress").upsert({
            user_id: user.id,
            surah_id: selectedSurahId,
            ayah_from: ayahs[currentAyahIndex].numberInSurah,
            ayah_to: ayahs[currentAyahIndex].numberInSurah,
            repetitions: next,
            accuracy_score: acc,
            mastered: next >= targetReps,
            last_practiced: new Date().toISOString(),
          }, { onConflict: "user_id,surah_id,ayah_from,ayah_to" }).then(() => {});
        }
        return next;
      });
    } else {
      setShowResult("retry");
    }
    // stop recognition cleanly
    try { recognitionRef.current?.stop(); } catch {}
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: isAr ? "غير مدعوم" : "Not Supported", description: isAr ? "متصفحك لا يدعم التعرف على الصوت" : "Your browser doesn't support speech recognition", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      // Build the cumulative transcript from all results (interim + final)
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        // Pick the alternative that yields the most matched words
        const alts = event.results[i];
        let bestAlt = alts[0].transcript;
        if (alts.length > 1) {
          const expected = ayahWordsRef.current.slice(cursorRef.current, cursorRef.current + 6);
          let bestScore = -1;
          for (let a = 0; a < alts.length; a++) {
            const toks = tokenize(alts[a].transcript);
            let score = 0;
            for (const t of toks) for (const e of expected) if (wordMatches(t, e)) { score++; break; }
            if (score > bestScore) { bestScore = score; bestAlt = alts[a].transcript; }
          }
        }
        combined += " " + bestAlt;
      }
      setTranscript(combined.trim());
      processHeardTokens(tokenize(combined));
    };

    recognition.onerror = (e: any) => {
      // Auto-restart on transient no-speech errors while user still wants to listen
      if (e?.error === "no-speech" || e?.error === "audio-capture") {
        try { recognition.stop(); } catch {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Restart automatically while user is still in listening mode
      // (speech recognition stops every ~60s on most browsers)
      if (cursorRef.current < ayahWordsRef.current.length && isListeningRef.current) {
        try { recognition.start(); return; } catch {}
      }
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    isListeningRef.current = true;
    setTranscript("");
    // reset live tracking
    wordStatesRef.current = new Array(ayahWordsRef.current.length).fill(0);
    setWordStates(wordStatesRef.current.slice());
    cursorRef.current = 0;
    setCursor(0);
    seenTokensRef.current = new Set();
    setAccuracy(null);
    setShowResult(null);
  };

  const stopListening = () => {
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
    // Finalize whatever we have
    const words = ayahWordsRef.current;
    if (words.length) {
      const correct = wordStatesRef.current.filter((s) => s === 1).length;
      const acc = Math.round((correct / words.length) * 100);
      if (correct > 0 || transcript) finalizeAttempt(acc);
    }
  };


  const nextAyah = () => {
    if (currentAyahIndex < ayahs.length - 1) {
      setCurrentAyahIndex((i) => i + 1);
      setRepetitions(0);
      setAccuracy(null);
      setShowResult(null);
      setTranscript("");
      setShowAyah(mode === "listen-repeat");
    }
  };

  const playCurrentAyah = () => {
    if (!selectedSurahId || !ayahs[currentAyahIndex]) return;
    const ayahNum = ayahs[currentAyahIndex].numberInSurah;
    // Use Alafasy recitation for practice
    const paddedSurah = String(selectedSurahId).padStart(3, "0");
    const paddedAyah = String(ayahNum).padStart(3, "0");
    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${getAbsoluteAyahNumber(selectedSurahId, ayahNum)}.mp3`;

    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  // Calculate absolute ayah number
  const getAbsoluteAyahNumber = (surahId: number, ayahInSurah: number): number => {
    let total = 0;
    for (const s of SURAHS) {
      if (s.id < surahId) total += s.verses;
      else break;
    }
    return total + ayahInSurah;
  };

  const randomQuote = (arr: typeof MOTIVATING_QUOTES_SUCCESS) =>
    arr[Math.floor(Math.random() * arr.length)];

  const goBack = () => {
    if (screen === "practice" || screen === "surah-select" || screen === "dashboard") setScreen("menu");
    else onBack();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {isAr ? "وضع الحفظ" : "Hafiz Mode"}
        </h1>
      </header>

      {/* === MENU === */}
      {screen === "menu" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center py-6 space-y-2">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className={`text-2xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "حافظ القرآن" : "Quran Hafiz"}
            </h2>
            <p className={`text-sm text-muted-foreground max-w-sm mx-auto ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "احفظ القرآن بالاستماع والتكرار والاختبار" : "Memorize the Quran through listening, repetition, and self-testing"}
            </p>
          </div>

          {/* Mode Selection */}
          <button
            onClick={() => { setMode("listen-repeat"); setScreen("surah-select"); }}
            className="w-full bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all text-left space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "استمع وردد" : "Listen & Repeat"}
                </h3>
                <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "استمع للقارئ ثم ردد الآية" : "Listen to the reciter then repeat the ayah"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>

          <button
            onClick={() => { setMode("memorize"); setScreen("surah-select"); }}
            className="w-full bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all text-left space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "وضع الحفظ" : "Memorization Mode"}
                </h3>
                <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "أخفِ النص وحاول التلاوة من الذاكرة" : "Hide text and recite from memory after repetitions"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>

          {user && (
            <button
              onClick={() => { fetchDashboard(); setScreen("dashboard"); }}
              className="w-full bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? "لوحة التقدم" : "Progress Dashboard"}
                  </h3>
                  <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? "تتبع تقدمك في الحفظ" : "Track your memorization journey"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          )}

          {/* Target Repetitions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "عدد التكرارات المطلوبة" : "Target Repetitions"}
              </span>
              <span className="text-sm font-bold text-primary">{targetReps}</span>
            </div>
            <Slider value={[targetReps]} min={3} max={20} step={1} onValueChange={([v]) => setTargetReps(v)} />
          </div>
        </div>
      )}

      {/* === SURAH SELECT === */}
      {screen === "surah-select" && (
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
                onClick={() => startPractice(surah.id)}
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
                  <p className="text-xs text-muted-foreground">{surah.verses} {isAr ? "آية" : "verses"}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* === PRACTICE === */}
      {screen === "practice" && selectedSurah && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</p>
            </div>
          ) : ayahs.length > 0 ? (
            <>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{isAr ? "الآية" : "Ayah"} {currentAyahIndex + 1} / {ayahs.length}</span>
                  <span>{isAr ? "التكرارات" : "Reps"}: {repetitions}/{targetReps}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(repetitions / targetReps) * 100}%` }}
                  />
                </div>
              </div>

              {/* Ayah Display — Tarteel-style word tracking */}
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-3">
                {showAyah ? (
                  <div
                    className="font-arabic text-xl sm:text-2xl leading-[2.4] text-foreground flex flex-wrap gap-x-2 gap-y-1 justify-center"
                    dir="rtl"
                  >
                    {(() => {
                      // Render the ORIGINAL Uthmani text split by spaces so user sees diacritics,
                      // but color each word by its tracked state.
                      const rawWords = ayahs[currentAyahIndex].text.split(/\s+/).filter(Boolean);
                      return rawWords.map((w, idx) => {
                        const state = wordStates[idx] ?? 0;
                        const isCursor = isListening && idx === cursor;
                        const isMasked = maskEnabled && maskedIdx.has(idx) && !revealedIdx.has(idx);
                        const cls =
                          state === 1
                            ? "text-primary"
                            : state === 2
                            ? "text-destructive underline decoration-dotted underline-offset-4"
                            : isCursor
                            ? "text-accent bg-accent/10 rounded px-1 ring-2 ring-accent/40 animate-pulse"
                            : "text-foreground/90";
                        return (
                          <span
                            key={idx}
                            onClick={() => {
                              if (!isMasked) return;
                              setRevealedIdx((prev) => {
                                const n = new Set(prev);
                                n.add(idx);
                                return n;
                              });
                            }}
                            className={`transition-colors duration-200 ${cls} ${isMasked ? "hafiz-mask" : ""}`}
                          >
                            {w}
                          </span>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="py-8 space-y-2">
                    <EyeOff className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                      {isAr ? "حاول التلاوة من الذاكرة" : "Try to recite from memory"}
                    </p>
                  </div>
                )}
                {/* Live word progress */}
                {showAyah && ayahWordsRef.current.length > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {wordStates.filter((s) => s === 1).length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      {wordStates.filter((s) => s === 2).length}
                    </span>
                    <span>/ {ayahWordsRef.current.length} {isAr ? "كلمة" : "words"}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAyah(!showAyah)}>
                    {showAyah ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {showAyah ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Show")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={playCurrentAyah} disabled={isPlayingAudio}>
                    {isPlayingAudio ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {isAr ? "استمع" : "Listen"}
                  </Button>
                </div>
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">{isAr ? "ما سمعناه:" : "What we heard:"}</p>
                  <p className="font-arabic text-foreground text-right" dir="rtl">{transcript}</p>
                </div>
              )}

              {/* Accuracy */}
              {accuracy !== null && (
                <div className={`text-center p-3 rounded-xl ${accuracy >= 70 ? "bg-primary/10" : "bg-destructive/10"}`}>
                  <span className={`text-2xl font-bold ${accuracy >= 70 ? "text-primary" : "text-destructive"}`}>
                    {accuracy}%
                  </span>
                  <p className="text-xs text-muted-foreground">{isAr ? "دقة التلاوة" : "Recitation Accuracy"}</p>
                </div>
              )}

              {/* Controls — single mic. Auto-finalizes when ayah complete. */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  aria-label={isListening ? "Stop" : "Record"}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isListening
                      ? "bg-destructive animate-pulse"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground" />
                  ) : (
                    <Mic className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground" />
                  )}
                </button>
                <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isListening
                    ? (isAr ? "تلاوتك تُتبَّع مباشرة..." : "Tracking your recitation live...")
                    : (isAr ? "اضغط واقرأ — سنُلوِّن كلَّ كلمة" : "Tap & recite — we'll color each word")}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTranscript("");
                      wordStatesRef.current = new Array(ayahWordsRef.current.length).fill(0);
                      setWordStates(wordStatesRef.current.slice());
                      cursorRef.current = 0;
                      setCursor(0);
                      seenTokensRef.current = new Set();
                      setAccuracy(null);
                      setShowResult(null);
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {isAr ? "إعادة" : "Reset"}
                  </Button>
                </div>
              </div>

              {/* Memorize mode: after target reps, hide and test */}
              {mode === "memorize" && repetitions >= targetReps && showAyah && (
                <div className="text-center space-y-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto animate-bounce">
                    <Trophy className="w-8 h-8 text-accent" />
                  </div>
                  <p className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? "حان وقت الاختبار!" : "Time to test yourself!"}
                  </p>
                  <Button variant="hero" onClick={() => setShowAyah(false)}>
                    {isAr ? "أخفِ النص وابدأ" : "Hide Text & Start"}
                  </Button>
                </div>
              )}

              {/* I Made It button */}
              {mode === "memorize" && !showAyah && repetitions >= targetReps && (
                <Button
                  variant="hero"
                  className="w-full h-14 text-lg"
                  onClick={() => {
                    setShowResult("success");
                    if (user && selectedSurahId) {
                      supabase.from("memorization_progress").upsert({
                        user_id: user.id,
                        surah_id: selectedSurahId,
                        ayah_from: ayahs[currentAyahIndex].numberInSurah,
                        ayah_to: ayahs[currentAyahIndex].numberInSurah,
                        repetitions: targetReps,
                        accuracy_score: 100,
                        mastered: true,
                        last_practiced: new Date().toISOString(),
                      }, { onConflict: "user_id,surah_id,ayah_from,ayah_to" }).then(() => {});
                    }
                  }}
                >
                  🎉 {isAr ? "حفظتها!" : "I Made It!"}
                </Button>
              )}

              {/* Next ayah */}
              {(repetitions >= targetReps || showResult === "success") && currentAyahIndex < ayahs.length - 1 && (
                <Button variant="outline" className="w-full" onClick={nextAyah}>
                  {isAr ? "الآية التالية" : "Next Ayah"} →
                </Button>
              )}

              {/* Result Overlay */}
              {showResult && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                  onClick={() => setShowResult(null)}
                >
                  <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center space-y-4 animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {showResult === "success" ? (
                      <>
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-10 h-10 text-primary animate-bounce" />
                        </div>
                        <h3 className={`text-xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
                          {isAr ? "أحسنت! ما شاء الله" : "Excellent! MashaAllah!"}
                        </h3>
                        {(() => {
                          const q = randomQuote(MOTIVATING_QUOTES_SUCCESS);
                          return (
                            <div className="bg-primary/5 rounded-xl p-4 space-y-1">
                              <p className="text-sm text-foreground italic">"{q.text}"</p>
                              <p className="text-xs text-accent font-medium">— {q.ref}</p>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                          <XCircle className="w-10 h-10 text-destructive" />
                        </div>
                        <h3 className={`text-xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
                          {isAr ? "حاول مرة أخرى" : "Try Again"}
                        </h3>
                        {(() => {
                          const q = randomQuote(MOTIVATING_QUOTES_RETRY);
                          return (
                            <div className="bg-accent/5 rounded-xl p-4 space-y-1">
                              <p className="text-sm text-foreground italic">"{q.text}"</p>
                              <p className="text-xs text-accent font-medium">— {q.ref}</p>
                            </div>
                          );
                        })()}
                      </>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => setShowResult(null)}>
                      {isAr ? "متابعة" : "Continue"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">{isAr ? "لا توجد آيات" : "No ayahs found"}</p>
          )}
        </div>
      )}

      {/* === DASHBOARD === */}
      {screen === "dashboard" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalMastered}</p>
              <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "آيات محفوظة" : "Ayahs Mastered"}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent">{dashboardData.length}</p>
              <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "آيات مُتدرب عليها" : "Ayahs Practiced"}
              </p>
            </div>
          </div>

          {/* Average accuracy */}
          {dashboardData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {Math.round(dashboardData.reduce((acc: number, d: any) => acc + (d.accuracy_score || 0), 0) / dashboardData.length)}%
              </p>
              <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "متوسط الدقة" : "Average Accuracy"}
              </p>
            </div>
          )}

          {/* Recent Practice */}
          <h3 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "التدريب الأخير" : "Recent Practice"}
          </h3>
          {dashboardData.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {isAr ? "لا توجد بيانات بعد. ابدأ التدريب!" : "No data yet. Start practicing!"}
            </p>
          ) : (
            dashboardData.slice(0, 20).map((item: any) => {
              const surah = SURAHS.find((s) => s.id === item.surah_id);
              return (
                <div key={item.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.mastered ? "bg-primary/10" : "bg-muted"}`}>
                    {item.mastered ? <Trophy className="w-5 h-5 text-primary" /> : <Target className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {surah?.name[language] || `Surah ${item.surah_id}`} — {isAr ? "آية" : "Ayah"} {item.ayah_from}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.repetitions} {isAr ? "تكرار" : "reps"} • {Math.round(item.accuracy_score)}% {isAr ? "دقة" : "accuracy"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default HafizMode;
