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

const ArabicCourse = ({ onBack }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [done, setDone] = useState<Record<string, boolean>>(readProgress);
  const [openUnit, setOpenUnit] = useState<string>(UNITS[0].id);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const totalLessons = UNITS.reduce((n, u) => n + u.lessons.length, 0);
  const completedCount = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completedCount / totalLessons) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-14 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className={`text-lg font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "تعلّم العربية للقرآن" : "Arabic for the Qur'an"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalLessons} · {pct}%
            </p>
          </div>
          <GraduationCap className="w-6 h-6 text-accent" />
        </div>
        <div className="h-1 bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-24">
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className={`text-sm text-foreground/80 leading-relaxed ${isAr ? "font-arabic" : ""}`}>
              {isAr
                ? "دورة قصيرة لتقرأ القرآن بفهم. تدرّب على النطق بلمسة، وضع علامة على كل درس أتممته."
                : "A short, focused path to read the Qur'an with meaning. Tap any word to hear it and mark lessons as you go."}
            </p>
          </div>
        </div>

        {UNITS.map((unit) => {
          const unitDone = unit.lessons.filter((l) => done[l.id]).length;
          const unitPct = Math.round((unitDone / unit.lessons.length) * 100);
          const isOpen = openUnit === unit.id;
          return (
            <section key={unit.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpenUnit(isOpen ? "" : unit.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
              >
                <div>
                  <h2 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? unit.titleAr : unit.titleEn}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{unitDone}/{unit.lessons.length} · {unitPct}%</p>
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-muted grid place-items-center relative">
                  <span className="text-xs font-bold text-accent">{unitPct}%</span>
                </div>
              </button>
              {isOpen && (
                <ul className="divide-y divide-border">
                  {unit.lessons.map((l) => {
                    const complete = !!done[l.id];
                    return (
                      <li key={l.id} className="p-4 flex items-center gap-3">
                        <button
                          onClick={() => toggle(l.id)}
                          aria-label={complete ? "Mark incomplete" : "Mark complete"}
                          className={`w-10 h-10 rounded-full grid place-items-center shrink-0 transition-colors ${
                            complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-arabic text-2xl text-foreground leading-tight" dir="rtl">{l.ar}</p>
                          <p className="text-xs text-muted-foreground italic mt-0.5">{l.translit}</p>
                          <p className="text-sm text-foreground/80 mt-1">{l.en}</p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => speak(l.ar)} aria-label="Play">
                          <Volume2 className="w-5 h-5 text-accent" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default ArabicCourse;