import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "al-bayan-local-bookmarks";

export type BookmarkType = "ayahs" | "chat" | "audio";

export interface BookmarkContent {
  // ayahs
  arabic?: string;
  translation?: string;
  reference?: string;
  surahId?: number;
  ayahNumber?: number;
  // chat
  query?: string;
  response?: string;
  // audio
  surahName?: string;
  reciterName?: string;
  reciterId?: string;
  // common
  tags?: string[];
  note?: string;
}

export interface Bookmark {
  id: string;
  type: BookmarkType;
  content: BookmarkContent;
  created_at: string;
}

const getLocal = (): Bookmark[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
};
const setLocal = (b: Bookmark[]) =>
  localStorage.setItem(LS_KEY, JSON.stringify(b));

export async function listBookmarks(userId?: string | null): Promise<Bookmark[]> {
  if (userId) {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data as Bookmark[]) || [];
  }
  return getLocal();
}

export async function addBookmark(
  userId: string | null | undefined,
  type: BookmarkType,
  content: BookmarkContent,
): Promise<Bookmark> {
  if (userId) {
    const { data } = await supabase
      .from("bookmarks")
      .insert([{ user_id: userId, type, content: content as any }])
      .select()
      .single();
    return data as Bookmark;
  }
  const b: Bookmark = {
    id: crypto.randomUUID(),
    type,
    content,
    created_at: new Date().toISOString(),
  };
  const all = getLocal();
  all.unshift(b);
  setLocal(all);
  return b;
}

export async function removeBookmark(
  userId: string | null | undefined,
  id: string,
): Promise<void> {
  if (userId) {
    await supabase.from("bookmarks").delete().eq("id", id);
    return;
  }
  setLocal(getLocal().filter((b) => b.id !== id));
}

export function isAyahBookmarked(
  list: Bookmark[],
  surahId: number,
  ayahNumber: number,
): Bookmark | undefined {
  return list.find(
    (b) =>
      b.type === "ayahs" &&
      b.content.surahId === surahId &&
      b.content.ayahNumber === ayahNumber,
  );
}

export function isAudioBookmarked(
  list: Bookmark[],
  surahId: number,
  reciterId: string,
): Bookmark | undefined {
  return list.find(
    (b) =>
      b.type === "audio" &&
      b.content.surahId === surahId &&
      b.content.reciterId === reciterId,
  );
}