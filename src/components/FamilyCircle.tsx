import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { SURAHS } from "@/data/quranData";
import {
  ArrowLeft, Users, Plus, LogIn as LogInIcon, Share2, Copy, Crown,
  Target, CheckCircle2, Circle, AlertCircle, RotateCcw, Trash2,
} from "lucide-react";

type Circle = {
  id: string; name: string; invite_code: string; created_by: string;
  max_members: number; created_at: string;
};
type Member = { id: string; user_id: string; role: string; joined_at: string };
type Goal = {
  id: string; circle_id: string; surah_number: number;
  start_verse: number; end_verse: number; deadline: string;
  created_at: string; completed_at: string | null;
};
type Prog = {
  id: string; user_id: string; goal_id: string;
  verse_number: number; status: "not_started" | "memorized" | "reviewing" | "needs_help";
};
type Profile = { id: string; display_name: string | null; avatar_url: string | null };

const statusCycle: Prog["status"][] = ["not_started", "memorized", "reviewing", "needs_help"];
const statusIcon = (s: Prog["status"]) => {
  if (s === "memorized") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (s === "reviewing") return <RotateCcw className="w-4 h-4 text-yellow-500" />;
  if (s === "needs_help") return <AlertCircle className="w-4 h-4 text-red-500" />;
  return <Circle className="w-4 h-4 text-muted-foreground" />;
};

interface Props { onBack: () => void }

export default function FamilyCircle({ onBack }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "join" | "circle" | "newGoal">("list");
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);

  const loadCircles = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("circles")
      .select("id,name,max_members,created_by,active,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load circles", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setCircles((data || []).map((c: any) => ({ ...c, invite_code: "" })));
    setLoading(false);
  }, [toast, user]);

  useEffect(() => { loadCircles(); }, [loadCircles]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center">
        <Users className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to use Family Circles</h2>
        <p className="text-muted-foreground mb-6">Memorize the Quran together with your family.</p>
        <Button onClick={onBack}>Back</Button>
      </div>
    );
  }

  if (view === "circle" && activeCircleId) {
    return (
      <CircleDashboard
        circleId={activeCircleId}
        onBack={() => { setActiveCircleId(null); setView("list"); loadCircles(); }}
        onNewGoal={() => setView("newGoal")}
        onLeft={() => { setActiveCircleId(null); setView("list"); loadCircles(); }}
      />
    );
  }

  if (view === "newGoal" && activeCircleId) {
    return <NewGoal circleId={activeCircleId} onDone={() => setView("circle")} />;
  }

  if (view === "create") return <CreateCircle onBack={() => setView("list")} onCreated={(id) => { setActiveCircleId(id); setView("circle"); }} />;
  if (view === "join") return <JoinCircle onBack={() => setView("list")} onJoined={(id) => { setActiveCircleId(id); setView("circle"); }} />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/85 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-semibold">Family Hifdh</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" className="h-14" onClick={() => setView("create")}>
            <Plus className="w-5 h-5 mr-2" /> Create
          </Button>
          <Button size="lg" variant="outline" className="h-14" onClick={() => setView("join")}>
            <LogInIcon className="w-5 h-5 mr-2" /> Join with Code
          </Button>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Your circles</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : circles.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">No circles yet</p>
              <p className="text-sm text-muted-foreground">Create one for your family or join with a code.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {circles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveCircleId(c.id); setView("circle"); }}
                  className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-between min-h-[64px]"
                >
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    {c.created_by === user.id && c.invite_code && (
                      <div className="text-xs text-muted-foreground mt-0.5">Code: {c.invite_code}</div>
                    )}
                  </div>
                  {c.created_by === user.id && <Crown className="w-4 h-4 text-gold" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateCircle({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState(5);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("create_family_circle", {
      _name: name.trim(),
      _max_members: maxMembers,
    });
    setBusy(false);
    if (error) { toast({ title: "Could not create", description: error.message, variant: "destructive" }); return; }
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.circle_id) {
      toast({ title: "Could not create", description: "The backend did not return a circle ID.", variant: "destructive" });
      return;
    }
    toast({ title: "Circle created", description: created.invite_code ? `Code: ${created.invite_code}` : "Share the invite from the circle screen." });
    onCreated(created.circle_id);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-card/85 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-semibold">Create Circle</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Circle name</label>
          <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 50))} placeholder="e.g. The Ahmad Family" className="h-12" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Max members</label>
          <div className="flex gap-2">
            {[5, 10, 20].map((n) => (
              <Button key={n} variant={maxMembers === n ? "default" : "outline"} className="flex-1 h-12" onClick={() => setMaxMembers(n)}>{n}</Button>
            ))}
          </div>
        </div>
        <Button onClick={submit} disabled={busy || !name.trim()} className="w-full h-14 text-base">
          {busy ? "Creating..." : "Create Circle"}
        </Button>
      </div>
    </div>
  );
}

