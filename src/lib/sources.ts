export interface StructuredSource {
  book: string;
  volume?: string;
  page?: string;
  hadithNo?: string;
  grading?: string;
  url?: string;
  digitalLabel?: string;
}

const GRADINGS = ["Sahih", "Hasan", "Da'if", "Daif", "Mutawatir", "Mawquf"];

const SUNNAH_COLLECTIONS: Record<string, string> = {
  bukhari: "bukhari",
  muslim: "muslim",
  tirmidhi: "tirmidhi",
  "abu dawud": "abudawud",
  "abu dawood": "abudawud",
  nasai: "nasai",
  "ibn majah": "ibnmajah",
  malik: "malik",
  ahmad: "ahmad",
  nawawi40: "nawawi",
};

/**
 * Turns a free-form citation string into structured book details plus a
 * clickable digital reference (quran.com / sunnah.com) when detectable.
 * Example inputs:
 *   "Majmu' al-Fatawa Ibn Baz 10/250"
 *   "Tirmidhi 2002 — Sahih"
 *   "Quran 3:31"
 */
export function parseReference(reference: string): StructuredSource {
  const raw = (reference || "").trim();
  const out: StructuredSource = { book: raw };
  if (!raw) return out;

  // Grading suffix after an em dash / hyphen
  const gradeMatch = raw.match(/[—–-]\s*(Sahih|Hasan|Da'if|Daif|Mutawatir|Mawquf)\b/i);
  if (gradeMatch) {
    out.grading = GRADINGS.find((g) => g.toLowerCase() === gradeMatch[1].toLowerCase()) || gradeMatch[1];
  }

  let body = raw.replace(/[—–-]\s*(Sahih|Hasan|Da'if|Daif|Mutawatir|Mawquf)\b/i, "").trim();

  // Quran citation → quran.com deep link
  const quran = body.match(/Qur'?an\s*(\d{1,3})\s*:\s*(\d{1,3})/i);
  if (quran) {
    out.book = `Qur'an ${quran[1]}:${quran[2]}`;
    out.url = `https://quran.com/${quran[1]}/${quran[2]}`;
    out.digitalLabel = "quran.com";
    return out;
  }

  // Volume/page pattern "10/250"
  const vp = body.match(/(\d{1,3})\s*\/\s*(\d{1,4})\s*$/);
  if (vp) {
    out.volume = vp[1];
    out.page = vp[2];
    body = body.slice(0, vp.index).trim();
  }

  // Hadith number "Tirmidhi 2002" / "p.38"
  const page = body.match(/p\.?\s*(\d{1,4})\s*$/i);
  if (page) {
    out.page = page[1];
    body = body.slice(0, page.index).replace(/,\s*$/, "").trim();
  } else {
    const num = body.match(/#?\s*(\d{1,5})\s*(\([^)]*\))?\s*$/);
    if (num) {
      out.hadithNo = num[1];
      if (num[2]) out.digitalLabel = num[2].replace(/[()]/g, "");
      body = body.slice(0, num.index).replace(/#\s*$/, "").trim();
    }
  }

  out.book = body || raw;

  // sunnah.com deep link when we recognise the collection + a hadith number
  if (out.hadithNo) {
    const lower = out.book.toLowerCase();
    const key = Object.keys(SUNNAH_COLLECTIONS).find((k) => lower.includes(k));
    if (key) {
      out.url = `https://sunnah.com/${SUNNAH_COLLECTIONS[key]}:${out.hadithNo}`;
      out.digitalLabel = out.digitalLabel || "sunnah.com";
    }
  }
  if (!out.url) {
    out.url = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
    out.digitalLabel = out.digitalLabel || "Search this citation";
  }
  return out;
}