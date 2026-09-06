/**
 * Realtime multilingual Quran search.
 *
 * Backed by alquran.cloud: one request searches an entire translation edition,
 * so the same keyword works in English, Arabic, Urdu, French, Indonesian,
 * Turkish, Russian, Spanish, Bengali or Swahili.
 */

export interface QuranSearchLanguage {
  code: string;
  label: string;
  edition: string;
  rtl?: boolean;
}

export const SEARCH_LANGUAGES: QuranSearchLanguage[] = [
  { code: "en", label: "English", edition: "en.sahih" },
  { code: "ar", label: "العربية", edition: "quran-simple", rtl: true },
  { code: "ur", label: "اردو", edition: "ur.jalandhry", rtl: true },
  { code: "fr", label: "Français", edition: "fr.hamidullah" },
  { code: "id", label: "Indonesia", edition: "id.indonesian" },
  { code: "tr", label: "Türkçe", edition: "tr.diyanet" },
  { code: "ru", label: "Русский", edition: "ru.kuliev" },
  { code: "es", label: "Español", edition: "es.cortes" },
  { code: "bn", label: "বাংলা", edition: "bn.bengali" },
  { code: "sw", label: "Kiswahili", edition: "sw.barwani" },
];

export interface QuranSearchHit {
  key: string;
  surahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahNumber: number;
  /** Matched text in the searched language. */
  text: string;
  /** Uthmani Arabic of the same ayah, filled in lazily. */
  arabic?: string;
}

const cache = new Map<string, QuranSearchHit[]>();

/** Searches one edition and returns up to `limit` ayah hits. */
export async function searchQuran(
  keyword: string,
  edition = "en.sahih",
  limit = 25,
): Promise<QuranSearchHit[]> {
  const q = keyword.trim();
  if (q.length < 2) return [];
  const key = `${edition}::${q.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached.slice(0, limit);

  const res = await fetch(
    `https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/${edition}`,
  );
  if (!res.ok) throw new Error("search failed");
  const json = await res.json();
  const matches: any[] = json?.data?.matches ?? [];
  const hits: QuranSearchHit[] = matches.map((m) => ({
    key: `${m.surah?.number}:${m.numberInSurah}`,
    surahNumber: m.surah?.number,
    surahNameEn: m.surah?.englishName ?? "",
    surahNameAr: String(m.surah?.name ?? "").replace(/^سُورَةُ\s*/u, ""),
    ayahNumber: m.numberInSurah,
    text: m.text,
  }));
  cache.set(key, hits);
  return hits.slice(0, limit);
}

const arabicCache = new Map<string, string>();

/** Fetches the Uthmani Arabic for an ayah so hits can show the original text. */
export async function fetchAyahArabic(surah: number, ayah: number): Promise<string> {
  const key = `${surah}:${ayah}`;
  const hit = arabicCache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${key}/quran-uthmani`);
    const json = await res.json();
    const text: string = json?.data?.text ?? "";
    if (text) arabicCache.set(key, text);
    return text;
  } catch {
    return "";
  }
}
