import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Mail, Lock, User, ArrowLeft, Phone, KeyRound } from "lucide-react";

interface AuthPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

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
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    try {
      const formatted = phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
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
      const formatted = phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;
      const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: "sms" });
      if (error) throw error;
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className={`font-semibold text-foreground ${isAr ? "font-arabic" : ""}`}>
          {mode === "signin" ? t("signIn") : t("signUp")}
        </h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gradient-gold font-arabic">البيان</h2>
            <p className={`text-sm text-muted-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "دليلك إلى المعرفة الإسلامية" : "Your Guide to Islamic Knowledge"}
            </p>
          </div>

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

          {tab === "email" && (
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full h-12" disabled={loading}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                mode === "signin" ? t("signIn") : t("signUp")
              )}
            </Button>
          </form>
          )}

          {tab === "phone" && (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  required
                  disabled={otpSent}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
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
                  ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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

export default AuthPage;
