import { useState } from "react";
import { ArrowLeft, Heart, BookOpen, HandHeart, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props { onBack: () => void }

type Step = {
  id: string;
  title: string;
  desc: string;
  arabic?: string;
  translit?: string;
};

/**
 * Warm, gentle "New Muslim" (revert) support space.
 * A practical first-30-days path + core beliefs + prayer basics + FAQ.
 * No shaming, no jargon — every step is optional and marks its own progress.
 */
const SHAHADA: Step = {
  id: "shahada",
  title: "The Shahada — the declaration of faith",
  desc: "There is no god worthy of worship except Allah, and Muhammad is His Messenger.",
  arabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ",
  translit: "Ash-hadu an lā ilāha illa-llāh, wa ash-hadu anna Muḥammadan rasūlu-llāh",
};

const FIRST_30: Step[] = [
  { id: "d1", title: "Learn the meaning of Shahada", desc: "Reflect on tawḥīd — Allah alone deserves worship." },
  { id: "d2", title: "Perform ghusl (full bath) with intention", desc: "A physical fresh start after entering Islam." },
  { id: "d3", title: "Memorise Surah Al-Fātiḥa", desc: "You'll recite it in every unit of prayer. Start with the transliteration if needed." },
  { id: "d4", title: "Learn wuḍū' (ablution)", desc: "Wash hands, mouth, nose, face, arms, wipe head, wash feet — right side first." },
  { id: "d5", title: "Pray Fajr on time for 7 days straight", desc: "Even one raka‘ah counts while you're learning. Consistency > perfection." },
  { id: "d6", title: "Choose 3 short surahs to memorise", desc: "Suggested: Al-Ikhlāṣ, Al-Falaq, An-Nās." },
  { id: "d7", title: "Find a local mosque or online circle", desc: "Community is protection. Say salām — Muslims will help." },
  { id: "d8", title: "Read one page of Qur'an daily with translation", desc: "Use Al-Bayan's reader. 5 minutes is enough." },
  { id: "d9", title: "Learn 3 daily adhkār", desc: "Morning, evening, and before sleep. Al-Bayan has them ready." },
  { id: "d10", title: "Give one small ṣadaqah", desc: "Even a smile is charity. Purify wealth and heart." },
];

const PILLARS: Step[] = [
  { id: "p1", title: "Shahada", desc: "Declaration of faith" },
  { id: "p2", title: "Ṣalāh", desc: "Five daily prayers" },
  { id: "p3", title: "Zakāh", desc: "Annual purifying charity (2.5% of savings)" },
  { id: "p4", title: "Ṣawm", desc: "Fasting the month of Ramadān" },
  { id: "p5", title: "Ḥajj", desc: "Pilgrimage to Makkah — once if able" },
];

const FAQ = [
  {
    q: "Do I need to change my name?",
    a: "No — unless it carries a meaning against Islamic values. The Prophet ﷺ kept many Companions' names.",
  },
  {
    q: "What about my non-Muslim family?",
    a: "Continue kindness and dutiful ties (birr). Islam commands excellent treatment of parents even if they aren't Muslim.",
  },
  {
    q: "Are past sins forgiven?",
    a: "Yes — accepting Islam wipes all previous sins. 'Islam wipes away what came before it.' (Ṣaḥīḥ Muslim 121)",
  },
  {
    q: "How do I pray if I don't know Arabic yet?",
    a: "Learn Al-Fātiḥa first using transliteration and audio. Allah accepts sincere effort — keep progressing.",
  },
  {
    q: "What if I make mistakes?",
    a: "You will — everyone does. Turn back to Allah (tawba). He loves those who return to Him repeatedly.",
  },
];

const STORAGE_KEY = "al-bayani-revert-progress";
const readProgress = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
};

const RevertSection = ({ onBack }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [done, setDone] = useState<Record<string, boolean>>(readProgress);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completed = FIRST_30.filter((s) => done[s.id]).length;
  const pct = Math.round((completed / FIRST_30.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-14 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className={`text-lg font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "مرحباً بك في الإسلام" : "Welcome to Islam"}
            </h1>
            <p className="text-xs text-muted-foreground">A gentle path for new & returning Muslims</p>
          </div>
          <Heart className="w-6 h-6 text-accent" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Warm welcome hero */}
        <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-accent/20 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-accent shrink-0 mt-1" />
            <div>
              <p className="text-xs uppercase tracking-widest text-accent font-semibold">﷽</p>
              <h2 className="text-2xl font-bold text-foreground mt-2 leading-tight">
                You are not alone on this journey.
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Take one step at a time. Islam is a mercy — start where you are, learn what you can, and turn to
                Allah when you stumble. Every sincere effort is counted.
              </p>
            </div>
          </div>
        </section>

        {/* Shahada card */}
        <section className="rounded-2xl border-2 border-accent/40 bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">The Shahada</p>
          <p dir="rtl" className="font-arabic text-2xl sm:text-3xl text-foreground leading-relaxed text-center">
            {SHAHADA.arabic}
          </p>
          <p className="text-xs italic text-muted-foreground text-center mt-3">{SHAHADA.translit}</p>
          <p className="text-sm text-foreground/85 mt-3 text-center">{SHAHADA.desc}</p>
        </section>

        {/* First 30 days */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              First 30 days
            </h3>
            <span className="text-xs text-muted-foreground">{completed}/{FIRST_30.length} · {pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="space-y-2">
            {FIRST_30.map((s, i) => {
              const complete = !!done[s.id];
              return (
                <li key={s.id}>
                  <button
                    onClick={() => toggle(s.id)}
                    className={`w-full text-left rounded-xl border p-3 flex gap-3 transition-all ${
                      complete ? "bg-primary/10 border-primary/40" : "bg-card border-border hover:border-accent/40"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 shrink-0 rounded-full grid place-items-center text-xs font-bold ${
                        complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {complete ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-foreground ${complete ? "line-through opacity-70" : ""}`}>
                        {s.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 5 Pillars */}
        <section className="rounded-2xl bg-card border border-border p-5">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <HandHeart className="w-5 h-5 text-primary" />
            The Five Pillars
          </h3>
          <ol className="grid sm:grid-cols-2 gap-3">
            {PILLARS.map((p, i) => (
              <li key={p.id} className="flex gap-3 p-3 rounded-xl bg-muted/40">
                <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold grid place-items-center shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section>
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            Common questions
          </h3>
          <ul className="space-y-2">
            {FAQ.map((f, i) => (
              <li key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
                >
                  <span className="font-medium text-foreground pr-3">{f.q}</span>
                  <span className="text-accent shrink-0">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default RevertSection;