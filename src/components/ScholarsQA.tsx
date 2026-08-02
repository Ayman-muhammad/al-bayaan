import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, ChevronRight, BookOpen, Globe2, Plus, Send, Loader2, ChevronDown, ExternalLink, Library, ShieldCheck } from "lucide-react";
import { parseReference } from "@/lib/sources";
import scholarsIcon from "@/assets/icons/icon-scholars.png";
import { EXTRA_SCHOLARS, type Scholar as ExtraScholar } from "@/data/scholarsQA";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ScholarsQAProps {
  onBack: () => void;
}

type Lang = "ar" | "en" | "sw" | "so" | "am";

const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: "ar", label: "Arabic", native: "العربية" },
  { id: "en", label: "English", native: "English" },
  { id: "sw", label: "Swahili", native: "Kiswahili" },
  { id: "so", label: "Somali", native: "Soomaali" },
  { id: "am", label: "Amharic", native: "አማርኛ" },
];

interface QA {
  id: string;
  topic: string; // english key
  topicLabel: { ar: string; en: string };
  question: Record<Lang, string>;
  answer: Record<Lang, string>;
  reference: string;
}

interface Scholar {
  id: string;
  nameEn: string;
  nameAr: string;
  era: string;
  bioEn: string;
  bioAr: string;
  qas: QA[];
}

