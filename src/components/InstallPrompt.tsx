import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Sparkles, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Engagement-gated install prompt — senior-grade UX.
// Rules:
//   • Never show in standalone mode or after install.
//   • Show on 2nd visit OR after 30s of engaged use on 1st visit.
//   • Max 3 dismissals lifetime, then never again.
//   • Respects 2-day cooldown between prompts.
const DISMISS_AT_KEY = "al-bayani-install-dismissed-at";
const DISMISS_COUNT_KEY = "al-bayani-install-dismiss-count";
const VISIT_COUNT_KEY = "al-bayani-visit-count";
const INSTALLED_KEY = "al-bayani-installed";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 2; // 2 days
const MAX_DISMISSALS = 3;
const ENGAGEMENT_DELAY_MS = 30_000;

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  // iOS
  // @ts-ignore
  window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const InstallPrompt = () => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    // Already installed previously
    if (localStorage.getItem(INSTALLED_KEY) === "1" || isStandalone()) {
      setInstalled(true);
      return;
    }

    // Track visit count
    const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visits));

    // Lifetime dismissal cap
    const dismissCount = Number(localStorage.getItem(DISMISS_COUNT_KEY) || 0);
    if (dismissCount >= MAX_DISMISSALS) return;

    // Cooldown between prompts
    const dismissedAt = Number(localStorage.getItem(DISMISS_AT_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    const scheduleReveal = () => {
      // Returning visitor (2nd+) → reveal quickly; first-timer → after engagement
      const delay = visits >= 2 ? 1500 : ENGAGEMENT_DELAY_MS;
      timersRef.current.push(window.setTimeout(() => setShow(true), delay));
    };

    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      scheduleReveal();
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setInstalled(true);
      setShow(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari: no BIP, surface the manual Share → Add to Home Screen hint
    if (isIOS()) {
      const delay = visits >= 2 ? 2000 : ENGAGEMENT_DELAY_MS;
      timersRef.current.push(
        window.setTimeout(() => {
          setIosHint(true);
          setShow(true);
        }, delay),
      );
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem(DISMISS_AT_KEY, String(Date.now()));
    const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) || 0) + 1;
    localStorage.setItem(DISMISS_COUNT_KEY, String(count));
  };

  const install = async () => {
    if (!bip) return;
    await bip.prompt();
    const choice = await bip.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
      setInstalled(true);
      setShow(false);
    } else {
      close();
    }
  };

  // Once installed, show a subtle confirmation pill once, then nothing
  if (installed) {
    const seen = sessionStorage.getItem("al-bayani-installed-ack");
    if (seen) return null;
    sessionStorage.setItem("al-bayani-installed-ack", "1");
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-slide-up"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 rounded-full bg-primary/95 text-primary-foreground px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur">
          <CheckCircle2 className="w-4 h-4" />
          {isAr ? "تم التثبيت ✓" : "Installed ✓"}
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[92vw] max-w-md animate-slide-up pointer-events-auto">
      <div className="relative rounded-2xl border border-accent/30 bg-card/95 backdrop-blur-md shadow-2xl p-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent pointer-events-none" />
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold text-foreground ${isAr ? "font-arabic" : ""}`}>
              {isAr ? "ثبّت تطبيق البياني لتجربة أفضل" : "Install Al-Bayani for the best experience"}
            </h3>
            <p className={`text-xs text-muted-foreground mt-1 ${isAr ? "font-arabic" : ""}`}>
              {iosHint
                ? isAr
                  ? "اضغط على زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية»"
                  : "Tap Share, then 'Add to Home Screen'"
                : isAr
                ? "يعمل دون اتصال • تنبيهات الصلاة • تشغيل أسرع"
                : "Works offline • Prayer alerts • Faster launch"}
            </p>
            <div className="flex gap-2 mt-3">
              {iosHint ? (
                <Button size="sm" variant="hero" onClick={close} className="gap-1.5">
                  <Share className="w-3.5 h-3.5" />
                  {isAr ? "حسناً" : "Got it"}
                </Button>
              ) : (
                <Button size="sm" variant="hero" onClick={install} className="gap-1.5" disabled={!bip}>
                  <Download className="w-3.5 h-3.5" />
                  {isAr ? "ثبّت الآن" : "Install"}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={close}>
                {isAr ? "لاحقاً" : "Later"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;