import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Award, BookOpen, Flame, HandHeart, Plus, Sparkles, Timer, Trophy } from "lucide-react";

type GoalType = "quran_ayahs" | "dhikr_count" | "salah_days" | "learning_minutes" | "custom";

type FamilyGoal = {
  id: string;
  circle_id: string;
  created_by: string;
  title: string;
  goal_type: GoalType;
  target_amount: number;
  unit: string;
  deadline: string;
  completed_at: string | null;
};
type Contribution = {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  note: string | null;
  created_at: string;
};
type LeaderRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_amount: number;
  contributions: number;
};
type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  unlocked_at: string;
};

const GOAL_META: Record<GoalType, { label: string; unit: string; icon: React.ComponentType<{ className?: string }>; suggestions: number[] }> = {
  quran_ayahs: { label: "Quran Ayahs", unit: "ayahs", icon: BookOpen, suggestions: [30, 100, 300] },
  dhikr_count: { label: "Dhikr Count", unit: "dhikrs", icon: Sparkles, suggestions: [100, 500, 1000] },
  salah_days:  { label: "Salah Days", unit: "days", icon: Flame, suggestions: [7, 14, 30] },
  learning_minutes: { label: "Learning Minutes", unit: "minutes", icon: Timer, suggestions: [60, 180, 600] },
  custom: { label: "Custom", unit: "count", icon: Trophy, suggestions: [10, 50, 100] },
};

interface Props {
  circleId: string;
  isAdmin: boolean;
}

