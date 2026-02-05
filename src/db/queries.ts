import type * as SQLite from 'expo-sqlite';

import { createId } from '../utils/id';

export async function getTableCounts(db: SQLite.SQLiteDatabase): Promise<{
  dealers: number;
  products: number;
  variants: number;
  sales: number;
  expenses: number;
}> {
  const dealers = (await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM Dealers;'))?.c ?? 0;
  const products = (await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM Products;'))?.c ?? 0;
  const variants = (await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM Variants;'))?.c ?? 0;
  const sales = (await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM Sales;'))?.c ?? 0;
  const expenses = (await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM Expenses;'))?.c ?? 0;

  return { dealers, products, variants, sales, expenses };
}

export async function createSampleDealer(db: SQLite.SQLiteDatabase): Promise<void> {
  const id = createId();
  const now = Date.now();

  await db.runAsync(
    'INSERT INTO Dealers (id, name, phone, location, created_at) VALUES (?, ?, ?, ?, ?);',
    [id, `Dealer ${id.slice(-4)}`, '9999999999', 'City', now],
  );
}

export async function createExpense(db: SQLite.SQLiteDatabase, input: {
  amount: number;
  category: string;
  note?: string;
  expenseDate: number;
}): Promise<void> {
  const id = createId();
  const now = Date.now();

  await db.runAsync(
    'INSERT INTO Expenses (id, category, amount, expense_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?);',
    [id, input.category, input.amount, input.expenseDate, input.note ?? null, now],
  );
}
