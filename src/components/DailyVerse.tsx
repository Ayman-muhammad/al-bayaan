import { useLanguage } from "@/contexts/LanguageContext";
import { Sunrise, BookOpen, Heart } from "lucide-react";
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

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4 hover:border-accent transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sunrise className="w-5 h-5 text-accent" />
          <h3 className={`font-semibold text-foreground ${language === "ar" ? "font-arabic" : ""}`}>
            {language === "ar" ? "رحلتك الروحية اليومية" : "Daily Spiritual Journey"}
          </h3>
        </div>
        <button onClick={handleLike} className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors">
          <Heart className={`w-5 h-5 transition-all duration-300 ${liked ? "fill-accent text-accent scale-110" : ""}`} />
          <span className="text-xs tabular-nums">{likeCount}</span>
        </button>
      </div>

      {/* Verse */}
      <div className="bg-background rounded-xl p-4 border-l-4 border-accent">
        <p className="font-arabic text-lg text-foreground leading-relaxed text-right mb-2">
          {daily.verse.ar}
        </p>
        <p className="text-sm text-muted-foreground italic">{daily.verse.en}</p>
        <div className="flex items-center gap-1 mt-2">
          <BookOpen className="w-3 h-3 text-accent" />
          <span className="text-xs text-accent font-medium">{daily.reference}</span>
        </div>
      </div>

      {/* Hadith */}
      <div className="bg-background rounded-xl p-4 border-l-4 border-primary">
        <p className="font-arabic text-base text-foreground leading-relaxed text-right mb-2">
          {daily.hadith.ar}
        </p>
        <p className="text-sm text-muted-foreground italic">{daily.hadith.en}</p>
        <div className="flex items-center gap-1 mt-2">
          <BookOpen className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium">{daily.hadithRef}</span>
        </div>
      </div>

      {/* Extra dynamic verse */}
      <div className="bg-background rounded-xl p-3 border-l-4 border-muted">
        <p className="font-arabic text-sm text-foreground leading-relaxed text-right mb-1">
          {extraVerse.ar}
        </p>
        <p className="text-xs text-muted-foreground italic">{extraVerse.en}</p>
        <span className="text-[10px] text-muted-foreground">{extraVerse.ref}</span>
      </div>

      {/* Reflection */}
      <div className="bg-primary/5 rounded-xl p-4">
        <p className={`text-sm text-foreground ${language === "ar" ? "font-arabic text-right" : ""}`}>
          💭 {daily.reflection[language]}
        </p>
      </div>
    </div>
  );
};

export default DailyVerse;
