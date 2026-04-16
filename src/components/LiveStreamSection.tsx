import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Radio, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import meccaImg from "@/assets/kaaba-hero.jpg";
import medinaImg from "@/assets/medina-mosque.jpg";

const STREAMS = [
  {
    id: "mecca",
    label: { ar: "بث مباشر من مكة المكرمة", en: "Live from Makkah" },
    desc: { ar: "المسجد الحرام", en: "Masjid Al-Haram" },
    thumbnail: meccaImg,
    youtubeId: "bSfIjJPQi1I",
    externalUrl: "https://www.youtube.com/watch?v=bSfIjJPQi1I",
  },
  {
    id: "medina",
    label: { ar: "بث مباشر من المدينة المنورة", en: "Live from Madinah" },
    desc: { ar: "المسجد النبوي", en: "Masjid An-Nabawi" },
    thumbnail: medinaImg,
    youtubeId: "P9MBk0BnFOo",
    externalUrl: "https://www.youtube.com/watch?v=P9MBk0BnFOo",
  },
];

const LiveStreamSection = () => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [activeStream, setActiveStream] = useState<string | null>(null);

  return (
    <section className="py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <div className="relative">
            <Radio className="w-5 h-5 text-destructive" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
          </div>
          <h2 className={`text-2xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "البث المباشر" : "Live Streams"}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {STREAMS.map((stream, i) => (
            <div
              key={stream.id}
              className="rounded-2xl overflow-hidden border border-border bg-card group animate-slide-up"
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
            >
              {activeStream === stream.id ? (
                <div className="relative aspect-video bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${stream.youtubeId}?autoplay=1&mute=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title={stream.label.en}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setActiveStream(stream.id)}
                  className="relative w-full aspect-video overflow-hidden cursor-pointer"
                >
                  <img
                    src={stream.thumbnail}
                    alt={stream.label.en}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    width={960}
                    height={540}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl">
                      <Play className="w-7 h-7 text-primary-foreground ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-destructive-foreground rounded-full animate-pulse" />
                    LIVE
                  </div>
                </button>
              )}

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold text-foreground text-sm ${isAr ? "font-arabic" : ""}`}>
                    {stream.label[language]}
                  </h3>
                  <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                    {stream.desc[language]}
                  </p>
                </div>
                <a
                  href={stream.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveStreamSection;
