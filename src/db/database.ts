import * as SQLite from 'expo-sqlite';

import { CREATE_TABLES_SQL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('kph.db');
  }

  return dbPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();

  await db.execAsync('PRAGMA foreign_keys = ON;');

  for (const sql of CREATE_TABLES_SQL) {
    await db.execAsync(sql);
  }
}
