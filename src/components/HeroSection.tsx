import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, Quote, GraduationCap, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import DailyVerse from "@/components/DailyVerse";
import LiveStreamSection from "@/components/LiveStreamSection";
import kaabaImg from "@/assets/kaaba-hero.jpg";
import medinaImg from "@/assets/medina-mosque.jpg";
import quranImg from "@/assets/quran-open.jpg";
import iconQuran from "@/assets/icons/icon-quran.png";
import iconHafiz from "@/assets/icons/icon-hafiz.png";
import iconAudio from "@/assets/icons/icon-audio.png";
import iconPrayer from "@/assets/icons/icon-prayer.png";
import iconJourney from "@/assets/icons/icon-journey.png";
import iconFavorites from "@/assets/icons/icon-favorites.png";
import iconChat from "@/assets/icons/icon-chat.png";
import iconMadhab from "@/assets/icons/icon-madhab.png";
import iconScholars from "@/assets/icons/icon-scholars.png";
import iconDhikr from "@/assets/icons/icon-dhikr.png";
import iconFamily from "@/assets/icons/icon-family.png";

interface HeroSectionProps {
  onStartChat: () => void;
  onNavigate: (view: string) => void;
}

const HERO_SLIDES = [
  { image: kaabaImg, titleAr: "البيان", titleEn: "Al-Bayan AI", subtitleAr: "رفيقك القرآني الذكي", subtitleEn: "Your Intelligent Quranic Companion" },
  { image: medinaImg, titleAr: "المدينة المنورة", titleEn: "City of Light", subtitleAr: "صلِّ على النبي ﷺ", subtitleEn: "Send blessings upon the Prophet ﷺ" },
  { image: quranImg, titleAr: "اقرأ وتدبر", titleEn: "Read & Reflect", subtitleAr: "القرآن الكريم بين يديك", subtitleEn: "The Noble Quran at your fingertips" },
];

