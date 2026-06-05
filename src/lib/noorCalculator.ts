export interface NoorStats {
  daysActive: number;
  ayahsRead: number;
  recitationsCompleted: number;
  familyGoalsMet: number;
  currentStreak: number;
  longestStreak: number;
}

export function calculateNoor(stats: NoorStats): number {
  let noor = 0;
  noor += Math.min(stats.daysActive, 30);
  noor += Math.min(Math.floor(stats.ayahsRead / 10), 20);
  noor += Math.min(stats.recitationsCompleted * 3, 15);
  noor += Math.min(stats.familyGoalsMet * 5, 20);
  if (stats.currentStreak >= 7) noor += 5;
  if (stats.currentStreak >= 30) noor += 10;
  return Math.min(noor, 100);
}

export function noorVerse(score: number): { text: string; ref: string } {
  if (score >= 80) return { text: "MashaAllah, radiant!", ref: "Your consistency is a sadaqah jariyah." };
  if (score >= 60) return { text: "A beacon of guidance", ref: "You are building a legacy of light." };
  if (score >= 40) return { text: "Noor fills the heart", ref: "Your dedication inspires those around you." };
  if (score >= 20) return { text: "The light grows", ref: "Consistency is the key to barakah." };
  return { text: "Begin with Bismillah", ref: "Every journey starts with a single step." };
}