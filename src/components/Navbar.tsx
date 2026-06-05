import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Globe,
  Home,
  BookOpen,
  Clock,
  GraduationCap,
  Bookmark,
  TrendingUp,
  Menu,
  Headphones,
  MessageCircle,
  Sparkles,
  Users,
  Sparkles as SparklesIcon,
  Mic,
  LayoutDashboard,
  LogIn,
  Sun,
  Moon,
  Shield,
  UserCircle2,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsAdmin } from "@/lib/useIsAdmin";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const Navbar = ({ currentView, onNavigate }: NavbarProps) => {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const { isAdmin } = useIsAdmin();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [currentView]);

  const isAr = language === "ar";

  const primaryLinks = [
    { id: "home", icon: Home, labelAr: "الرئيسية", labelEn: "Home" },
    { id: "quran", icon: BookOpen, labelAr: "القرآن", labelEn: "Quran" },
    { id: "hafiz", icon: GraduationCap, labelAr: "الحفظ", labelEn: "Hafiz" },
    { id: "prayer", icon: Clock, labelAr: "الصلاة", labelEn: "Prayer" },
  ];

  const secondaryLinks = [
    { id: "audio", icon: Headphones, labelAr: "الاستماع", labelEn: "Listen" },
    { id: "chat", icon: MessageCircle, labelAr: "اسأل", labelEn: "Ask AI" },
    { id: "scholars", icon: Users, labelAr: "علماء", labelEn: "Scholars" },
    { id: "dhikr", icon: Sparkles, labelAr: "الأذكار والأدعية", labelEn: "Dhikr & Dua" },
    { id: "dashboard", icon: LayoutDashboard, labelAr: "لوحة التقدم", labelEn: "Dashboard" },
    { id: "journeys", icon: SparklesIcon, labelAr: "رحلة 30 يوم", labelEn: "30-Day Journey" },
    { id: "voice", icon: Mic, labelAr: "يوميات صوتية", labelEn: "Voice Journal" },
    { id: "journey", icon: TrendingUp, labelAr: "رحلتي", labelEn: "My Journey" },
    { id: "favorites", icon: Bookmark, labelAr: "المفضلة", labelEn: "Favorites" },
    { id: "auth", icon: LogIn, labelAr: "حساب", labelEn: "Sign In" },
  ];

  const profileLink = { id: "profile", icon: UserCircle2, labelAr: "ملفي الشخصي", labelEn: "My Profile" };
  const adminLink = { id: "admin", icon: Shield, labelAr: "لوحة المشرف", labelEn: "Admin Panel" };

  const renderLinkButton = (
    link: { id: string; icon: any; labelAr: string; labelEn: string },
    variant: "desktop" | "mobile",
  ) => {
    const Icon = link.icon;
    const active = currentView === link.id;
    const label = isAr ? link.labelAr : link.labelEn;

    if (variant === "desktop") {
      return (
        <Button
          key={link.id}
          variant={active ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onNavigate(link.id)}
          className="gap-1.5 px-2.5 h-9"
        >
          <Icon className="w-4 h-4" />
          <span className={`hidden xl:inline text-xs ${isAr ? "font-arabic" : ""}`}>
            {label}
          </span>
        </Button>
      );
    }

    return (
      <button
        key={link.id}
        onClick={() => onNavigate(link.id)}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors text-left ${
          active
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            active ? "bg-primary/15" : "bg-muted"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-sm font-medium ${isAr ? "font-arabic" : ""}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        {/* Brand */}
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 shrink-0 min-w-0"
          aria-label="Al Bayani home"
        >
          <span className="text-xl font-bold text-gradient-gold font-arabic leading-none">
            البياني
          </span>
          <span className="text-sm font-semibold text-foreground hidden sm:inline truncate">
            Al Bayani
          </span>
        </button>

        {/* Desktop links (md+) */}
        <div className="hidden md:flex items-center gap-0.5">
          {primaryLinks.map((l) => renderLinkButton(l, "desktop"))}
          <div className="w-px h-6 bg-border mx-1" />
          {secondaryLinks.slice(2).map((l) => renderLinkButton(l, "desktop"))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-1 px-2 h-9"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">
              {language === "en" ? "ع" : "EN"}
            </span>
          </Button>

          {/* Mobile menu trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isAr ? "left" : "right"}
              className="w-[85vw] max-w-sm p-0 flex flex-col"
            >
              <SheetHeader className="px-5 py-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <span className="text-2xl font-bold text-gradient-gold font-arabic leading-none">
                    البياني
                  </span>
                  <span className="text-base font-semibold">Al Bayani</span>
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
                <div className="space-y-1">
                  <p
                    className={`px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground ${
                      isAr ? "font-arabic" : ""
                    }`}
                  >
                    {isAr ? "الرئيسية" : "Main"}
                  </p>
                  {primaryLinks.map((l) => renderLinkButton(l, "mobile"))}
                </div>

                <div className="space-y-1">
                  <p
                    className={`px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground ${
                      isAr ? "font-arabic" : ""
                    }`}
                  >
                    {isAr ? "المزيد" : "Explore"}
                  </p>
                  {secondaryLinks.map((l) => renderLinkButton(l, "mobile"))}
                  {renderLinkButton(profileLink, "mobile")}
                  {isAdmin && renderLinkButton(adminLink, "mobile")}
                </div>
              </div>

              <div className="border-t border-border p-3">
                <p className={`text-[11px] text-center text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                  {isAr ? "بياناتك محفوظة على جهازك" : "Your progress is saved on this device"}
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
