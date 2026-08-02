import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Send, BookOpen, ArrowLeft, Bookmark, BookmarkCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import QuickTopics from "@/components/QuickTopics";
import { useAuth } from "@/contexts/AuthContext";
import { addBookmark, removeBookmark, listBookmarks } from "@/lib/bookmarks";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  bookmarked?: boolean;
  bookmarkId?: string;
}

interface ChatInterfaceProps {
  onBack: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/islamic-chat`;

const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("welcomeMessage"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const madhabCompare = false;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showQuickTopics = messages.length <= 1;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleBookmark = async (id: string) => {
    const idx = messages.findIndex((m) => m.id === id);
    const msg = messages[idx];
    if (!msg || !msg.content.trim()) return;

    // Un-save: remove the stored bookmark so favorites stay in sync.
    if (msg.bookmarked) {
      if (msg.bookmarkId) await removeBookmark(user?.id, msg.bookmarkId);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, bookmarked: false, bookmarkId: undefined } : m)),
      );
      toast({
        title: language === "ar" ? "تم الإزالة" : "Removed",
        description: language === "ar" ? "أُزيلت الإجابة من المفضلة" : "Answer removed from favorites",
      });
      return;
    }

    // Find the user question that produced this answer.
    let query = "";
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") { query = messages[i].content; break; }
    }

    try {
      const saved = await addBookmark(user?.id, "chat", {
        query,
        response: msg.content,
        note: new Date().toLocaleString(),
      });
      if (!saved?.id) throw new Error("save failed");
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, bookmarked: true, bookmarkId: saved.id } : m)),
      );
      toast({
        title: language === "ar" ? "تم الحفظ" : "Saved to Favorites",
        description:
          language === "ar"
            ? "يمكنك مراجعة الإجابة من المفضلة"
            : "Open Favorites → Chat to review this answer",
      });
    } catch {
      toast({
        title: language === "ar" ? "تعذر الحفظ" : "Could not save",
        description:
          language === "ar" ? "حاول مرة أخرى" : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: language === "ar" ? "الرجاء تسجيل الدخول" : "Please sign in",
          description: language === "ar" ? "يجب تسجيل الدخول لاستخدام الدردشة" : "You must be signed in to use the chat.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: updatedMessages
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
          madhabCompare,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const errorMsg = err.error || "Something went wrong. Please try again.";
        if (resp.status === 429) {
          toast({ title: "Rate Limited", description: errorMsg, variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "Credits Exhausted", description: errorMsg, variant: "destructive" });
        } else {
          toast({ title: "Error", description: errorMsg, variant: "destructive" });
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const upsertAssistant = (nextChunk: string) => {
        assistantContent += nextChunk;
        const content = assistantContent;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id !== "welcome") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { id: `ai-${Date.now()}`, role: "assistant", content }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) upsertAssistant(c);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to get a response. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className={`font-semibold text-foreground text-sm ${language === "ar" ? "font-arabic" : ""}`}>
                {t("appName")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-Powered"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="relative group max-w-[85%] md:max-w-[70%]">
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                }`}
              >
                <div className={`text-sm leading-relaxed ${language === "ar" ? "font-arabic" : ""} ${msg.role === "assistant" ? "prose prose-sm max-w-none text-card-foreground" : ""}`}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
              {/* Bookmark button for AI responses */}
              {msg.role === "assistant" && msg.id !== "welcome" && (
                <button
                  onClick={() => toggleBookmark(msg.id)}
                  className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded-full p-1.5 shadow-sm hover:bg-accent/10"
                >
                  {msg.bookmarked ? (
                    <BookmarkCheck className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Quick Topics (only shown at start) */}
        {showQuickTopics && (
          <div className="max-w-lg mx-auto">
            <QuickTopics onSelectTopic={sendMessage} />
          </div>
        )}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("askQuestion")}
            rows={1}
            className={`flex-1 resize-none bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${language === "ar" ? "font-arabic text-right" : ""}`}
          />
          <Button
            variant="hero"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-xl h-[46px] w-[46px] shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
