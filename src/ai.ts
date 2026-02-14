import type { JournalEntry, WeeklyReport, AISettings, AIOutput, AIOutputType } from './types';
import { saveAIOutput } from './db';
import { formatDate } from './utils';

// --- Settings (stored in localStorage) ---

export function getAISettings(): AISettings | null {
  const raw = localStorage.getItem('ai-settings');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem('ai-settings', JSON.stringify(settings));
}

export function hasApiKey(): boolean {
  const s = getAISettings();
  return !!(s?.apiKey);
}

// --- LLM call ---

async function callLLM(system: string, user: string): Promise<string> {
  const settings = getAISettings();
  if (!settings?.apiKey) {
    throw new Error('No API key configured. Go to Settings to add one.');
  }

  if (settings.provider === 'anthropic') {
    const url = (settings.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
    const res = await fetch(`${url}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model || 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.content[0].text;
  } else {
    // OpenAI-compatible
    const url = (settings.baseUrl || 'https://api.openai.com').replace(/\/$/, '');
    const res = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }
}

// --- Serialization helpers ---

function serializeEntry(entry: JournalEntry): string {
  const parts = [
    `Date: ${entry.date}`,
    `Brain dump: ${entry.brainDump || '(empty)'}`,
    `Mood: ${entry.mood}/10`,
    `Energy: ${entry.energy}/10`,
    `Stress: ${entry.stress}/10`,
  ];
  if (entry.gratitude.length > 0) {
    parts.push(`Grateful for: ${entry.gratitude.join('; ')}`);
  }
  if (entry.tags.length > 0) {
    parts.push(`Tags: ${entry.tags.join(', ')}`);
  }
  return parts.join('\n');
}

function serializeWeekEntries(entries: JournalEntry[]): string {
  return entries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const lines = [
        `--- ${formatDate(e.date)} ---`,
        `Brain dump: ${e.brainDump || '(empty)'}`,
        `Mood: ${e.mood}/10 | Energy: ${e.energy}/10 | Stress: ${e.stress}/10`,
      ];
      if (e.gratitude.length > 0) lines.push(`Grateful for: ${e.gratitude.join('; ')}`);
      if (e.tags.length > 0) lines.push(`Tags: ${e.tags.join(', ')}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

function serializeReport(report: WeeklyReport): string {
  const lines = [
    `Week: ${report.weekStart} to ${report.weekEnd}`,
    `Entries: ${report.entries}`,
    `Averages — Mood: ${report.avgMood}, Energy: ${report.avgEnergy}, Stress: ${report.avgStress}`,
    `Best day: ${report.bestDay ? `${formatDate(report.bestDay.date)} (score ${report.bestDay.score})` : 'none'}`,
    `Worst day: ${report.worstDay ? `${formatDate(report.worstDay.date)} (score ${report.worstDay.score})` : 'none'}`,
    `Themes: ${report.themes.join(', ') || 'none'}`,
    `Streak: ${report.streak} days`,
  ];
  return lines.join('\n');
}

// --- Helper to create + save output ---

async function createOutput(
  type: AIOutputType,
  sourceKey: string,
  system: string,
  user: string,
  query?: string,
): Promise<AIOutput> {
  const content = await callLLM(system, user);
  const id = type === 'ask' ? `ask:${sourceKey}:${Date.now()}` : `${type}:${sourceKey}`;
  const output: AIOutput = {
    id,
    type,
    sourceKey,
    content,
    query,
    createdAt: Date.now(),
  };
  await saveAIOutput(output);
  return output;
}

// --- Daily entry AI actions ---

export async function aiReflect(entry: JournalEntry): Promise<AIOutput> {
  return createOutput(
    'reflect',
    entry.date,
    `You are a thoughtful, grounded journaling coach. Given a journal entry, produce a brief reflection covering:
- Key emotions you detect
- Themes present
- Wins (if any)
- Friction points (if any)
- One kind next step
- One question to think about

Be warm but concise. Use plain language. Keep it under 150 words. Do not use bullet headers like "Emotions:" — write in flowing short paragraphs.`,
    serializeEntry(entry),
  );
}

export async function aiNameTheDay(entry: JournalEntry): Promise<AIOutput> {
  return createOutput(
    'name-the-day',
    entry.date,
    `Given a journal entry, generate:
1. A short memorable title for the day (3-6 words)
2. Three suggested tags (lowercase, single words or short phrases)
3. A one-sentence summary

Respond ONLY with valid JSON, no markdown fences:
{"title": "...", "tags": ["...", "...", "..."], "summary": "..."}`,
    serializeEntry(entry),
  );
}

export async function aiCoach(entry: JournalEntry): Promise<AIOutput> {
  return createOutput(
    'coach',
    entry.date,
    `You are a practical life coach. Given a journal entry, identify ONE specific, actionable next step the person could take today. Not generic advice — reference what they actually wrote. Keep it to 2-3 sentences max.`,
    serializeEntry(entry),
  );
}

export async function aiExtractActions(entry: JournalEntry): Promise<AIOutput> {
  return createOutput(
    'extract-actions',
    entry.date,
    `Given a journal entry, extract any implied tasks, follow-ups, or action items. For each, give a brief description and rough priority (high/medium/low). If there are no clear actions, say so honestly. Format as a short bulleted list using "- " prefix. Keep it concise.`,
    serializeEntry(entry),
  );
}

export async function aiAskAboutEntry(
  entry: JournalEntry,
  question: string,
  recentEntries?: JournalEntry[],
): Promise<AIOutput> {
  let userContent = serializeEntry(entry);
  if (recentEntries && recentEntries.length > 0) {
    userContent += '\n\n--- Recent entries for context ---\n\n' + serializeWeekEntries(recentEntries);
  }
  userContent += `\n\nUser question: ${question}`;

  return createOutput(
    'ask',
    entry.date,
    `You are a thoughtful journaling companion. Answer the user's question about their journal entry. Be honest, insightful, and kind. If you see patterns or things they might be avoiding, gently point them out. Keep responses under 200 words.`,
    userContent,
    question,
  );
}

// --- Weekly report AI actions ---

export async function aiWeeklyInsight(
  report: WeeklyReport,
  entries: JournalEntry[],
): Promise<AIOutput> {
  const weekEntries = entries
    .filter(e => e.date >= report.weekStart && e.date <= report.weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  return createOutput(
    'weekly-insight',
    report.id,
    `You are a thoughtful life analyst. Given a week of journal entries and their aggregated stats, produce a narrative weekly "chapter" covering:

1. **Top themes** with evidence (which dates)
2. **Emotional arc** — how did the week start vs end? Was there a turning point day?
3. **Highlights and low points** — include tiny quotes from entries
4. **Patterns detected** — with a confidence qualifier (e.g. "seems like", "clearly")
5. **Gratitude signal** — what do they seem to value?
6. **2 suggested experiments** for next week, each with a concrete success metric

Keep the tone warm, grounded, and specific to what was actually written. About 250-300 words. Use short paragraphs, not bullet lists for the narrative parts. You can use bold for section headers.`,
    `Weekly stats:\n${serializeReport(report)}\n\nFull entries:\n${serializeWeekEntries(weekEntries)}`,
  );
}

export async function aiWeeklyCompare(
  thisWeek: WeeklyReport,
  lastWeek: WeeklyReport,
  thisWeekEntries: JournalEntry[],
  lastWeekEntries: JournalEntry[],
): Promise<AIOutput> {
  const thisEntries = thisWeekEntries.filter(e => e.date >= thisWeek.weekStart && e.date <= thisWeek.weekEnd);
  const lastEntries = lastWeekEntries.filter(e => e.date >= lastWeek.weekStart && e.date <= lastWeek.weekEnd);

  return createOutput(
    'weekly-compare',
    thisWeek.id,
    `Compare this week's journal data with last week's. Highlight:
- Changes in emotional arc (mood/energy/stress trends)
- New or disappearing themes
- Shifts in energy or stress patterns
- One key difference to pay attention to

Be specific with dates and numbers. Keep it under 150 words.`,
    `THIS WEEK:\nStats: ${serializeReport(thisWeek)}\nEntries:\n${serializeWeekEntries(thisEntries)}\n\nLAST WEEK:\nStats: ${serializeReport(lastWeek)}\nEntries:\n${serializeWeekEntries(lastEntries)}`,
  );
}

export async function aiWeeklyExperiments(
  report: WeeklyReport,
  entries: JournalEntry[],
): Promise<AIOutput> {
  const weekEntries = entries.filter(e => e.date >= report.weekStart && e.date <= report.weekEnd);

  return createOutput(
    'weekly-experiments',
    report.id,
    `Based on this week's journal data, suggest 2 small experiments the person could try next week. Each should be:
- Specific and concrete
- Measurable (how to know it worked)
- Relevant to what they wrote about
- Doable in a week

Format each experiment as:
**Experiment: [name]**
What to do: [1-2 sentences]
How to know it worked: [1 sentence]`,
    `Weekly stats:\n${serializeReport(report)}\n\nEntries:\n${serializeWeekEntries(weekEntries)}`,
  );
}
