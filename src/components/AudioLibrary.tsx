import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, BookOpen, User } from "lucide-react";

interface AudioTrack {
  id: string;
  title: { en: string; ar: string };
  scholar: { en: string; ar: string };
  category: "quran" | "lecture";
  duration: string;
  reference: string;
}

const AUDIO_TRACKS: AudioTrack[] = [
  {
    id: "1",
    title: { en: "Surah Al-Fatiha", ar: "سورة الفاتحة" },
    scholar: { en: "Sheikh Abdul Basit", ar: "الشيخ عبد الباسط" },
    category: "quran",
    duration: "2:34",
    reference: "Quran 1:1-7",
  },
  {
    id: "2",
    title: { en: "Surah Al-Baqarah (Verses 1-5)", ar: "سورة البقرة (الآيات ١-٥)" },
    scholar: { en: "Sheikh Mishary Rashid", ar: "الشيخ مشاري راشد" },
    category: "quran",
    duration: "4:12",
    reference: "Quran 2:1-5",
  },
  {
    id: "3",
    title: { en: "Surah Ya-Sin", ar: "سورة يس" },
    scholar: { en: "Sheikh Sudais", ar: "الشيخ السديس" },
    category: "quran",
    duration: "18:45",
    reference: "Quran 36:1-83",
  },
  {
    id: "4",
    title: { en: "The Importance of Seeking Knowledge", ar: "أهمية طلب العلم" },
    scholar: { en: "Dr. Yasir Qadhi", ar: "د. ياسر القاضي" },
    category: "lecture",
    duration: "42:30",
    reference: "Sahih al-Bukhari, Book of Knowledge",
  },
  {
    id: "5",
    title: { en: "Tafsir of Surah Al-Kahf", ar: "تفسير سورة الكهف" },
    scholar: { en: "Sheikh Nouman Ali Khan", ar: "الشيخ نعمان علي خان" },
    category: "lecture",
    duration: "55:10",
    reference: "Quran 18:1-110",
  },
  {
    id: "6",
    title: { en: "The Life of Prophet Muhammad ﷺ", ar: "سيرة النبي محمد ﷺ" },
    scholar: { en: "Dr. Omar Suleiman", ar: "د. عمر سليمان" },
    category: "lecture",
    duration: "38:20",
    reference: "Seerah - Ibn Hisham",
  },
];

interface AudioLibraryProps {
  onBack: () => void;
}

const AudioLibrary = ({ onBack }: AudioLibraryProps) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"quran" | "lecture">("quran");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filtered = AUDIO_TRACKS.filter((track) => track.category === activeTab);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground ${language === "ar" ? "font-arabic" : ""}`}>
          {t("audioLibrary")}
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        <button
          onClick={() => setActiveTab("quran")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "quran"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          } ${language === "ar" ? "font-arabic" : ""}`}
        >
          {t("quranRecitations")}
        </button>
        <button
          onClick={() => setActiveTab("lecture")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "lecture"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          } ${language === "ar" ? "font-arabic" : ""}`}
        >
          {t("lectures")}
        </button>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {filtered.map((track) => (
          <div
            key={track.id}
            className="bg-card border border-border rounded-xl p-4 hover:border-accent transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPlayingId(playingId === track.id ? null : track.id)}
                className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors"
              >
                {playingId === track.id ? (
                  <Pause className="w-5 h-5 text-primary" />
                ) : (
                  <Play className="w-5 h-5 text-primary ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-foreground text-sm truncate ${language === "ar" ? "font-arabic" : ""}`}>
                  {track.title[language]}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className={`text-xs text-muted-foreground truncate ${language === "ar" ? "font-arabic" : ""}`}>
                    {track.scholar[language]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <BookOpen className="w-3 h-3 text-accent shrink-0" />
                  <span className="text-xs text-accent font-medium">{track.reference}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{track.duration}</span>
            </div>

            {/* Progress bar (visible when playing) */}
            {playingId === track.id && (
              <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-1/3 animate-pulse" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioLibrary;