function JoinCircle({ onBack, onJoined }: { onBack: () => void; onJoined: (id: string) => void }) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("join_circle_by_code", { _code: code });
    setBusy(false);
    if (error) { toast({ title: "Could not join", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Joined circle" });
    onJoined(data as string);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-card/85 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-semibold">Join Circle</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <label className="text-sm font-medium block">6-digit code</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="123456"
          className="h-14 text-center text-2xl tracking-widest font-mono"
        />
        <Button onClick={submit} disabled={busy || code.length !== 6} className="w-full h-14 text-base">
          {busy ? "Joining..." : "Join Family"}
        </Button>
      </div>
    </div>
  );
}

function NewGoal({ circleId, onDone }: { circleId: string; onDone: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [surah, setSurah] = useState(67);
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(5);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const surahInfo = SURAHS.find((s) => s.id === surah)!;

  const submit = async () => {
    if (!user) return;
    if (start < 1 || end > surahInfo.verses || start > end) {
      toast({ title: "Invalid verses", variant: "destructive" }); return;
    }
    setBusy(true);
    const deadline = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await (supabase as any).from("goals").insert({
      circle_id: circleId, surah_number: surah, start_verse: start,
      end_verse: end, deadline, created_by: user.id,
    });
    setBusy(false);
    if (error) { toast({ title: "Could not create goal", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Goal set" });
    onDone();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-card/85 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onDone}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-semibold">New Goal</h1>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Surah</label>
          <select
            value={surah}
            onChange={(e) => { const id = Number(e.target.value); setSurah(id); setStart(1); setEnd(Math.min(5, SURAHS.find(s=>s.id===id)!.verses)); }}
            className="w-full h-12 px-3 rounded-md border border-input bg-background"
          >
            {SURAHS.map((s) => <option key={s.id} value={s.id}>{s.id}. {s.name.en} ({s.verses})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Start verse</label>
            <Input type="number" min={1} max={surahInfo.verses} value={start} onChange={(e) => setStart(Number(e.target.value))} className="h-12" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End verse</label>
            <Input type="number" min={1} max={surahInfo.verses} value={end} onChange={(e) => setEnd(Number(e.target.value))} className="h-12" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Deadline (days)</label>
          <div className="flex gap-2">
            {[3, 7, 14, 30].map((d) => (
              <Button key={d} variant={days === d ? "default" : "outline"} className="flex-1 h-12" onClick={() => setDays(d)}>{d}d</Button>
            ))}
          </div>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full h-14 text-base">
          {busy ? "Saving..." : "Set Goal"}
        </Button>
      </div>
    </div>
  );
}

function CircleDashboard({ circleId, onBack, onNewGoal, onLeft }: {
  circleId: string; onBack: () => void; onNewGoal: () => void; onLeft: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [goal, setGoal] = useState<Goal | null>(null);
  const [progress, setProgress] = useState<Prog[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!user && !!circle && members.find((m) => m.user_id === user.id)?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: ms }, { data: gs }] = await Promise.all([
      (supabase as any).from("circles").select("id,name,max_members,created_by,active,created_at,updated_at").eq("id", circleId).maybeSingle(),
      (supabase as any).from("circle_members").select("*").eq("circle_id", circleId),
      (supabase as any).from("goals").select("*").eq("circle_id", circleId).is("completed_at", null).order("created_at", { ascending: false }).limit(1),
    ]);
    let inviteCode = "";
    const meRow = (ms || []).find((m: Member) => m.user_id === user?.id);
    if (c && meRow?.role === "admin") {
      const { data: code } = await (supabase as any).rpc("get_circle_invite_code", { _circle_id: circleId });
      inviteCode = code || "";
    }
    setCircle(c ? { ...c, invite_code: inviteCode } : null);
    setMembers(ms || []);
    const g = gs?.[0] || null;
    setGoal(g);
    if (g) {
      const { data: ps } = await (supabase as any).from("circle_progress").select("*").eq("goal_id", g.id);
      setProgress(ps || []);
    } else { setProgress([]); }
    const ids = (ms || []).map((m: Member) => m.user_id);
    if (ids.length) {
      const { data: profs } = await (supabase as any).from("profiles").select("id,display_name,avatar_url").in("id", ids);
      const map: Record<string, Profile> = {};
      (profs || []).forEach((p: Profile) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`circle-${circleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "circle_progress", filter: `circle_id=eq.${circleId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "circle_members", filter: `circle_id=eq.${circleId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `circle_id=eq.${circleId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [circleId, load]);

  const verses = useMemo(() => {
    if (!goal) return [];
    return Array.from({ length: goal.end_verse - goal.start_verse + 1 }, (_, i) => goal.start_verse + i);
  }, [goal]);

  const myStatus = (v: number): Prog["status"] => {
    if (!user) return "not_started";
    return progress.find((p) => p.user_id === user.id && p.verse_number === v)?.status || "not_started";
  };

  const cycleVerse = async (v: number) => {
    if (!user || !goal) return;
    const current = myStatus(v);
    const next = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length];
    // optimistic
    setProgress((prev) => {
      const others = prev.filter((p) => !(p.user_id === user.id && p.verse_number === v));
      return [...others, { id: "tmp", user_id: user.id, goal_id: goal.id, verse_number: v, status: next }];
    });
    await (supabase as any).from("circle_progress").upsert(
      { circle_id: circleId, goal_id: goal.id, user_id: user.id, verse_number: v, status: next, updated_at: new Date().toISOString() },
      { onConflict: "goal_id,user_id,verse_number" }
    );
  };

  const familyPct = useMemo(() => {
    if (!goal || members.length === 0) return 0;
    const total = verses.length * members.length;
    const done = progress.filter((p) => p.status === "memorized").length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [goal, members, progress, verses]);

  const myPct = useMemo(() => {
    if (!goal || !user) return 0;
    const done = progress.filter((p) => p.user_id === user.id && p.status === "memorized").length;
    return verses.length ? Math.round((done / verses.length) * 100) : 0;
  }, [goal, user, progress, verses]);

  const daysLeft = goal ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)) : 0;

  const copyCode = () => {
    if (!circle?.invite_code) { toast({ title: "Only circle admins can share the code" }); return; }
    navigator.clipboard.writeText(circle.invite_code).then(() => toast({ title: "Code copied" }));
  };
  const shareCircle = async () => {
    if (!circle?.invite_code) { toast({ title: "Only circle admins can share the code" }); return; }
    const text = `Join our Family Hifdh Circle "${circle.name}" on Al-Bayan. Code: ${circle.invite_code}`;
    if ((navigator as any).share) { try { await (navigator as any).share({ title: "Al-Bayan", text }); } catch {} }
    else { navigator.clipboard.writeText(text); toast({ title: "Invite copied" }); }
  };

  const leave = async () => {
    if (!user) return;
    if (!confirm("Leave this circle?")) return;
    await (supabase as any).from("circle_members").delete().eq("circle_id", circleId).eq("user_id", user.id);
    toast({ title: "Left circle" });
    onLeft();
  };

  if (loading) return <div className="min-h-screen bg-background p-6 text-muted-foreground">Loading...</div>;
  if (!circle) return (
    <div className="min-h-screen bg-background p-6 text-center">
      <p className="mb-4">Circle not found.</p>
      <Button onClick={onBack}>Back</Button>
    </div>
  );

  const surahInfo = goal ? SURAHS.find((s) => s.id === goal.surah_number) : null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 bg-card/85 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{circle.name}</div>
            <div className="text-xs text-muted-foreground">
              {circle.invite_code ? `Code ${circle.invite_code} · ` : ""}{members.length}/{circle.max_members}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={shareCircle} aria-label="Share"><Share2 className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={copyCode} aria-label="Copy code"><Copy className="w-5 h-5" /></Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {!goal ? (
          <Card className="p-6 text-center">
            <Target className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="font-medium mb-1">No active goal</p>
            <p className="text-sm text-muted-foreground mb-4">
              {isAdmin ? "Set your family's first weekly goal." : "Waiting for the admin to set a goal."}
            </p>
            {isAdmin && <Button onClick={onNewGoal} className="h-12"><Plus className="w-4 h-4 mr-2" />Set Goal</Button>}
          </Card>
        ) : (
          <>
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">This week's goal</div>
                  <div className="font-semibold text-lg">{surahInfo?.name.en} {goal.start_verse}–{goal.end_verse}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{familyPct}%</div>
                  <div className="text-xs text-muted-foreground">family</div>
                </div>
              </div>
              <Progress value={familyPct} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{daysLeft} days left</span>
                <span>You: {myPct}%</span>
              </div>
            </Card>

            <div>
              <h3 className="text-sm font-medium mb-3">Verses (tap to update)</h3>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {verses.map((v) => {
                  const s = myStatus(v);
                  const bg = s === "memorized" ? "bg-emerald-500/15 border-emerald-500/40"
                    : s === "reviewing" ? "bg-yellow-500/15 border-yellow-500/40"
                    : s === "needs_help" ? "bg-red-500/15 border-red-500/40"
                    : "bg-muted border-border";
                  return (
                    <button
                      key={v}
                      onClick={() => cycleVerse(v)}
                      className={`h-14 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors ${bg}`}
                    >
                      <span className="text-sm font-semibold">{v}</span>
                      {statusIcon(s)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Family ({members.length})</h3>
              <div className="space-y-2">
                {members.map((m) => {
                  const p = profiles[m.user_id];
                  const memDone = progress.filter((x) => x.user_id === m.user_id && x.status === "memorized").length;
                  const pct = verses.length ? Math.round((memDone / verses.length) * 100) : 0;
                  return (
                    <div key={m.id} className="p-3 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold">
                            {(p?.display_name || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="text-sm font-medium">
                            {p?.display_name || "Member"}
                            {m.user_id === user?.id && " (You)"}
                          </div>
                          {m.role === "admin" && <Crown className="w-3.5 h-3.5 text-gold" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{pct}%</div>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>

            {isAdmin && (
              <Button onClick={onNewGoal} variant="outline" className="w-full h-12">
                <Plus className="w-4 h-4 mr-2" />New Goal
              </Button>
            )}
          </>
        )}

        <div className="pt-4 border-t border-border">
          <Button onClick={leave} variant="ghost" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />Leave circle
          </Button>
        </div>
      </div>
    </div>
  );
}