export default function FamilyGoalsPanel({ circleId, isAdmin }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<FamilyGoal[]>([]);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: gs }, { data: cs }, { data: lb }, { data: ach }] = await Promise.all([
      (supabase as any).from("family_goals").select("*").eq("circle_id", circleId).order("created_at", { ascending: false }),
      (supabase as any).from("family_goal_contributions").select("*").eq("circle_id", circleId).order("created_at", { ascending: false }).limit(50),
      (supabase as any).rpc("get_family_leaderboard", { _circle_id: circleId }),
      (supabase as any).from("achievements").select("id,code,title,description,unlocked_at").order("unlocked_at", { ascending: false }).limit(12),
    ]);
    setGoals(gs || []);
    setContribs(cs || []);
    setLeaders(lb || []);
    setAchievements(ach || []);
    setLoading(false);
  }, [circleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`family-goals-${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_goals", filter: `circle_id=eq.${circleId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "family_goal_contributions", filter: `circle_id=eq.${circleId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [circleId, load]);

  const totalsByGoal = useMemo(() => {
    const m = new Map<string, number>();
    contribs.forEach((c) => m.set(c.goal_id, (m.get(c.goal_id) || 0) + c.amount));
    return m;
  }, [contribs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><HandHeart className="w-4 h-4 text-primary" /> Family Goals</h3>
          <p className="text-xs text-muted-foreground">Shared barakah — every contribution counts.</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreating(true)} className="h-9">
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        )}
      </div>

      {creating && (
        <NewFamilyGoal circleId={circleId} onDone={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : goals.length === 0 ? (
        <Card className="p-6 text-center">
          <Trophy className="w-10 h-10 mx-auto text-primary mb-2" />
          <p className="font-medium">No family goals yet</p>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Create a shared goal for your family." : "Waiting for the admin to set a family goal."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const meta = GOAL_META[g.goal_type] || GOAL_META.custom;
            const total = totalsByGoal.get(g.id) || 0;
            const pct = Math.min(100, Math.round((total / g.target_amount) * 100));
            const days = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000));
            const Icon = meta.icon;
            return (
              <Card key={g.id} className={`p-4 space-y-3 ${g.completed_at ? "border-emerald-500/40 bg-emerald-500/5" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{g.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {total.toLocaleString()} / {g.target_amount.toLocaleString()} {g.unit}
                        {g.completed_at ? " · Completed 🎉" : ` · ${days}d left`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${g.completed_at ? "text-emerald-500" : "text-primary"}`}>{pct}%</div>
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
                {!g.completed_at && user && (
                  <ContributeRow goalId={g.id} circleId={circleId} unit={g.unit} onDone={load} />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {leaders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Trophy className="w-4 h-4 text-gold" /> Leaderboard</h3>
          <div className="space-y-1.5">
            {leaders.map((row, i) => (
              <div key={row.user_id} className="p-2.5 rounded-lg border border-border bg-card flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-gold/20 text-gold" : i === 1 ? "bg-muted-foreground/20" : i === 2 ? "bg-orange-500/15 text-orange-500" : "bg-muted"
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0 text-sm truncate">
                  {row.display_name || "Member"} {row.user_id === user?.id && <span className="text-xs text-muted-foreground">(You)</span>}
                </div>
                <div className="text-sm font-semibold">{Number(row.total_amount).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Award className="w-4 h-4 text-gold" /> Your Badges</h3>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-border bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <div className="text-xs font-semibold truncate">{a.title}</div>
                </div>
                {a.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{a.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContributeRow({ goalId, circleId, unit, onDone }: { goalId: string; circleId: string; unit: string; onDone: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState<number | "">("");
  const [busy, setBusy] = useState(false);

  const contribute = async (val: number) => {
    if (!user || val <= 0) return;
    setBusy(true);
    const { error } = await (supabase as any).from("family_goal_contributions").insert({
      goal_id: goalId, circle_id: circleId, user_id: user.id, amount: val,
    });
    setBusy(false);
    if (error) { toast({ title: "Could not log", description: error.message, variant: "destructive" }); return; }
    toast({ title: `+${val} ${unit}`, description: "Barakallahu feek" });
    setAmount("");
    onDone();
  };

  return (
    <div className="flex gap-2 pt-1">
      {[1, 5, 10].map((n) => (
        <Button key={n} size="sm" variant="outline" disabled={busy} onClick={() => contribute(n)} className="flex-1 h-9">
          +{n}
        </Button>
      ))}
      <Input
        type="number" min={1} value={amount} placeholder="Custom"
        onChange={(e) => setAmount(e.target.value ? Math.max(1, Number(e.target.value)) : "")}
        className="h-9 w-20"
      />
      <Button size="sm" disabled={busy || !amount} onClick={() => amount && contribute(Number(amount))} className="h-9">
        Log
      </Button>
    </div>
  );
}

function NewFamilyGoal({ circleId, onDone, onCancel }: { circleId: string; onDone: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("quran_ayahs");
  const [target, setTarget] = useState<number>(100);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const meta = GOAL_META[goalType];

  const submit = async () => {
    if (!user || !title.trim() || target <= 0) return;
    setBusy(true);
    const deadline = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await (supabase as any).from("family_goals").insert({
      circle_id: circleId,
      created_by: user.id,
      title: title.trim(),
      goal_type: goalType,
      target_amount: target,
      unit: meta.unit,
      deadline,
    });
    setBusy(false);
    if (error) { toast({ title: "Could not create", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Goal created" });
    onDone();
  };

  return (
    <Card className="p-4 space-y-3 border-primary/40">
      <Input placeholder="Goal title (e.g. Read Al-Mulk together)" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} className="h-11" />
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(GOAL_META) as GoalType[]).map((t) => {
          const M = GOAL_META[t];
          const Icon = M.icon;
          return (
            <button key={t} onClick={() => { setGoalType(t); setTarget(M.suggestions[0]); }}
              className={`p-2.5 rounded-lg border text-left flex items-center gap-2 text-sm ${goalType === t ? "border-primary bg-primary/10" : "border-border"}`}>
              <Icon className="w-4 h-4 text-primary" /> {M.label}
            </button>
          );
        })}
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Target ({meta.unit})</label>
        <div className="flex gap-2">
          {meta.suggestions.map((n) => (
            <Button key={n} size="sm" variant={target === n ? "default" : "outline"} onClick={() => setTarget(n)} className="flex-1 h-10">{n}</Button>
          ))}
          <Input type="number" min={1} value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))} className="h-10 w-24" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
        <div className="flex gap-2">
          {[3, 7, 14, 30].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)} className="flex-1 h-10">{d}d</Button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button disabled={busy || !title.trim()} onClick={submit} className="flex-1">{busy ? "Saving..." : "Create Goal"}</Button>
      </div>
    </Card>
  );
}