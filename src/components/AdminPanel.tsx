import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Users, Activity, Search, Crown } from "lucide-react";
import { useIsAdmin } from "@/lib/useIsAdmin";
import LiveStreamsAdmin from "@/components/admin/LiveStreamsAdmin";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  created_at: string;
}
interface RoleRow { user_id: string; role: string; }
interface EventRow { id: string; user_id: string; event: string; meta: any; created_at: string; }

interface Props { onBack: () => void; }

const AdminPanel = ({ onBack }: Props) => {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [tab, setTab] = useState<"users" | "admins" | "events" | "streams">("users");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      (supabase as any).from("profiles").select("id,display_name,avatar_url,preferred_language,created_at").order("created_at", { ascending: false }).limit(500),
      (supabase as any).from("user_roles").select("user_id, role"),
      (supabase as any).from("user_events").select("*").order("created_at", { ascending: false }).limit(200),
    ]).then(([p, r, e]: any[]) => {
      setProfiles(p.data || []);
      setRoles(r.data || []);
      setEvents(e.data || []);
      setLoading(false);
    });
  }, [isAdmin]);

  if (roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
      <Shield className="w-12 h-12 text-destructive" />
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="text-sm text-muted-foreground">You do not have permission to view the admin panel.</p>
      <Button onClick={onBack}>Go back</Button>
    </div>
  );

  const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id));
  const filteredProfiles = profiles.filter((p) =>
    !q || (p.display_name || "").toLowerCase().includes(q.toLowerCase()) || p.id.includes(q),
  );
  const adminProfiles = filteredProfiles.filter((p) => adminIds.has(p.id));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="font-semibold">Admin Panel</h1>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Users className="w-4 h-4" />} label="Users" value={profiles.length} />
          <Stat icon={<Crown className="w-4 h-4" />} label="Admins" value={adminIds.size} />
          <Stat icon={<Activity className="w-4 h-4" />} label="Recent events" value={events.length} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(["users", "admins", "events", "streams"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {k}
            </button>
          ))}
        </div>

        {tab !== "events" && tab !== "streams" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or id"
              className="w-full h-11 pl-10 pr-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}

        {loading && tab !== "streams" && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}

        {tab === "streams" && <LiveStreamsAdmin />}

        {!loading && tab === "users" && (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border bg-card">
            {filteredProfiles.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users</p>}
            {filteredProfiles.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold shrink-0">
                  {(p.display_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.display_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.id}</p>
                </div>
                {adminIds.has(p.id) && <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-primary/15 text-primary font-semibold">Admin</span>}
                <span className="text-xs text-muted-foreground hidden sm:inline">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "admins" && (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border bg-card">
            {adminProfiles.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No admins</p>}
            {adminProfiles.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <Crown className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.display_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "events" && (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border bg-card max-h-[60vh] overflow-y-auto">
            {events.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No events yet</p>}
            {events.map((e) => (
              <div key={e.id} className="px-4 py-2.5 text-xs flex items-start gap-3">
                <span className="font-mono text-primary shrink-0">{e.event}</span>
                <span className="text-muted-foreground truncate flex-1">{e.user_id.slice(0, 8)}…</span>
                <span className="text-muted-foreground shrink-0">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

export default AdminPanel;