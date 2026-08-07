/**
 * Physical Mushaf page engine.
 *
 * The Madinah printed Mushaf lays the whole Quran out over 604 pages. This
 * module fetches a real page (the exact ayah arrangement of the printed
 * page) so the reader can be paged like the physical book instead of
 * scrolling a surah.
 */

export interface PageAyah {
  number: number; // global 1..6236
  numberInSurah: number;
  text: string;
  translation?: string;
  surahNumber: number;
  surahNameAr: string;
  surahNameEn: string;
  surahAyahCount: number;
  revelationType: string;
  juz: number;
  sajda: boolean;
  startsSurah: boolean;
}

export interface MushafPageData {
  page: number;
  juz: number;
  ayahs: PageAyah[];
}

export const TOTAL_MUSHAF_PAGES = 604;

const BISMILLAH_RE =
  /^بِسْمِ\s*ٱللَّهِ\s*ٱلرَّحْمَ[ٰـ]?نِ\s*ٱلرَّحِيمِ\s*/u;

const cache = new Map<number, MushafPageData>();

const LS_PREFIX = "al-bayan-mushaf-page-";

function readCached(page: number): MushafPageData | null {
  if (cache.has(page)) return cache.get(page)!;
  try {
    const raw = localStorage.getItem(LS_PREFIX + page);
    if (raw) {
      const parsed = JSON.parse(raw) as MushafPageData;
      cache.set(page, parsed);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCached(data: MushafPageData) {
  cache.set(data.page, data);
  try {
    localStorage.setItem(LS_PREFIX + data.page, JSON.stringify(data));
  } catch {
    /* quota — memory cache still serves the session */
  }
}

/** Fetches one printed Mushaf page (Arabic + English), cached for offline. */
export async function fetchMushafPage(page: number): Promise<MushafPageData> {
  const clamped = Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, Math.round(page)));
  const cached = readCached(clamped);
  if (cached) return cached;

  const [arRes, enRes] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/page/${clamped}/quran-uthmani`),
    fetch(`https://api.alquran.cloud/v1/page/${clamped}/en.sahih`).catch(() => null),
  ]);
  const arJson = await arRes.json();
  if (arJson.code !== 200) throw new Error("Failed to load Mushaf page");
  let enAyahs: any[] = [];
  try {
    const enJson = enRes ? await enRes.json() : null;
    if (enJson?.code === 200) enAyahs = enJson.data.ayahs;
  } catch {
    /* translation is optional */
  }

  const ayahs: PageAyah[] = arJson.data.ayahs.map((a: any, i: number) => {
    const startsSurah = a.numberInSurah === 1;
    let text: string = a.text;
    // Pages that open a surah embed the Basmalah in ayah 1 — pull it out so
    // it can be rendered as its own calligraphic line, like the print.
    if (startsSurah && a.surah.number !== 1 && a.surah.number !== 9) {
      text = text.replace(BISMILLAH_RE, "");
    }
    return {
      number: a.number,
      numberInSurah: a.numberInSurah,
      text: text.trim(),
      translation: enAyahs[i]?.text,
      surahNumber: a.surah.number,
      surahNameAr: String(a.surah.name).replace(/^سُورَةُ\s*/u, ""),
      surahNameEn: a.surah.englishName,
      surahAyahCount: a.surah.numberOfAyahs,
      revelationType: a.surah.revelationType,
      juz: a.juz,
      sajda: !!a.sajda,
      startsSurah,
    };
  });

  const data: MushafPageData = {
    page: clamped,
    juz: ayahs[0]?.juz ?? 1,
    ayahs,
  };
  writeCached(data);
  return data;
}

/** Prefetches neighbouring pages so paging feels instant. */
export function prefetchAround(page: number) {
  [page + 1, page - 1, page + 2].forEach((p) => {
    if (p >= 1 && p <= TOTAL_MUSHAF_PAGES && !readCached(p)) {
      void fetchMushafPage(p).catch(() => {});
    }
  });
}

/** Resolves the printed page that contains a given surah:ayah. */
export async function pageForAyah(surah: number, ayah = 1): Promise<number> {
  const key = `al-bayan-page-of-${surah}-${ayah}`;
  const stored = localStorage.getItem(key);
  if (stored) return Number(stored);
  const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-uthmani`);
  const json = await res.json();
  const page = json?.data?.page ?? 1;
  try { localStorage.setItem(key, String(page)); } catch { /* ignore */ }
  return page;
}

export const JUZ_LABEL = (juz: number, isAr: boolean) =>
  isAr ? `الجزء ${juz}` : `Juz ${juz}`;

export const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
