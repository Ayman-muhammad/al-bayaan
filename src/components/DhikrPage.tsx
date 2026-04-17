import { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BookHeart,
  Search,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DhikrPageProps {
  onBack: () => void;
}

type Screen = "menu" | "tasbih" | "duas" | "dua-detail";

interface DhikrPreset {
  id: string;
  labelAr: string;
  labelEn: string;
  phraseAr: string;
  translitEn: string;
  meaningEn: string;
  target: number;
}

interface Dua {
  id: string;
  categoryAr: string;
  categoryEn: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  translitEn: string;
  meaningEn: string;
  reference: string;
}

const DHIKR_PRESETS: DhikrPreset[] = [
  {
    id: "subhanallah",
    labelAr: "سبحان الله",
    labelEn: "SubhanAllah",
    phraseAr: "سُبْحَانَ ٱللَّٰهِ",
    translitEn: "Subhan-Allah",
    meaningEn: "Glory be to Allah",
    target: 33,
  },
  {
    id: "alhamdulillah",
    labelAr: "الحمد لله",
    labelEn: "Alhamdulillah",
    phraseAr: "ٱلْحَمْدُ لِلَّٰهِ",
    translitEn: "Al-hamdu lillah",
    meaningEn: "All praise is due to Allah",
    target: 33,
  },
  {
    id: "allahuakbar",
    labelAr: "الله أكبر",
    labelEn: "Allahu Akbar",
    phraseAr: "ٱللَّٰهُ أَكْبَرُ",
    translitEn: "Allahu Akbar",
    meaningEn: "Allah is the Greatest",
    target: 34,
  },
  {
    id: "lailahaillallah",
    labelAr: "لا إله إلا الله",
    labelEn: "La ilaha illallah",
    phraseAr: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ",
    translitEn: "La ilaha illa-llah",
    meaningEn: "There is no god but Allah",
    target: 100,
  },
  {
    id: "istighfar",
    labelAr: "أستغفر الله",
    labelEn: "Astaghfirullah",
    phraseAr: "أَسْتَغْفِرُ ٱللَّٰهَ",
    translitEn: "Astaghfirullah",
    meaningEn: "I seek forgiveness from Allah",
    target: 100,
  },
  {
    id: "salawat",
    labelAr: "اللهم صلِّ على محمد",
    labelEn: "Salawat",
    phraseAr: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ",
    translitEn: "Allahumma salli ala Muhammad",
    meaningEn: "O Allah, send blessings upon Muhammad ﷺ",
    target: 100,
  },
];

const DUAS: Dua[] = [
  {
    id: "morning-1",
    categoryAr: "أذكار الصباح",
    categoryEn: "Morning",
    titleAr: "سيد الاستغفار",
    titleEn: "Master of Seeking Forgiveness",
    textAr:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.",
    translitEn:
      "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana ‘abduka…",
    meaningEn:
      "O Allah, You are my Lord; none has the right to be worshipped except You. You created me and I am Your servant… Forgive me, for none forgives sins except You.",
    reference: "Sahih al-Bukhari 6306",
  },
  {
    id: "morning-2",
    categoryAr: "أذكار الصباح",
    categoryEn: "Morning",
    titleAr: "الإخلاص والمعوذتين",
    titleEn: "Three Quls (3x morning & evening)",
    textAr:
      "قُلْ هُوَ ٱللَّهُ أَحَدٌ… قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ… قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ…",
    translitEn: "Surahs 112, 113, 114 — recited three times each",
    meaningEn: "Protection from all evil, morning and evening.",
    reference: "Abu Dawud 5082, Tirmidhi 3575",
  },
  {
    id: "evening-1",
    categoryAr: "أذكار المساء",
    categoryEn: "Evening",
    titleAr: "آية الكرسي",
    titleEn: "Ayat al-Kursi",
    textAr:
      "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ…",
    translitEn: "Allahu la ilaha illa huwa, al-Hayyu al-Qayyum…",
    meaningEn:
      "Whoever recites Ayat al-Kursi after every obligatory prayer, nothing will keep him from Paradise except death.",
    reference: "An-Nasa’i — al-Kubra 9928",
  },
  {
    id: "sleep-1",
    categoryAr: "قبل النوم",
    categoryEn: "Before Sleep",
    titleAr: "دعاء النوم",
    titleEn: "Before Sleeping",
    textAr: "بِٱسْمِكَ ٱللَّهُمَّ أَمُوتُ وَأَحْيَا",
    translitEn: "Bismika Allahumma amutu wa ahya",
    meaningEn: "In Your name, O Allah, I die and I live.",
    reference: "Sahih al-Bukhari 6324",
  },
  {
    id: "sleep-2",
    categoryAr: "قبل النوم",
    categoryEn: "Before Sleep",
    titleAr: "المعوذات قبل النوم",
    titleEn: "Three Quls on Hands",
    textAr: "قُلْ هُوَ ٱللَّهُ أَحَدٌ + ٱلْفَلَقِ + ٱلنَّاسِ (3x)",
    translitEn: "Recite 112, 113, 114 three times, wipe over body",
    meaningEn:
      "The Prophet ﷺ would recite the three Quls, blow in his hands, and wipe over himself before sleeping.",
    reference: "Sahih al-Bukhari 5017",
  },
  {
    id: "anxiety-1",
    categoryAr: "عند الضيق",
    categoryEn: "Anxiety & Distress",
    titleAr: "دعاء الهمّ والحزن",
    titleEn: "Relief from Worry",
    textAr:
      "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ… أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ… أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي.",
    translitEn: "Allahumma inni ‘abduka, ibnu ‘abdika…",
    meaningEn:
      "Make the Quran the spring of my heart, the light of my chest, the banisher of my sorrow and the remover of my worry.",
    reference: "Musnad Ahmad 3712 — Sahih",
  },
  {
    id: "travel-1",
    categoryAr: "السفر",
    categoryEn: "Travel",
    titleAr: "دعاء السفر",
    titleEn: "When Setting Off",
    textAr:
      "سُبْحَانَ ٱلَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّآ إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ",
    translitEn: "Subhana-lladhi sakhkhara lana hadha…",
    meaningEn:
      "Glory be to Him Who has subjected this to us, and we could never have accomplished it. Indeed, to our Lord we will return.",
    reference: "Sahih Muslim 1342",
  },
  {
    id: "eating-1",
    categoryAr: "الطعام",
    categoryEn: "Eating",
    titleAr: "قبل الأكل",
    titleEn: "Before Eating",
    textAr: "بِسْمِ ٱللَّهِ",
    translitEn: "Bismillah",
    meaningEn: "In the name of Allah.",
    reference: "Abu Dawud 3767 — Sahih",
  },
  {
    id: "eating-2",
    categoryAr: "الطعام",
    categoryEn: "Eating",
    titleAr: "بعد الأكل",
    titleEn: "After Eating",
    textAr:
      "ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    translitEn: "Al-hamdu lillahi-lladhi at‘amani hadha…",
    meaningEn:
      "Praise be to Allah Who has fed me this and provided for me without any might or power on my part.",
    reference: "Abu Dawud 4023 — Sahih",
  },
  {
    id: "rain-1",
    categoryAr: "المطر",
    categoryEn: "Rain",
    titleAr: "عند نزول المطر",
    titleEn: "When It Rains",
    textAr: "اللَّهُمَّ صَيِّبًا نَافِعًا",
    translitEn: "Allahumma sayyiban nafi‘a",
    meaningEn: "O Allah, let it be a beneficial rain cloud.",
    reference: "Sahih al-Bukhari 1032",
  },
];

const DhikrPage = ({ onBack }: DhikrPageProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [screen, setScreen] = useState<Screen>("menu");
  const [activePreset, setActivePreset] = useState<DhikrPreset | null>(null);
  const [count, setCount] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [duaFilter, setDuaFilter] = useState("");
  const [selectedDua, setSelectedDua] = useState<Dua | null>(null);
  const milestoneRef = useRef<number>(0);

  // Load saved session total from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("al-bayani-dhikr-total");
    if (raw) setSessionTotal(parseInt(raw, 10) || 0);
  }, []);

  const persistTotal = (next: number) => {
    setSessionTotal(next);
    localStorage.setItem("al-bayani-dhikr-total", String(next));
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  const increment = () => {
    if (!activePreset) return;
    const next = count + 1;
    setCount(next);
    persistTotal(sessionTotal + 1);

    // Milestone haptics & feedback
    if (next === activePreset.target) {
      vibrate([60, 40, 60, 40, 120]);
      toast({
        title: isAr ? "أحسنت! ما شاء الله" : "MashaAllah — Complete",
        description: `${activePreset.translitEn} × ${activePreset.target}`,
      });
      milestoneRef.current = next;
    } else if (next % 33 === 0) {
      vibrate([30, 20, 30]);
    } else {
      vibrate(15);
    }
  };

  const resetCount = () => {
    setCount(0);
    milestoneRef.current = 0;
  };

  const startPreset = (preset: DhikrPreset) => {
    setActivePreset(preset);
    setCount(0);
    milestoneRef.current = 0;
    setScreen("tasbih");
  };

  const filteredDuas = useMemo(() => {
    if (!duaFilter.trim()) return DUAS;
    const q = duaFilter.toLowerCase();
    return DUAS.filter(
      (d) =>
        d.titleEn.toLowerCase().includes(q) ||
        d.titleAr.includes(duaFilter) ||
        d.categoryEn.toLowerCase().includes(q) ||
        d.meaningEn.toLowerCase().includes(q),
    );
  }, [duaFilter]);

  const duasByCategory = useMemo(() => {
    const map = new Map<string, Dua[]>();
    filteredDuas.forEach((d) => {
      const key = isAr ? d.categoryAr : d.categoryEn;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return Array.from(map.entries());
  }, [filteredDuas, isAr]);

  const goBack = () => {
    if (screen === "dua-detail") {
      setSelectedDua(null);
      setScreen("duas");
    } else if (screen === "tasbih" || screen === "duas") {
      setScreen("menu");
    } else {
      onBack();
    }
  };

  // Progress ring calculation
  const progressPct = activePreset
    ? Math.min(100, (count / activePreset.target) * 100)
    : 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-3 sm:px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1
          className={`font-semibold text-foreground truncate ${
            isAr ? "font-arabic" : ""
          }`}
        >
          {screen === "menu" && (isAr ? "الأذكار والأدعية" : "Dhikr & Dua")}
          {screen === "tasbih" && (isAr ? "السبحة" : "Tasbih")}
          {screen === "duas" && (isAr ? "حصن المسلم" : "Hisnul Muslim")}
          {screen === "dua-detail" &&
            (isAr ? selectedDua?.titleAr : selectedDua?.titleEn)}
        </h1>
      </header>

      {/* === MENU === */}
      {screen === "menu" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="text-center py-4 sm:py-6 space-y-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h2
              className={`text-xl sm:text-2xl font-bold text-foreground ${
                isAr ? "font-arabic" : ""
              }`}
            >
              {isAr ? "الأذكار والأدعية" : "Dhikr & Dua"}
            </h2>
            <p
              className={`text-sm text-muted-foreground max-w-sm mx-auto px-2 ${
                isAr ? "font-arabic" : ""
              }`}
            >
              {isAr
                ? "سبّح واذكر الله مع العداد الرقمي وادعُ بأدعية السنة"
                : "Digital tasbih with haptics and authentic duas from the Sunnah"}
            </p>
          </div>

          {/* Session total */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-border rounded-2xl p-4 text-center">
            <p
              className={`text-xs text-muted-foreground mb-1 ${
                isAr ? "font-arabic" : ""
              }`}
            >
              {isAr ? "إجمالي التسبيحات" : "Total Dhikr Count"}
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-gradient-gold">
              {sessionTotal.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DHIKR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => startPreset(preset)}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-arabic text-lg text-foreground group-hover:text-primary transition-colors" dir="rtl">
                      {preset.phraseAr}
                    </p>
                    <p
                      className={`text-xs text-muted-foreground mt-1 ${
                        isAr ? "font-arabic" : ""
                      }`}
                    >
                      {isAr ? preset.labelAr : preset.translitEn}
                    </p>
                  </div>
                  <div className="shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    ×{preset.target}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setScreen("duas")}
            className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all flex items-center gap-3 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <BookHeart className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-foreground ${
                  isAr ? "font-arabic" : ""
                }`}
              >
                {isAr ? "حصن المسلم" : "Hisnul Muslim"}
              </h3>
              <p
                className={`text-xs text-muted-foreground ${
                  isAr ? "font-arabic" : ""
                }`}
              >
                {isAr
                  ? "أدعية الصباح، المساء، النوم، السفر والمزيد"
                  : "Morning, evening, sleep, travel & more"}
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground shrink-0 ${isAr ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {/* === TASBIH === */}
      {screen === "tasbih" && activePreset && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-6 sm:gap-8 scrollbar-thin">
          <div className="text-center space-y-2 w-full max-w-sm">
            <p className="font-arabic text-2xl sm:text-3xl text-foreground break-words" dir="rtl">
              {activePreset.phraseAr}
            </p>
            <p className="text-sm text-muted-foreground italic">
              {activePreset.translitEn}
            </p>
            <p className={`text-xs text-muted-foreground px-2 ${isAr ? "font-arabic" : ""}`}>
              {isAr ? activePreset.labelAr : activePreset.meaningEn}
            </p>
          </div>

          {/* Progress ring + tap area */}
          <button
            onClick={increment}
            aria-label="Count"
            className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex items-center justify-center active:scale-95 transition-transform touch-none select-none"
          >
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="6"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progressPct / 100)}`}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center">
              <span className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">
                {count}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                / {activePreset.target}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={resetCount}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isAr ? "إعادة" : "Reset"}
            </Button>
            <Button
              variant="hero"
              size="lg"
              onClick={increment}
              className="min-w-[140px]"
            >
              + {isAr ? "تسبيح" : "Count"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center max-w-xs">
            {isAr
              ? "انقر أي مكان في الدائرة للعدّ"
              : "Tap anywhere in the circle to count"}
          </p>
        </div>
      )}

      {/* === DUAS LIST === */}
      {screen === "duas" && (
        <>
          <div className="p-3 sm:p-4 border-b border-border bg-card shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={duaFilter}
                onChange={(e) => setDuaFilter(e.target.value)}
                placeholder={isAr ? "ابحث عن دعاء..." : "Search duas..."}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5 scrollbar-thin">
            {duasByCategory.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                {isAr ? "لا توجد نتائج" : "No results found"}
              </p>
            )}
            {duasByCategory.map(([category, duas]) => (
              <div key={category} className="space-y-2">
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider text-accent px-1 ${
                    isAr ? "font-arabic" : ""
                  }`}
                >
                  {category}
                </h3>
                <div className="space-y-2">
                  {duas.map((dua) => (
                    <button
                      key={dua.id}
                      onClick={() => {
                        setSelectedDua(dua);
                        setScreen("dua-detail");
                      }}
                      className="w-full bg-card border border-border rounded-xl p-3 sm:p-4 hover:border-primary/30 transition-colors text-left space-y-1"
                    >
                      <p
                        className={`font-medium text-sm text-foreground ${
                          isAr ? "font-arabic text-right" : ""
                        }`}
                        dir={isAr ? "rtl" : "ltr"}
                      >
                        {isAr ? dua.titleAr : dua.titleEn}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {dua.meaningEn}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* === DUA DETAIL === */}
      {screen === "dua-detail" && selectedDua && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-accent uppercase tracking-wider">
                {isAr ? selectedDua.categoryAr : selectedDua.categoryEn}
              </p>
              <h2
                className={`text-lg sm:text-xl font-bold text-foreground mt-1 ${
                  isAr ? "font-arabic" : ""
                }`}
              >
                {isAr ? selectedDua.titleAr : selectedDua.titleEn}
              </h2>
            </div>

            <div className="border-t border-border pt-4">
              <p
                className="font-arabic text-xl sm:text-2xl text-foreground leading-[2] text-right break-words"
                dir="rtl"
              >
                {selectedDua.textAr}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Transliteration
              </p>
              <p className="text-sm italic text-foreground/80">
                {selectedDua.translitEn}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Meaning
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {selectedDua.meaningEn}
              </p>
            </div>

            <div className="border-t border-border pt-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs font-medium text-accent">
                {selectedDua.reference}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DhikrPage;
