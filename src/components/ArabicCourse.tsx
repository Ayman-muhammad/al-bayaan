import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft, Volume2, Sparkles, Heart, Flame, Star,
  Lock, Trophy, X, Check, BookOpen, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props { onBack: () => void }

type Lesson = {
  id: string;
  ar: string;
  translit: string;
  en: string;
  note?: string;
};

type Unit = {
  id: string;
  titleAr: string;
  titleEn: string;
  color: string; // from-... to-...
  lessons: Lesson[];
};

/**
 * A self-contained "Arabic for the Qur'an" starter course.
 * Progress is stored per-lesson in localStorage; each unit renders as a
 * clean card with playable pronunciation (Web Speech API) and a mark-complete
 * toggle. Content is intentionally short and Qur'an-centred, matching the
 * app's minimal aesthetic.
 */
const UNITS: Unit[] = [
  {
    id: "alphabet",
    titleAr: "الحروف الهجائية",
    titleEn: "The Arabic Alphabet",
    color: "from-emerald-500 to-teal-600",
    lessons: [
      { id: "a1", ar: "ا ب ت ث", translit: "alif · ba · ta · tha", en: "First 4 letters" },
      { id: "a2", ar: "ج ح خ", translit: "jeem · ḥa · kha", en: "Throat letters — group 1" },
      { id: "a3", ar: "د ذ ر ز", translit: "dal · dhal · ra · zay", en: "Tongue-tip letters" },
      { id: "a4", ar: "س ش ص ض", translit: "seen · sheen · ṣad · ḍad", en: "Whistle & heavy letters" },
      { id: "a5", ar: "ط ظ ع غ", translit: "ṭa · ẓa · ‘ayn · ghayn", en: "Heavy + throat — group 2" },
      { id: "a6", ar: "ف ق ك ل م", translit: "fa · qaf · kaf · lam · meem", en: "Mid mouth letters" },
      { id: "a7", ar: "ن ه و ي", translit: "noon · ha · waw · ya", en: "Closing letters" },
    ],
  },
  {
    id: "harakat",
    titleAr: "الحركات",
    titleEn: "Short Vowels (Harakāt)",
    color: "from-amber-500 to-orange-600",
    lessons: [
      { id: "h1", ar: "بَ بِ بُ", translit: "ba · bi · bu", en: "Fatḥa, Kasra, Ḍamma on ب" },
      { id: "h2", ar: "بً بٍ بٌ", translit: "ban · bin · bun", en: "Tanwīn — the 'n' sound" },
      { id: "h3", ar: "بْ", translit: "b (sukūn)", en: "Sukūn = no vowel, stop the sound" },
      { id: "h4", ar: "بّ", translit: "bb (shadda)", en: "Shadda = double the letter" },
    ],
  },
  {
    id: "words",
    titleAr: "كلمات من القرآن",
    titleEn: "Common Qur'anic Words",
    color: "from-sky-500 to-indigo-600",
    lessons: [
      { id: "w1", ar: "اللَّه", translit: "Allāh", en: "God — the One" },
      { id: "w2", ar: "الرَّحْمَٰن", translit: "Ar-Raḥmān", en: "The Most Merciful" },
      { id: "w3", ar: "الرَّحِيم", translit: "Ar-Raḥīm", en: "The Especially Merciful" },
      { id: "w4", ar: "رَبّ", translit: "Rabb", en: "Lord / Sustainer" },
      { id: "w5", ar: "قُلْ", translit: "Qul", en: "Say (command)" },
      { id: "w6", ar: "يَوْم", translit: "Yawm", en: "Day" },
      { id: "w7", ar: "كِتَاب", translit: "Kitāb", en: "Book" },
      { id: "w8", ar: "نُور", translit: "Nūr", en: "Light" },
      { id: "w9", ar: "صَبْر", translit: "Ṣabr", en: "Patience" },
      { id: "w10", ar: "شُكْر", translit: "Shukr", en: "Gratitude" },
    ],
  },
  {
    id: "fatiha",
    titleAr: "فهم سورة الفاتحة",
    titleEn: "Understand Al-Fātiḥa",
    color: "from-fuchsia-500 to-rose-600",
    lessons: [
      { id: "f1", ar: "بِسْمِ اللَّهِ", translit: "Bismillāh", en: "In the name of Allah" },
      { id: "f2", ar: "الْحَمْدُ لِلَّهِ", translit: "Al-ḥamdu lillāh", en: "All praise is for Allah" },
      { id: "f3", ar: "رَبِّ الْعَالَمِينَ", translit: "Rabbi-l-‘ālamīn", en: "Lord of the worlds" },
      { id: "f4", ar: "مَالِكِ يَوْمِ الدِّينِ", translit: "Māliki yawmi-d-dīn", en: "Master of the Day of Judgment" },
      { id: "f5", ar: "إِيَّاكَ نَعْبُدُ", translit: "Iyyāka na‘bud", en: "You alone we worship" },
      { id: "f6", ar: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", translit: "Ihdinā-ṣ-ṣirāṭa-l-mustaqīm", en: "Guide us to the straight path" },
    ],
  },
];

const STORAGE_KEY = "al-bayani-arabic-progress";

const readProgress = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
};

