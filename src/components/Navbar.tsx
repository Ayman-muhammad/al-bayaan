import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe, MessageSquare, Headphones, Home } from "lucide-react";

type View = "home" | "chat" | "audio";

interface NavbarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const Navbar = ({ currentView, onNavigate }: NavbarProps) => {
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2"
        >
          <span className="text-xl font-bold text-gradient-gold font-arabic">البيان</span>
          <span className="text-sm font-semibold text-foreground hidden sm:inline">Al-Bayan AI</span>
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant={currentView === "home" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavigate("home")}
            className="gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span className={`hidden sm:inline ${language === "ar" ? "font-arabic" : ""}`}>{t("home")}</span>
          </Button>
          <Button
            variant={currentView === "chat" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavigate("chat")}
            className="gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            <span className={`hidden sm:inline ${language === "ar" ? "font-arabic" : ""}`}>{t("chat")}</span>
          </Button>
          <Button
            variant={currentView === "audio" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavigate("audio")}
            className="gap-1.5"
          >
            <Headphones className="w-4 h-4" />
            <span className={`hidden sm:inline ${language === "ar" ? "font-arabic" : ""}`}>{t("audioLibrary")}</span>
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{language === "en" ? "عربي" : "EN"}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
