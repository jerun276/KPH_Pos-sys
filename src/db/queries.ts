import type * as SQLite from 'expo-sqlite';

import { createId } from '../utils/id';

export type DealerRow = {
  id: string;
  name: string;
};

export type ProductListRow = {
  id: string;
  name: string;
  image_uri: string | null;
  total_stock: number;
  low_stock_variants: number;
};

export type ProductUpsertInput = {
  id?: string;
  dealerId: string | null;
  name: string;
  imageUri: string | null;
  purchaseDate: number | null;
  category: string | null;
  material: string | null;
  notes: string | null;
};

export type VariantRow = {
  id: string;
  product_id: string;
  size_label: string;
  cost_price: number;
  min_selling_price: number | null;
  max_selling_price: number | null;
  current_stock: number;
  notes: string | null;
};

export type VariantUpsertInput = {
  id?: string;
  productId: string;
  sizeLabel: string;
  costPrice: number;
  minSellingPrice: number | null;
  maxSellingPrice: number | null;
  currentStock: number;
  notes: string | null;
};

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

export async function listDealers(db: SQLite.SQLiteDatabase): Promise<DealerRow[]> {
  const rows = await db.getAllAsync<DealerRow>('SELECT id, name FROM Dealers ORDER BY name COLLATE NOCASE ASC;');
  return rows ?? [];
}

export async function listProducts(
  db: SQLite.SQLiteDatabase,
  input: {
    search?: string;
  },
): Promise<ProductListRow[]> {
  const search = input.search?.trim() ?? '';
  const hasSearch = search.length > 0;
  const pattern = `%${search}%`;

  const sql = `
    SELECT
      p.id as id,
      p.name as name,
      p.image_uri as image_uri,
      COALESCE(SUM(v.current_stock), 0) as total_stock,
      COALESCE(SUM(CASE WHEN v.current_stock <= 2 THEN 1 ELSE 0 END), 0) as low_stock_variants
    FROM Products p
    LEFT JOIN Variants v ON v.product_id = p.id
    ${hasSearch ? 'WHERE p.name LIKE ?' : ''}
    GROUP BY p.id
    ORDER BY p.name COLLATE NOCASE ASC;
  `;

  const rows = await db.getAllAsync<ProductListRow>(sql, hasSearch ? [pattern] : []);
  return (rows ?? []).map((r) => ({
    ...r,
    total_stock: Number(r.total_stock ?? 0),
    low_stock_variants: Number(r.low_stock_variants ?? 0),
  }));
}

export async function upsertProduct(db: SQLite.SQLiteDatabase, input: ProductUpsertInput): Promise<string> {
  const now = Date.now();
  const id = input.id ?? createId();

  if (input.id) {
    await db.runAsync(
      `UPDATE Products
       SET dealer_id = ?, name = ?, image_uri = ?, purchase_date = ?, category = ?, material = ?, notes = ?
       WHERE id = ?;`,
      [
        input.dealerId,
        input.name,
        input.imageUri,
        input.purchaseDate,
        input.category,
        input.material,
        input.notes,
        id,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO Products (id, dealer_id, name, image_uri, purchase_date, category, material, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        input.dealerId,
        input.name,
        input.imageUri,
        input.purchaseDate,
        input.category,
        input.material,
        input.notes,
        now,
      ],
    );
  }

  return id;
}

export async function listVariantsForProduct(db: SQLite.SQLiteDatabase, productId: string): Promise<VariantRow[]> {
  const rows = await db.getAllAsync<VariantRow>(
    `SELECT id, product_id, size_label, cost_price, min_selling_price, max_selling_price, current_stock, notes
     FROM Variants
     WHERE product_id = ?
     ORDER BY size_label COLLATE NOCASE ASC;`,
    [productId],
  );
  return rows ?? [];
}

export async function upsertVariant(db: SQLite.SQLiteDatabase, input: VariantUpsertInput): Promise<string> {
  const id = input.id ?? createId();

  if (input.id) {
    await db.runAsync(
      `UPDATE Variants
       SET size_label = ?, cost_price = ?, min_selling_price = ?, max_selling_price = ?, current_stock = ?, notes = ?
       WHERE id = ?;`,
      [
        input.sizeLabel,
        input.costPrice,
        input.minSellingPrice,
        input.maxSellingPrice,
        input.currentStock,
        input.notes,
        id,
      ],
    );
  } else {
    await db.runAsync(
      `INSERT INTO Variants
       (id, product_id, size_label, cost_price, min_selling_price, max_selling_price, current_stock, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        input.productId,
        input.sizeLabel,
        input.costPrice,
        input.minSellingPrice,
        input.maxSellingPrice,
        input.currentStock,
        input.notes,
      ],
    );
  }

  return id;
}

export async function deleteVariant(db: SQLite.SQLiteDatabase, variantId: string): Promise<void> {
  await db.runAsync('DELETE FROM Variants WHERE id = ?;', [variantId]);
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
