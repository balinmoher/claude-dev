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

// AI feature types

export type AIOutputType =
  | 'reflect'
  | 'name-the-day'
  | 'coach'
  | 'extract-actions'
  | 'ask'
  | 'weekly-insight'
  | 'weekly-compare'
  | 'weekly-experiments';

export interface AIOutput {
  id: string; // "type:date" or "type:weekId" or "ask:date:timestamp"
  type: AIOutputType;
  sourceKey: string; // date (YYYY-MM-DD) or weekId (YYYY-Www)
  content: string;
  query?: string; // for "ask" type
  createdAt: number;
}

export interface AISettings {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
  baseUrl?: string;
}
