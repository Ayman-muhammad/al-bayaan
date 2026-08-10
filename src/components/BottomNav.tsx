import { useState } from "react";
import { Home, BookOpen, Heart, Users, Menu as MenuIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import CelebrationBurst from "@/components/CelebrationBurst";

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenMenu: () => void;
}

/**
 * Premium mobile tab bar: frosted floating surface, sliding active indicator,
 * safe-area aware, and a raised Family action that fires a celebration burst
 * on tap (the family cycle is the emotional centre of the app).
 * Hidden on md+ where the top navbar carries navigation.
 */
const BottomNav = ({ currentView, onNavigate, onOpenMenu }: BottomNavProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  /** Increments on each Family tap so the burst remounts and replays. */
  const [burst, setBurst] = useState(0);

  const tabs = [
    { id: "home", icon: Home, ar: "الرئيسية", en: "Home" },
    { id: "quran", icon: BookOpen, ar: "اقرأ", en: "Read" },
    { id: "cycle", icon: Heart, ar: "العائلة", en: "Family", featured: true },
    { id: "scholars", icon: Users, ar: "علماء", en: "Scholars" },
    { id: "__menu", icon: MenuIcon, ar: "المزيد", en: "More" },
  ] as Array<{ id: string; icon: any; ar: string; en: string; featured?: boolean }>;

  const handleTap = (id: string) => {
    if (id === "__menu") return onOpenMenu();
    if (id === "cycle") {
      setBurst((n) => n + 1);
      if (navigator.vibrate) navigator.vibrate([12, 40, 18]);
    } else if (navigator.vibrate) {
      navigator.vibrate(8);
    }
    onNavigate(id);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 nav-surface border-t border-border/70 shadow-[0_-8px_30px_-12px_hsl(var(--primary)/0.28)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {/* Hairline gold gradient crown */}
      <span
        aria-hidden
        className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
      />
      <ul className="grid grid-cols-5 h-16">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = currentView === t.id;
          const label = isAr ? t.ar : t.en;
          const featured = t.featured;
          return (
            <li key={t.id} className="flex relative">
              <button
                onClick={() => handleTap(t.id)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`group relative flex-1 flex flex-col items-center justify-center gap-1 min-h-11 transition-colors duration-200 active:scale-[0.97] ${
                  active || featured ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {/* Sliding active indicator */}
                {active && !featured && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-[3px] w-8 rounded-full bg-gradient-to-r from-primary to-accent animate-scale-in"
                  />
                )}
                <span
                  className={`relative inline-flex items-center justify-center rounded-full transition-all duration-300 ${
                    featured
                      ? `w-14 h-14 -mt-6 text-primary-foreground ring-4 ring-card shadow-[0_10px_24px_-8px_hsl(var(--accent)/0.7)] ${
                          active
                            ? "bg-gradient-to-br from-primary to-accent scale-105"
                            : "bg-gradient-to-br from-accent to-primary animate-pulse-slow"
                        }`
                      : `w-11 h-7 ${active ? "bg-accent/15" : "bg-transparent group-active:bg-muted"}`
                  }`}
                >
                  {featured && burst > 0 && <CelebrationBurst key={burst} radius={38} />}
                  <Icon
                    className={`${featured ? "w-7 h-7" : "w-5 h-5"} transition-transform duration-300 ${
                      active ? "scale-110" : ""
                    } ${featured && active ? "drop-shadow" : ""}`}
                    strokeWidth={active ? 2.4 : 1.9}
                    fill={featured && active ? "currentColor" : "none"}
                  />
                </span>
                <span
                  className={`text-[10px] leading-none tracking-tight transition-all ${
                    active ? "font-semibold" : "font-medium"
                  } ${isAr ? "font-arabic" : ""}`}
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