import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { JournalEntry, WeeklyReport } from './types';

interface JournalDB extends DBSchema {
  entries: {
    key: string;
    value: JournalEntry;
    indexes: { 'by-date': string };
  };
  reports: {
    key: string;
    value: WeeklyReport;
  };
}

let dbPromise: Promise<IDBPDatabase<JournalDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<JournalDB>('journal-rpg', 1, {
      upgrade(db) {
        const entryStore = db.createObjectStore('entries', { keyPath: 'date' });
        entryStore.createIndex('by-date', 'date');
        db.createObjectStore('reports', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getEntry(date: string): Promise<JournalEntry | undefined> {
  const db = await getDB();
  return db.get('entries', date);
}

export async function saveEntry(entry: JournalEntry): Promise<void> {
  const db = await getDB();
  await db.put('entries', entry);
}

export async function getAllEntries(): Promise<JournalEntry[]> {
  const db = await getDB();
  return db.getAll('entries');
}

export async function getEntriesInRange(start: string, end: string): Promise<JournalEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('entries', 'by-date', IDBKeyRange.bound(start, end));
}

export async function getReport(id: string): Promise<WeeklyReport | undefined> {
  const db = await getDB();
  return db.get('reports', id);
}

export async function saveReport(report: WeeklyReport): Promise<void> {
  const db = await getDB();
  await db.put('reports', report);
}

export async function getAllReports(): Promise<WeeklyReport[]> {
  const db = await getDB();
  return db.getAll('reports');
}