const SCHOLARS: Scholar[] = [
  {
    id: "ibn-baz",
    nameEn: "Sheikh Ibn Baz",
    nameAr: "الشيخ ابن باز",
    era: "1912 – 1999",
    bioEn: "Former Grand Mufti of Saudi Arabia, leading scholar of Hadith and Fiqh.",
    bioAr: "المفتي العام السابق للمملكة العربية السعودية، من كبار علماء الحديث والفقه.",
    qas: [
      {
        id: "ibz-1",
        topic: "salah",
        topicLabel: { ar: "الصلاة", en: "Prayer" },
        question: {
          ar: "ما حكم تارك الصلاة تكاسلاً؟",
          en: "What is the ruling on one who abandons prayer out of laziness?",
          sw: "Hukumu ya mtu anayeacha sala kwa uvivu ni ipi?",
          so: "Maxay tahay xukunka qofka kasoo tagay salaadda kasla’aan darteed?",
          am: "በስንፍና ሰላት የሚተው ሰው ፍርዱ ምንድነው?",
        },
        answer: {
          ar: "الصلاة عمود الإسلام، وتركها كسلاً كبيرة عظيمة، وذهب جمعٌ من العلماء إلى كفر تاركها مطلقًا. الواجب التوبة والمحافظة عليها في أوقاتها مع الجماعة.",
          en: "Prayer is the pillar of Islam. Abandoning it out of laziness is a major sin; many scholars even consider the one who abandons it to have left Islam. One must repent and pray on time, in congregation when possible.",
          sw: "Sala ni nguzo ya Uislamu. Kuiacha kwa uvivu ni dhambi kubwa; baadhi ya wanazuoni husema kuwa mwenye kuacha sala anatoka katika Uislamu. Tubia na hifadhi sala kwa wakati wake na jamaa.",
          so: "Salaadda waa tiirka Islaamka. In la kasoo tago kasla’aan waa dambi weyn; culimo badan waxay u arkaan inuu ka baxay diinta. Waa in la toobad keeno oo la tukado waqtigeeda iyo jamaacada.",
          am: "ሰላት የእስልምና ምሰሶ ነች። በስንፍና ማቋረጥ ታላቅ ኃጢአት ነው፤ አንዳንድ ሊቃውንት ከእስልምና ወጥቷል ይላሉ። ንስሐ ግቡ እና በወቅቱ ከጀመዓ ጋር ስገዱ።",
        },
        reference: "Majmu' al-Fatawa Ibn Baz 10/250",
      },
      {
        id: "ibz-2",
        topic: "tawhid",
        topicLabel: { ar: "العقيدة", en: "Aqeedah" },
        question: {
          ar: "ما أهمية التوحيد في حياة المسلم؟",
          en: "What is the importance of Tawheed in a Muslim's life?",
          sw: "Umuhimu wa Tawhidi katika maisha ya Muislamu ni upi?",
          so: "Muxuu ahaa muhiimadda Towxiidka nolosha Muslinka?",
          am: "ቶውሒድ ለሙስሊም ሕይወት ያለው ጠቀሜታ ምንድነው?",
        },
        answer: {
          ar: "التوحيد أساس الدين وأعظم ما أمر الله به، وبه قبول الأعمال ودخول الجنة. لأجله أرسل الله الرسل وأنزل الكتب.",
          en: "Tawheed is the foundation of religion and the greatest of Allah's commands. Acceptance of all deeds and entering Paradise depend on it. For its sake Allah sent the Messengers and revealed the Books.",
          sw: "Tawhidi ni msingi wa dini na amri kuu kabisa. Kukubaliwa kwa matendo na kuingia Peponi vinategemea Tawhidi. Kwa ajili yake Mwenyezi Mungu alituma Mitume na kuteremsha Vitabu.",
          so: "Towxiidku waa aasaaska diinta iyo amarka ugu weyn. Aqbalka camallada iyo galitaanka Jannada way ku xiran yihiin. Daraaddiis ayuu Allaah u soo diray Rusushii oo soo dejiyey Kutubtii.",
          am: "ቶውሒድ የሃይማኖት መሰረት እና ከአላህ ትዕዛዛት ሁሉ ታላቅ ነው። ሥራዎች ተቀባይነት መሆናቸውና ጀነት መግባት በዚህ ላይ ይመሠረታሉ።",
        },
        reference: "Sharh Thalathat al-Usul",
      },
    ],
  },
  {
    id: "uthaymeen",
    nameEn: "Sheikh Ibn Uthaymeen",
    nameAr: "الشيخ ابن عثيمين",
    era: "1925 – 2001",
    bioEn: "Renowned Saudi scholar, member of the Council of Senior Scholars.",
    bioAr: "عالم سعودي شهير، عضو هيئة كبار العلماء.",
    qas: [
      {
        id: "uth-1",
        topic: "fasting",
        topicLabel: { ar: "الصيام", en: "Fasting" },
        question: {
          ar: "هل يجوز للحائض أن تقرأ القرآن؟",
          en: "Is it permissible for a menstruating woman to read the Quran?",
          sw: "Je, mwanamke aliye na hedhi anaruhusiwa kusoma Qur'an?",
          so: "Ma bannaan tahay haweeneyda caadada qabta inay akhrido Quraanka?",
          am: "የወር አበባ ላይ ያለች ሴት ቁርአን መቅራት ትችላለችን?",
        },
        answer: {
          ar: "الراجح جواز قراءة الحائض للقرآن من غير مسٍّ للمصحف، خاصة عند الحاجة كالحفظ والتعليم، لعدم ثبوت دليل صريح في المنع.",
          en: "The stronger view is that a menstruating woman may recite the Quran without touching the mushaf, especially when needed for memorization or teaching, as no clear authentic prohibition has been established.",
          sw: "Rai yenye nguvu ni kuwa mwanamke wa hedhi anaweza kusoma Qur'an bila kugusa msahafu, hasa anapohitaji kuhifadhi au kufundisha.",
          so: "Raayiga xoogga leh waa in haweeneyda caadada qabta ay akhrin karto Quraanka iyada oo aan taaban Mushafka, gaar ahaan markay u baahan tahay xifdi ama macallinimo.",
          am: "ጠንካራው አስተያየት የወር አበባ ላይ ያለች ሴት መሷህፍን ሳትነካ ቁርአን መቅራት እንደምትችል ነው።",
        },
        reference: "Majmu' Fatawa Ibn Uthaymeen 11/216",
      },
    ],
  },
  {
    id: "albani",
    nameEn: "Sheikh Al-Albani",
    nameAr: "الشيخ الألباني",
    era: "1914 – 1999",
    bioEn: "Master of modern hadith verification.",
    bioAr: "إمام في تخريج الحديث وتصحيحه في العصر الحديث.",
    qas: [
      {
        id: "alb-1",
        topic: "sunnah",
        topicLabel: { ar: "السنة", en: "Sunnah" },
        question: {
          ar: "ما الفرق بين الحديث الصحيح والضعيف؟",
          en: "What is the difference between a Sahih and a Da'if hadith?",
          sw: "Tofauti kati ya hadithi Sahihi na Daifu ni ipi?",
          so: "Maxaa kala duwan xadiis Saxiix iyo Daciif?",
          am: "በሳሒሕ እና ደዒፍ ሐዲሥ መካከል ያለው ልዩነት ምንድነው?",
        },
        answer: {
          ar: "الصحيح ما اتصل سنده بنقل العدل الضابط عن مثله إلى منتهاه، من غير شذوذ ولا علة. والضعيف ما فقد شرطًا من شروط القبول.",
          en: "Sahih is a hadith with a continuous chain of upright, precise narrators, free from irregularity and hidden defects. Da'if lacks one or more of these conditions and cannot be used to establish rulings.",
          sw: "Sahihi ni hadithi yenye mlolongo kamili wa wapokezi waadilifu na makini, isiyo na kasoro. Daifu inakosa mojawapo ya masharti haya.",
          so: "Saxiixu waa xadiis silsilad isku xirantay leh oo qof caadil oo xafidaa wado, oo ka madhan cilad. Daciifka mid ka maqan shuruudaha aqbalka.",
          am: "ሳሒሕ የቀጥተኛ ሰንሰለትና ታማኝ አስተላላፊዎች ያሉት ሐዲሥ ነው። ደዒፍ ግን ከነዚህ መስፈርቶች አንዱን ይጎድለዋል።",
        },
        reference: "Silsilat al-Ahadeeth as-Sahihah",
      },
    ],
  },
  {
    id: "shanqiti",
    nameEn: "Sheikh Ash-Shinqiti",
    nameAr: "الشيخ الشنقيطي",
    era: "1907 – 1973",
    bioEn: "Author of Adwa' al-Bayan, master of tafsir and usul.",
    bioAr: "صاحب أضواء البيان، إمام في التفسير والأصول.",
    qas: [
      {
        id: "shq-1",
        topic: "quran",
        topicLabel: { ar: "القرآن", en: "Quran" },
        question: {
          ar: "كيف نتدبر القرآن الكريم؟",
          en: "How do we reflect upon (tadabbur) the Noble Quran?",
          sw: "Tunaweza vipi kutafakari Qur'an Tukufu?",
          so: "Sideen ugu tadabbur samayn karnaa Quraanka Karaamada leh?",
          am: "በተከበረው ቁርአን እንዴት ተደብሩ እናደርጋለን?",
        },
        answer: {
          ar: "بالتأمل في معاني الآيات، والوقوف عند أوامرها ونواهيها، والربط بين المتشابه، والرجوع إلى تفسير السلف، وسؤال الله الفهم.",
          en: "By reflecting on the meanings of the verses, pausing at commands and prohibitions, connecting related passages, consulting the tafsir of the early generations, and asking Allah for understanding.",
          sw: "Kwa kutafakari maana za aya, kusimama kwenye amri na makatazo, kuunganisha aya zenye uhusiano, kurejea tafsiri za masalaf na kumuomba Mwenyezi Mungu uelewa.",
          so: "Adoo ka fikiraya macnaha aayadaha, joogsanaya amarrada iyo reebbada, isku xirayo aayadaha is-shabaha, ku noqonayo tafsiirka salafta, kana baryayo Allaah fahanka.",
          am: "የአንቀጾችን ትርጉም በማሰላሰል፣ በትዕዛዞችና ክልከላዎች ላይ በመቆም፣ ተዛማጅ አንቀጾችን በማገናኘት እና አላህን ግንዛቤ በመጠየቅ።",
        },
        reference: "Adwa' al-Bayan, intro",
      },
    ],
  },
];

