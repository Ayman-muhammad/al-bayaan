import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Radio, Play, ExternalLink, Volume2, VolumeX, Maximize2 } from "lucide-react";
import meccaImg from "@/assets/kaaba-hero.jpg";
import medinaImg from "@/assets/medina-mosque.jpg";
import {
  FALLBACK_STREAMS,
  LiveStream,
  buildEmbedSrc,
  fetchLiveStreams,
  readCachedStreams,
  watchUrl,
} from "@/lib/liveStreams";

/**
 * Streams are configured by admins (Admin Panel → Streams) and stored in the
 * database, so links and embed params change without a code deploy.
 */
const thumbnailFor = (slug: string) =>
  /mad|medin|nabaw/i.test(slug) ? medinaImg : meccaImg;

const LiveStreamSection = () => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [streams, setStreams] = useState<LiveStream[]>(
    () => readCachedStreams() || FALLBACK_STREAMS,
  );

  useEffect(() => {
    let cancelled = false;
    fetchLiveStreams().then((s) => {
      if (!cancelled && s.length) setStreams(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (streams.length === 0) return null;

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
          {streams.map((stream, i) => (
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
                    src={buildEmbedSrc(stream, { muted })}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    title={stream.label_en}
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
                    src={thumbnailFor(stream.slug)}
                    alt={stream.label_en}
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
                    {isAr ? stream.label_ar || stream.label_en : stream.label_en}
                  </h3>
                  <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? stream.desc_ar || stream.desc_en : stream.desc_en}
                  </p>
                </div>
                <a
                  href={watchUrl(stream)}
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
