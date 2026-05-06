// Adhan muezzin presets — all freely hosted MP3s (cached by SW for offline)
export interface Muezzin {
  id: string;
  nameEn: string;
  nameAr: string;
  url: string;
  fajrUrl?: string; // some have separate Fajr (with as-salatu khayrun min an-nawm)
}

export const MUEZZINS: Muezzin[] = [
  {
    id: "makkah",
    nameEn: "Makkah — Sheikh Ali Mulla",
    nameAr: "مكة — الشيخ علي ملا",
    url: "https://www.islamcan.com/audio/adhan/azan2.mp3",
    fajrUrl: "https://www.islamcan.com/audio/adhan/azan11.mp3",
  },
  {
    id: "madinah",
    nameEn: "Madinah — Sheikh Abdul Majeed",
    nameAr: "المدينة — الشيخ عبد المجيد",
    url: "https://www.islamcan.com/audio/adhan/azan9.mp3",
  },
  {
    id: "mishary",
    nameEn: "Mishary Rashid Alafasy",
    nameAr: "مشاري راشد العفاسي",
    url: "https://www.islamcan.com/audio/adhan/azan1.mp3",
  },
  {
    id: "qatami",
    nameEn: "Nasir al-Qatami",
    nameAr: "ناصر القطامي",
    url: "https://www.islamcan.com/audio/adhan/azan10.mp3",
  },
  {
    id: "ahmad-al-nafees",
    nameEn: "Ahmad Al-Nafees (Egypt)",
    nameAr: "أحمد النفيس",
    url: "https://www.islamcan.com/audio/adhan/azan6.mp3",
  },
  {
    id: "turkish",
    nameEn: "Turkish Style",
    nameAr: "النمط التركي",
    url: "https://www.islamcan.com/audio/adhan/azan7.mp3",
  },
];

// Du'a after the Adhan
export const DUA_AFTER_ADHAN = {
  ar: "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ.",
  en: "O Allah, Lord of this perfect call and established prayer, grant Muhammad ﷺ the means and the virtue, and raise him to the praised station which You have promised him.",
  translit: "Allahumma Rabba hadhihi-d-da'wati-t-tammah, wa-s-salati-l-qa'imah, ati Muhammadan al-wasilata wa-l-fadeelah, wab'athhu maqaman mahmudan-illadhi wa'adtah.",
  reference: "Sahih al-Bukhari 614",
};

// Reply during adhan (between phrases)
export const ADHAN_REPLY = {
  ar: "وَأَنَا أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، رَضِيتُ بِاللَّهِ رَبًّا، وَبِمُحَمَّدٍ رَسُولًا، وَبِالْإِسْلَامِ دِينًا.",
  en: "I bear witness that none has the right to be worshipped except Allah alone, with no partner, and that Muhammad ﷺ is His slave and Messenger. I am pleased with Allah as my Lord, with Muhammad as my Messenger, and with Islam as my religion.",
  reference: "Sahih Muslim 386",
};

export type PrayerKey = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export interface AdhanSettings {
  enabled: boolean;
  muezzinId: string;
  perPrayer: Record<PrayerKey, { enabled: boolean; offsetMin: number }>;
}

const SETTINGS_KEY = "al-bayan-adhan-settings";

export const DEFAULT_ADHAN_SETTINGS: AdhanSettings = {
  enabled: true,
  muezzinId: "makkah",
  perPrayer: {
    Fajr: { enabled: true, offsetMin: 0 },
    Dhuhr: { enabled: true, offsetMin: 0 },
    Asr: { enabled: true, offsetMin: 0 },
    Maghrib: { enabled: true, offsetMin: 0 },
    Isha: { enabled: true, offsetMin: 0 },
  },
};

export function loadAdhanSettings(): AdhanSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_ADHAN_SETTINGS;
    return { ...DEFAULT_ADHAN_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADHAN_SETTINGS;
  }
}

export function saveAdhanSettings(s: AdhanSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/** Pre-cache adhan audio for offline use */
export async function preCacheAdhan(muezzin: Muezzin): Promise<void> {
  try {
    await fetch(muezzin.url, { mode: "no-cors" });
    if (muezzin.fajrUrl) await fetch(muezzin.fajrUrl, { mode: "no-cors" });
  } catch {
    // SW will handle if available
  }
}