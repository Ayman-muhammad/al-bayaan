import { Home, BookOpen, Heart, Users, Menu as MenuIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenMenu: () => void;
}

/**
 * App-standard bottom tab bar. Fixed to viewport bottom with safe-area
 * padding for iOS notches. Five slots: Home, Read (Quran), Listen (Audio),
 * Journey (Dashboard), More (opens the existing side drawer via onOpenMenu).
 * Hidden on md+ where the top navbar carries navigation.
 */
const BottomNav = ({ currentView, onNavigate, onOpenMenu }: BottomNavProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const tabs = [
    { id: "home", icon: Home, ar: "الرئيسية", en: "Home" },
    { id: "quran", icon: BookOpen, ar: "اقرأ", en: "Read" },
    { id: "cycle", icon: Heart, ar: "العائلة", en: "Family", featured: true },
    { id: "scholars", icon: Users, ar: "علماء", en: "Scholars" },
    { id: "__menu", icon: MenuIcon, ar: "المزيد", en: "More" },
  ] as Array<{ id: string; icon: any; ar: string; en: string; featured?: boolean }>;

  const handleTap = (id: string) => {
    if (id === "__menu") return onOpenMenu();
    if (navigator.vibrate) navigator.vibrate(8);
    onNavigate(id);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 h-16">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = currentView === t.id;
          const label = isAr ? t.ar : t.en;
          const featured = t.featured;
          return (
            <li key={t.id} className="flex">
              <button
                onClick={() => handleTap(t.id)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`group flex-1 flex flex-col items-center justify-center gap-0.5 min-h-11 transition-colors ${
                  active ? "text-accent" : featured ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-full transition-all ${
                    featured
                      ? `w-12 h-12 -mt-4 shadow-lg ${active ? "bg-gradient-to-br from-primary to-accent text-primary-foreground animate-pulse" : "bg-gradient-to-br from-accent/80 to-primary/80 text-primary-foreground"}`
                      : `w-10 h-6 ${active ? "bg-accent/15" : "bg-transparent group-active:bg-muted"}`
                  }`}
                >
                  <Icon
                    className={`${featured ? "w-6 h-6" : "w-5 h-5"} transition-transform ${active ? "scale-110" : ""}`}
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                </span>
                <span
                  className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"} ${
                    isAr ? "font-arabic" : ""
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;