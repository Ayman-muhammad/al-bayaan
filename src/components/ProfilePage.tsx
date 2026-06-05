import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, LogOut, Pencil, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NoorMeter from "./NoorMeter";
import { calculateNoor, noorVerse, NoorStats } from "@/lib/noorCalculator";
import { track } from "@/lib/telemetry";

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  created_at: string;
}

interface Props {
  onBack: () => void;
}

const DEFAULT_STATS: NoorStats = {
  daysActive: 1,
  ayahsRead: 0,
  recitationsCompleted: 0,
  familyGoalsMet: 0,
  currentStreak: 1,
  longestStreak: 1,
};

const ProfilePage = ({ onBack }: Props) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stats, setStats] = useState<NoorStats>(DEFAULT_STATS);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const noor = calculateNoor(stats);
  const verse = noorVerse(noor);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    load();
    track("profile_view");
  }, [user]);

  const refreshAvatar = async (path: string | null) => {
    if (!path) {
      setAvatarSrc(null);
      return;
    }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24);
    setAvatarSrc(data?.signedUrl ?? null);
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      let row = p as ProfileRow | null;
      if (!row) {
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            display_name: (user.user_metadata as any)?.full_name || user.email,
            email: user.email,
          })
          .select()
          .maybeSingle();
        row = inserted as ProfileRow | null;
      }
      setProfile(row);
      await refreshAvatar(row?.avatar_url ?? null);

      if (s) {
        setStats({
          daysActive: s.days_active,
          ayahsRead: s.ayahs_read,
          recitationsCompleted: s.recitations_completed,
          familyGoalsMet: s.family_goals_met,
          currentStreak: s.current_streak,
          longestStreak: s.longest_streak,
        });
      } else {
        await supabase.from("user_stats").insert({ user_id: user.id });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't load your profile");
    } finally {
      setLoading(false);
    }
  };

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setProfile((p) => (p ? { ...p, avatar_url: path } : p));
      await refreshAvatar(path);
      toast.success("Photo updated");
      track("profile_avatar_update");
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = () => {
    setEditName(profile?.display_name || "");
    setEditBio(profile?.bio || "");
    setEditing(true);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: editName.trim(), bio: editBio.trim() })
        .eq("id", user.id);
      if (error) throw error;
      setProfile((p) =>
        p ? { ...p, display_name: editName.trim(), bio: editBio.trim() } : p,
      );
      setEditing(false);
      toast.success("Profile saved");
      track("profile_update");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const doSignOut = async () => {
    if (!confirm("Sign out of Al-Bayan?")) return;
    track("auth_signout");
    await signOut();
    onBack();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <User className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sign in to view your profile</p>
        <Button onClick={onBack}>Go back</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  const initial = (profile?.display_name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 bg-card/85 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto h-14 px-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold">Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-8">
        {/* Noor Meter */}
        <section className="flex flex-col items-center gap-3 py-2">
          <NoorMeter score={noor} />
          <div className="text-center px-4 max-w-sm">
            <p className="text-sm font-semibold text-gold">{verse.text}</p>
            <p className="text-xs text-muted-foreground mt-1">{verse.ref}</p>
          </div>
        </section>

        {/* Avatar + Name */}
        <section className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-2 border-gold/40">
              {avatarSrc && <AvatarImage src={avatarSrc} alt="Avatar" />}
              <AvatarFallback className="text-2xl font-bold text-gold bg-muted">
                {initial}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={onPickAvatar}
              disabled={uploading}
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gold text-gold-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
          </div>

          {editing ? (
            <div className="w-full max-w-sm space-y-3">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
                className="h-12 text-base"
              />
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="A short bio…"
                maxLength={160}
                rows={3}
                className="text-base"
              />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold">{profile?.display_name || "Believer"}</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startEdit} aria-label="Edit profile">
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {profile?.bio || "Seeking knowledge and light"}
              </p>
              {profile?.created_at && (
                <p className="text-xs text-muted-foreground/70">
                  Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { v: stats.daysActive, l: "Days Active" },
            { v: stats.ayahsRead, l: "Ayahs Read" },
            { v: stats.recitationsCompleted, l: "Recitations" },
            { v: stats.familyGoalsMet, l: "Family Goals" },
            { v: stats.currentStreak, l: "Current Streak", highlight: true },
            { v: stats.longestStreak, l: "Best Streak" },
          ].map((s) => (
            <div
              key={s.l}
              className={`rounded-2xl p-3 text-center border ${
                s.highlight
                  ? "bg-gold/10 border-gold/30"
                  : "bg-card border-border"
              }`}
            >
              <div className="text-2xl font-bold text-gold leading-none">{s.v}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
                {s.l}
              </div>
            </div>
          ))}
        </section>

        {/* Reflection */}
        <section className="rounded-2xl p-5 bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20">
          <h3 className="text-sm font-semibold mb-2">This Week's Reflection</h3>
          <p className="text-sm leading-relaxed">
            {noor > 50
              ? "Your Noor shines bright. Consistency in seeking knowledge is the path to barakah."
              : noor > 20
              ? "Every step toward the Quran is a step toward light. Keep going."
              : "Begin with Bismillah. Even one ayah today is a seed of Noor."}
          </p>
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm italic text-muted-foreground">
              "Indeed, Allah is with those who fear Him and those who are doers of good."
            </p>
            <p className="text-xs text-gold mt-1">— An-Nahl 16:128</p>
          </div>
        </section>

        {/* Sign out */}
        <section>
          <Button
            variant="outline"
            className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            onClick={doSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;