import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WelcomeOverlayProps {
  userName?: string;
  onComplete: () => void;
}

const ISLAMIC_GREETINGS = [
  { ar: "السلام عليكم ورحمة الله وبركاته", en: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh" },
  { ar: "أهلاً وسهلاً", en: "Welcome back" },
];

const WELCOME_DUAS = [
  { ar: "اللهم بارك لنا في علمنا", en: "O Allah, bless us in our knowledge", ref: "دعاء" },
  { ar: "رَبِّ زِدْنِي عِلْمًا", en: "My Lord, increase me in knowledge", ref: "طه ٢٠:١١٤" },
  { ar: "اللهم انفعنا بما علمتنا", en: "O Allah, benefit us with what You taught us", ref: "دعاء" },
];

const WelcomeOverlay = ({ userName, onComplete }: WelcomeOverlayProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [phase, setPhase] = useState<"greeting" | "dua" | "exit">("greeting");

  const greeting = ISLAMIC_GREETINGS[0];
  const dua = WELCOME_DUAS[Math.floor(Math.random() * WELCOME_DUAS.length)];
  const displayName = userName || (isAr ? "عبد الله" : "Seeker of Knowledge");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dua"), 1800);
    const t2 = setTimeout(() => setPhase("exit"), 3600);
    const t3 = setTimeout(onComplete, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.95), hsl(var(--background) / 0.98))",
      }}
    >
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 islamic-pattern opacity-10" />

      <div className="relative text-center space-y-6 px-6 max-w-md">
        {/* Bismillah calligraphy */}
        <p
          className={`text-2xl font-arabic text-primary-foreground/80 transition-all duration-700 ${
            phase === "greeting" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          ﷽
        </p>

        {/* Greeting */}
        <div
          className={`transition-all duration-700 ${
            phase === "greeting" ? "opacity-100 scale-100" : phase === "dua" ? "opacity-0 scale-95 -translate-y-8" : "opacity-0"
          }`}
        >
          <h1 className="text-3xl md:text-4xl font-bold font-arabic text-primary-foreground leading-relaxed">
            {greeting.ar}
          </h1>
          {!isAr && (
            <p className="text-lg text-primary-foreground/70 mt-2">{greeting.en}</p>
          )}
          <p className="text-xl text-accent mt-4 font-semibold">
            {isAr ? `مرحباً ${displayName}` : `Welcome, ${displayName}`}
          </p>
        </div>

        {/* Dua phase */}
        <div
          className={`absolute inset-0 flex items-center justify-center px-6 transition-all duration-700 ${
            phase === "dua" ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <div className="space-y-4 bg-primary-foreground/10 rounded-2xl p-6 backdrop-blur-sm border border-primary-foreground/20">
            <p className="text-2xl font-arabic text-primary-foreground leading-relaxed" dir="rtl">
              {dua.ar}
            </p>
            {!isAr && (
              <p className="text-base text-primary-foreground/70 italic">{dua.en}</p>
            )}
            <p className="text-xs text-accent font-medium">— {dua.ref}</p>
          </div>
        </div>

        {/* Decorative crescents */}
        <div className="absolute top-1/4 left-8 text-4xl text-primary-foreground/10 animate-pulse">☪</div>
        <div className="absolute bottom-1/4 right-8 text-3xl text-primary-foreground/10 animate-pulse" style={{ animationDelay: "0.5s" }}>☪</div>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
