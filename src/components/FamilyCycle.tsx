import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart, Plus, X, Book, Sunrise, Moon as MoonIcon, Sparkles, Coins, Check, ChevronRight, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onNavigate: (view: string) => void;
}

interface Cycle {
  id: string;
  intention: string;
  start_date: string;
  duration_days: number;
  status: string;
}
interface Member {
  id: string;
  cycle_id: string;
  name: string;
  role: string;
  avatar_emoji: string;
  color: string;
}
type ActivityType = "quran" | "adhkar_morning" | "adhkar_evening" | "dhikr" | "gratitude" | "charity";
interface Activity {
  id: string;
  cycle_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  surah_number: number | null;
  start_ayah: number | null;
  end_ayah: number | null;
  dhikr_target: number | null;
  time_slot: "morning" | "evening" | "anytime";
  assigned_members: string[];
}
interface Completion {
  id: string;
  activity_id: string;
  member_id: string | null;
  completion_date: string;
}

const EMOJIS = ["👨", "👩", "👧", "👦", "👶", "🧓", "🧕", "🧔"];
const COLORS = ["#D4AF37", "#0D7377", "#E11D48", "#059669", "#7C3AED", "#EA580C"];
const ROLES: Array<{ id: Member["role"]; ar: string; en: string }> = [
  { id: "parent", ar: "والد", en: "Parent" },
  { id: "spouse", ar: "زوج", en: "Spouse" },
  { id: "child", ar: "طفل", en: "Child" },
  { id: "sibling", ar: "أخ/أخت", en: "Sibling" },
];

const ACTIVITY_TEMPLATES: Array<{
  key: string;
  type: ActivityType;
  time_slot: "morning" | "evening" | "anytime";
  titleEn: string;
  titleAr: string;
  surah?: number;
  target?: number;
  icon: any;
}> = [
  { key: "morning_adhkar", type: "adhkar_morning", time_slot: "morning", titleEn: "Morning Adhkar together", titleAr: "أذكار الصباح معًا", icon: Sunrise },
  { key: "evening_adhkar", type: "adhkar_evening", time_slot: "evening", titleEn: "Evening Adhkar together", titleAr: "أذكار المساء معًا", icon: MoonIcon },
  { key: "quran_mulk", type: "quran", time_slot: "evening", titleEn: "Read Surah Al-Mulk (67)", titleAr: "قراءة سورة الملك", surah: 67, icon: Book },
  { key: "quran_kahf", type: "quran", time_slot: "morning", titleEn: "Read Surah Al-Kahf (18)", titleAr: "قراءة سورة الكهف", surah: 18, icon: Book },
  { key: "dhikr_100", type: "dhikr", time_slot: "anytime", titleEn: "100× SubhanAllah wa bihamdih", titleAr: "١٠٠× سبحان الله وبحمده", target: 100, icon: Sparkles },
  { key: "gratitude", type: "gratitude", time_slot: "evening", titleEn: "Share one gratitude", titleAr: "شارك امتنانًا واحدًا", icon: Heart },
  { key: "charity", type: "charity", time_slot: "anytime", titleEn: "Give charity together", titleAr: "تصدّقوا معًا", icon: Coins },
];

