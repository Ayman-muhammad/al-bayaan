import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "al-bayani-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 2; // 2 days
const FIRST_SEEN_KEY = "al-bayani-first-seen";

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

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    // First-visit fast prompt (works for browsers that already fired BIP before our listener ran)
    const firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
    if (!firstSeen) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      // Open prompt sooner on first visit
      setTimeout(() => setShow(true), 800);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setTimeout(() => setShow(true), 600);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari has no beforeinstallprompt — show manual hint quickly
    if (isIOS()) {
      const t = setTimeout(() => {
        setIosHint(true);
        setShow(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!bip) return;
    await bip.prompt();
    const choice = await bip.userChoice;
    if (choice.outcome === "accepted") {
      setShow(false);
    } else {
      close();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-md animate-slide-up">
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