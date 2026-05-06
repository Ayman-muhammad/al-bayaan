import { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BookHeart,
  Search,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DhikrPageProps {
  onBack: () => void;
}

type Screen = "menu" | "tasbih" | "duas" | "dua-detail";

interface DhikrPreset {
  id: string;
  labelAr: string;
  labelEn: string;
  phraseAr: string;
  translitEn: string;
  meaningEn: string;
  target: number;
}

interface Dua {
  id: string;
  categoryAr: string;
  categoryEn: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  translitEn: string;
  meaningEn: string;
  reference: string;
}

const DHIKR_PRESETS: DhikrPreset[] = [
  {
    id: "subhanallah",
    labelAr: "سبحان الله",
    labelEn: "SubhanAllah",
    phraseAr: "سُبْحَانَ ٱللَّٰهِ",
    translitEn: "Subhan-Allah",
    meaningEn: "Glory be to Allah",
    target: 33,
  },
  {
    id: "alhamdulillah",
    labelAr: "الحمد لله",
    labelEn: "Alhamdulillah",
    phraseAr: "ٱلْحَمْدُ لِلَّٰهِ",
    translitEn: "Al-hamdu lillah",
    meaningEn: "All praise is due to Allah",
    target: 33,
  },
  {
    id: "allahuakbar",
    labelAr: "الله أكبر",
    labelEn: "Allahu Akbar",
    phraseAr: "ٱللَّٰهُ أَكْبَرُ",
    translitEn: "Allahu Akbar",
    meaningEn: "Allah is the Greatest",
    target: 34,
  },
  {
    id: "lailahaillallah",
    labelAr: "لا إله إلا الله",
    labelEn: "La ilaha illallah",
    phraseAr: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ",
    translitEn: "La ilaha illa-llah",
    meaningEn: "There is no god but Allah",
    target: 100,
  },
  {
    id: "istighfar",
    labelAr: "أستغفر الله",
    labelEn: "Astaghfirullah",
    phraseAr: "أَسْتَغْفِرُ ٱللَّٰهَ",
    translitEn: "Astaghfirullah",
    meaningEn: "I seek forgiveness from Allah",
    target: 100,
  },
  {
    id: "salawat",
    labelAr: "اللهم صلِّ على محمد",
    labelEn: "Salawat",
    phraseAr: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ",
    translitEn: "Allahumma salli ala Muhammad",
    meaningEn: "O Allah, send blessings upon Muhammad ﷺ",
    target: 100,
  },
];

const DUAS: Dua[] = [
  {
    id: "morning-1",
    categoryAr: "أذكار الصباح",
    categoryEn: "Morning",
    titleAr: "سيد الاستغفار",
    titleEn: "Master of Seeking Forgiveness",
    textAr:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.",
    translitEn:
      "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana ‘abduka…",
    meaningEn:
      "O Allah, You are my Lord; none has the right to be worshipped except You. You created me and I am Your servant… Forgive me, for none forgives sins except You.",
    reference: "Sahih al-Bukhari 6306",
  },
  {
    id: "morning-2",
    categoryAr: "أذكار الصباح",
    categoryEn: "Morning",
    titleAr: "الإخلاص والمعوذتين",
    titleEn: "Three Quls (3x morning & evening)",
    textAr:
      "قُلْ هُوَ ٱللَّهُ أَحَدٌ… قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ… قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ…",
    translitEn: "Surahs 112, 113, 114 — recited three times each",
    meaningEn: "Protection from all evil, morning and evening.",
    reference: "Abu Dawud 5082, Tirmidhi 3575",
  },
  {
    id: "evening-1",
    categoryAr: "أذكار المساء",
    categoryEn: "Evening",
    titleAr: "آية الكرسي",
    titleEn: "Ayat al-Kursi",
    textAr:
      "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ…",
    translitEn: "Allahu la ilaha illa huwa, al-Hayyu al-Qayyum…",
    meaningEn:
      "Whoever recites Ayat al-Kursi after every obligatory prayer, nothing will keep him from Paradise except death.",
    reference: "An-Nasa’i — al-Kubra 9928",
  },
  {
    id: "sleep-1",
    categoryAr: "قبل النوم",
    categoryEn: "Before Sleep",
    titleAr: "دعاء النوم",
    titleEn: "Before Sleeping",
    textAr: "بِٱسْمِكَ ٱللَّهُمَّ أَمُوتُ وَأَحْيَا",
    translitEn: "Bismika Allahumma amutu wa ahya",
    meaningEn: "In Your name, O Allah, I die and I live.",
    reference: "Sahih al-Bukhari 6324",
  },
  {
    id: "sleep-2",
    categoryAr: "قبل النوم",
    categoryEn: "Before Sleep",
    titleAr: "المعوذات قبل النوم",
    titleEn: "Three Quls on Hands",
    textAr: "قُلْ هُوَ ٱللَّهُ أَحَدٌ + ٱلْفَلَقِ + ٱلنَّاسِ (3x)",
    translitEn: "Recite 112, 113, 114 three times, wipe over body",
    meaningEn:
      "The Prophet ﷺ would recite the three Quls, blow in his hands, and wipe over himself before sleeping.",
    reference: "Sahih al-Bukhari 5017",
  },
  {
    id: "anxiety-1",
    categoryAr: "عند الضيق",
    categoryEn: "Anxiety & Distress",
    titleAr: "دعاء الهمّ والحزن",
    titleEn: "Relief from Worry",
    textAr:
      "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ… أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ… أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي.",
    translitEn: "Allahumma inni ‘abduka, ibnu ‘abdika…",
    meaningEn:
      "Make the Quran the spring of my heart, the light of my chest, the banisher of my sorrow and the remover of my worry.",
    reference: "Musnad Ahmad 3712 — Sahih",
  },
  {
    id: "travel-1",
    categoryAr: "السفر",
    categoryEn: "Travel",
    titleAr: "دعاء السفر",
    titleEn: "When Setting Off",
    textAr:
      "سُبْحَانَ ٱلَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّآ إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ",
    translitEn: "Subhana-lladhi sakhkhara lana hadha…",
    meaningEn:
      "Glory be to Him Who has subjected this to us, and we could never have accomplished it. Indeed, to our Lord we will return.",
    reference: "Sahih Muslim 1342",
  },
  {
    id: "eating-1",
    categoryAr: "الطعام",
    categoryEn: "Eating",
    titleAr: "قبل الأكل",
    titleEn: "Before Eating",
    textAr: "بِسْمِ ٱللَّهِ",
    translitEn: "Bismillah",
    meaningEn: "In the name of Allah.",
    reference: "Abu Dawud 3767 — Sahih",
  },
  {
    id: "eating-2",
    categoryAr: "الطعام",
    categoryEn: "Eating",
    titleAr: "بعد الأكل",
    titleEn: "After Eating",
    textAr:
      "ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    translitEn: "Al-hamdu lillahi-lladhi at‘amani hadha…",
    meaningEn:
      "Praise be to Allah Who has fed me this and provided for me without any might or power on my part.",
    reference: "Abu Dawud 4023 — Sahih",
  },
  {
    id: "rain-1",
    categoryAr: "المطر",
    categoryEn: "Rain",
    titleAr: "عند نزول المطر",
    titleEn: "When It Rains",
    textAr: "اللَّهُمَّ صَيِّبًا نَافِعًا",
    translitEn: "Allahumma sayyiban nafi‘a",
    meaningEn: "O Allah, let it be a beneficial rain cloud.",
    reference: "Sahih al-Bukhari 1032",
  },
  {
    id: "morning-3",
    categoryAr: "أذكار الصباح",
    categoryEn: "Morning",
    titleAr: "سبحان الله وبحمده (100x)",
    titleEn: "SubhanAllahi wa bihamdihi (100x)",
    textAr: "سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ",
    translitEn: "Subhan Allahi wa bi-hamdihi",
    meaningEn: "Whoever says it 100 times in a day, his sins are forgiven even if they were like the foam of the sea.",
    reference: "Sahih al-Bukhari 6405",
  },
  {
    id: "morning-4",
    categoryAr: "أذكار الصباح",
    categoryEn: "Morning",
    titleAr: "حسبي الله لا إله إلا هو (7x)",
    titleEn: "HasbiyAllah (7x morning & evening)",
    textAr: "حَسْبِيَ ٱللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ",
    translitEn: "Hasbiyallahu la ilaha illa huwa, ‘alayhi tawakkaltu wa huwa Rabbul ‘arshil ‘azeem",
    meaningEn: "Allah is sufficient for me; there is no god but Him. Whoever recites it 7x, Allah will suffice him in this world and the Hereafter.",
    reference: "Abu Dawud 5081",
  },
  {
    id: "evening-2",
    categoryAr: "أذكار المساء",
    categoryEn: "Evening",
    titleAr: "أعوذ بكلمات الله التامات",
    titleEn: "Refuge in Allah's Perfect Words",
    textAr: "أَعُوذُ بِكَلِمَاتِ ٱللَّهِ ٱلتَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    translitEn: "A‘udhu bi-kalimatillahit-tammati min sharri ma khalaq",
    meaningEn: "I seek refuge in Allah's perfect words from the evil of what He created. Nothing will harm him that night.",
    reference: "Sahih Muslim 2708",
  },
  {
    id: "evening-3",
    categoryAr: "أذكار المساء",
    categoryEn: "Evening",
    titleAr: "اللَّهُمَّ بك أمسينا",
    titleEn: "O Allah, by You we reach evening",
    textAr: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ ٱلْمَصِيرُ",
    translitEn: "Allahumma bika amsayna…",
    meaningEn: "O Allah, by You we reach evening and morning, by You we live and die, and to You is the return.",
    reference: "Tirmidhi 3391 — Sahih",
  },
  {
    id: "wakeup-1",
    categoryAr: "الاستيقاظ",
    categoryEn: "Waking Up",
    titleAr: "دعاء الاستيقاظ",
    titleEn: "Upon Waking",
    textAr: "ٱلْحَمْدُ لِلَّهِ ٱلَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ ٱلنُّشُورُ",
    translitEn: "Alhamdulillahi-lladhi ahyana ba‘da ma amatana wa ilayhin-nushur",
    meaningEn: "Praise be to Allah who gave us life after death, and to Him is the resurrection.",
    reference: "Sahih al-Bukhari 6312",
  },
  {
    id: "wudu-1",
    categoryAr: "الوضوء",
    categoryEn: "Wudu",
    titleAr: "بعد الوضوء",
    titleEn: "After Wudu",
    textAr: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
    translitEn: "Ash-hadu an la ilaha illallahu wahdahu la sharika lah…",
    meaningEn: "Whoever says this after wudu, the eight gates of Paradise are opened for him.",
    reference: "Sahih Muslim 234",
  },
  {
    id: "mosque-1",
    categoryAr: "المسجد",
    categoryEn: "Mosque",
    titleAr: "دخول المسجد",
    titleEn: "Entering the Mosque",
    textAr: "اللَّهُمَّ ٱفْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    translitEn: "Allahumma-ftah li abwaba rahmatik",
    meaningEn: "O Allah, open for me the gates of Your mercy.",
    reference: "Sahih Muslim 713",
  },
  {
    id: "mosque-2",
    categoryAr: "المسجد",
    categoryEn: "Mosque",
    titleAr: "خروج المسجد",
    titleEn: "Leaving the Mosque",
    textAr: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    translitEn: "Allahumma inni as’aluka min fadlik",
    meaningEn: "O Allah, I ask You from Your bounty.",
    reference: "Sahih Muslim 713",
  },
  {
    id: "home-1",
    categoryAr: "البيت",
    categoryEn: "Home",
    titleAr: "دخول البيت",
    titleEn: "Entering the Home",
    textAr: "بِسْمِ ٱللَّهِ وَلَجْنَا، وَبِسْمِ ٱللَّهِ خَرَجْنَا، وَعَلَىٰ رَبِّنَا تَوَكَّلْنَا",
    translitEn: "Bismillahi walajna, wa bismillahi kharajna, wa ‘ala Rabbina tawakkalna",
    meaningEn: "In the name of Allah we enter, in the name of Allah we leave, and upon our Lord we rely.",
    reference: "Abu Dawud 5096 — Hasan",
  },
  {
    id: "bathroom-1",
    categoryAr: "الخلاء",
    categoryEn: "Bathroom",
    titleAr: "دخول الخلاء",
    titleEn: "Entering the Bathroom",
    textAr: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ ٱلْخُبُثِ وَٱلْخَبَائِثِ",
    translitEn: "Allahumma inni a‘udhu bika minal-khubuthi wal-khaba’ith",
    meaningEn: "O Allah, I seek refuge in You from male and female devils.",
    reference: "Sahih al-Bukhari 142",
  },
  {
    id: "anxiety-2",
    categoryAr: "عند الضيق",
    categoryEn: "Anxiety & Distress",
    titleAr: "دعاء الكرب",
    titleEn: "Du'a of Distress",
    textAr: "لَا إِلَٰهَ إِلَّا ٱللَّهُ ٱلْعَظِيمُ ٱلْحَلِيمُ، لَا إِلَٰهَ إِلَّا ٱللَّهُ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ، لَا إِلَٰهَ إِلَّا ٱللَّهُ رَبُّ ٱلسَّمَاوَاتِ وَرَبُّ ٱلْأَرْضِ وَرَبُّ ٱلْعَرْشِ ٱلْكَرِيمِ",
    translitEn: "La ilaha illallahul-‘Azeemul-Halim…",
    meaningEn: "The Prophet ﷺ used to say this in times of distress.",
    reference: "Sahih al-Bukhari 6346",
  },
  {
    id: "anxiety-3",
    categoryAr: "عند الضيق",
    categoryEn: "Anxiety & Distress",
    titleAr: "يا حي يا قيوم",
    titleEn: "Ya Hayyu Ya Qayyum",
    textAr: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَىٰ نَفْسِي طَرْفَةَ عَيْنٍ",
    translitEn: "Ya Hayyu Ya Qayyumu bi-rahmatika astagheeth…",
    meaningEn: "O Living, O Sustaining, by Your mercy I seek help. Rectify all my affairs and do not leave me to myself for the blink of an eye.",
    reference: "An-Nasa’i — al-Kubra 10405 — Hasan",
  },
  {
    id: "forgiveness-1",
    categoryAr: "الاستغفار",
    categoryEn: "Forgiveness",
    titleAr: "أستغفر الله العظيم (100x)",
    titleEn: "Seek forgiveness 100x",
    textAr: "أَسْتَغْفِرُ ٱللَّهَ ٱلْعَظِيمَ ٱلَّذِي لَا إِلَٰهَ إِلَّا هُوَ ٱلْحَيُّ ٱلْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
    translitEn: "Astaghfirullaha-l-‘Azeem alladhee la ilaha illa Huwa…",
    meaningEn: "Whoever says it, his sins are forgiven even if he fled from battle.",
    reference: "Abu Dawud 1517 — Sahih",
  },
  {
    id: "knowledge-1",
    categoryAr: "العلم",
    categoryEn: "Knowledge",
    titleAr: "دعاء طلب العلم",
    titleEn: "For Beneficial Knowledge",
    textAr: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
    translitEn: "Allahumma inni as’aluka ‘ilman nafi‘a, wa rizqan tayyiba, wa ‘amalan mutaqabbala",
    meaningEn: "O Allah, I ask You for beneficial knowledge, good provision, and accepted deeds.",
    reference: "Ibn Majah 925 — Sahih",
  },
  {
    id: "parents-1",
    categoryAr: "الوالدين",
    categoryEn: "Parents",
    titleAr: "دعاء للوالدين",
    titleEn: "For Parents",
    textAr: "رَبِّ ٱرْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    translitEn: "Rabbir-hamhuma kama rabbayani sagheera",
    meaningEn: "My Lord, have mercy upon them as they raised me when I was small.",
    reference: "Quran 17:24",
  },
  {
    id: "wealth-1",
    categoryAr: "الرزق",
    categoryEn: "Provision",
    titleAr: "دعاء سعة الرزق",
    titleEn: "For Lawful Provision",
    textAr: "اللَّهُمَّ ٱكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
    translitEn: "Allahumma-kfini bi-halalika ‘an haramik, wa aghnini bi-fadlika ‘amman siwak",
    meaningEn: "O Allah, suffice me with what You have made lawful instead of unlawful, and enrich me by Your bounty above all others.",
    reference: "Tirmidhi 3563 — Hasan",
  },
  {
    id: "guidance-1",
    categoryAr: "الهداية",
    categoryEn: "Guidance",
    titleAr: "دعاء الاستخارة",
    titleEn: "Istikhara (Seeking Guidance)",
    textAr: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ ٱلْعَظِيمِ…",
    translitEn: "Allahumma inni astakhiruka bi-‘ilmik…",
    meaningEn: "Pray two rak'ahs then make this du'a when seeking guidance for any matter.",
    reference: "Sahih al-Bukhari 1162",
  },
  {
    id: "protection-1",
    categoryAr: "الحماية",
    categoryEn: "Protection",
    titleAr: "بِسْمِ اللَّهِ الَّذِي لا يَضُرُّ (3x)",
    titleEn: "Protection from harm (3x)",
    textAr: "بِسْمِ ٱللَّهِ ٱلَّذِي لَا يَضُرُّ مَعَ ٱسْمِهِ شَيْءٌ فِي ٱلْأَرْضِ وَلَا فِي ٱلسَّمَاءِ وَهُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
    translitEn: "Bismillahi-lladhi la yadurru ma‘asmihi shay’un…",
    meaningEn: "Whoever says this 3x morning and evening, nothing will harm him.",
    reference: "Abu Dawud 5088 — Sahih",
  },
  {
    id: "marriage-1",
    categoryAr: "الزواج",
    categoryEn: "Family",
    titleAr: "للزوجة والذرية الصالحة",
    titleEn: "For Righteous Spouse & Offspring",
    textAr: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَٱجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    translitEn: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a‘yun…",
    meaningEn: "Our Lord, grant us from our spouses and offspring comfort to our eyes, and make us a leader for the righteous.",
    reference: "Quran 25:74",
  },
  {
    id: "ill-1",
    categoryAr: "المرض",
    categoryEn: "Illness",
    titleAr: "زيارة المريض",
    titleEn: "Visiting the Sick",
    textAr: "أَسْأَلُ ٱللَّهَ ٱلْعَظِيمَ، رَبَّ ٱلْعَرْشِ ٱلْعَظِيمِ، أَنْ يَشْفِيَكَ (7x)",
    translitEn: "As’alullaha-l-‘Azeem, Rabbal-‘arshil-‘azeem, an yashfiyaka (7x)",
    meaningEn: "I ask Allah the Mighty, Lord of the Magnificent Throne, to cure you. (Recite 7 times.)",
    reference: "Tirmidhi 2083 — Sahih",
  },
  {
    id: "after-salah-1",
    categoryAr: "بعد الصلاة",
    categoryEn: "After Salah",
    titleAr: "أذكار بعد الصلاة",
    titleEn: "After Obligatory Prayer",
    textAr: "أَسْتَغْفِرُ ٱللَّهَ (3x) — اللَّهُمَّ أَنْتَ ٱلسَّلَامُ وَمِنْكَ ٱلسَّلَامُ تَبَارَكْتَ يَا ذَا ٱلْجَلَالِ وَٱلْإِكْرَامِ",
    translitEn: "Astaghfirullah ×3 — Allahumma antas-Salam…",
    meaningEn: "Said immediately after each obligatory prayer.",
    reference: "Sahih Muslim 591",
  },
  {
    id: "after-salah-2",
    categoryAr: "بعد الصلاة",
    categoryEn: "After Salah",
    titleAr: "تسبيح فاطمة",
    titleEn: "Tasbih of Fatimah",
    textAr: "سُبْحَانَ ٱللَّهِ (33) — ٱلْحَمْدُ لِلَّهِ (33) — ٱللَّهُ أَكْبَرُ (34)",
    translitEn: "33× SubhanAllah, 33× Alhamdulillah, 34× Allahu Akbar",
    meaningEn: "After each obligatory prayer — better than a servant according to the Prophet ﷺ.",
    reference: "Sahih al-Bukhari 5362",
  },
  {
    id: "jumuah-1",
    categoryAr: "الجمعة",
    categoryEn: "Friday",
    titleAr: "كثرة الصلاة على النبي ﷺ",
    titleEn: "Salawat on Friday",
    textAr: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
    translitEn: "Allahumma salli ‘ala Muhammad…",
    meaningEn: "Increase salawat on the Prophet ﷺ on Fridays — they are presented to him.",
    reference: "Abu Dawud 1047 — Sahih",
  },
];

const DhikrPage = ({ onBack }: DhikrPageProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [screen, setScreen] = useState<Screen>("menu");
  const [activePreset, setActivePreset] = useState<DhikrPreset | null>(null);
  const [count, setCount] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [duaFilter, setDuaFilter] = useState("");
  const [selectedDua, setSelectedDua] = useState<Dua | null>(null);
  const milestoneRef = useRef<number>(0);

  // Load saved session total from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("al-bayani-dhikr-total");
    if (raw) setSessionTotal(parseInt(raw, 10) || 0);
  }, []);

  const persistTotal = (next: number) => {
    setSessionTotal(next);
    localStorage.setItem("al-bayani-dhikr-total", String(next));
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  const increment = () => {
    if (!activePreset) return;
    const next = count + 1;
    setCount(next);
    persistTotal(sessionTotal + 1);

    // Milestone haptics & feedback
    if (next === activePreset.target) {
      vibrate([60, 40, 60, 40, 120]);
      toast({
        title: isAr ? "أحسنت! ما شاء الله" : "MashaAllah — Complete",
        description: `${activePreset.translitEn} × ${activePreset.target}`,
      });
      milestoneRef.current = next;
    } else if (next % 33 === 0) {
      vibrate([30, 20, 30]);
    } else {
      vibrate(15);
    }
  };

  const resetCount = () => {
    setCount(0);
    milestoneRef.current = 0;
  };

  const startPreset = (preset: DhikrPreset) => {
    setActivePreset(preset);
    setCount(0);
    milestoneRef.current = 0;
    setScreen("tasbih");
  };

  const filteredDuas = useMemo(() => {
    if (!duaFilter.trim()) return DUAS;
    const q = duaFilter.toLowerCase();
    return DUAS.filter(
      (d) =>
        d.titleEn.toLowerCase().includes(q) ||
        d.titleAr.includes(duaFilter) ||
        d.categoryEn.toLowerCase().includes(q) ||
        d.meaningEn.toLowerCase().includes(q),
    );
  }, [duaFilter]);

  const duasByCategory = useMemo(() => {
    const map = new Map<string, Dua[]>();
    filteredDuas.forEach((d) => {
      const key = isAr ? d.categoryAr : d.categoryEn;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return Array.from(map.entries());
  }, [filteredDuas, isAr]);

  const goBack = () => {
    if (screen === "dua-detail") {
      setSelectedDua(null);
      setScreen("duas");
    } else if (screen === "tasbih" || screen === "duas") {
      setScreen("menu");
    } else {
      onBack();
    }
  };

  // Progress ring calculation
  const progressPct = activePreset
    ? Math.min(100, (count / activePreset.target) * 100)
    : 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-3 sm:px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1
          className={`font-semibold text-foreground truncate ${
            isAr ? "font-arabic" : ""
          }`}
        >
          {screen === "menu" && (isAr ? "الأذكار والأدعية" : "Dhikr & Dua")}
          {screen === "tasbih" && (isAr ? "السبحة" : "Tasbih")}
          {screen === "duas" && (isAr ? "حصن المسلم" : "Hisnul Muslim")}
          {screen === "dua-detail" &&
            (isAr ? selectedDua?.titleAr : selectedDua?.titleEn)}
        </h1>
      </header>

      {/* === MENU === */}
      {screen === "menu" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="text-center py-4 sm:py-6 space-y-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h2
              className={`text-xl sm:text-2xl font-bold text-foreground ${
                isAr ? "font-arabic" : ""
              }`}
            >
              {isAr ? "الأذكار والأدعية" : "Dhikr & Dua"}
            </h2>
            <p
              className={`text-sm text-muted-foreground max-w-sm mx-auto px-2 ${
                isAr ? "font-arabic" : ""
              }`}
            >
              {isAr
                ? "سبّح واذكر الله مع العداد الرقمي وادعُ بأدعية السنة"
                : "Digital tasbih with haptics and authentic duas from the Sunnah"}
            </p>
          </div>

          {/* Session total */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-border rounded-2xl p-4 text-center">
            <p
              className={`text-xs text-muted-foreground mb-1 ${
                isAr ? "font-arabic" : ""
              }`}
            >
              {isAr ? "إجمالي التسبيحات" : "Total Dhikr Count"}
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-gradient-gold">
              {sessionTotal.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DHIKR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => startPreset(preset)}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-arabic text-lg text-foreground group-hover:text-primary transition-colors" dir="rtl">
                      {preset.phraseAr}
                    </p>
                    <p
                      className={`text-xs text-muted-foreground mt-1 ${
                        isAr ? "font-arabic" : ""
                      }`}
                    >
                      {isAr ? preset.labelAr : preset.translitEn}
                    </p>
                  </div>
                  <div className="shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    ×{preset.target}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setScreen("duas")}
            className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all flex items-center gap-3 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <BookHeart className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-foreground ${
                  isAr ? "font-arabic" : ""
                }`}
              >
                {isAr ? "حصن المسلم" : "Hisnul Muslim"}
              </h3>
              <p
                className={`text-xs text-muted-foreground ${
                  isAr ? "font-arabic" : ""
                }`}
              >
                {isAr
                  ? "أدعية الصباح، المساء، النوم، السفر والمزيد"
                  : "Morning, evening, sleep, travel & more"}
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground shrink-0 ${isAr ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {/* === TASBIH === */}
      {screen === "tasbih" && activePreset && (
        <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-background via-primary/5 to-accent/10">
          {/* Decorative glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/15 blur-3xl animate-pulse" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="relative h-full flex flex-col items-center justify-between py-6 px-4 overflow-y-auto scrollbar-thin">
            <div className="text-center space-y-1.5 w-full max-w-sm">
              <p className="font-arabic text-3xl sm:text-4xl text-foreground leading-snug break-words" dir="rtl">
                {activePreset.phraseAr}
              </p>
              <p className="text-xs text-accent/90 font-medium tracking-wide uppercase">
                {activePreset.translitEn}
              </p>
              <p className={`text-xs text-muted-foreground px-4 ${isAr ? "font-arabic" : ""}`}>
                {isAr ? activePreset.labelAr : activePreset.meaningEn}
              </p>
            </div>

            {/* Premium dial */}
            <button
              onClick={increment}
              aria-label="Count"
              className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center active:scale-[0.97] transition-all touch-none select-none my-2 group"
            >
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40 blur-2xl opacity-60 group-active:opacity-90 transition-opacity" />
              {/* Glass surface */}
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-card to-card/60 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.5),inset_0_1px_0_0_hsl(0_0%_100%/0.1)]" />
              {/* Progress arc */}
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 120 120"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="dhikrGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="56" fill="none" stroke="hsl(var(--muted)/0.4)" strokeWidth="3" />
                <circle
                  cx="60"
                  cy="60"
                  r="56"
                  fill="none"
                  stroke="url(#dhikrGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progressPct / 100)}`}
                  className="transition-[stroke-dashoffset] duration-500 ease-out drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                />
              </svg>
              {/* Counter */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-7xl sm:text-8xl font-extralight text-foreground tabular-nums tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text">
                  {count}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="h-px w-6 bg-gradient-to-r from-transparent to-accent/60" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold">
                    {count >= activePreset.target ? (isAr ? "تم" : "Done") : `${activePreset.target}`}
                  </span>
                  <span className="h-px w-6 bg-gradient-to-l from-transparent to-accent/60" />
                </div>
                {progressPct >= 100 && (
                  <span className="mt-2 text-xs text-primary font-medium animate-fade-in">
                    ✦ {isAr ? "ما شاء الله" : "MashaAllah"} ✦
                  </span>
                )}
              </div>
              {/* Inner highlight */}
              <div className="absolute inset-6 rounded-full pointer-events-none border border-white/5" />
            </button>

            <div className="w-full max-w-xs space-y-3">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={resetCount}
                  className="gap-2 rounded-full backdrop-blur-sm bg-card/60"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isAr ? "إعادة" : "Reset"}
                </Button>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={increment}
                  className="rounded-full min-w-[140px] shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]"
                >
                  + {isAr ? "تسبيح" : "Count"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                {isAr ? "انقر الدائرة للعدّ • اهتزاز عند كل ٣٣" : "Tap circle to count • Haptic at every 33"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* === DUAS LIST === */}
      {screen === "duas" && (
        <>
          <div className="p-3 sm:p-4 border-b border-border bg-card shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={duaFilter}
                onChange={(e) => setDuaFilter(e.target.value)}
                placeholder={isAr ? "ابحث عن دعاء..." : "Search duas..."}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5 scrollbar-thin">
            {duasByCategory.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                {isAr ? "لا توجد نتائج" : "No results found"}
              </p>
            )}
            {duasByCategory.map(([category, duas]) => (
              <div key={category} className="space-y-2">
                <h3
                  className={`text-xs font-semibold uppercase tracking-wider text-accent px-1 ${
                    isAr ? "font-arabic" : ""
                  }`}
                >
                  {category}
                </h3>
                <div className="space-y-2">
                  {duas.map((dua) => (
                    <button
                      key={dua.id}
                      onClick={() => {
                        setSelectedDua(dua);
                        setScreen("dua-detail");
                      }}
                      className="w-full bg-card border border-border rounded-xl p-3 sm:p-4 hover:border-primary/30 transition-colors text-left space-y-1"
                    >
                      <p
                        className={`font-medium text-sm text-foreground ${
                          isAr ? "font-arabic text-right" : ""
                        }`}
                        dir={isAr ? "rtl" : "ltr"}
                      >
                        {isAr ? dua.titleAr : dua.titleEn}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {dua.meaningEn}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* === DUA DETAIL === */}
      {screen === "dua-detail" && selectedDua && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-accent uppercase tracking-wider">
                {isAr ? selectedDua.categoryAr : selectedDua.categoryEn}
              </p>
              <h2
                className={`text-lg sm:text-xl font-bold text-foreground mt-1 ${
                  isAr ? "font-arabic" : ""
                }`}
              >
                {isAr ? selectedDua.titleAr : selectedDua.titleEn}
              </h2>
            </div>

            <div className="border-t border-border pt-4">
              <p
                className="font-arabic text-xl sm:text-2xl text-foreground leading-[2] text-right break-words"
                dir="rtl"
              >
                {selectedDua.textAr}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Transliteration
              </p>
              <p className="text-sm italic text-foreground/80">
                {selectedDua.translitEn}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Meaning
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {selectedDua.meaningEn}
              </p>
            </div>

            <div className="border-t border-border pt-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs font-medium text-accent">
                {selectedDua.reference}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DhikrPage;
