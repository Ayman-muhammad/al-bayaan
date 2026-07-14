// Offline download manager for Qur'an surahs.
// Stores per-ayah Arabic + English text in IndexedDB and tracks resume
// state so an interrupted download can pick up exactly where it stopped.
// Audio (mp3) chunks are prefetched via fetch(); the service worker
// (ADHAN_CACHE bucket in sw.js already handles everyayah.com) persists
// them for offline playback.

import { SURAHS } from "@/data/quranData";

const DB_NAME = "al-bayan-offline";
const DB_VERSION = 1;
const STORE_SURAHS = "surahs";      // full text payloads
const STORE_META   = "surah_meta";  // { surahId, status, downloadedAyahs, total, updatedAt }

export type DownloadStatus = "idle" | "downloading" | "paused" | "complete" | "error";

export interface SurahMeta {
  surahId: number;
  status: DownloadStatus;
  downloadedAyahs: number;
  total: number;
  withAudio: boolean;
  updatedAt: number;
  error?: string;
}

export interface OfflineAyah { n: number; ar: string; en: string }
export interface OfflineSurah { surahId: number; ayahs: OfflineAyah[] }

// ---------- IndexedDB helpers ----------
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SURAHS)) db.createObjectStore(STORE_SURAHS, { keyPath: "surahId" });
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: "surahId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function listMeta(): Promise<SurahMeta[]> {
  try { return (await tx<SurahMeta[]>(STORE_META, "readonly", (s) => s.getAll())) || []; }
  catch { return []; }
}
export async function getMeta(surahId: number): Promise<SurahMeta | undefined> {
  try { return await tx<SurahMeta>(STORE_META, "readonly", (s) => s.get(surahId)); }
  catch { return undefined; }
}
async function putMeta(m: SurahMeta) { await tx(STORE_META, "readwrite", (s) => s.put(m)); }

export async function getOfflineSurah(surahId: number): Promise<OfflineSurah | undefined> {
  try { return await tx<OfflineSurah>(STORE_SURAHS, "readonly", (s) => s.get(surahId)); }
  catch { return undefined; }
}
async function putSurah(s: OfflineSurah) { await tx(STORE_SURAHS, "readwrite", (st) => st.put(s)); }

export async function deleteSurah(surahId: number): Promise<void> {
  await tx(STORE_SURAHS, "readwrite", (s) => s.delete(surahId));
  await tx(STORE_META, "readwrite", (s) => s.delete(surahId));
}

// ---------- Download orchestration ----------
const controllers = new Map<number, AbortController>();
type Progress = (m: SurahMeta) => void;

export function isDownloading(surahId: number) { return controllers.has(surahId); }

export function cancelDownload(surahId: number) {
  const c = controllers.get(surahId);
  if (c) { c.abort(); controllers.delete(surahId); }
}

/** Download (or resume) a full surah's text. Audio is best-effort prefetched. */
export async function downloadSurah(
  surahId: number,
  opts: { withAudio?: boolean; onProgress?: Progress } = {},
): Promise<void> {
  const { withAudio = true, onProgress } = opts;
  if (controllers.has(surahId)) return; // already running
  const controller = new AbortController();
  controllers.set(surahId, controller);

  const meta = SURAHS.find((s) => s.id === surahId);
  const total = meta?.verses || 0;

  const emit = async (m: SurahMeta) => { await putMeta(m); onProgress?.(m); };

  try {
    await emit({
      surahId, status: "downloading",
      downloadedAyahs: 0, total, withAudio, updatedAt: Date.now(),
    });

    // Text: one bulk fetch (both editions) — this is the "safe" chunk that resumes
    // on next call if it fails partway (we mark paused).
    const existing = await getOfflineSurah(surahId);
    let ayahs: OfflineAyah[] = existing?.ayahs || [];

    if (ayahs.length < total) {
      const [arRes, enRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`, { signal: controller.signal }),
        fetch(`https://api.alquran.cloud/v1/surah/${surahId}/en.sahih`, { signal: controller.signal }),
      ]);
      const arJson = await arRes.json();
      const enJson = await enRes.json();
      if (arJson.code !== 200 || enJson.code !== 200) throw new Error("Text fetch failed");
      ayahs = arJson.data.ayahs.map((a: any, i: number) => ({
        n: a.numberInSurah,
        ar: a.text,
        en: enJson.data.ayahs[i]?.text || "",
      }));
      await putSurah({ surahId, ayahs });
      await emit({
        surahId, status: "downloading",
        downloadedAyahs: ayahs.length, total, withAudio, updatedAt: Date.now(),
      });
    }

    // Audio: per-ayah, resumable. We check meta.downloadedAyahs and continue.
    if (withAudio) {
      const startFrom = (await getMeta(surahId))?.downloadedAyahs || ayahs.length;
      // If startFrom < total we still resume audio from that point.
      let done = Math.min(startFrom, ayahs.length);
      // If text just completed, restart audio counter from 0.
      if (done === ayahs.length && ayahs.length === total) done = 0;
      for (let i = done; i < ayahs.length; i++) {
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const surahPad = String(surahId).padStart(3, "0");
        const ayahPad = String(ayahs[i].n).padStart(3, "0");
        const url = `https://everyayah.com/data/Alafasy_128kbps/${surahPad}${ayahPad}.mp3`;
        try {
          // no-cors is fine — sw.js will still cache the opaque response.
          await fetch(url, { mode: "no-cors", signal: controller.signal });
        } catch (e: any) {
          if (e?.name === "AbortError") throw e;
          // swallow individual audio failures; text is already saved
        }
        if ((i + 1) % 5 === 0 || i === ayahs.length - 1) {
          await emit({
            surahId, status: "downloading",
            downloadedAyahs: i + 1, total, withAudio, updatedAt: Date.now(),
          });
        }
      }
    }

    await emit({
      surahId, status: "complete",
      downloadedAyahs: total, total, withAudio, updatedAt: Date.now(),
    });
  } catch (e: any) {
    const status: DownloadStatus = e?.name === "AbortError" ? "paused" : "error";
    const current = await getMeta(surahId);
    await emit({
      surahId, status,
      downloadedAyahs: current?.downloadedAyahs || 0,
      total, withAudio, updatedAt: Date.now(),
      error: status === "error" ? String(e?.message || e) : undefined,
    });
  } finally {
    controllers.delete(surahId);
  }
}