import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, Quote, GraduationCap, Clock, Compass } from "lucide-react";
import islamicBg from "@/assets/islamic-pattern-bg.jpg";
import DailyVerse from "@/components/DailyVerse";



interface HeroSectionProps {
  onStartChat: () => void;
  onNavigate: (view: string) => void;
}

const HeroSection = ({ onStartChat, onNavigate }: HeroSectionProps) => {
  const { language, t } = useLanguage();
  const isAr = language === "ar";

  const features = [
    { icon: BookOpen, title: t("featureAI"), desc: t("featureAIDesc"), action: () => onNavigate("chat") },
    { icon: Headphones, title: t("featureAudio"), desc: t("featureAudioDesc"), action: () => onNavigate("audio") },
    { icon: Quote, title: t("featureCitations"), desc: t("featureCitationsDesc"), action: () => onNavigate("chat") },
  ];

  const quickLinks = [
    { emoji: "📖", label: isAr ? "القرآن الكريم" : "Read Quran", desc: isAr ? "اقرأ مع الترجمة" : "Arabic text & translation", action: () => onNavigate("quran") },
    { emoji: "⚖️", label: isAr ? "مقارنة المذاهب" : "Madhab Compare", desc: isAr ? "قارن المذاهب الأربعة" : "Compare 4 schools", action: () => onNavigate("chat") },
    { emoji: "🎧", label: isAr ? "استمع للقرآن" : "Listen to Quran", desc: isAr ? "من قراء مشهورين" : "Famous reciters", action: () => onNavigate("audio") },
    { emoji: "🕌", label: isAr ? "مواقيت الصلاة" : "Prayer Times", desc: isAr ? "المواقيت والقبلة" : "Times & Qibla", action: () => onNavigate("prayer") },
    { emoji: "📚", label: isAr ? "وضع الحفظ" : "Hafiz Mode", desc: isAr ? "احفظ القرآن" : "Memorize Quran", action: () => onNavigate("hafiz") },
    { emoji: "💬", label: isAr ? "اسأل سؤالاً" : "Ask a Question", desc: isAr ? "مدعوم بالذكاء الاصطناعي" : "AI-powered answers", action: () => onNavigate("chat") },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-20 overflow-hidden">
        <img src={islamicBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" width={1920} height={1080} loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-2">
            <h2 className="text-sm font-medium tracking-widest uppercase text-accent">﷽</h2>
            <h1 className={`text-5xl md:text-7xl font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              <span className="text-gradient-gold">{t("appName")}</span>
            </h1>
            <p className={`text-xl md:text-2xl text-muted-foreground mt-4 ${isAr ? "font-arabic" : ""}`}>
              {t("tagline")}
            </p>
          </div>
          <p className={`text-muted-foreground max-w-xl mx-auto ${isAr ? "font-arabic" : ""}`}>
            {t("subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={onStartChat} className="min-w-[200px]">
              {t("startChat")}
            </Button>
            <Button variant="outline" size="lg" onClick={() => onNavigate("hafiz")} className="min-w-[200px] gap-2">
              <GraduationCap className="w-5 h-5" />
              {isAr ? "ابدأ الحفظ" : "Start Memorizing"}
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 px-4 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            {quickLinks.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="p-4 rounded-xl bg-background border border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
              >
                <span className="text-2xl group-hover:scale-125 inline-block transition-transform duration-300">{item.emoji}</span>
                <p className={`text-xs font-semibold text-foreground mt-2 ${isAr ? "font-arabic" : ""}`}>{item.label}</p>
                <p className={`text-[10px] text-muted-foreground mt-1 ${isAr ? "font-arabic" : ""}`}>{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

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
                className="p-6 rounded-xl bg-background border border-border hover:border-accent hover:glow-gold transition-all duration-300 group text-left"
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
