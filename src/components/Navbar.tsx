import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Globe, Headphones, Home, BookOpen, Clock, GraduationCap, User, LogOut, Bookmark, TrendingUp } from "lucide-react";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user?: any;
}

const Navbar = ({ currentView, onNavigate, user }: NavbarProps) => {
  const { t, language, toggleLanguage } = useLanguage();
  const { signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-2">
          <span className="text-xl font-bold text-gradient-gold font-arabic">البيان</span>
          <span className="text-sm font-semibold text-foreground hidden sm:inline">Al-Bayan AI</span>
        </button>

        <div className="flex items-center gap-0.5 overflow-x-auto">
          <Button variant={currentView === "home" ? "secondary" : "ghost"} size="sm" onClick={() => onNavigate("home")} className="gap-1 px-2">
            <Home className="w-4 h-4" />
            <span className={`hidden md:inline text-xs ${language === "ar" ? "font-arabic" : ""}`}>{t("home")}</span>
          </Button>
          <Button variant={currentView === "quran" ? "secondary" : "ghost"} size="sm" onClick={() => onNavigate("quran")} className="gap-1 px-2">
            <BookOpen className="w-4 h-4" />
            <span className={`hidden md:inline text-xs ${language === "ar" ? "font-arabic" : ""}`}>{language === "ar" ? "القرآن" : "Quran"}</span>
          </Button>
          <Button variant={currentView === "hafiz" ? "secondary" : "ghost"} size="sm" onClick={() => onNavigate("hafiz")} className="gap-1 px-2">
            <GraduationCap className="w-4 h-4" />
            <span className={`hidden lg:inline text-xs`}>{language === "ar" ? "حفظ" : "Hafiz"}</span>
          </Button>
          <Button variant={currentView === "prayer" ? "secondary" : "ghost"} size="sm" onClick={() => onNavigate("prayer")} className="gap-1 px-2">
            <Clock className="w-4 h-4" />
            <span className={`hidden lg:inline text-xs`}>{language === "ar" ? "الصلاة" : "Prayer"}</span>
          </Button>
          {user && (
            <>
              <Button variant={currentView === "journey" ? "secondary" : "ghost"} size="sm" onClick={() => onNavigate("journey")} className="gap-1 px-2">
                <TrendingUp className="w-4 h-4" />
                <span className={`hidden lg:inline text-xs`}>{language === "ar" ? "رحلتي" : "Journey"}</span>
              </Button>
              <Button variant={currentView === "favorites" ? "secondary" : "ghost"} size="sm" onClick={() => onNavigate("favorites")} className="gap-1 px-2">
                <Bookmark className="w-4 h-4" />
              </Button>
            </>
          )}
          <div className="w-px h-6 bg-border mx-0.5" />
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1 px-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{language === "en" ? "عربي" : "EN"}</span>
          </Button>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1 px-2">
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onNavigate("auth")} className="gap-1 px-2">
              <User className="w-4 h-4" />
              <span className={`hidden sm:inline text-xs ${language === "ar" ? "font-arabic" : ""}`}>{t("signIn")}</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
