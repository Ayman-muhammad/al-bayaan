// Unique Adhan-inspired notification chime synthesized with Web Audio API.
// Distinct from system alerts: a gentle 3-note ascending crescent tone
// (D5 → A5 → F5) with shimmer harmonics. Auto-enabled on first interaction.

const NOTIF_KEY = "al-bayan-notif-enabled";

export const isNotifEnabled = () => localStorage.getItem(NOTIF_KEY) !== "0";
export const setNotifEnabled = (v: boolean) => localStorage.setItem(NOTIF_KEY, v ? "1" : "0");

let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

const playTone = (
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.18,
) => {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ac.destination);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

/** Al-Bayan signature chime: 3 ascending notes + shimmer harmonic. */
export const playSignatureChime = () => {
  if (!isNotifEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  // Base melody — D5, A5, F5 (warm, distinct from any default alert)
  playTone(ac, 587.33, t, 0.35, "sine", 0.22);
  playTone(ac, 880.00, t + 0.18, 0.45, "sine", 0.20);
  playTone(ac, 698.46, t + 0.42, 0.65, "triangle", 0.18);
  // Shimmer harmonic an octave up
  playTone(ac, 1760.0, t + 0.42, 0.45, "sine", 0.06);
  // Soft sustaining drone
  playTone(ac, 293.66, t, 0.9, "sine", 0.05);
};

/** Auto-arm chime on first user interaction — ensures audio policy unlocks. */
export const armChimeOnFirstInteraction = () => {
  const handler = () => {
    getCtx();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
};

/** Request OS notification permission silently if not yet decided. */
export const requestNotifPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    try { return await Notification.requestPermission(); } catch { return "denied"; }
  }
  return Notification.permission;
};

/** Show OS notification + play signature chime. */
export const notifyUser = (title: string, body: string) => {
  if (!isNotifEnabled()) return;
  playSignatureChime();
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", silent: true });
    } catch { /* noop */ }
  }
};