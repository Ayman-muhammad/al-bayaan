import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Headphones, Quote } from "lucide-react";
import islamicBg from "@/assets/islamic-pattern-bg.jpg";

interface HeroSectionProps {
  onStartChat: () => void;
}

const HeroSection = ({ onStartChat }: HeroSectionProps) => {
  const { t, language } = useLanguage();

  const features = [
    { icon: BookOpen, title: t("featureAI"), desc: t("featureAIDesc") },
    { icon: Headphones, title: t("featureAudio"), desc: t("featureAudioDesc") },
    { icon: Quote, title: t("featureCitations"), desc: t("featureCitationsDesc") },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-20 overflow-hidden">
        <img src={islamicBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-2">
            <h2 className="text-sm font-medium tracking-widest uppercase text-accent">
              ﷽
            </h2>
            <h1 className={`text-5xl md:text-7xl font-bold text-foreground ${language === "ar" ? "font-arabic" : ""}`}>
              <span className="text-gradient-gold">{t("appName")}</span>
            </h1>
            <p className={`text-xl md:text-2xl text-muted-foreground mt-4 ${language === "ar" ? "font-arabic" : ""}`}>
              {t("tagline")}
            </p>
          </div>
          
          <p className={`text-muted-foreground max-w-xl mx-auto ${language === "ar" ? "font-arabic" : ""}`}>
            {t("subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={onStartChat} className="min-w-[200px]">
              {t("startChat")}
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl font-bold text-center mb-12 text-foreground ${language === "ar" ? "font-arabic" : ""}`}>
            {t("features")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-background border border-border hover:border-accent hover:glow-gold transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className={`text-lg font-semibold text-foreground mb-2 ${language === "ar" ? "font-arabic" : ""}`}>
                  {feature.title}
                </h3>
                <p className={`text-muted-foreground text-sm leading-relaxed ${language === "ar" ? "font-arabic" : ""}`}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
