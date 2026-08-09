import { supabase } from "@/integrations/supabase/client";

export interface LiveStream {
  id: string;
  slug: string;
  label_en: string;
  label_ar: string;
  desc_en: string;
  desc_ar: string;
  youtube_id: string;
  external_url: string | null;
  embed_params: string;
  sort_order: number;
  active: boolean;
}

export const DEFAULT_EMBED_PARAMS =
  "rel=0&modestbranding=1&playsinline=1&iv_load_policy=3";

/** Fallback used when the device is offline or the table is unreachable. */
export const FALLBACK_STREAMS: LiveStream[] = [
  {
    id: "fallback-mecca",
    slug: "mecca",
    label_en: "Live from Makkah",
    label_ar: "بث مباشر من مكة المكرمة",
    desc_en: "Masjid Al-Haram",
    desc_ar: "المسجد الحرام",
    youtube_id: "nwllJOmz3sI",
    external_url: "https://www.youtube.com/watch?v=nwllJOmz3sI",
    embed_params: DEFAULT_EMBED_PARAMS,
    sort_order: 0,
    active: true,
  },
  {
    id: "fallback-medina",
    slug: "medina",
    label_en: "Live from Madinah",
    label_ar: "بث مباشر من المدينة المنورة",
    desc_en: "Masjid An-Nabawi",
    desc_ar: "المسجد النبوي",
    youtube_id: "QYCZzl--IQs",
    external_url: "https://www.youtube.com/watch?v=QYCZzl--IQs",
    embed_params: DEFAULT_EMBED_PARAMS,
    sort_order: 1,
    active: true,
  },
];

const CACHE_KEY = "al-bayani:live-streams";

/** Accepts a raw ID, a watch URL, a youtu.be link or an embed URL. */
export const extractYoutubeId = (input: string): string => {
  const value = input.trim();
  if (!value) return "";
  const match =
    value.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ||
    value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ||
    value.match(/\/embed\/([A-Za-z0-9_-]{6,})/) ||
    value.match(/\/live\/([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : value.replace(/[^A-Za-z0-9_-]/g, "");
};

/** Normalises a params string: strips leading "?"/"&" and blank segments. */
export const normalizeParams = (params: string): string =>
  params
    .replace(/^[?&]+/, "")
    .split("&")
    .map((p) => p.trim())
    .filter(Boolean)
    .join("&");

export const buildEmbedSrc = (
  stream: Pick<LiveStream, "youtube_id" | "embed_params">,
  opts: { muted: boolean; autoplay?: boolean },
) => {
  const base = `https://www.youtube.com/embed/${stream.youtube_id}`;
  const params = normalizeParams(stream.embed_params || DEFAULT_EMBED_PARAMS);
  return `${base}?autoplay=${opts.autoplay === false ? 0 : 1}&mute=${
    opts.muted ? 1 : 0
  }${params ? `&${params}` : ""}`;
};

export const watchUrl = (stream: LiveStream) =>
  stream.external_url || `https://www.youtube.com/watch?v=${stream.youtube_id}`;

export const readCachedStreams = (): LiveStream[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as LiveStream[]) : null;
    return parsed && parsed.length ? parsed : null;
  } catch {
    return null;
  }
};

/** Public read — active streams only, ordered. Falls back to cache/defaults. */
export const fetchLiveStreams = async (): Promise<LiveStream[]> => {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return readCachedStreams() || FALLBACK_STREAMS;
  }
  const streams = data as unknown as LiveStream[];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(streams));
  } catch {
    /* storage may be unavailable */
  }
  return streams;
};

/** Admin read — includes inactive rows. */
export const fetchAllLiveStreams = async (): Promise<LiveStream[]> => {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as LiveStream[];
};

export const saveLiveStream = async (stream: Partial<LiveStream>) => {
  const payload = {
    slug: (stream.slug || "").trim(),
    label_en: (stream.label_en || "").trim(),
    label_ar: (stream.label_ar || "").trim(),
    desc_en: (stream.desc_en || "").trim(),
    desc_ar: (stream.desc_ar || "").trim(),
    youtube_id: extractYoutubeId(stream.youtube_id || ""),
    external_url: stream.external_url?.trim() || null,
    embed_params: normalizeParams(stream.embed_params || DEFAULT_EMBED_PARAMS),
    sort_order: Number(stream.sort_order ?? 0),
    active: stream.active ?? true,
  };

  if (stream.id && !stream.id.startsWith("fallback-")) {
    const { error } = await supabase
      .from("live_streams")
      .update(payload)
      .eq("id", stream.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("live_streams").insert(payload);
  if (error) throw error;
};

export const deleteLiveStream = async (id: string) => {
  const { error } = await supabase.from("live_streams").delete().eq("id", id);
  if (error) throw error;
};