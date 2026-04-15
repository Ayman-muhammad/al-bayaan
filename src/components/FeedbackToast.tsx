import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

// Contextual Islamic feedback messages for different actions
const FEEDBACK_MESSAGES = {
  navigate_quran: [
    { ar: "بارك الله فيك! تلاوة القرآن نور في القلب", en: "Blessed! Quran recitation is light in the heart", icon: "📖" },
    { ar: "خير الكلام كلام الله", en: "The best speech is the speech of Allah", icon: "✨" },
  ],
  navigate_audio: [
    { ar: "استمع بخشوع وتدبر", en: "Listen with humility and reflection", icon: "🎧" },
    { ar: "إن السمع كان مسؤولاً", en: "Indeed, the hearing will be questioned", icon: "🎵" },
  ],
  navigate_prayer: [
    { ar: "حافظ على الصلاة في وقتها", en: "Maintain prayer at its time", icon: "🕌" },
    { ar: "الصلاة عماد الدين", en: "Prayer is the pillar of faith", icon: "🌙" },
  ],
  navigate_hafiz: [
    { ar: "من حفظ القرآن فقد أوتي علماً عظيماً", en: "Whoever memorizes the Quran has been given great knowledge", icon: "🏆" },
    { ar: "خيركم من تعلم القرآن وعلمه", en: "The best of you are those who learn the Quran and teach it", icon: "📚" },
  ],
  navigate_chat: [
    { ar: "اسأل واستفد، فالعلم نور", en: "Ask and benefit, for knowledge is light", icon: "💡" },
    { ar: "من سلك طريقاً يلتمس فيه علماً...", en: "Whoever treads a path seeking knowledge...", icon: "🌟" },
  ],
  bookmark_saved: [
    { ar: "تم الحفظ! والله المستعان", en: "Saved! May Allah help you benefit from it", icon: "🔖" },
  ],
  progress_made: [
    { ar: "ما شاء الله! أنت تتقدم", en: "MashaAllah! You are progressing", icon: "📈" },
  ],
  first_visit: [
    { ar: "أهلاً بك في البيان! اكتشف عالم المعرفة الإسلامية", en: "Welcome to Al-Bayan! Discover Islamic knowledge", icon: "🌺" },
  ],
};

type FeedbackType = keyof typeof FEEDBACK_MESSAGES;

export const useFeedback = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const showFeedback = (type: FeedbackType) => {
    const messages = FEEDBACK_MESSAGES[type];
    if (!messages || messages.length === 0) return;

    const msg = messages[Math.floor(Math.random() * messages.length)];

    toast({
      title: `${msg.icon} ${isAr ? msg.ar : msg.en}`,
      duration: 2500,
    });
  };

  return { showFeedback };
};

export default useFeedback;