// Merge in expanded library (100+ Q&A from famous books and scholars)
const ALL_SCHOLARS: Scholar[] = [...SCHOLARS, ...(EXTRA_SCHOLARS as Scholar[])];

const ScholarsQA = ({ onBack }: ScholarsQAProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [scholar, setScholar] = useState<Scholar | null>(null);
  const [qa, setQa] = useState<QA | null>(null);
  const [qLang, setQLang] = useState<Lang>(isAr ? "ar" : "en");
  const [filter, setFilter] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const [askOpen, setAskOpen] = useState(false);
  const [askCategory, setAskCategory] = useState("general");
  const [askText, setAskText] = useState("");
  const [askAnon, setAskAnon] = useState(false);
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const submitQuestion = async () => {
    if (!askText.trim()) return;
    if (!user) {
      toast({ title: isAr ? "سجّل الدخول أولاً" : "Please sign in first", variant: "destructive" });
      return;
    }
    setAskSubmitting(true);
    const { error } = await supabase.from("questions").insert({
      user_id: user.id,
      category: askCategory,
      question_text: askText.trim(),
      anonymous: askAnon,
      status: "pending",
    });
    setAskSubmitting(false);
    if (error) {
      toast({ title: isAr ? "تعذر الإرسال" : "Failed to submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isAr ? "تم إرسال سؤالك، بارك الله فيك" : "Your question has been submitted, jazakAllah khair" });
    setAskText("");
    setAskOpen(false);
  };

  const filteredScholars = useMemo(() => {
    if (!filter.trim()) return ALL_SCHOLARS;
    const q = filter.toLowerCase();
    return ALL_SCHOLARS.filter(
      (s) =>
        s.nameEn.toLowerCase().includes(q) ||
        s.nameAr.includes(filter) ||
        s.qas.some((qa) =>
          qa.topic.includes(q) ||
          qa.question.en.toLowerCase().includes(q) ||
          qa.answer.en.toLowerCase().includes(q),
        ),
    );
  }, [filter]);

  const goBack = () => {
    if (qa) setQa(null);
    else if (scholar) setScholar(null);
    else onBack();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-3 sm:px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground truncate ${isAr ? "font-arabic" : ""}`}>
          {!scholar && (isAr ? "علماء وفتاوى" : "Scholars Q&A")}
          {scholar && !qa && (isAr ? scholar.nameAr : scholar.nameEn)}
          {qa && (qa.topicLabel[isAr ? "ar" : "en"])}
        </h1>
      </header>

      {/* Scholar list */}
      {!scholar && (
        <>
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <img src={scholarsIcon} alt="" width={48} height={48} className="w-12 h-12" loading="lazy" />
              <div>
                <p className={`text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "اختر عالمًا واستكشف فتاواه" : "Pick a scholar and explore their fatwas"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "5 لغات • مصادر موثوقة" : "5 languages • Verified sources"}
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={isAr ? "بحث..." : "Search scholar or topic..."}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {filteredScholars.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setScholar(s)}
                className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all text-left group animate-slide-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-primary font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
                    {s.nameEn.split(" ").pop()?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">{s.nameEn}</h3>
                      <span className="font-arabic text-sm text-foreground/80 truncate">{s.nameAr}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.era} • {s.qas.length} {isAr ? "فتوى" : "Q&A"}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 ${isAr ? "rotate-180" : ""}`} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Scholar detail (Q&A list) */}
      {scholar && !qa && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-border rounded-2xl p-4 space-y-2">
            <h2 className={`text-lg font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? scholar.nameAr : scholar.nameEn}
            </h2>
            <p className="text-xs text-accent">{scholar.era}</p>
            <p className={`text-sm text-muted-foreground leading-relaxed ${isAr ? "font-arabic" : ""}`}>
              {isAr ? scholar.bioAr : scholar.bioEn}
            </p>
          </div>

          <div className="space-y-2">
            {scholar.qas.map((q, i) => (
              <button
                key={q.id}
                onClick={() => { setQa(q); setQLang(isAr ? "ar" : "en"); setSourcesOpen(false); }}
                className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all space-y-2 animate-slide-up"
                style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-accent">
                  <BookOpen className="w-3 h-3" />
                  {q.topicLabel[isAr ? "ar" : "en"]}
                </div>
                <p className={`text-sm font-medium text-foreground ${isAr ? "font-arabic text-right" : ""}`} dir={isAr ? "rtl" : "ltr"}>
                  {q.question[isAr ? "ar" : "en"]}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q&A detail */}
      {qa && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* Language switcher */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
              <Globe2 className="w-3.5 h-3.5" />
              {isAr ? "اختر اللغة" : "Translation language"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setQLang(l.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    qLang === l.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              {isAr ? "السؤال" : "Question"}
            </p>
            <p
              className={`text-base font-medium text-foreground leading-relaxed ${qLang === "ar" ? "font-arabic text-right" : ""}`}
              dir={qLang === "ar" ? "rtl" : "ltr"}
              key={`q-${qLang}`}
            >
              {qa.question[qLang]}
            </p>
          </div>

          {/* Answer */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-4 sm:p-5 space-y-3 animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {isAr ? "الجواب" : "Answer"}
            </p>
            <p
              className={`text-sm leading-[1.9] text-foreground ${qLang === "ar" ? "font-arabic text-right text-base" : ""}`}
              dir={qLang === "ar" ? "rtl" : "ltr"}
              key={`a-${qLang}`}
            >
              {qa.answer[qLang]}
            </p>
          </div>

          {/* Sources & References — collapsible, structured */}
          {(() => {
            const src = parseReference(qa.reference);
            return (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setSourcesOpen((v) => !v)}
                  aria-expanded={sourcesOpen}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/5 transition-colors"
                >
                  <Library className="w-4 h-4 text-accent shrink-0" />
                  <span className={`flex-1 text-sm font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                    {isAr ? "المصادر والمراجع" : "Sources & References"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
                </button>
                {sourcesOpen && (
                  <div className="border-t border-border p-4 space-y-3 animate-fade-in">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {isAr ? "المصدر الأساسي" : "Primary source"}
                      </p>
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                        <p className="text-sm font-medium text-foreground">{src.book}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {src.volume && (
                          <div className="bg-muted/50 rounded-lg px-2.5 py-1.5">
                            <span className="text-muted-foreground">{isAr ? "المجلد" : "Volume"}: </span>
                            <span className="font-semibold text-foreground">{src.volume}</span>
                          </div>
                        )}
                        {src.page && (
                          <div className="bg-muted/50 rounded-lg px-2.5 py-1.5">
                            <span className="text-muted-foreground">{isAr ? "الصفحة" : "Page"}: </span>
                            <span className="font-semibold text-foreground">{src.page}</span>
                          </div>
                        )}
                        {src.hadithNo && (
                          <div className="bg-muted/50 rounded-lg px-2.5 py-1.5">
                            <span className="text-muted-foreground">{isAr ? "رقم الحديث" : "Hadith no."}: </span>
                            <span className="font-semibold text-foreground">{src.hadithNo}</span>
                          </div>
                        )}
                        {src.grading && (
                          <div className="bg-primary/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-primary" />
                            <span className="font-semibold text-primary">{src.grading}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {isAr ? "المرجع الرقمي" : "Digital reference"}
                      </p>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        {src.digitalLabel || src.url}
                      </a>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                      {isAr
                        ? "يرجى الرجوع إلى المصدر الأصلي والتحقق منه قبل النقل أو الفتوى."
                        : "Please verify against the printed original before quoting or acting on this ruling."}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Ask FAB */}
      <button
        onClick={() => setAskOpen(true)}
        aria-label={isAr ? "اسأل سؤالاً" : "Ask a question"}
        className="fixed bottom-24 md:bottom-6 right-4 z-30 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={isAr ? "font-arabic" : ""}>
              {isAr ? "اسأل عالماً" : "Ask a scholar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {isAr ? "الموضوع" : "Category"}
              </label>
              <select
                value={askCategory}
                onChange={(e) => setAskCategory(e.target.value)}
                className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="general">{isAr ? "عام" : "General"}</option>
                <option value="aqeedah">{isAr ? "العقيدة" : "Aqeedah"}</option>
                <option value="salah">{isAr ? "الصلاة" : "Salah"}</option>
                <option value="fasting">{isAr ? "الصيام" : "Fasting"}</option>
                <option value="zakat">{isAr ? "الزكاة" : "Zakat"}</option>
                <option value="family">{isAr ? "الأسرة" : "Family"}</option>
                <option value="quran">{isAr ? "القرآن" : "Quran"}</option>
                <option value="hadith">{isAr ? "الحديث" : "Hadith"}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                {isAr ? "سؤالك" : "Your question"}
              </label>
              <textarea
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                rows={5}
                placeholder={isAr ? "اكتب سؤالك بوضوح..." : "Write your question clearly..."}
                className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={askAnon}
                onChange={(e) => setAskAnon(e.target.checked)}
                className="accent-primary"
              />
              {isAr ? "إرسال بشكل مجهول" : "Submit anonymously"}
            </label>
            <Button
              onClick={submitQuestion}
              disabled={askSubmitting || !askText.trim()}
              className="w-full"
              variant="hero"
            >
              {askSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isAr ? "إرسال" : "Submit"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScholarsQA;