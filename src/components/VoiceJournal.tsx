import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, Square, Trash2, Play, Pause, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Entry {
  id: string;
  createdAt: number;
  ayahRef?: string;
  durationMs: number;
  audioBase64: string;
  themes: string[];
  note?: string;
}

const KEY = "voice-journal-entries";
const MAX_DURATION_MS = 30_000;

const THEMES = [
  { en: "gratitude", ar: "شكر", keywords: ["thank", "grateful", "blessing", "alhamdu", "نعمة", "شكر"] },
  { en: "patience", ar: "صبر", keywords: ["patience", "patient", "sabr", "صبر"] },
  { en: "fear", ar: "خوف", keywords: ["fear", "worried", "anxious", "خوف"] },
  { en: "hope", ar: "رجاء", keywords: ["hope", "trust", "tawakkul", "رجاء", "أمل"] },
  { en: "mercy", ar: "رحمة", keywords: ["mercy", "compassion", "رحمة"] },
];

const tagThemes = (text: string): string[] => {
  const lc = text.toLowerCase();
  return THEMES.filter((t) => t.keywords.some((k) => lc.includes(k.toLowerCase()))).map((t) => t.en);
};

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = rej;
  r.readAsDataURL(blob);
});

const VoiceJournal = ({ onBack }: { onBack: () => void }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [ayahRef, setAyahRef] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try { setEntries(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
  }, []);

  const persist = (next: Entry[]) => {
    setEntries(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { toast({ title: "Storage full", description: "Delete old entries", variant: "destructive" }); }
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const b64 = await blobToBase64(blob);
        const themes = tagThemes(`${note} ${ayahRef}`);
        const entry: Entry = { id: crypto.randomUUID(), createdAt: Date.now(), audioBase64: b64, durationMs: Date.now() - startRef.current, themes, note: note || undefined, ayahRef: ayahRef || undefined };
        persist([entry, ...entries]);
        setNote(""); setAyahRef("");
      };
      rec.start();
      recorderRef.current = rec;
      startRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        const e = Date.now() - startRef.current;
        setElapsed(e);
        if (e >= MAX_DURATION_MS) stop();
      }, 100);
    } catch (e) {
      toast({ title: isAr ? "لا يوجد ميكروفون" : "Microphone unavailable", description: isAr ? "اسمح بالوصول للميكروفون" : "Please allow microphone access", variant: "destructive" });
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    setRecording(false);
  };

  const playEntry = (e: Entry) => {
    if (!audioRef.current) audioRef.current = new Audio();
    if (playingId === e.id) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current.src = e.audioBase64;
    audioRef.current.play();
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(e.id);
  };

  const remove = (id: string) => persist(entries.filter((x) => x.id !== id));

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <Mic className="w-5 h-5 text-accent" />
        <h1 className={`font-semibold ${isAr ? "font-arabic" : ""}`}>{isAr ? "يوميات الصوت" : "Voice Tadabbur Journal"}</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-primary/5 to-accent/5 p-5 space-y-3">
          <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "سجل تأملاً صوتياً (٣٠ ثانية) بعد قراءة آية." : "Record a 30-second reflection after an ayah. Stored privately on your device."}
          </p>
          <input value={ayahRef} onChange={(e) => setAyahRef(e.target.value)} placeholder={isAr ? "الآية (مثلاً 2:255)" : "Ayah ref (e.g. 2:255)"} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={isAr ? "ملاحظة قصيرة (اختياري)" : "Short note (optional)"} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" />
          <div className="flex items-center justify-center gap-3">
            {!recording ? (
              <Button size="lg" variant="hero" className="rounded-full w-20 h-20" onClick={start}>
                <Mic className="w-8 h-8" />
              </Button>
            ) : (
              <Button size="lg" variant="destructive" className="rounded-full w-20 h-20 animate-pulse" onClick={stop}>
                <Square className="w-7 h-7 fill-current" />
              </Button>
            )}
          </div>
          {recording && (
            <div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${(elapsed / MAX_DURATION_MS) * 100}%` }} />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-1">{Math.floor(elapsed / 1000)}s / 30s</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className={`text-sm font-bold ${isAr ? "font-arabic" : ""}`}>{isAr ? "تأملاتك" : "Your Reflections"} ({entries.length})</h2>
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">{isAr ? "لا توجد تسجيلات بعد" : "No recordings yet"}</p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
              <Button size="icon" variant="ghost" className="rounded-full bg-primary/10" onClick={() => playEntry(e)}>
                {playingId === e.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {e.ayahRef && <span className="text-xs font-mono text-accent">{e.ayahRef}</span>}
                  <span className="text-[11px] text-muted-foreground">{Math.floor(e.durationMs / 1000)}s</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
                {e.note && <p className="text-xs text-foreground mt-0.5 truncate">{e.note}</p>}
                {e.themes.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {e.themes.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(e.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceJournal;