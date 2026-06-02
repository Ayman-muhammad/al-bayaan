import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Mail, Lock, User, ArrowLeft, Phone, KeyRound, Eye, EyeOff, UserCircle2, Apple, Sparkles, Shield, Heart, TrendingUp, WifiOff } from "lucide-react";
import { authFlow } from "@/lib/authFlow";
import { track } from "@/lib/telemetry";

interface AuthPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+252", flag: "🇸🇴", name: "Somalia" },
  { code: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
];

const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["bg-destructive", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-emerald-500", "bg-emerald-600"];
  return { score: s, label: labels[s], color: colors[s] };
};

const detectPlatform = (): "ios" | "android" | "desktop" => {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
};

const AuthPage = ({ onBack, onSuccess }: AuthPageProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const submitLockRef = useRef(false);

  // Auto-suggest preferred method
  useEffect(() => {
    const platform = detectPlatform();
    // Try to set sensible defaults — we don't have apple tab so keep email
    if (platform === "android") setTab("email");
    track("auth_view", { mode, tab });
  }, []);

  // Network awareness — Tecno spark on 2G drops constantly
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Auto-scroll focused input above mobile keyboard
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el || !(el.matches?.("input,select,textarea"))) return;
      setTimeout(() => {
        try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
      }, 280);
    };
    document.addEventListener("focusin", handler);
    return () => document.removeEventListener("focusin", handler);
  }, []);

  const guard = async (label: string, fn: () => Promise<void>) => {
    if (submitLockRef.current) { track("auth_double_submit_blocked", { label }); return; }
    submitLockRef.current = true;
    setLoading(true);
    try { await fn(); } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  const buzz = () => { try { navigator.vibrate?.(80); } catch {} };

  const handleGoogleSignIn = async () => {
    await guard("google", async () => {
      track("auth_oauth_start", { provider: "google" });
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        track("auth_error", { method: "google", msg: String(result.error).slice(0, 120) });
        toast({ title: "Error", description: String(result.error), variant: "destructive" });
        buzz();
        return;
      }
      if (result.redirected) { track("auth_oauth_redirect", { provider: "google" }); return; }
      track("auth_success", { method: "google" });
      onSuccess();
    });
  };

  const handleAppleSignIn = async () => {
    await guard("apple", async () => {
      track("auth_oauth_start", { provider: "apple" });
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        track("auth_error", { method: "apple", msg: String(result.error).slice(0, 120) });
        toast({ title: "Error", description: String(result.error), variant: "destructive" });
        buzz();
        return;
      }
      if (result.redirected) { track("auth_oauth_redirect", { provider: "apple" }); return; }
      track("auth_success", { method: "apple" });
      onSuccess();
    });
  };

  const handleGuest = async () => {
    await guard("guest", async () => {
      const res = await authFlow.guest(isAr);
      if (!res.ok) { toast({ title: isAr ? "خطأ" : "Oops", description: res.error, variant: "destructive" }); buzz(); return; }
      toast({
        title: isAr ? "أهلاً بك" : "Welcome!",
        description: isAr ? "تم الدخول كضيف. يمكنك الترقية لاحقاً" : "Signed in as guest. Upgrade anytime.",
      });
      onSuccess();
    });
  };

  const handleForgot = async () => {
    if (!email) {
      toast({ title: isAr ? "أدخل البريد" : "Enter your email first", variant: "destructive" });
      return;
    }
    await guard("forgot", async () => {
      const res = await authFlow.resetPassword(email, isAr);
      if (!res.ok) { toast({ title: isAr ? "خطأ" : "Oops", description: res.error, variant: "destructive" }); buzz(); return; }
      toast({
        title: isAr ? "تم الإرسال" : "Check your email",
        description: isAr ? "أرسلنا لك رابط إعادة تعيين كلمة المرور" : "We sent a password reset link",
      });
      setForgotMode(false);
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      toast({ title: isAr ? "خطأ" : "Oops", description: isAr ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters", variant: "destructive" });
      buzz();
      return;
    }
    track("auth_submit", { mode, tab: "email" });
    await guard("email", async () => {
      const res = mode === "signup"
        ? await authFlow.signUp(email, password, name, isAr)
        : await authFlow.signIn(email, password, isAr);
      if (!res.ok) { toast({ title: isAr ? "خطأ" : "Oops", description: res.error, variant: "destructive" }); buzz(); return; }
      if (mode === "signup") toast({ title: isAr ? "أهلاً بك" : "Welcome!", description: isAr ? "تم إنشاء حسابك" : "Account created" });
      onSuccess();
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    // Rate limit: 1 per 60 seconds
    const lastSent = Number(localStorage.getItem("otp-last-sent") || 0);
    if (Date.now() - lastSent < 60_000) {
      const wait = Math.ceil((60_000 - (Date.now() - lastSent)) / 1000);
      toast({ title: isAr ? "انتظر" : "Please wait", description: isAr ? `حاول بعد ${wait} ثانية` : `Try again in ${wait}s`, variant: "destructive" });
      return;
    }
    track("auth_submit", { mode, tab: "phone" });
    await guard("otp_send", async () => {
      const formatted = `${countryCode}${phone.replace(/\D/g, "")}`;
      const res = await authFlow.sendOtp(formatted, isAr);
      if (!res.ok) { toast({ title: isAr ? "خطأ" : "Oops", description: res.error, variant: "destructive" }); buzz(); return; }
      localStorage.setItem("otp-last-sent", String(Date.now()));
      setOtpSent(true);
      toast({ title: isAr ? "تم الإرسال" : "Code Sent", description: isAr ? "أدخل الرمز المرسل" : "Enter the code we sent" });
    });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    await guard("otp_verify", async () => {
      const formatted = `${countryCode}${phone.replace(/\D/g, "")}`;
      const res = await authFlow.verifyOtp(formatted, otp, isAr);
      if (!res.ok) { toast({ title: isAr ? "خطأ" : "Oops", description: res.error, variant: "destructive" }); buzz(); return; }
      onSuccess();
    });
  };

  const pwStrength = passwordStrength(password);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" dir={isAr ? "rtl" : "ltr"} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {!online && (
        <div role="status" className="bg-destructive text-destructive-foreground text-xs px-3 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          {isAr ? "أنت غير متصل. سنحاول مرة أخرى عند عودة الاتصال" : "You're offline. We'll retry when you're back online."}
        </div>
      )}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-12 w-12">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {mode === "signin" ? t("signIn") : t("signUp")}
        </h1>
      </header>

      <div className="flex-1 flex items-start sm:items-center justify-center p-4 pt-6">
        <div className="w-full max-w-md space-y-5">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg glow-gold">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-gradient-gold font-arabic">البيان</h2>
            <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "دليلك إلى المعرفة الإسلامية" : "Your Guide to Islamic Knowledge"}
            </p>
          </div>

          {/* Why create account benefits */}
          {mode === "signup" && (
            <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-primary/5 to-accent/5 p-3 space-y-1.5">
              <p className={`text-xs font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "لماذا تنشئ حساباً؟" : "Why create an account?"}
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-primary" />{isAr ? "حفظ التقدم" : "Sync progress"}</div>
                <div className="flex items-center gap-1"><Heart className="w-3 h-3 text-primary" />{isAr ? "المفضلة" : "Favorites"}</div>
                <div className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" />{isAr ? "حماية السلسلة" : "Streak backup"}</div>
                <div className="flex items-center gap-1"><Shield className="w-3 h-3 text-primary" />{isAr ? "تشفير البيانات" : "Encrypted"}</div>
              </div>
            </div>
          )}

          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full gap-2 h-14 text-base"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("continueWithGoogle")}
          </Button>

          <Button variant="outline" className="w-full gap-2 h-14 text-base bg-foreground text-background hover:bg-foreground/90" onClick={handleAppleSignIn} disabled={loading}>
            <Apple className="w-5 h-5" />
            {isAr ? "المتابعة مع Apple" : "Continue with Apple"}
          </Button>

          <Button variant="ghost" className="w-full gap-2 h-12 border border-dashed border-border" onClick={handleGuest} disabled={loading}>
            <UserCircle2 className="w-4 h-4" />
            {isAr ? "متابعة بدون حساب" : "Continue as Guest"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t("orContinueWith")}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "email"}
              onClick={() => { setTab("email"); track("auth_view", { tab: "email" }); }}
              className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${tab === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Mail className="w-4 h-4 inline mr-1" /> {isAr ? "البريد" : "Email"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "phone"}
              onClick={() => { setTab("phone"); track("auth_view", { tab: "phone" }); }}
              className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${tab === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Phone className="w-4 h-4 inline mr-1" /> {isAr ? "الهاتف" : "Phone"}
            </button>
          </div>

          {tab === "email" && !forgotMode && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isAr ? "الاسم" : "Full Name"}
                  className="w-full h-14 pl-10 pr-4 bg-background border border-border rounded-xl text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email")}
                required
                className="w-full h-14 pl-10 pr-4 bg-background border border-border rounded-xl text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
                required
                minLength={6}
                className="w-full h-14 pl-10 pr-12 bg-background border border-border rounded-xl text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label="toggle password" className="absolute right-1 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {mode === "signup" && password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 h-1.5">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className={`flex-1 rounded-full ${i <= pwStrength.score ? pwStrength.color : "bg-muted"}`} />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{pwStrength.label}</p>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} className="rounded border-border accent-primary" />
              {isAr ? "ثق بهذا الجهاز لمدة 30 يوماً" : "Trust this device for 30 days"}
            </label>

            <Button type="submit" variant="hero" className="w-full h-14 text-base active:scale-[0.98] transition-transform" disabled={loading || !online}>
              {loading ? (
                <CrescentSpinner />
              ) : (
                mode === "signin" ? t("signIn") : t("signUp")
              )}
            </Button>

            {mode === "signin" && (
              <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline w-full text-center">
                {isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}
              </button>
            )}
          </form>
          )}

          {tab === "email" && forgotMode && (
            <div className="space-y-4">
              <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
                {isAr ? "أدخل بريدك لإرسال رابط إعادة التعيين" : "Enter your email to receive a reset link"}
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} className="w-full h-14 pl-10 pr-4 bg-background border border-border rounded-xl text-base" />
              </div>
              <Button onClick={handleForgot} variant="hero" className="w-full h-14 text-base" disabled={loading || !online}>
                {loading ? <CrescentSpinner /> : (isAr ? "إرسال الرابط" : "Send reset link")}
              </Button>
              <button onClick={() => setForgotMode(false)} className="text-xs text-muted-foreground w-full text-center">
                {isAr ? "رجوع" : "Back"}
              </button>
            </div>
          )}

          {tab === "phone" && (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={otpSent}
                  className="h-14 px-2 bg-background border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="send"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="555 123 4567"
                  required
                  disabled={otpSent}
                  className="w-full h-14 pl-10 pr-4 bg-background border border-border rounded-xl text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                </div>
              </div>
              {otpSent && (
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    enterKeyHint="go"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder={isAr ? "رمز التحقق" : "6-digit code"}
                    required
                    maxLength={6}
                    className="w-full h-14 pl-10 pr-4 bg-background border border-border rounded-xl text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring tracking-[0.5em] text-center"
                  />
                </div>
              )}
              <Button type="submit" variant="hero" className="w-full h-14 text-base active:scale-[0.98] transition-transform" disabled={loading || !online}>
                {loading
                  ? <CrescentSpinner />
                  : otpSent ? (isAr ? "تأكيد" : "Verify") : (isAr ? "إرسال الرمز" : "Send Code")}
              </Button>
              {otpSent && (
                <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                  {isAr ? "تغيير الرقم" : "Change number"}
                </button>
              )}
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? t("noAccount") : t("haveAccount")}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? t("signUp") : t("signIn")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const CrescentSpinner = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <path d="M20 12a8 8 0 1 1-8-8 6 6 0 0 0 8 8z" fill="currentColor" />
  </svg>
);

export default AuthPage;
