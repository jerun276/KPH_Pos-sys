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

export type ProductSaleRow = {
  id: string;
  name: string;
};

export type VariantSaleRow = {
  id: string;
  product_id: string;
  size_label: string;
  cost_price: number;
  min_selling_price: number | null;
  max_selling_price: number | null;
  current_stock: number;
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

export async function listProductsForSale(
  db: SQLite.SQLiteDatabase,
  input: {
    search?: string;
  },
): Promise<ProductSaleRow[]> {
  const search = input.search?.trim() ?? '';
  const hasSearch = search.length > 0;
  const pattern = `%${search}%`;

  const sql = `
    SELECT id, name
    FROM Products
    ${hasSearch ? 'WHERE name LIKE ?' : ''}
    ORDER BY name COLLATE NOCASE ASC;
  `;

  const rows = await db.getAllAsync<ProductSaleRow>(sql, hasSearch ? [pattern] : []);
  return rows ?? [];
}

export async function listVariantsForSale(db: SQLite.SQLiteDatabase, productId: string): Promise<VariantSaleRow[]> {
  const rows = await db.getAllAsync<VariantSaleRow>(
    `SELECT id, product_id, size_label, cost_price, min_selling_price, max_selling_price, current_stock
     FROM Variants
     WHERE product_id = ?
     ORDER BY size_label COLLATE NOCASE ASC;`,
    [productId],
  );
  return rows ?? [];
}

export async function createSaleAndUpdateStock(
  db: SQLite.SQLiteDatabase,
  input: {
    variantId: string;
    finalSoldPrice: number;
    quantity: number;
    saleDate: number;
    isReturn: boolean;
    notes?: string | null;
  },
): Promise<string> {
  if (!Number.isFinite(input.finalSoldPrice) || input.finalSoldPrice <= 0) {
    throw new Error('Invalid sold price');
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('Invalid quantity');
  }

  const id = createId();
  const now = Date.now();
  const delta = input.isReturn ? input.quantity : -input.quantity;

  await db.execAsync('BEGIN;');
  try {
    const v = await db.getFirstAsync<{ current_stock: number }>('SELECT current_stock FROM Variants WHERE id = ?;', [
      input.variantId,
    ]);
    if (!v) {
      throw new Error('Variant not found');
    }

    const nextStock = Number(v.current_stock) + delta;
    if (nextStock < 0) {
      throw new Error('Not enough stock');
    }

    await db.runAsync('UPDATE Variants SET current_stock = ? WHERE id = ?;', [nextStock, input.variantId]);

    await db.runAsync(
      `INSERT INTO Sales
       (id, variant_id, final_sold_price, quantity_sold, sale_date, is_return, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        input.variantId,
        input.finalSoldPrice,
        input.quantity,
        input.saleDate,
        input.isReturn ? 1 : 0,
        input.notes ?? null,
        now,
      ],
    );

    await db.execAsync('COMMIT;');
    return id;
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

export type DateRange = {
  startMs?: number;
  endMs?: number;
};

export type DashboardTotals = {
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  itemsSold: number;
};

function buildDateWhere(column: string, range?: DateRange): { clause: string; args: any[] } {
  if (!range?.startMs && !range?.endMs) return { clause: '', args: [] };

  const parts: string[] = [];
  const args: any[] = [];
  if (range.startMs != null) {
    parts.push(`${column} >= ?`);
    args.push(range.startMs);
  }
  if (range.endMs != null) {
    parts.push(`${column} < ?`);
    args.push(range.endMs);
  }

  return { clause: parts.length ? `WHERE ${parts.join(' AND ')}` : '', args };
}

export async function getDashboardTotals(db: SQLite.SQLiteDatabase, range?: DateRange): Promise<DashboardTotals> {
  const salesWhere = buildDateWhere('s.sale_date', range);
  const expWhere = buildDateWhere('e.expense_date', range);

  const sales =
    (await db.getFirstAsync<{
      revenue: number;
      cogs: number;
      items_sold: number;
    }>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN s.is_return = 1 THEN -(s.final_sold_price * s.quantity_sold) ELSE (s.final_sold_price * s.quantity_sold) END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN s.is_return = 1 THEN -(v.cost_price * s.quantity_sold) ELSE (v.cost_price * s.quantity_sold) END), 0) AS cogs,
        COALESCE(SUM(CASE WHEN s.is_return = 1 THEN -s.quantity_sold ELSE s.quantity_sold END), 0) AS items_sold
      FROM Sales s
      INNER JOIN Variants v ON v.id = s.variant_id
      ${salesWhere.clause};
      `,
      salesWhere.args,
    )) ?? { revenue: 0, cogs: 0, items_sold: 0 };

  const expenses =
    (await db.getFirstAsync<{ expenses: number }>(
      `
      SELECT COALESCE(SUM(e.amount), 0) AS expenses
      FROM Expenses e
      ${expWhere.clause};
      `,
      expWhere.args,
    )) ?? { expenses: 0 };

  const revenue = Number(sales.revenue ?? 0);
  const cogs = Number(sales.cogs ?? 0);
  const exp = Number(expenses.expenses ?? 0);
  const netProfit = revenue - cogs - exp;

  return {
    revenue,
    cogs,
    expenses: exp,
    netProfit,
    itemsSold: Number(sales.items_sold ?? 0),
  };
}

export type BestSellerRow = {
  product_id: string;
  product_name: string;
  quantity: number;
};

export async function listBestSellers(
  db: SQLite.SQLiteDatabase,
  input: {
    range?: DateRange;
    limit?: number;
  },
): Promise<BestSellerRow[]> {
  const lim = input.limit ?? 3;
  const where = buildDateWhere('s.sale_date', input.range);
  const rows = await db.getAllAsync<BestSellerRow>(
    `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      COALESCE(SUM(CASE WHEN s.is_return = 1 THEN -s.quantity_sold ELSE s.quantity_sold END), 0) AS quantity
    FROM Sales s
    INNER JOIN Variants v ON v.id = s.variant_id
    INNER JOIN Products p ON p.id = v.product_id
    ${where.clause}
    GROUP BY p.id
    HAVING quantity > 0
    ORDER BY quantity DESC
    LIMIT ?;
    `,
    [...where.args, lim],
  );
  return (rows ?? []).map((r) => ({ ...r, quantity: Number(r.quantity ?? 0) }));
}

export type LowStockRow = {
  variant_id: string;
  product_name: string;
  size_label: string;
  current_stock: number;
};

export async function listLowStockVariants(
  db: SQLite.SQLiteDatabase,
  input: {
    threshold?: number;
    limit?: number;
  } = {},
): Promise<LowStockRow[]> {
  const threshold = input.threshold ?? 2;
  const lim = input.limit ?? 20;
  const rows = await db.getAllAsync<LowStockRow>(
    `
    SELECT
      v.id AS variant_id,
      p.name AS product_name,
      v.size_label AS size_label,
      v.current_stock AS current_stock
    FROM Variants v
    INNER JOIN Products p ON p.id = v.product_id
    WHERE v.current_stock <= ?
    ORDER BY v.current_stock ASC, p.name COLLATE NOCASE ASC
    LIMIT ?;
    `,
    [threshold, lim],
  );
  return (rows ?? []).map((r) => ({ ...r, current_stock: Number(r.current_stock ?? 0) }));
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