const speak = (text: string) => {
  const s = window.speechSynthesis;
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  u.rate = 0.75;
  s.speak(u);
};

// ---------- Duolingo-style state ----------

type Stats = { xp: number; streak: number; hearts: number; lastActive: string };
const STATS_KEY = "al-bayani-arabic-stats";
const MAX_HEARTS = 5;

const readStats = (): Stats => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { xp: 0, streak: 0, hearts: MAX_HEARTS, lastActive: "" };
};
const writeStats = (s: Stats) => {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {}
};

// ---------- Exercise generation ----------

type Exercise =
  | { kind: "listen"; prompt: string; answer: string; choices: string[] }         // hear Arabic, pick meaning
  | { kind: "translate"; prompt: string; answer: string; choices: string[] }      // Arabic shown, pick English
  | { kind: "reverse"; prompt: string; answer: string; choices: string[] };       // English shown, pick Arabic

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildExercises = (lesson: Lesson, pool: Lesson[]): Exercise[] => {
  const distractorsEn = shuffle(pool.filter((l) => l.id !== lesson.id)).slice(0, 3).map((l) => l.en);
  const distractorsAr = shuffle(pool.filter((l) => l.id !== lesson.id)).slice(0, 3).map((l) => l.ar);
  return [
    {
      kind: "listen",
      prompt: lesson.ar,
      answer: lesson.en,
      choices: shuffle([lesson.en, ...distractorsEn]),
    },
    {
      kind: "translate",
      prompt: lesson.ar,
      answer: lesson.en,
      choices: shuffle([lesson.en, ...distractorsEn]),
    },
    {
      kind: "reverse",
      prompt: lesson.en,
      answer: lesson.ar,
      choices: shuffle([lesson.ar, ...distractorsAr]),
    },
  ];
};

// ---------- Lesson Player (modal) ----------

interface PlayerProps {
  unit: Unit;
  lesson: Lesson;
  onClose: () => void;
  onComplete: (xp: number) => void;
}

