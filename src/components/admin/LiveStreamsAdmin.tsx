import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Save, Trash2, Radio, RotateCcw } from "lucide-react";
import {
  DEFAULT_EMBED_PARAMS,
  LiveStream,
  buildEmbedSrc,
  deleteLiveStream,
  extractYoutubeId,
  fetchAllLiveStreams,
  saveLiveStream,
} from "@/lib/liveStreams";

const PARAM_PRESETS = [
  { key: "modestbranding=1", label: "modestbranding" },
  { key: "playsinline=1", label: "playsinline" },
  { key: "rel=0", label: "rel=0 (no related)" },
  { key: "iv_load_policy=3", label: "hide annotations" },
  { key: "controls=0", label: "hide controls" },
  { key: "loop=1", label: "loop" },
  { key: "cc_load_policy=1", label: "captions on" },
];

const blank = (order: number): Partial<LiveStream> => ({
  slug: "",
  label_en: "",
  label_ar: "",
  desc_en: "",
  desc_ar: "",
  youtube_id: "",
  external_url: "",
  embed_params: DEFAULT_EMBED_PARAMS,
  sort_order: order,
  active: true,
});

const LiveStreamsAdmin = () => {
  const [rows, setRows] = useState<Partial<LiveStream>[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchAllLiveStreams());
    } catch (e: any) {
      toast.error(e?.message || "Could not load streams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = (idx: number, next: Partial<LiveStream>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...next } : r)));

  const toggleParam = (idx: number, token: string) => {
    const current = (rows[idx].embed_params || "").split("&").filter(Boolean);
    const [key] = token.split("=");
    const has = current.some((p) => p.split("=")[0] === key);
    const next = has
      ? current.filter((p) => p.split("=")[0] !== key)
      : [...current, token];
    patch(idx, { embed_params: next.join("&") });
  };

  const hasParam = (idx: number, token: string) =>
    (rows[idx].embed_params || "")
      .split("&")
      .some((p) => p.split("=")[0] === token.split("=")[0]);

  const onSave = async (idx: number) => {
    const row = rows[idx];
    if (!row.slug?.trim() || !row.label_en?.trim() || !row.youtube_id?.trim()) {
      toast.error("Slug, English label and video link are required");
      return;
    }
    setSavingId(row.id || `new-${idx}`);
    try {
      await saveLiveStream(row);
      toast.success(`Saved “${row.label_en}”`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (idx: number) => {
    const row = rows[idx];
    if (!row.id) {
      setRows((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm(`Remove “${row.label_en}” from the live section?`)) return;
    try {
      await deleteLiveStream(row.id);
      toast.success("Stream removed");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading streams…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <p className="text-sm text-muted-foreground flex-1">
          Edit the live embeds shown on Home. Changes go live instantly — no code deploy.
        </p>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <Button
          size="sm"
          onClick={() => setRows((prev) => [...prev, blank(prev.length)])}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="p-6 text-center text-sm text-muted-foreground border border-border rounded-lg bg-card">
          No streams configured yet.
        </p>
      )}

      {rows.map((row, idx) => (
        <div key={row.id || `new-${idx}`} className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm flex-1 truncate">
              {row.label_en || "New stream"}
            </h3>
            <div className="flex items-center gap-2">
              <Label htmlFor={`active-${idx}`} className="text-xs text-muted-foreground">
                Visible
              </Label>
              <Switch
                id={`active-${idx}`}
                checked={!!row.active}
                onCheckedChange={(v) => patch(idx, { active: v })}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Slug (unique key)">
              <Input value={row.slug || ""} onChange={(e) => patch(idx, { slug: e.target.value })} placeholder="mecca" />
            </Field>
            <Field label="Order">
              <Input
                type="number"
                value={row.sort_order ?? 0}
                onChange={(e) => patch(idx, { sort_order: Number(e.target.value) })}
              />
            </Field>
            <Field label="Label (English)">
              <Input value={row.label_en || ""} onChange={(e) => patch(idx, { label_en: e.target.value })} placeholder="Live from Makkah" />
            </Field>
            <Field label="Label (Arabic)">
              <Input dir="rtl" className="font-arabic" value={row.label_ar || ""} onChange={(e) => patch(idx, { label_ar: e.target.value })} />
            </Field>
            <Field label="Subtitle (English)">
              <Input value={row.desc_en || ""} onChange={(e) => patch(idx, { desc_en: e.target.value })} placeholder="Masjid Al-Haram" />
            </Field>
            <Field label="Subtitle (Arabic)">
              <Input dir="rtl" className="font-arabic" value={row.desc_ar || ""} onChange={(e) => patch(idx, { desc_ar: e.target.value })} />
            </Field>
            <Field label="YouTube link or video ID">
              <Input
                value={row.youtube_id || ""}
                onChange={(e) => patch(idx, { youtube_id: e.target.value })}
                onBlur={(e) => patch(idx, { youtube_id: extractYoutubeId(e.target.value) })}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </Field>
            <Field label="“Watch on YouTube” URL (optional)">
              <Input value={row.external_url || ""} onChange={(e) => patch(idx, { external_url: e.target.value })} />
            </Field>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Embed params</Label>
            <div className="flex flex-wrap gap-1.5">
              {PARAM_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => toggleParam(idx, p.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                    hasParam(idx, p.key)
                      ? "bg-primary/15 border-primary/50 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Input
              value={row.embed_params || ""}
              onChange={(e) => patch(idx, { embed_params: e.target.value })}
              className="font-mono text-xs"
              placeholder={DEFAULT_EMBED_PARAMS}
            />
            <p className="text-[11px] text-muted-foreground break-all">
              {buildEmbedSrc(
                { youtube_id: extractYoutubeId(row.youtube_id || "VIDEO_ID"), embed_params: row.embed_params || "" },
                { muted: true },
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={() => onSave(idx)} disabled={savingId !== null} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {savingId === (row.id || `new-${idx}`) ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(idx)} className="gap-1.5 text-destructive">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default LiveStreamsAdmin;