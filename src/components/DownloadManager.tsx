import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Download, Pause, Play, Trash2, CheckCircle2,
  AlertCircle, Search, WifiOff,
} from "lucide-react";
import { SURAHS } from "@/data/quranData";
import {
  listMeta, downloadSurah, cancelDownload, deleteSurah, isDownloading,
  type SurahMeta,
} from "@/lib/downloadManager";
import { useToast } from "@/hooks/use-toast";

interface Props { onBack: () => void }

const JUZ_QUICK: { id: number; label: string; surahs: number[] }[] = [
  { id: 30, label: "Juz 30 (An-Naba' → An-Nas)", surahs: Array.from({ length: 37 }, (_, i) => 78 + i) },
  { id: 29, label: "Juz 29 (Al-Mulk → Al-Mursalat)", surahs: Array.from({ length: 11 }, (_, i) => 67 + i) },
  { id: 1,  label: "Al-Fatiha + Al-Baqarah",        surahs: [1, 2] },
];

const DownloadManager = ({ onBack }: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const [meta, setMeta] = useState<Record<number, SurahMeta>>({});
  const [filter, setFilter] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);

  const refresh = useCallback(async () => {
    const rows = await listMeta();
    const map: Record<number, SurahMeta> = {};
    rows.forEach((r) => (map[r.surahId] = r));
    setMeta(map);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const start = async (surahId: number) => {
    if (offline) {
      toast({ title: isAr ? "أنت غير متصل" : "You are offline", variant: "destructive" });
      return;
    }
    await downloadSurah(surahId, {
      withAudio: true,
      onProgress: (m) => setMeta((prev) => ({ ...prev, [m.surahId]: m })),
    });
    refresh();
  };

  const pause = (id: number) => { cancelDownload(id); refresh(); };
  const remove = async (id: number) => { await deleteSurah(id); refresh(); };

  const downloadJuz = async (surahIds: number[]) => {
    if (offline) {
      toast({ title: isAr ? "أنت غير متصل" : "You are offline", variant: "destructive" });
      return;
    }
    for (const id of surahIds) {
      // Sequential to avoid saturating the network on mobile.
      // eslint-disable-next-line no-await-in-loop
      await downloadSurah(id, {
        withAudio: true,
        onProgress: (m) => setMeta((prev) => ({ ...prev, [m.surahId]: m })),
      });
    }
    refresh();
  };

  const filtered = !filter.trim()
    ? SURAHS
    : SURAHS.filter(
        (s) =>
          s.name.en.toLowerCase().includes(filter.toLowerCase()) ||
          s.name.ar.includes(filter) ||
          String(s.id).includes(filter),
      );

  const totalComplete = Object.values(meta).filter((m) => m.status === "complete").length;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <Download className="w-5 h-5 text-primary" />
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {isAr ? "التحميلات" : "Downloads"}
        </h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {totalComplete}/114
        </span>
      </header>

      <div className="p-4 space-y-4 border-b border-border bg-card/50">
        {offline && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-600">
            <WifiOff className="w-4 h-4" />
            {isAr ? "أنت غير متصل — يمكنك تشغيل ما تم تحميله" : "You are offline — cached surahs still play"}
          </div>
        )}
        <div>
          <p className={`text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "حزم سريعة" : "Quick packs"}
          </p>
          <div className="flex flex-wrap gap-2">
            {JUZ_QUICK.map((j) => (
              <button
                key={j.id}
                onClick={() => downloadJuz(j.surahs)}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              >
                {j.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={isAr ? "ابحث عن سورة..." : "Search surahs..."}
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map((s) => {
          const m = meta[s.id];
          const status = m?.status || "idle";
          const pct = m && m.total > 0 ? Math.round((m.downloadedAyahs / m.total) * 100) : 0;
          const active = status === "downloading" || isDownloading(s.id);

          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {s.id}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{s.name.en}</p>
                  <p className="font-arabic text-sm text-foreground">{s.name.ar}</p>
                </div>
                <div className="mt-1">
                  {status === "idle" && (
                    <p className="text-xs text-muted-foreground">{s.verses} {isAr ? "آية" : "verses"}</p>
                  )}
                  {(status === "downloading" || status === "paused") && (
                    <>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${status === "paused" ? "bg-muted-foreground" : "bg-primary"} transition-[width] duration-300`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                        {status === "paused" ? (isAr ? "متوقف" : "Paused") : (isAr ? "جاري" : "Downloading")} · {pct}%
                      </p>
                    </>
                  )}
                  {status === "complete" && (
                    <p className="text-[11px] text-emerald-500 inline-flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> {isAr ? "متاح دون اتصال" : "Available offline"}
                    </p>
                  )}
                  {status === "error" && (
                    <p className="text-[11px] text-destructive inline-flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3" /> {m?.error || (isAr ? "فشل" : "Error")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {active ? (
                  <Button size="icon" variant="ghost" onClick={() => pause(s.id)} aria-label="Pause">
                    <Pause className="w-4 h-4" />
                  </Button>
                ) : status === "complete" ? (
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)} aria-label="Delete">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost" onClick={() => start(s.id)} aria-label="Download">
                    {status === "paused" ? <Play className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DownloadManager;