const LessonPlayer = ({ unit, lesson, onClose, onComplete }: PlayerProps) => {
  const exercises = useMemo(() => buildExercises(lesson, unit.lessons), [lesson, unit]);
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [state, setState] = useState<"pick" | "right" | "wrong">("pick");
  const [correct, setCorrect] = useState(0);

  const ex = exercises[i];
  const isLast = i >= exercises.length - 1;
  const progressPct = Math.round(((i + (state !== "pick" ? 1 : 0)) / exercises.length) * 100);

  useEffect(() => {
    if (ex.kind === "listen") speak(lesson.ar);
  }, [i, ex.kind, lesson.ar]);

  const check = () => {
    if (!selected) return;
    if (selected === ex.answer) {
      setState("right");
      setCorrect((c) => c + 1);
    } else {
      setState("wrong");
    }
  };

  const next = () => {
    if (isLast) {
      const xp = 10 + correct * 3;
      onComplete(xp);
      return;
    }
    setI((n) => n + 1);
    setSelected(null);
    setState("pick");
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-fade-in">
      {/* Top bar: close + progress + hearts */}
      <header className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onClose} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${unit.color} transition-all duration-500`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-1 text-rose-500 font-bold">
          <Heart className="w-5 h-5 fill-rose-500" />
          <span className="text-sm">{readStats().hearts}</span>
        </div>
      </header>

      {/* Exercise */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-40">
        <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-4">
          {ex.kind === "listen" && "Tap what you hear"}
          {ex.kind === "translate" && "What does this mean?"}
          {ex.kind === "reverse" && "Choose the Arabic"}
        </p>

        {ex.kind === "listen" ? (
          <button
            onClick={() => speak(lesson.ar)}
            className={`w-full max-w-md mx-auto rounded-3xl p-8 flex items-center justify-center gap-4 bg-gradient-to-br ${unit.color} text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-transform`}
          >
            <Volume2 className="w-10 h-10" />
            <span className="text-lg font-bold">Play audio</span>
          </button>
        ) : (
          <div className="rounded-3xl border-2 border-border bg-card p-8 text-center max-w-md mx-auto">
            {ex.kind === "translate" ? (
              <>
                <p className="font-arabic text-5xl leading-tight text-foreground" dir="rtl">{ex.prompt}</p>
                <p className="text-xs italic text-muted-foreground mt-3">{lesson.translit}</p>
              </>
            ) : (
              <p className="text-3xl font-bold text-foreground">{ex.prompt}</p>
            )}
            <button
              onClick={() => speak(lesson.ar)}
              className="mt-5 inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <Volume2 className="w-4 h-4" /> Hear it
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-md mx-auto">
          {ex.choices.map((c) => {
            const isSel = selected === c;
            const isAnswer = c === ex.answer;
            const showRight = state === "right" && isSel;
            const showWrong = state === "wrong" && isSel;
            const revealAnswer = state === "wrong" && isAnswer;
            return (
              <button
                key={c}
                disabled={state !== "pick"}
                onClick={() => setSelected(c)}
                className={[
                  "rounded-2xl border-2 px-4 py-4 text-left font-semibold transition-all",
                  "shadow-[0_4px_0_hsl(var(--border))] active:translate-y-[2px] active:shadow-none",
                  isSel && state === "pick" && "border-accent bg-accent/10",
                  !isSel && state === "pick" && "border-border bg-card hover:border-accent/60",
                  showRight && "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  showWrong && "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400",
                  revealAnswer && "border-emerald-500 bg-emerald-500/10",
                  state !== "pick" && !isSel && !revealAnswer && "opacity-60",
                ].filter(Boolean).join(" ")}
              >
                <span className={ex.kind === "reverse" ? "font-arabic text-2xl" : "text-base"} dir={ex.kind === "reverse" ? "rtl" : "ltr"}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer: check/continue */}
      <div
        className={`fixed bottom-0 inset-x-0 border-t-2 px-5 py-4 transition-colors ${
          state === "right"
            ? "bg-emerald-500/10 border-emerald-500"
            : state === "wrong"
            ? "bg-rose-500/10 border-rose-500"
            : "bg-background border-border"
        }`}
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            {state === "right" && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <Check className="w-5 h-5" /> Excellent!
              </div>
            )}
            {state === "wrong" && (
              <div className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                Answer: <span className="font-arabic text-lg" dir="auto">{ex.answer}</span>
              </div>
            )}
          </div>
          {state === "pick" ? (
            <Button
              size="lg"
              disabled={!selected}
              onClick={check}
              className={`min-w-32 rounded-2xl font-bold uppercase tracking-wider ${
                selected ? `bg-gradient-to-br ${unit.color} text-white shadow-lg hover:opacity-90` : ""
              }`}
            >
              Check
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={next}
              className={`min-w-32 rounded-2xl font-bold uppercase tracking-wider ${
                state === "right" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"
              }`}
            >
              {isLast ? "Finish" : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Completion celebration ----------

const CompletionCard = ({ xp, onClose }: { xp: number; onClose: () => void }) => (
  <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur grid place-items-center px-6 animate-fade-in">
    <div className="max-w-sm w-full rounded-3xl border-2 border-accent/40 bg-card p-8 text-center shadow-2xl animate-scale-in">
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shadow-lg animate-confetti">
        <Trophy className="w-10 h-10 text-white" />
      </div>
      <h3 className="mt-4 text-2xl font-bold text-foreground">Lesson complete!</h3>
      <p className="text-sm text-muted-foreground mt-1">May Allah reward your effort.</p>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">XP earned</p>
          <p className="text-2xl font-bold text-accent">+{xp}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Great job</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {[0, 1, 2].map((n) => (
              <Star key={n} className="w-6 h-6 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
      </div>
      <Button onClick={onClose} className="w-full mt-6 h-12 rounded-2xl font-bold uppercase tracking-wider">
        Continue
      </Button>
    </div>
  </div>
);

// ---------- Main course view (Duolingo-style path) ----------

const ArabicCourse = ({ onBack }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [done, setDone] = useState<Record<string, boolean>>(readProgress);
  const [stats, setStats] = useState<Stats>(readStats);
  const [active, setActive] = useState<{ unit: Unit; lesson: Lesson } | null>(null);
  const [celebrateXp, setCelebrateXp] = useState<number | null>(null);

  const totalLessons = UNITS.reduce((n, u) => n + u.lessons.length, 0);
  const completedCount = Object.values(done).filter(Boolean).length;

  const completeLesson = (lesson: Lesson, xp: number) => {
    const nextDone = { ...done, [lesson.id]: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDone));
    setDone(nextDone);

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const nextStreak =
      stats.lastActive === today ? stats.streak :
      stats.lastActive === yesterday ? stats.streak + 1 : 1;
    const next: Stats = { ...stats, xp: stats.xp + xp, streak: nextStreak, lastActive: today };
    writeStats(next);
    setStats(next);
    setActive(null);
    setCelebrateXp(xp);
  };

  // Build a linear list of steps across units so we can lock everything after
  // the first uncompleted step — the classic Duolingo path model.
  const flat = useMemo(
    () => UNITS.flatMap((u) => u.lessons.map((l) => ({ unit: u, lesson: l }))),
    []
  );
  const activeIdx = flat.findIndex(({ lesson }) => !done[lesson.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-14 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className={`text-base font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "تعلّم العربية للقرآن" : "Arabic for the Qur'an"}
            </h1>
            <p className="text-[11px] text-muted-foreground">{completedCount}/{totalLessons} lessons</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1 text-orange-500"><Flame className="w-4 h-4" /> {stats.streak}</span>
            <span className="flex items-center gap-1 text-amber-500"><Star className="w-4 h-4 fill-amber-500" /> {stats.xp}</span>
            <span className="flex items-center gap-1 text-rose-500"><Heart className="w-4 h-4 fill-rose-500" /> {stats.hearts}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* Intro card */}
        <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-primary/5 to-transparent p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-primary grid place-items-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <p className={`text-sm text-foreground/85 leading-relaxed ${isAr ? "font-arabic" : ""}`}>
              {isAr
                ? "طريق تفاعلي لتعلّم العربية القرآنية. أكمل كل درس لفتح ما بعده."
                : "An interactive path to Qur'anic Arabic. Finish each lesson to unlock the next."}
            </p>
          </div>
        </div>

        {/* Units + Path */}
        {UNITS.map((unit, uIdx) => {
          const unitDone = unit.lessons.filter((l) => done[l.id]).length;
          const unitPct = Math.round((unitDone / unit.lessons.length) * 100);
          return (
            <section key={unit.id} className="mb-10">
              <div className={`rounded-3xl bg-gradient-to-r ${unit.color} p-5 shadow-lg text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest opacity-80">Unit {uIdx + 1}</p>
                    <h2 className={`text-lg font-black ${isAr ? "font-arabic" : ""}`}>
                      {isAr ? unit.titleAr : unit.titleEn}
                    </h2>
                  </div>
                  <div className="text-right">
                    <BookOpen className="w-6 h-6 ml-auto opacity-90" />
                    <p className="text-xs mt-1 opacity-90">{unitDone}/{unit.lessons.length} · {unitPct}%</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
                  <div className="h-full bg-white" style={{ width: `${unitPct}%` }} />
                </div>
              </div>

              {/* Zig-zag path of lesson nodes */}
              <div className="mt-6 relative">
                {unit.lessons.map((l, li) => {
                  const flatIdx = flat.findIndex((f) => f.lesson.id === l.id);
                  const isDone = !!done[l.id];
                  const isActive = flatIdx === activeIdx;
                  const isLocked = !isDone && !isActive;
                  // Zig-zag horizontal offset for the classic Duo path feel.
                  const cycle = li % 6;
                  const offsets = [0, 60, 90, 60, 0, -60];
                  const dx = offsets[cycle];
                  return (
                    <div key={l.id} className="flex justify-center mb-6" style={{ transform: `translateX(${dx}px)` }}>
                      <button
                        disabled={isLocked}
                        onClick={() => setActive({ unit, lesson: l })}
                        aria-label={isAr ? l.ar : l.en}
                        className={[
                          "relative w-20 h-20 rounded-full grid place-items-center transition-all",
                          "shadow-[0_6px_0_rgba(0,0,0,0.15)] active:translate-y-[3px] active:shadow-none",
                          isDone && `bg-gradient-to-br ${unit.color} text-white`,
                          isActive && `bg-gradient-to-br ${unit.color} text-white ring-4 ring-accent/50 animate-pulse`,
                          isLocked && "bg-muted text-muted-foreground",
                        ].filter(Boolean).join(" ")}
                      >
                        {isDone ? (
                          <Crown className="w-8 h-8 drop-shadow" />
                        ) : isLocked ? (
                          <Lock className="w-6 h-6" />
                        ) : (
                          <Star className="w-8 h-8" />
                        )}
                        {isActive && (
                          <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-foreground text-background text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shadow-lg">
                            Start
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {activeIdx === -1 && (
          <div className="rounded-3xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 to-primary/10 p-6 text-center">
            <Trophy className="w-10 h-10 mx-auto text-accent" />
            <h3 className="mt-3 text-lg font-bold">Course complete — MashaAllah!</h3>
            <p className="text-sm text-muted-foreground mt-1">Keep reviewing to strengthen your recall.</p>
          </div>
        )}
      </main>

      {active && (
        <LessonPlayer
          unit={active.unit}
          lesson={active.lesson}
          onClose={() => setActive(null)}
          onComplete={(xp) => completeLesson(active.lesson, xp)}
        />
      )}
      {celebrateXp !== null && (
        <CompletionCard xp={celebrateXp} onClose={() => setCelebrateXp(null)} />
      )}
    </div>
  );
};

export default ArabicCourse;