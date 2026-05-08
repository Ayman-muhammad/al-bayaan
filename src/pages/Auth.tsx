import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Mail, Lock, User, ArrowLeft, Phone, KeyRound, Eye, EyeOff, UserCircle2, Apple, Sparkles, Shield, Heart, TrendingUp } from "lucide-react";

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

  // Auto-suggest preferred method
  useEffect(() => {
    const platform = detectPlatform();
    // Try to set sensible defaults — we don't have apple tab so keep email
    if (platform === "android") setTab("email");
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Error", description: String(result.error), variant: "destructive" });
      }
      if (result.redirected) return;
      onSuccess();
    } catch (e) {
      toast({ title: "Error", description: "Failed to sign in with Google", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Error", description: String(result.error), variant: "destructive" });
      }
      if (result.redirected) return;
      onSuccess();
    } catch (e) {
      toast({ title: "Error", description: "Failed to sign in with Apple", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      localStorage.setItem("al-bayan-guest", "1");
      toast({
        title: isAr ? "أهلاً بك" : "Welcome!",
        description: isAr ? "تم الدخول كضيف. يمكنك الترقية لاحقاً" : "Signed in as guest. Upgrade anytime.",
      });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Guest sign-in failed", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!email) {
      toast({ title: isAr ? "أدخل البريد" : "Enter your email first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      toast({
        title: isAr ? "تم الإرسال" : "Check your email",
        description: isAr ? "أرسلنا لك رابط إعادة تعيين كلمة المرور" : "We sent a password reset link",
      });
      setForgotMode(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name || email },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Auto-confirm enabled — try immediate sign-in
        await supabase.auth.signInWithPassword({ email, password });
        toast({
          title: isAr ? "أهلاً بك" : "Welcome!",
          description: isAr ? "تم إنشاء حسابك بنجاح" : "Account created successfully",
        });
        onSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      }
    } catch (error: any) {
      const msg = error.message || "";
      const friendly = msg.toLowerCase().includes("invalid")
        ? (isAr ? "بيانات الدخول غير صحيحة" : "Email or password is incorrect")
        : msg.toLowerCase().includes("already")
          ? (isAr ? "الحساب موجود بالفعل، حاول تسجيل الدخول" : "Account already exists. Try signing in.")
          : msg;
      toast({ title: isAr ? "خطأ" : "Oops", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    try {
      const formatted = `${countryCode}${phone.replace(/\D/g, "")}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
      localStorage.setItem("otp-last-sent", String(Date.now()));
      setOtpSent(true);
      toast({ title: isAr ? "تم الإرسال" : "Code Sent", description: isAr ? "أدخل الرمز المرسل" : "Enter the code we sent" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    try {
      const formatted = `${countryCode}${phone.replace(/\D/g, "")}`;
      const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: "sms" });
      if (error) throw error;
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const pwStrength = passwordStrength(password);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {mode === "signin" ? t("signIn") : t("signUp")}
        </h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
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
            className="w-full gap-2 h-12"
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

          <Button variant="outline" className="w-full gap-2 h-12 bg-foreground text-background hover:bg-foreground/90" onClick={handleAppleSignIn} disabled={loading}>
            <Apple className="w-5 h-5" />
            {isAr ? "المتابعة مع Apple" : "Continue with Apple"}
          </Button>

          <Button variant="ghost" className="w-full gap-2 h-11 border border-dashed border-border" onClick={handleGuest} disabled={loading}>
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
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${tab === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Mail className="w-3.5 h-3.5 inline mr-1" /> {isAr ? "البريد" : "Email"}
            </button>
            <button
              type="button"
              onClick={() => setTab("phone")}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${tab === "phone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Phone className="w-3.5 h-3.5 inline mr-1" /> {isAr ? "الهاتف" : "Phone"}
            </button>
          </div>

          {tab === "email" && !forgotMode && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isAr ? "الاسم" : "Full Name"}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email")}
                required
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label="toggle password" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

            <Button type="submit" variant="hero" className="w-full h-12" disabled={loading}>
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
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm" />
              </div>
              <Button onClick={handleForgot} variant="hero" className="w-full h-12" disabled={loading}>
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
                  className="px-2 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="555 123 4567"
                  required
                  disabled={otpSent}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                </div>
              </div>
              {otpSent && (
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder={isAr ? "رمز التحقق" : "6-digit code"}
                    required
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring tracking-widest"
                  />
                </div>
              )}
              <Button type="submit" variant="hero" className="w-full h-12" disabled={loading}>
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
