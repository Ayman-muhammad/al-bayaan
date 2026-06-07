import { useLanguage } from "@/contexts/LanguageContext";
import { Sunrise, BookOpen, Heart, Sparkles, Share2 } from "lucide-react";
import { useState, useEffect } from "react";

const DAILY_CONTENT = [
  {
    verse: { ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", en: "Indeed, with hardship comes ease." },
    reference: "Surah Ash-Sharh 94:6",
    hadith: { ar: "إنما الأعمال بالنيات", en: "Actions are judged by intentions." },
    hadithRef: "Sahih al-Bukhari 1",
    reflection: { ar: "تأمل في نواياك اليوم. هل أعمالك لوجه الله؟", en: "Reflect on your intentions today. Are your actions for the sake of Allah?" },
  },
  {
    verse: { ar: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", en: "And whoever relies upon Allah - then He is sufficient for him." },
    reference: "Surah At-Talaq 65:3",
    hadith: { ar: "من قال لا إله إلا الله دخل الجنة", en: "Whoever says 'La ilaha illallah' will enter Paradise." },
    hadithRef: "Sahih Muslim 26a",
    reflection: { ar: "ضع توكلك على الله في كل أمورك اليوم", en: "Put your trust in Allah in all your affairs today." },
  },
  {
    verse: { ar: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ", en: "And your Lord is going to give you, and you will be satisfied." },
    reference: "Surah Ad-Duha 93:5",
    hadith: { ar: "تبسمك في وجه أخيك صدقة", en: "Your smile to your brother is a charity." },
    hadithRef: "Jami' at-Tirmidhi 1956",
    reflection: { ar: "ابتسم اليوم وانشر الخير حولك", en: "Smile today and spread goodness around you." },
  },
  {
    verse: { ar: "فَاذْكُرُونِي أَذْكُرْكُمْ", en: "So remember Me; I will remember you." },
    reference: "Surah Al-Baqarah 2:152",
    hadith: { ar: "خيركم من تعلم القرآن وعلمه", en: "The best of you are those who learn the Quran and teach it." },
    hadithRef: "Sahih al-Bukhari 5027",
    reflection: { ar: "خصص وقتاً اليوم لذكر الله وقراءة القرآن", en: "Set aside time today for remembrance of Allah and Quran recitation." },
  },
  {
    verse: { ar: "وَقُل رَّبِّ زِدْنِي عِلْمًا", en: "And say: My Lord, increase me in knowledge." },
    reference: "Surah Ta-Ha 20:114",
    hadith: { ar: "من سلك طريقاً يلتمس فيه علماً سهل الله له به طريقاً إلى الجنة", en: "Whoever takes a path seeking knowledge, Allah will make easy for him a path to Paradise." },
    hadithRef: "Sahih Muslim 2699",
    reflection: { ar: "اسعَ لتعلم شيئاً جديداً عن دينك اليوم", en: "Seek to learn something new about your religion today." },
  },
  {
    verse: { ar: "وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ", en: "And do not despair of relief from Allah." },
    reference: "Surah Yusuf 12:87",
    hadith: { ar: "المؤمن القوي خير وأحب إلى الله من المؤمن الضعيف", en: "The strong believer is better and more beloved to Allah than the weak believer." },
    hadithRef: "Sahih Muslim 2664",
    reflection: { ar: "لا تفقد الأمل. الله معك في كل لحظة", en: "Never lose hope. Allah is with you at every moment." },
  },
  {
    verse: { ar: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", en: "Indeed, Allah is with the patient." },
    reference: "Surah Al-Baqarah 2:153",
    hadith: { ar: "ما نقصت صدقة من مال", en: "Charity does not decrease wealth." },
    hadithRef: "Sahih Muslim 2588",
    reflection: { ar: "تصدق اليوم ولو بابتسامة أو كلمة طيبة", en: "Give charity today, even if it's a smile or a kind word." },
  },
];

// Additional dynamic verses for variety
const EXTRA_VERSES = [
  { ar: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً", en: "Our Lord, give us good in this world and good in the Hereafter.", ref: "Surah Al-Baqarah 2:201" },
  { ar: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", en: "And when My servants ask you about Me - indeed I am near.", ref: "Surah Al-Baqarah 2:186" },
  { ar: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", en: "O you who have believed, seek help through patience and prayer.", ref: "Surah Al-Baqarah 2:153" },
];

const DailyVerse = () => {
  const { language } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => Math.floor(Math.random() * 200) + 50);

  // Use combination of day + hour segment for more dynamic content
  const dayIndex = new Date().getDay();
  const hourSegment = Math.floor(new Date().getHours() / 8); // Changes 3 times a day
  const contentIndex = (dayIndex * 3 + hourSegment) % DAILY_CONTENT.length;
  const daily = DAILY_CONTENT[contentIndex];
  const extraVerse = EXTRA_VERSES[(dayIndex + hourSegment) % EXTRA_VERSES.length];

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const handleShare = async () => {
    const text = `${daily.verse.ar}\n\n"${daily.verse.en}"\n— ${daily.reference}`;
    try {
      if (navigator.share) await navigator.share({ title: "Al-Bayan • Daily Verse", text });
      else await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group">
      {/* Decorative gold glow */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-60 group-hover:opacity-90 transition-opacity duration-700"
        style={{ background: "radial-gradient(circle, hsl(var(--accent)/0.25) 0%, transparent 65%)" }}
      />
      <div className="absolute inset-0 islamic-pattern opacity-[0.07] pointer-events-none" />

      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent/30 to-primary/20 flex items-center justify-center shadow-inner">
            <Sunrise className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-accent/80 font-semibold">
              {language === "ar" ? "اليوم" : "Today"}
            </p>
            <h3 className={`font-bold text-foreground leading-tight ${language === "ar" ? "font-arabic text-lg" : "text-base"}`}>
              {language === "ar" ? "رحلتك الروحية" : "Spiritual Journey"}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-background/60 hover:bg-accent/15 text-muted-foreground hover:text-accent transition-colors flex items-center justify-center"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleLike}
            className="flex items-center gap-1 px-2.5 h-9 rounded-full bg-background/60 hover:bg-accent/15 text-muted-foreground hover:text-accent transition-colors"
          >
            <Heart className={`w-4 h-4 transition-all duration-300 ${liked ? "fill-accent text-accent scale-110" : ""}`} />
            <span className="text-xs tabular-nums font-medium">{likeCount}</span>
          </button>
        </div>
      </div>

      {/* Verse */}
      <div className="relative bg-background/70 backdrop-blur rounded-2xl p-5 border border-accent/20 shadow-sm">
        <Sparkles className="absolute top-3 right-3 w-4 h-4 text-accent/40" />
        <p className="font-arabic text-2xl sm:text-3xl text-foreground leading-loose text-right mb-3 tracking-wide">
          {daily.verse.ar}
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent my-3" />
        <p className="text-sm sm:text-base text-foreground/80 italic leading-relaxed">"{daily.verse.en}"</p>
        <div className="flex items-center gap-1.5 mt-3">
          <BookOpen className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs text-accent font-semibold tracking-wide">{daily.reference}</span>
        </div>
      </div>

      {/* Hadith */}
      <div className="relative bg-background/70 backdrop-blur rounded-2xl p-5 border border-primary/20 shadow-sm mt-4">
        <span className="absolute -top-2.5 left-4 text-[10px] uppercase tracking-[0.18em] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold">
          {language === "ar" ? "حديث" : "Hadith"}
        </span>
        <p className="font-arabic text-lg text-foreground leading-loose text-right mb-2">
          {daily.hadith.ar}
        </p>
        <p className="text-sm text-foreground/75 italic">"{daily.hadith.en}"</p>
        <div className="flex items-center gap-1.5 mt-2.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-semibold">{daily.hadithRef}</span>
        </div>
      </div>

      {/* Extra dynamic verse */}
      <div className="relative bg-background/40 rounded-2xl p-4 border border-border/50 mt-4">
        <p className="font-arabic text-base text-foreground/90 leading-loose text-right mb-1">
          {extraVerse.ar}
        </p>
        <p className="text-xs text-muted-foreground italic">"{extraVerse.en}"</p>
        <span className="text-[10px] text-muted-foreground/80 font-medium">{extraVerse.ref}</span>
      </div>

      {/* Reflection */}
      <div className="relative bg-gradient-to-br from-accent/10 via-primary/5 to-transparent rounded-2xl p-5 border border-accent/15 mt-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold mb-1.5">
          {language === "ar" ? "تأمل" : "Reflection"}
        </p>
        <p className={`text-sm sm:text-base text-foreground leading-relaxed ${language === "ar" ? "font-arabic text-right" : ""}`}>
          {daily.reflection[language]}
        </p>
      </div>
    </div>
  );
};

export default DailyVerse;