const HeroSection = ({ onStartChat, onNavigate }: HeroSectionProps) => {
  const { language, t } = useLanguage();
  const isAr = language === "ar";
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: BookOpen, title: t("featureAI"), desc: t("featureAIDesc"), action: () => onNavigate("chat") },
    { icon: Headphones, title: t("featureAudio"), desc: t("featureAudioDesc"), action: () => onNavigate("audio") },
    { icon: Quote, title: t("featureCitations"), desc: t("featureCitationsDesc"), action: () => onNavigate("chat") },
  ];

  const quickLinks = [
    { img: iconJourney, label: isAr ? "لوحة التقدم" : "Dashboard", desc: isAr ? "تتبع رحلتك" : "Track your progress", action: () => onNavigate("dashboard") },
    { img: iconFamily, label: isAr ? "حلقة العائلة" : "Family Circle", desc: isAr ? "احفظوا معاً" : "Memorize together", action: () => onNavigate("family") },
    { img: iconQuran, label: isAr ? "القرآن الكريم" : "Read Quran", desc: isAr ? "اقرأ مع الترجمة" : "Arabic text & translation", action: () => onNavigate("quran") },
    { img: iconHafiz, label: isAr ? "وضع الحفظ" : "Hafiz Mode", desc: isAr ? "احفظ القرآن" : "Memorize Quran", action: () => onNavigate("hafiz") },
    { img: iconAudio, label: isAr ? "استمع للقرآن" : "Listen to Quran", desc: isAr ? "من قراء مشهورين" : "Famous reciters", action: () => onNavigate("audio") },
    { img: iconPrayer, label: isAr ? "مواقيت الصلاة" : "Prayer Times", desc: isAr ? "المواقيت والقبلة" : "Times & Qibla", action: () => onNavigate("prayer") },
    { img: iconScholars, label: isAr ? "علماء وفتاوى" : "Scholars Q&A", desc: isAr ? "5 لغات • مصادر موثوقة" : "5 languages • Verified", action: () => onNavigate("scholars") },
    { img: iconDhikr, label: isAr ? "الأذكار والأدعية" : "Dhikr & Dua", desc: isAr ? "تسبيح وأدعية" : "Tasbih & duas", action: () => onNavigate("dhikr") },
    { img: iconFavorites, label: isAr ? "المفضلة" : "Favorites", desc: isAr ? "الآيات المحفوظة" : "Saved content", action: () => onNavigate("favorites") },
    { img: iconChat, label: isAr ? "اسأل سؤالاً" : "Ask a Question", desc: isAr ? "مدعوم بالذكاء الاصطناعي" : "AI-powered answers", action: () => onNavigate("chat") },
    { img: iconJourney, label: isAr ? "رحلتي" : "My Journey", desc: isAr ? "تأملاتك ومعالمك" : "Reflections & milestones", action: () => onNavigate("journey") },
    { img: iconDhikr, label: isAr ? "اليوميات الصوتية" : "Voice Journal", desc: isAr ? "سجّل تأملاتك" : "Record reflections", action: () => onNavigate("voice") },
    { img: iconMadhab, label: isAr ? "مقارنة المذاهب" : "Madhab Compare", desc: isAr ? "قارن المذاهب الأربعة" : "Compare 4 schools", action: () => onNavigate("chat") },
    { img: iconScholars, label: isAr ? "تعلّم العربية" : "Arabic Course", desc: isAr ? "افهم لغة القرآن" : "Understand the Qur'an", action: () => onNavigate("arabic") },
    { img: iconFamily, label: isAr ? "مرحباً بك في الإسلام" : "New to Islam", desc: isAr ? "دليل مبسّط للمهتدين" : "Gentle revert guide", action: () => onNavigate("revert") },
  ];

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero with Image Carousel */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-12 sm:py-20 overflow-hidden min-h-[60vh] sm:min-h-[70vh]">
        {/* Background images with crossfade */}
        {HERO_SLIDES.map((s, i) => (
          <img
            key={i}
            src={s.image}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              i === currentSlide ? "opacity-30" : "opacity-0"
            }`}
            width={1920}
            height={1080}
            {...(i === 0 ? {} : { loading: "lazy" as const })}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        {/* Soft Islamic geometric pattern wash */}
        <div className="absolute inset-0 islamic-pattern opacity-40 pointer-events-none" />
        {/* Radial gold glow behind title */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[640px] aspect-square rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent) / 0.18) 0%, hsl(var(--accent) / 0.05) 40%, transparent 70%)",
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-accent/30 rounded-full"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
                animation: `float ${4 + i * 0.5}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10 w-full">
          <div className="space-y-2">
            <h2 className="text-xs sm:text-sm font-medium tracking-widest uppercase text-accent animate-fade-in">﷽</h2>
            <h1
              className={`text-4xl sm:text-5xl md:text-7xl font-bold text-foreground ${isAr ? "font-arabic" : ""} transition-all duration-700 leading-tight`}
              key={currentSlide}
            >
              <span className="text-gradient-gold animate-scale-in inline-block">
                {isAr ? slide.titleAr : slide.titleEn}
              </span>
            </h1>
            <p
              className={`text-base sm:text-xl md:text-2xl text-muted-foreground mt-3 sm:mt-4 px-2 ${isAr ? "font-arabic" : ""} animate-fade-in`}
              key={`sub-${currentSlide}`}
            >
              {isAr ? slide.subtitleAr : slide.subtitleEn}
            </p>
          </div>

          <div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slide-up px-4 sm:px-0"
            style={{ animationDelay: "300ms", animationFillMode: "both" }}
          >
            <Button variant="hero" size="lg" onClick={onStartChat} className="w-full sm:w-auto sm:min-w-[200px]">
              {t("startChat")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigate("hafiz")}
              className="w-full sm:w-auto sm:min-w-[200px] gap-2"
            >
              <GraduationCap className="w-5 h-5" />
              {isAr ? "ابدأ الحفظ" : "Start Memorizing"}
            </Button>
          </div>

          {/* Slide indicators */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className="w-9 h-9 rounded-full bg-card/60 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  i === currentSlide ? "w-8 h-2 bg-accent" : "w-2 h-2 bg-muted-foreground/30"
                }`}
              />
            ))}
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="w-9 h-9 rounded-full bg-card/60 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>
      </section>

      {/* Arabesque divider */}
      <div className="relative h-10 sm:h-12 -mt-px flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 600 24"
          className="w-full max-w-md h-6 text-accent/50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden
        >
          <line x1="0" y1="12" x2="240" y2="12" strokeDasharray="2 4" />
          <path d="M240 12 Q270 0 300 12 Q330 24 360 12" />
          <circle cx="300" cy="12" r="2.5" fill="currentColor" />
          <line x1="360" y1="12" x2="600" y2="12" strokeDasharray="2 4" />
        </svg>
      </div>

      {/* Quick Links */}
      <section className="relative py-6 sm:py-8 px-3 sm:px-4 bg-card/50">
        <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 text-center">
            {quickLinks.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="p-3 sm:p-4 rounded-xl bg-background border border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up flex flex-col items-center"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/5 to-accent/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <img src={item.img} alt="" width={64} height={64} className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm" loading="lazy" />
                </div>
                <p className={`text-xs font-semibold text-foreground mt-2 ${isAr ? "font-arabic" : ""}`}>{item.label}</p>
                <p className={`text-[10px] text-muted-foreground mt-1 line-clamp-2 ${isAr ? "font-arabic" : ""}`}>{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Live Streams from Mecca & Medina */}
      <LiveStreamSection />

      {/* Daily Spiritual Journey */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <DailyVerse />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl font-bold text-center mb-12 text-foreground ${isAr ? "font-arabic" : ""}`}>
            {t("features")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <button
                key={i}
                onClick={feature.action}
                className="p-6 rounded-xl bg-background border border-border hover:border-accent hover:glow-gold transition-all duration-300 group text-left animate-slide-up"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className={`text-lg font-semibold text-foreground mb-2 ${isAr ? "font-arabic" : ""}`}>
                  {feature.title}
                </h3>
                <p className={`text-muted-foreground text-sm leading-relaxed ${isAr ? "font-arabic" : ""}`}>
                  {feature.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
