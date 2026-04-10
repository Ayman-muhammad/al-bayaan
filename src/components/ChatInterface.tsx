import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Send, BookOpen, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  onBack: () => void;
}

const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("welcomeMessage"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulated AI response - will be replaced with actual AI integration
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateMockResponse(userMessage.content, language),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
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
              {language === "ar" ? "متصل" : "Online"}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
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
          </div>
        ))}
        {isLoading && (
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
            ref={inputRef}
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

function generateMockResponse(question: string, lang: string): string {
  const q = question.toLowerCase();
  
  if (q.includes("prayer") || q.includes("salah") || q.includes("صلاة")) {
    return lang === "ar"
      ? `## الصلاة في الإسلام\n\nالصلاة هي الركن الثاني من أركان الإسلام. فرض الله على المسلمين خمس صلوات في اليوم والليلة.\n\n**المرجع:** صحيح البخاري، كتاب الصلاة، حديث رقم 528\n\n> عن عبد الله بن عمر رضي الله عنهما قال: قال رسول الله ﷺ: "بُنِيَ الإسلام على خمس..."\n\n📖 *سورة البقرة: 43* — "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ"`
      : `## Prayer (Salah) in Islam\n\nPrayer is the second pillar of Islam. Allah has ordained five daily prayers upon Muslims.\n\n**Reference:** Sahih al-Bukhari, Book of Prayer, Hadith 528\n\n> The Prophet ﷺ said: "Islam is built upon five pillars..."\n\n📖 *Surah Al-Baqarah 2:43* — "And establish prayer and give zakah and bow with those who bow [in worship]."`;
  }

  return lang === "ar"
    ? `شكراً لسؤالك. هذا موضوع مهم في الفقه الإسلامي.\n\nبناءً على المصادر الإسلامية الموثوقة:\n\n**المرجع:** القرآن الكريم والسنة النبوية الشريفة\n\n> يمكنك الاطلاع على المزيد من التفاصيل في كتب الفقه المعتمدة.\n\n*ملاحظة: للحصول على فتوى شرعية محددة، يُنصح بالرجوع إلى عالم دين متخصص.*`
    : `Thank you for your question. This is an important topic in Islamic knowledge.\n\nBased on authentic Islamic sources:\n\n**Reference:** The Holy Quran and Prophetic Sunnah\n\n> For detailed rulings, scholars recommend consulting established works of Islamic jurisprudence.\n\n*Note: For specific religious rulings (fatwa), it is recommended to consult a qualified Islamic scholar.*`;
}

export default ChatInterface;
