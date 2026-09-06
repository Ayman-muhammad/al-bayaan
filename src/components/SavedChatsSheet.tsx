import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { listBookmarks, removeBookmark, type Bookmark } from "@/lib/bookmarks";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Reopens a saved exchange inside the assistant. */
  onOpenChat: (saved: { query?: string; response?: string; bookmarkId: string }) => void;
}

/**
 * Saved answers library, reachable straight from the assistant header so any
 * previously saved exchange can be reopened and continued.
 */
const SavedChatsSheet = ({ open, onOpenChange, onOpenChat }: Props) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const [items, setItems] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const all = await listBookmarks(user?.id);
      if (cancelled) return;
      setItems(all.filter((b) => b.type === "chat"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const drop = async (id: string) => {
    await removeBookmark(user?.id, id);
    setItems((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className={isAr ? "font-arabic" : ""}>
            {isAr ? "الإجابات المحفوظة" : "Saved answers"}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {isAr
              ? "لا توجد إجابات محفوظة بعد — احفظ أي إجابة بعلامة المرجعية."
              : "No saved answers yet — tap the bookmark on any answer to keep it."}
          </p>
        ) : (
          <div className="space-y-3 pb-6">
            {items.map((b) => (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-3">
                <button
                  onClick={() => {
                    onOpenChat({
                      query: b.content.query,
                      response: b.content.response,
                      bookmarkId: b.id,
                    });
                    onOpenChange(false);
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isAr ? "font-arabic" : ""}`}>
                        {b.content.query || (isAr ? "إجابة محفوظة" : "Saved answer")}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {(b.content.response || "").replace(/[#*>`]/g, "").slice(0, 160)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => drop(b.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-destructive/80 hover:text-destructive px-2 py-1 rounded-lg"
                  >
                    <Trash2 className="w-3 h-3" />
                    {isAr ? "حذف" : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SavedChatsSheet;
