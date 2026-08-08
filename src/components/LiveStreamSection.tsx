import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Radio, Play, ExternalLink, Volume2, VolumeX, Maximize2 } from "lucide-react";
import meccaImg from "@/assets/kaaba-hero.jpg";
import medinaImg from "@/assets/medina-mosque.jpg";

/**
 * Official 24/7 embeds provided for Al-Bayan.
 * Params are kept exactly as supplied: no related videos, no branding,
 * inline playback on mobile — muted first frame so autoplay is never blocked.
 */
const EMBED_PARAMS = "rel=0&modestbranding=1&playsinline=1&iv_load_policy=3";

const STREAMS = [
  {
    id: "mecca",
    label: { ar: "بث مباشر من مكة المكرمة", en: "Live from Makkah" },
    desc: { ar: "المسجد الحرام", en: "Masjid Al-Haram" },
    thumbnail: meccaImg,
    youtubeId: "nwllJOmz3sI",
    externalUrl: "https://www.youtube.com/watch?v=nwllJOmz3sI",
  },
  {
    id: "medina",
    label: { ar: "بث مباشر من المدينة المنورة", en: "Live from Madinah" },
    desc: { ar: "المسجد النبوي", en: "Masjid An-Nabawi" },
    thumbnail: medinaImg,
    youtubeId: "QYCZzl--IQs",
    externalUrl: "https://www.youtube.com/watch?v=QYCZzl--IQs",
  },
];

const LiveStreamSection = () => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const embedSrc = (id: string) =>
    `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&${EMBED_PARAMS}`;

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
        <p className={`text-center text-sm text-muted-foreground -mt-3 ${isAr ? "font-arabic" : ""}`}>
          {isAr
            ? "بث مستمر ٢٤ ساعة من الحرمين الشريفين"
            : "Continuous 24/7 coverage from the two Holy Mosques"}
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {STREAMS.map((stream, i) => (
            <div
              key={stream.id}
              className="rounded-2xl overflow-hidden border border-border bg-card group animate-slide-up"
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
            >
              {activeStream === stream.id ? (
                <div className="relative aspect-video bg-foreground/95">
                  <iframe
                    key={`${stream.id}-${muted ? "m" : "s"}`}
                    id={`live-frame-${stream.id}`}
                    src={embedSrc(stream.youtubeId)}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    title={stream.label.en}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <button
                      onClick={() => setMuted((m) => !m)}
                      aria-label={muted ? "Unmute stream" : "Mute stream"}
                      className="h-9 w-9 rounded-full bg-card/85 backdrop-blur-md border border-border flex items-center justify-center text-foreground hover:text-primary transition-colors"
                    >
                      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() =>
                        document.getElementById(`live-frame-${stream.id}`)?.requestFullscreen?.()
                      }
                      aria-label="Fullscreen"
                      className="h-9 w-9 rounded-full bg-card/85 backdrop-blur-md border border-border flex items-center justify-center text-foreground hover:text-primary transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
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
                  <div className="absolute top-3 right-3 rounded-full bg-card/85 backdrop-blur-md border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground">
                    24/7
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
                  aria-label={isAr ? "شاهد على يوتيوب" : "Watch on YouTube"}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className={isAr ? "font-arabic" : ""}>
                    {isAr ? "يوتيوب" : "YouTube"}
                  </span>
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
