import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Bookmark, BookOpen, MessageSquare, Headphones,
  Search, Tag, Trash2, Heart, Eye, Copy, ExternalLink
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { listBookmarks, removeBookmark, type Bookmark as BM } from "@/lib/bookmarks";

interface FavoritesHubProps {
  onBack: () => void;
  onNavigate: (view: string) => void;
}

type Tab = "ayahs" | "chat" | "audio";

const FavoritesHub = ({ onBack, onNavigate }: FavoritesHubProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [tab, setTab] = useState<Tab>("ayahs");
  const [bookmarks, setBookmarks] = useState<BM[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [review, setReview] = useState<BM | null>(null);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setBookmarks(await listBookmarks(user?.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const deleteBookmark = async (id: string) => {
    await removeBookmark(user?.id, id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    setReview((r) => (r?.id === id ? null : r));
    toast({ title: isAr ? "تم الحذف" : "Removed", duration: 2000 });
  };

  /** Opens the saved item in its native surface (Quran reader / audio library). */
  const openBookmark = (b: BM) => {
    const c = b.content as any;
    if (b.type === "ayahs" && c?.surahId) {
      const p = new URLSearchParams({ view: "quran", surah: String(c.surahId) });
      if (c.ayahNumber) p.set("ayah", String(c.ayahNumber));
      window.location.search = `?${p.toString()}`;
      return;
    }
    if (b.type === "audio") {
      onNavigate("audio");
      return;
    }
    // Saved chats reopen inside the assistant with the full exchange restored,
    // so the conversation can continue where it left off.
    if (b.type === "chat") {
      localStorage.setItem(
        "al-bayan-restore-chat",
        JSON.stringify({ query: c?.query || "", response: c?.response || "", bookmarkId: b.id }),
      );
      onNavigate("chat");
      return;
    }
    setReview(b);
  };

  const copyReview = async () => {
    if (!review) return;
    const c = review.content as any;
    const text =
      review.type === "chat"
        ? `Q: ${c?.query || ""}\n\n${c?.response || ""}`
        : [c?.arabic, c?.translation, c?.reference].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: isAr ? "تم النسخ" : "Copied", duration: 1800 });
    } catch {
      toast({ title: isAr ? "تعذر النسخ" : "Copy failed", variant: "destructive" });
    }
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
                  <p className="text-xs text-muted-foreground font-medium">Q: {(bookmark.content as any)?.query || (isAr ? "محادثة محفوظة" : "Saved answer")}</p>
                  <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">{(bookmark.content as any)?.response || ""}</p>
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

              <div className="flex items-center justify-between pt-1 gap-2">
                <span className="text-[10px] text-muted-foreground">{new Date(bookmark.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setReview(bookmark)}
                    className="text-xs font-medium text-primary px-2 py-1 rounded-lg hover:bg-primary/10 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isAr ? "مراجعة" : "Review"}
                  </button>
                  <button
                    onClick={() => openBookmark(bookmark)}
                    className="text-xs font-medium text-accent px-2 py-1 rounded-lg hover:bg-accent/10 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {bookmark.type === "chat" ? (isAr ? "متابعة" : "Continue") : isAr ? "فتح" : "Open"}
                  </button>
                  <button onClick={() => deleteBookmark(bookmark.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {(bookmark.content as any)?.note && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mt-1">📝 {(bookmark.content as any).note}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review dialog — full saved content, readable and copyable */}
      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={isAr ? "font-arabic" : ""}>
              {review?.type === "chat"
                ? isAr ? "مراجعة الإجابة" : "Review answer"
                : review?.type === "audio"
                  ? isAr ? "تسجيل محفوظ" : "Saved recitation"
                  : isAr ? "آية محفوظة" : "Saved ayah"}
            </DialogTitle>
          </DialogHeader>
          {review && (
            <div className="space-y-3">
              {review.type === "chat" && (
                <>
                  {(review.content as any)?.query && (
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        {isAr ? "السؤال" : "Question"}
                      </p>
                      <p className="text-sm text-foreground">{(review.content as any).query}</p>
                    </div>
                  )}
                  <div className={`prose prose-sm max-w-none text-foreground ${isAr ? "font-arabic" : ""}`}>
                    <ReactMarkdown>{(review.content as any)?.response || ""}</ReactMarkdown>
                  </div>
                </>
              )}
              {review.type === "ayahs" && (
                <>
                  <p className="font-arabic text-lg leading-loose text-right text-foreground" dir="rtl">
                    {(review.content as any)?.arabic || ""}
                  </p>
                  {(review.content as any)?.translation && (
                    <p className="text-sm text-muted-foreground italic">{(review.content as any).translation}</p>
                  )}
                  <p className="text-xs font-medium text-accent">{(review.content as any)?.reference || ""}</p>
                </>
              )}
              {review.type === "audio" && (
                <div className="flex items-center gap-3">
                  <Headphones className="w-10 h-10 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{(review.content as any)?.surahName || ""}</p>
                    <p className="text-xs text-muted-foreground">{(review.content as any)?.reciterName || ""}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={copyReview} className="flex-1">
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {isAr ? "نسخ" : "Copy"}
                </Button>
                <Button variant="hero" size="sm" onClick={() => openBookmark(review)} className="flex-1">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  {review.type === "chat" ? (isAr ? "متابعة في المحادثة" : "Continue in chat") : isAr ? "فتح" : "Open"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FavoritesHub;
