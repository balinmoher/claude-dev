export interface JournalEntry {
  date: string; // YYYY-MM-DD, primary key
  brainDump: string;
  mood: number; // 0-10
  energy: number; // 0-10
  stress: number; // 0-10
  gratitude: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WeeklyReport {
  id: string; // YYYY-Www (e.g. "2026-W07")
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  entries: number;
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
  themes: string[];
  wins: string[];
  stressors: string[];
  streak: number;
  createdAt: number;
}
