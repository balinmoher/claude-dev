import type { JournalEntry, WeeklyReport } from './types';

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

export function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

export function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getWeekId(date: Date): string {
  const monday = getMonday(date);
  const year = monday.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((monday.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

export function computeStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;

  const dates = new Set(entries.map(e => e.date));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = dateToStr(d);
    if (dates.has(ds)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function generateWeeklyReport(entries: JournalEntry[], weekDate: Date): WeeklyReport {
  const monday = getMonday(weekDate);
  const sunday = getSunday(monday);
  const weekStart = dateToStr(monday);
  const weekEnd = dateToStr(sunday);
  const id = getWeekId(weekDate);

  const weekEntries = entries.filter(e => e.date >= weekStart && e.date <= weekEnd);

  const count = weekEntries.length;
  const avgMood = count ? weekEntries.reduce((s, e) => s + e.mood, 0) / count : 0;
  const avgEnergy = count ? weekEntries.reduce((s, e) => s + e.energy, 0) / count : 0;
  const avgStress = count ? weekEntries.reduce((s, e) => s + e.stress, 0) / count : 0;

  let bestDay: WeeklyReport['bestDay'] = null;
  let worstDay: WeeklyReport['worstDay'] = null;

  for (const e of weekEntries) {
    const score = e.mood + e.energy - e.stress;
    if (!bestDay || score > bestDay.score) {
      bestDay = { date: e.date, score };
    }
    if (!worstDay || score < worstDay.score) {
      worstDay = { date: e.date, score };
    }
  }

  // Extract themes from tags
  const tagCounts = new Map<string, number>();
  for (const e of weekEntries) {
    for (const t of e.tags) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }
  const themes = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // Find wins (high mood+energy days)
  const wins = weekEntries
    .filter(e => e.mood >= 7 && e.energy >= 6)
    .map(e => `${formatDate(e.date)}: Mood ${e.mood}/10, Energy ${e.energy}/10`);

  // Find stressors (high stress days)
  const stressors = weekEntries
    .filter(e => e.stress >= 7)
    .map(e => `${formatDate(e.date)}: Stress ${e.stress}/10`);

  // Compute streak as of week end
  const allDates = new Set(entries.map(e => e.date));
  let streak = 0;
  const sundayDate = new Date(weekEnd + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    const d = new Date(sundayDate);
    d.setDate(d.getDate() - i);
    if (allDates.has(dateToStr(d))) {
      streak++;
    } else {
      break;
    }
  }

  return {
    id,
    weekStart,
    weekEnd,
    entries: count,
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    avgStress: Math.round(avgStress * 10) / 10,
    bestDay,
    worstDay,
    themes,
    wins,
    stressors,
    streak,
    createdAt: Date.now(),
  };
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateToStr(d);
}
