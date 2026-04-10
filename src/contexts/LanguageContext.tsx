import React, { createContext, useContext, useState, useCallback } from "react";

type Language = "en" | "ar";

interface Translations {
  [key: string]: { en: string; ar: string };
}

const translations: Translations = {
  appName: { en: "Al-Bayan AI", ar: "البيان" },
  tagline: { en: "Your Guide to Islamic Knowledge", ar: "دليلك إلى المعرفة الإسلامية" },
  subtitle: { en: "Ask questions about the Quran, Hadith, and Islamic jurisprudence with authentic citations", ar: "اسأل عن القرآن والحديث والفقه الإسلامي مع الاستشهادات الموثوقة" },
  startChat: { en: "Start Learning", ar: "ابدأ التعلم" },
  signIn: { en: "Sign In", ar: "تسجيل الدخول" },
  signUp: { en: "Sign Up", ar: "إنشاء حساب" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  continueWithGoogle: { en: "Continue with Google", ar: "المتابعة مع Google" },
  orContinueWith: { en: "Or continue with", ar: "أو المتابعة عبر" },
  askQuestion: { en: "Ask about Islam...", ar: "اسأل عن الإسلام..." },
  send: { en: "Send", ar: "إرسال" },
  audioLibrary: { en: "Audio Library", ar: "المكتبة الصوتية" },
  scholars: { en: "Scholars", ar: "العلماء" },
  chat: { en: "Chat", ar: "المحادثة" },
  home: { en: "Home", ar: "الرئيسية" },
  quranRecitations: { en: "Quran Recitations", ar: "تلاوات قرآنية" },
  lectures: { en: "Lectures", ar: "محاضرات" },
  welcomeMessage: { en: "Assalamu Alaikum! I'm Al-Bayan AI, your Islamic knowledge assistant. Ask me about the Quran, Hadith, Fiqh, or any Islamic topic. Every answer comes with authentic references.", ar: "السلام عليكم! أنا البيان، مساعدك في المعرفة الإسلامية. اسألني عن القرآن والحديث والفقه أو أي موضوع إسلامي. كل إجابة تأتي بمراجع موثوقة." },
  features: { en: "Features", ar: "المميزات" },
  featureAI: { en: "AI-Powered Answers", ar: "إجابات مدعومة بالذكاء الاصطناعي" },
  featureAIDesc: { en: "Get accurate answers to Islamic questions with citations from the Quran and authentic Hadith collections", ar: "احصل على إجابات دقيقة للأسئلة الإسلامية مع اقتباسات من القرآن والأحاديث الصحيحة" },
  featureAudio: { en: "Scholar Audio", ar: "صوتيات العلماء" },
  featureAudioDesc: { en: "Listen to Quran recitations and lectures from renowned scholars worldwide", ar: "استمع إلى تلاوات القرآن ومحاضرات من علماء مشهورين حول العالم" },
  featureCitations: { en: "Authentic Citations", ar: "استشهادات موثوقة" },
  featureCitationsDesc: { en: "Every response includes references to primary Islamic sources for verification", ar: "كل إجابة تتضمن مراجع من المصادر الإسلامية الأساسية للتحقق" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },
  noAccount: { en: "Don't have an account?", ar: "ليس لديك حساب؟" },
  haveAccount: { en: "Already have an account?", ar: "لديك حساب بالفعل؟" },
};

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  }, []);

  const t = useCallback(
    (key: string) => translations[key]?.[language] || key,
    [language]
  );

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, dir }}>
      <div dir={dir}>{children}</div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