const FamilyCycle = ({ onBack, onNavigate }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(0);
  const [intention, setIntention] = useState("");
  const [duration, setDuration] = useState(7);
  const [draftMembers, setDraftMembers] = useState<Array<{ name: string; role: string; emoji: string; color: string }>>([
    { name: "", role: "parent", emoji: "👨", color: COLORS[0] },
  ]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([
    "morning_adhkar",
    "evening_adhkar",
    "quran_mulk",
    "dhikr_100",
  ]);

  useEffect(() => {
    if (!user) return;
    void loadCycle();
  }, [user]);

  async function loadCycle() {
    setLoading(true);
    const { data: cycles } = await supabase
      .from("family_cycles")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);
    const c = cycles?.[0] ?? null;
    setCycle(c);
    if (c) {
      const [{ data: ms }, { data: as }] = await Promise.all([
        supabase.from("family_members").select("*").eq("cycle_id", c.id),
        supabase.from("cycle_activities").select("*").eq("cycle_id", c.id),
      ]);
      setMembers((ms as Member[]) ?? []);
      setActivities((as as Activity[]) ?? []);
      const activityIds = (as ?? []).map((a: any) => a.id);
      if (activityIds.length) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: cs } = await supabase
          .from("cycle_completions")
          .select("*")
          .in("activity_id", activityIds)
          .eq("completion_date", today);
        setCompletions((cs as Completion[]) ?? []);
      }
    }
    setLoading(false);
  }

  async function createCycle() {
    if (!user) {
      toast.error(isAr ? "سجّل الدخول أولًا" : "Please sign in first");
      return;
    }
    if (!intention.trim()) {
      toast.error(isAr ? "اكتب نيّتك" : "Please set an intention");
      return;
    }
    const validMembers = draftMembers.filter((m) => m.name.trim());
    if (validMembers.length === 0) {
      toast.error(isAr ? "أضف عضوًا واحدًا على الأقل" : "Add at least one member");
      return;
    }

    const { data: newCycle, error: cErr } = await supabase
      .from("family_cycles")
      .insert({ user_id: user.id, intention: intention.trim(), duration_days: duration })
      .select()
      .single();
    if (cErr || !newCycle) {
      toast.error(cErr?.message ?? "Failed to create");
      return;
    }
    const { data: insertedMembers } = await supabase
      .from("family_members")
      .insert(
        validMembers.map((m, i) => ({
          cycle_id: newCycle.id,
          name: m.name.trim(),
          role: m.role,
          avatar_emoji: m.emoji,
          color: m.color,
          sort_order: i,
        }))
      )
      .select();

    const memberIds = (insertedMembers ?? []).map((m: any) => m.id);
    const activityRows = ACTIVITY_TEMPLATES.filter((t) => selectedTemplates.includes(t.key)).map((t) => ({
      cycle_id: newCycle.id,
      activity_type: t.type,
      title: isAr ? t.titleAr : t.titleEn,
      description: null,
      surah_number: t.surah ?? null,
      start_ayah: null,
      end_ayah: null,
      dhikr_target: t.target ?? null,
      time_slot: t.time_slot,
      assigned_members: memberIds,
    }));
    if (activityRows.length) {
      await supabase.from("cycle_activities").insert(activityRows);
    }
    toast.success(isAr ? "✨ بدأت الرحلة!" : "✨ Cycle started!");
    setWizardStep(0);
    await loadCycle();
  }

  async function markDone(activity: Activity) {
    if (!user) return;
    const { error } = await supabase.from("cycle_completions").insert({
      activity_id: activity.id,
      completed_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success(isAr ? "✅ تم" : "✅ Marked complete!");
    await loadCycle();
  }

  function openActivity(activity: Activity) {
    if (["quran", "adhkar_morning", "adhkar_evening", "dhikr"].includes(activity.activity_type)) {
      const { view, search } = buildFamilyDeepLink(activity);
      navigate(`/?view=${view}&${search}`);
      onNavigate(view);
    } else {
      // gratitude / charity — inline complete
      void markDone(activity);
    }
  }

  const completedIds = useMemo(() => new Set(completions.map((c) => c.activity_id)), [completions]);
  const morningActs = activities.filter((a) => a.time_slot === "morning" || a.activity_type === "adhkar_morning");
  const eveningActs = activities.filter((a) => a.time_slot === "evening" || a.activity_type === "adhkar_evening");
  const anytimeActs = activities.filter((a) => a.time_slot === "anytime");
  const completedCount = activities.filter((a) => completedIds.has(a.id)).length;
  const totalCount = activities.length || 1;
  const percent = Math.round((completedCount / totalCount) * 100);

  // ============ RENDER ============
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Heart className="w-12 h-12 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">{isAr ? "دورة العائلة" : "Family Cycle"}</h1>
        <p className="text-muted-foreground mb-6">
          {isAr ? "سجّل الدخول لتبدأ رحلة عائلتك الروحية" : "Sign in to begin your family's spiritual journey."}
        </p>
        <Button onClick={() => onNavigate("auth")} className="w-full">
          {isAr ? "تسجيل الدخول" : "Sign In"}
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-md mx-auto px-4 py-16 text-center text-muted-foreground">…</div>;
  }

  // ------- WIZARD -------
  if (!cycle) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-14 z-30 bg-card/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className={`text-base font-semibold ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "ابدأ دورة العائلة" : "Start a Family Cycle"}
            </h1>
            <span className="ml-auto text-xs text-muted-foreground">{wizardStep + 1} / 3</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {wizardStep === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-3xl p-5 bg-gradient-to-br from-accent/10 via-primary/10 to-transparent border border-accent/20">
                <h2 className="text-lg font-semibold mb-1">
                  {isAr ? "ما هي نيّة عائلتك؟" : "What is your family's intention?"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "اختر أو اكتب" : "Pick a preset or write your own."}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    isAr ? "قرآن يومي معًا" : "Daily Quran together",
                    isAr ? "أذكار الصباح والمساء" : "Morning & Evening Adhkar",
                    isAr ? "الامتنان اليومي" : "Gratitude practice",
                    isAr ? "هدف للصدقة" : "Charity goal",
                    isAr ? "ذكر جماعي" : "Family dhikr",
                    isAr ? "حفظ سورة جديدة" : "Learn a new Surah",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setIntention(chip)}
                      className={`px-3 py-1.5 rounded-full text-xs border ${
                        intention === chip
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={intention}
                  onChange={(e) => setIntention(e.target.value.slice(0, 100))}
                  placeholder={isAr ? "اكتب نيّتك…" : "Or write your own…"}
                  className="mt-4"
                  maxLength={100}
                />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{intention.length}/100</p>
              </div>

              <div className="rounded-2xl p-4 border border-border">
                <p className="text-sm font-medium mb-3">{isAr ? "مدة الدورة" : "Cycle duration"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`h-12 rounded-xl border text-sm font-semibold ${
                        duration === d
                          ? "bg-accent/15 border-accent text-accent"
                          : "bg-background border-border"
                      }`}
                    >
                      {d} {isAr ? "يوم" : "days"}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setWizardStep(1)}
                disabled={!intention.trim()}
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                {isAr ? "التالي" : "Next"} <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold mb-1">{isAr ? "أفراد العائلة" : "Family members"}</h2>
                <p className="text-xs text-muted-foreground">{isAr ? "أضف حتى ٨ أعضاء" : "Add up to 8 members."}</p>
              </div>
              {draftMembers.map((m, i) => (
                <div key={i} className="rounded-2xl border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-wrap flex-1">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            const next = [...draftMembers];
                            next[i].emoji = e;
                            setDraftMembers(next);
                          }}
                          className={`w-9 h-9 rounded-lg text-xl ${
                            m.emoji === e ? "bg-accent/20 ring-2 ring-accent" : "bg-muted"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setDraftMembers(draftMembers.filter((_, idx) => idx !== i))}
                      className="text-destructive p-2"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    value={m.name}
                    onChange={(e) => {
                      const next = [...draftMembers];
                      next[i].name = e.target.value;
                      setDraftMembers(next);
                    }}
                    placeholder={isAr ? "الاسم" : "Name"}
                    maxLength={40}
                  />
                  <div className="flex gap-2 flex-wrap">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          const next = [...draftMembers];
                          next[i].role = r.id;
                          setDraftMembers(next);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          m.role === r.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border"
                        }`}
                      >
                        {isAr ? r.ar : r.en}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          const next = [...draftMembers];
                          next[i].color = c;
                          setDraftMembers(next);
                        }}
                        className="w-8 h-8 rounded-full border-2"
                        style={{
                          backgroundColor: c,
                          borderColor: m.color === c ? "hsl(var(--foreground))" : "transparent",
                        }}
                        aria-label="color"
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  draftMembers.length < 8 &&
                  setDraftMembers([
                    ...draftMembers,
                    {
                      name: "",
                      role: "child",
                      emoji: EMOJIS[draftMembers.length % EMOJIS.length],
                      color: COLORS[draftMembers.length % COLORS.length],
                    },
                  ])
                }
                className="w-full h-12"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAr ? "أضف عضوًا" : "Add member"}
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWizardStep(0)} className="flex-1 h-14">
                  {isAr ? "رجوع" : "Back"}
                </Button>
                <Button
                  onClick={() => setWizardStep(2)}
                  className="flex-1 h-14 rounded-2xl font-semibold"
                >
                  {isAr ? "التالي" : "Next"} <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold mb-1">
                  {isAr ? "الأنشطة اليومية" : "Daily activities"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "اختر ما ستمارسه العائلة يوميًا" : "Pick what your family will practice each day."}
                </p>
              </div>
              {ACTIVITY_TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = selectedTemplates.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() =>
                      setSelectedTemplates((s) =>
                        active ? s.filter((k) => k !== t.key) : [...s, t.key]
                      )
                    }
                    className={`w-full text-left rounded-2xl p-4 border flex items-center gap-3 transition-colors ${
                      active ? "bg-accent/10 border-accent" : "bg-card border-border"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        active ? "bg-accent text-accent-foreground" : "bg-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{isAr ? t.titleAr : t.titleEn}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        {t.time_slot === "morning"
                          ? isAr ? "صباحًا" : "Morning"
                          : t.time_slot === "evening"
                            ? isAr ? "مساءً" : "Evening"
                            : isAr ? "في أي وقت" : "Anytime"}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        active ? "bg-accent border-accent" : "border-border"
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-accent-foreground" />}
                    </div>
                  </button>
                );
              })}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1 h-14">
                  {isAr ? "رجوع" : "Back"}
                </Button>
                <Button
                  onClick={createCycle}
                  disabled={selectedTemplates.length === 0}
                  className="flex-1 h-14 rounded-2xl font-semibold bg-gradient-to-r from-primary to-accent"
                >
                  {isAr ? "ابدأ الدورة" : "Start Cycle"}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ------- DASHBOARD -------
  const dayNumber = Math.max(
    1,
    Math.floor((Date.now() - new Date(cycle.start_date).getTime()) / 86400000) + 1
  );
  const renderBlock = (
    label: string,
    icon: any,
    acts: Activity[]
  ) => {
    const Icon = icon;
    if (acts.length === 0) return null;
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <Icon className="w-4 h-4" /> {label}
        </h2>
        {acts.map((a) => {
          const done = completedIds.has(a.id);
          return (
            <div
              key={a.id}
              className={`rounded-3xl border p-4 space-y-3 transition-all ${
                done ? "bg-primary/5 border-primary/40" : "bg-card border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    done ? "bg-primary text-primary-foreground" : "bg-accent/15 text-accent"
                  }`}
                >
                  {a.activity_type === "quran" && <Book className="w-5 h-5" />}
                  {a.activity_type === "adhkar_morning" && <Sunrise className="w-5 h-5" />}
                  {a.activity_type === "adhkar_evening" && <MoonIcon className="w-5 h-5" />}
                  {a.activity_type === "dhikr" && <Sparkles className="w-5 h-5" />}
                  {a.activity_type === "gratitude" && <Heart className="w-5 h-5" />}
                  {a.activity_type === "charity" && <Coins className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isAr ? "font-arabic" : ""}`}>{a.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {a.assigned_members.slice(0, 6).map((mid) => {
                      const m = members.find((x) => x.id === mid);
                      if (!m) return null;
                      return (
                        <span
                          key={mid}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] border-2 border-background -ml-1 first:ml-0"
                          style={{ backgroundColor: m.color + "33" }}
                          title={m.name}
                        >
                          {m.avatar_emoji}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {done && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {isAr ? "تم" : "Done"}
                  </span>
                )}
              </div>
              {!done && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => openActivity(a)}
                    className="flex-1 h-11 text-sm"
                  >
                    {a.activity_type === "quran"
                      ? (isAr ? "اقرأ الآن" : "Read now")
                      : a.activity_type.startsWith("adhkar")
                        ? (isAr ? "افتح الأذكار" : "Open Adhkar")
                        : a.activity_type === "dhikr"
                          ? (isAr ? "افتح التسبيح" : "Open Dhikr")
                          : (isAr ? "ابدأ" : "Start")}
                  </Button>
                  <Button variant="outline" onClick={() => markDone(a)} className="h-11 text-sm">
                    {isAr ? "علّم كمنجز" : "Mark done"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-14 z-30 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-base font-semibold truncate ${isAr ? "font-arabic" : ""}`}>
              {cycle.intention}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {isAr ? `اليوم ${dayNumber} من ${cycle.duration_days}` : `Day ${dayNumber} of ${cycle.duration_days}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-accent leading-none">{percent}%</p>
            <p className="text-[10px] text-muted-foreground">{isAr ? "اليوم" : "today"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-24">
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-muted-foreground" />
          {members.map((m) => (
            <span
              key={m.id}
              className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1 border"
              style={{ borderColor: m.color, backgroundColor: m.color + "18" }}
            >
              <span>{m.avatar_emoji}</span> {m.name}
            </span>
          ))}
        </div>

        {renderBlock(isAr ? "الصباح" : "Morning", Sunrise, morningActs)}
        {renderBlock(isAr ? "المساء" : "Evening", MoonIcon, eveningActs)}
        {renderBlock(isAr ? "في أي وقت" : "Anytime", Sparkles, anytimeActs)}

        {activities.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {isAr ? "لا توجد أنشطة بعد" : "No activities in this cycle yet."}
          </div>
        )}
      </main>
    </div>
  );
};

export default FamilyCycle;