import { useLanguage } from "@/contexts/LanguageContext";
import { MessageSquare } from "lucide-react";
import iconPrayer from "@/assets/icons/icon-prayer.png";
import iconQuran from "@/assets/icons/icon-quran.png";
import iconMadhab from "@/assets/icons/icon-madhab.png";
import iconFasting from "@/assets/icons/icon-fasting.png";
import iconZakat from "@/assets/icons/icon-zakat.png";
import iconDhikr from "@/assets/icons/icon-dhikr.png";
import iconFamily from "@/assets/icons/icon-family.png";
import iconStories from "@/assets/icons/icon-stories.png";

interface QuickTopicsProps {
  onSelectTopic: (topic: string) => void;
}

const TOPICS = [
  {
    icon: iconPrayer,
    en: "How to pray Salah step by step?",
    ar: "كيف أصلي الصلاة خطوة بخطوة؟",
    category: { en: "Prayer", ar: "الصلاة" },
  },
  {
    icon: iconQuran,
    en: "Explain Surah Al-Fatiha with tafsir",
    ar: "اشرح سورة الفاتحة مع التفسير",
    category: { en: "Quran", ar: "القرآن" },
  },
  {
    icon: iconMadhab,
    en: "Compare madhab views on wiping socks in wudu",
    ar: "قارن آراء المذاهب في المسح على الجوارب",
    category: { en: "Fiqh", ar: "الفقه" },
  },
  {
    icon: iconFasting,
    en: "Rules of fasting in Ramadan",
    ar: "أحكام الصيام في رمضان",
    category: { en: "Fasting", ar: "الصيام" },
  },
  {
    icon: iconZakat,
    en: "How to calculate Zakat on savings?",
    ar: "كيف أحسب زكاة المال؟",
    category: { en: "Zakat", ar: "الزكاة" },
  },
  {
    icon: iconDhikr,
    en: "Best duas for anxiety and stress",
    ar: "أفضل الأدعية للقلق والتوتر",
    category: { en: "Dua", ar: "الدعاء" },
  },
  {
    icon: iconFamily,
    en: "Islamic guidance on raising children",
    ar: "التوجيه الإسلامي في تربية الأولاد",
    category: { en: "Family", ar: "الأسرة" },
  },
  {
    icon: iconStories,
    en: "What is the story of Prophet Yusuf?",
    ar: "ما هي قصة النبي يوسف عليه السلام؟",
    category: { en: "Stories", ar: "القصص" },
  },
];

const QuickTopics = ({ onSelectTopic }: QuickTopicsProps) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-3">
      <h3 className={`font-semibold text-foreground flex items-center gap-2 ${language === "ar" ? "font-arabic" : ""}`}>
        <MessageSquare className="w-4 h-4 text-primary" />
        {language === "ar" ? "أسئلة شائعة" : "Quick Questions"}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {TOPICS.map((topic, i) => (
          <button
            key={i}
            onClick={() => onSelectTopic(language === "ar" ? topic.ar : topic.en)}
            className="bg-card border border-border rounded-xl p-3 text-left hover:border-accent hover:bg-accent/5 transition-all duration-200 group"
          >
            <img
              src={topic.icon}
              alt=""
              aria-hidden="true"
              loading="lazy"
              width={512}
              height={512}
              className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
            />
            <p className={`text-xs text-muted-foreground mt-1 line-clamp-2 group-hover:text-foreground transition-colors ${language === "ar" ? "font-arabic text-right" : ""}`}>
              {language === "ar" ? topic.ar : topic.en}
            </p>
            <span className={`text-[10px] text-accent font-medium mt-1 inline-block ${language === "ar" ? "font-arabic" : ""}`}>
              {topic.category[language]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickTopics;
