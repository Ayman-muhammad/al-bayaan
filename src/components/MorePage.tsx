import { ArrowLeft, BookOpen, Bell, User, Compass, Sparkles, Sun, Moon, ShieldCheck, Download, Users, Heart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QuranPrefsSheet from "@/components/QuranPrefsSheet";

interface Props {
  onBack: () => void;
  onNavigate: (view: string) => void;
}

const MorePage = ({ onBack, onNavigate }: Props) => {
  const { language, setLanguage } = useLanguage();
  const isAr = language === "ar";
  const { theme, setTheme } = useTheme() as any;
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Family reminders
  const [rem, setRem] = useState({
    morning_enabled: true,
    morning_offset_minutes: 15,
    evening_enabled: true,
    evening_offset_minutes: 30,
    sound: "chime",
  });
  const [remLoading, setRemLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("family_reminders")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setRem((r) => ({ ...r, ...(data as any) }));
    })();
  }, [user]);

  const saveReminders = async () => {
    if (!user) {
      toast({ title: isAr ? "سجّل الدخول أولاً" : "Please sign in first", variant: "destructive" });
      return;
    }
    setRemLoading(true);
    const { error } = await supabase
      .from("family_reminders")
      .upsert({ user_id: user.id, ...rem }, { onConflict: "user_id" });
    setRemLoading(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: isAr ? "تم الحفظ" : "Reminders saved" });
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-2">
      <h3 className={`text-xs font-bold uppercase tracking-wider text-muted-foreground ${isAr ? "font-arabic text-right" : ""}`}>
        {title}
      </h3>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {children}
      </div>
    </section>
  );

  const Row = ({ icon: Icon, label, sub, onClick, trailing }: any) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/5 transition-colors"
    >
      <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium text-foreground ${isAr ? "font-arabic" : ""}`}>{label}</span>
        {sub && <span className="block text-xs text-muted-foreground truncate">{sub}</span>}
      </span>
      {trailing}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0 sticky top-14 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold ${isAr ? "font-arabic" : ""}`}>{isAr ? "المزيد" : "More"}</h1>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Core */}
        <Section title={isAr ? "الأساسي" : "Core"}>
          <Row icon={User} label={isAr ? "الملف الشخصي" : "Profile"} onClick={() => onNavigate("profile")} />
          <Row icon={Sparkles} label={isAr ? "لوحة القيادة" : "Dashboard"} onClick={() => onNavigate("dashboard")} />
          <Row icon={Heart} label={isAr ? "المفضلة" : "Favorites"} onClick={() => onNavigate("favorites")} />
          <Row icon={Compass} label={isAr ? "الرحلات" : "Journeys"} onClick={() => onNavigate("journeys")} />
        </Section>

        {/* Prayer */}
        <Section title={isAr ? "الصلاة" : "Prayer"}>
          <Row icon={Clock} label={isAr ? "مواقيت الصلاة" : "Prayer times"} onClick={() => onNavigate("prayer")} />
          <Row icon={Compass} label={isAr ? "الأذكار" : "Adhkar"} onClick={() => onNavigate("adhkar")} />
        </Section>

        {/* Family Cycle */}
        <Section title={isAr ? "دورة العائلة" : "Family Cycle"}>
          <Row icon={Users} label={isAr ? "الدورة العائلية" : "Family Cycle"} onClick={() => onNavigate("cycle")} />
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className={`text-sm ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "تذكير الصباح" : "Morning reminder"}
              </label>
              <input
                type="checkbox"
                checked={rem.morning_enabled}
                onChange={(e) => setRem({ ...rem, morning_enabled: e.target.checked })}
                className="accent-primary w-5 h-5"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{isAr ? "بعد الفجر بـ" : "After Fajr by"}</span>
              <input
                type="number"
                min={0}
                max={180}
                value={rem.morning_offset_minutes}
                onChange={(e) => setRem({ ...rem, morning_offset_minutes: parseInt(e.target.value || "0", 10) })}
                className="w-20 bg-background border border-border rounded-lg px-2 py-1"
              />
              <span className="text-muted-foreground">{isAr ? "دقيقة" : "min"}</span>
            </div>
            <div className="flex items-center justify-between">
              <label className={`text-sm ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "تذكير المساء" : "Evening reminder"}
              </label>
              <input
                type="checkbox"
                checked={rem.evening_enabled}
                onChange={(e) => setRem({ ...rem, evening_enabled: e.target.checked })}
                className="accent-primary w-5 h-5"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{isAr ? "بعد العصر بـ" : "After Asr by"}</span>
              <input
                type="number"
                min={0}
                max={180}
                value={rem.evening_offset_minutes}
                onChange={(e) => setRem({ ...rem, evening_offset_minutes: parseInt(e.target.value || "0", 10) })}
                className="w-20 bg-background border border-border rounded-lg px-2 py-1"
              />
              <span className="text-muted-foreground">{isAr ? "دقيقة" : "min"}</span>
            </div>
            <Button size="sm" variant="hero" onClick={saveReminders} disabled={remLoading} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              {isAr ? "حفظ التذكيرات" : "Save reminders"}
            </Button>
          </div>
        </Section>

        {/* App */}
        <Section title={isAr ? "التطبيق" : "App"}>
          <Row
            icon={BookOpen}
            label={isAr ? "إعدادات القرآن" : "Quran preferences"}
            sub={isAr ? "الخط، الحجم، مظهر الصفحة" : "Font, size, page theme"}
            onClick={() => setPrefsOpen(true)}
          />
          <Row
            icon={theme === "dark" ? Moon : Sun}
            label={isAr ? "السمة" : "Theme"}
            sub={theme === "dark" ? (isAr ? "داكن" : "Dark") : theme === "light" ? (isAr ? "فاتح" : "Light") : (isAr ? "تلقائي" : "System")}
            onClick={() => setTheme?.(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")}
          />
          <Row
            icon={Sparkles}
            label={isAr ? "اللغة" : "Language"}
            sub={isAr ? "العربية" : "English"}
            onClick={() => setLanguage(isAr ? "en" : "ar")}
          />
          <Row icon={Download} label={isAr ? "التنزيلات" : "Downloads"} onClick={() => onNavigate("downloads")} />
        </Section>

        {/* About */}
        <Section title={isAr ? "حول" : "About"}>
          <Row icon={ShieldCheck} label={isAr ? "لوحة الإدارة" : "Admin panel"} onClick={() => onNavigate("admin")} />
          {user && (
            <button
              onClick={async () => { await signOut(); onNavigate("home"); }}
              className="w-full text-left px-4 py-3.5 text-sm font-medium text-destructive hover:bg-destructive/5"
            >
              {isAr ? "تسجيل الخروج" : "Sign out"}
            </button>
          )}
        </Section>
      </div>

      <QuranPrefsSheet open={prefsOpen} onOpenChange={setPrefsOpen} />
    </div>
  );
};

export default MorePage;
