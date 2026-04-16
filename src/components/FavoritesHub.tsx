import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Bookmark, BookOpen, MessageSquare, Headphones,
  Search, Tag, Trash2, Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FavoritesHubProps {
  onBack: () => void;
  onNavigate: (view: string) => void;
}

type Tab = "ayahs" | "chat" | "audio";

const LS_BOOKMARKS_KEY = "al-bayan-local-bookmarks";

const getLocalBookmarks = (): any[] => {
  try { return JSON.parse(localStorage.getItem(LS_BOOKMARKS_KEY) || "[]"); } catch { return []; }
};

const saveLocalBookmarks = (bookmarks: any[]) => {
  localStorage.setItem(LS_BOOKMARKS_KEY, JSON.stringify(bookmarks));
};

const FavoritesHub = ({ onBack, onNavigate }: FavoritesHubProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [tab, setTab] = useState<Tab>("ayahs");
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    if (user) {
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setBookmarks(data);
    } else {
      setBookmarks(getLocalBookmarks());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const deleteBookmark = async (id: string) => {
    if (user) {
      await supabase.from("bookmarks").delete().eq("id", id);
    } else {
      const updated = getLocalBookmarks().filter((b) => b.id !== id);
      saveLocalBookmarks(updated);
    }
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    toast({ title: isAr ? "تم الحذف" : "Removed", duration: 2000 });
  };

  const filtered = bookmarks
    .filter((b) => b.type === tab)
    .filter((b) => {
      if (!searchQuery.trim()) return true;
      const content = JSON.stringify(b.content).toLowerCase();
      return content.includes(searchQuery.toLowerCase());
    });

  const tabs: { key: Tab; icon: typeof BookOpen; label: string }[] = [
    { key: "ayahs", icon: BookOpen, label: isAr ? "آيات" : "Ayahs" },
    { key: "chat", icon: MessageSquare, label: isAr ? "محادثات" : "Chat" },
    { key: "audio", icon: Headphones, label: isAr ? "صوتيات" : "Audio" },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Bookmark className="w-5 h-5 text-accent" />
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {isAr ? "المفضلة" : "My Favorites"}
        </h1>
        <span className="ml-auto text-xs text-muted-foreground">{bookmarks.length} {isAr ? "عنصر" : "items"}</span>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className={isAr ? "font-arabic" : ""}>{t.label}</span>
            <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">
              {bookmarks.filter((b) => b.type === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border bg-card/50 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "ابحث في المفضلة..." : "Search favorites..."}
            className={`w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${isAr ? "font-arabic text-right pr-10 pl-4" : ""}`}
          />
        </div>
      </div>

      {/* Sync prompt */}
      {!user && bookmarks.length > 0 && (
        <div className="mx-4 mt-3 bg-accent/5 border border-accent/20 rounded-xl p-3 text-center animate-fade-in">
          <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
            {isAr ? "سجّل الدخول لمزامنة المفضلة عبر الأجهزة" : "Sign in to sync favorites across devices"}
          </p>
          <Button variant="outline" size="sm" onClick={() => onNavigate("auth")} className="mt-2">
            {isAr ? "تسجيل الدخول" : "Sign In"}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3 animate-fade-in">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className={`text-muted-foreground text-sm ${isAr ? "font-arabic" : ""}`}>
              {searchQuery
                ? isAr ? "لا توجد نتائج" : "No results found"
                : isAr ? "لا توجد مفضلات بعد" : "No favorites yet"}
            </p>
            <p className={`text-xs text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "احفظ الآيات والمحادثات والصوتيات من التطبيق" : "Save ayahs, chats, and audio from the app"}
            </p>
          </div>
        ) : (
          filtered.map((bookmark, i) => (
            <div
              key={bookmark.id}
              className="bg-card border border-border rounded-xl p-4 space-y-2 animate-slide-up hover:border-primary/30 transition-all group"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              {bookmark.type === "ayahs" && (
                <>
                  <p className="font-arabic text-foreground leading-relaxed text-right" dir="rtl">
                    {(bookmark.content as any)?.arabic || ""}
                  </p>
                  {(bookmark.content as any)?.translation && (
                    <p className="text-sm text-muted-foreground italic">{(bookmark.content as any).translation}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-accent font-medium">{(bookmark.content as any)?.reference || ""}</span>
                    {(bookmark.content as any)?.tags?.length > 0 && (
                      <div className="flex gap-1">
                        {(bookmark.content as any).tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                            <Tag className="w-2.5 h-2.5 inline mr-0.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {bookmark.type === "chat" && (
                <>
                  <p className="text-xs text-muted-foreground font-medium">Q: {(bookmark.content as any)?.query || ""}</p>
                  <p className="text-sm text-foreground line-clamp-3">{(bookmark.content as any)?.response || ""}</p>
                </>
              )}

              {bookmark.type === "audio" && (
                <div className="flex items-center gap-3">
                  <Headphones className="w-8 h-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{(bookmark.content as any)?.surahName || ""}</p>
                    <p className="text-xs text-muted-foreground">{(bookmark.content as any)?.reciterName || ""}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-muted-foreground">{new Date(bookmark.created_at).toLocaleDateString()}</span>
                <button onClick={() => deleteBookmark(bookmark.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {(bookmark.content as any)?.note && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mt-1">📝 {(bookmark.content as any).note}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FavoritesHub;
