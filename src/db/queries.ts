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

export async function getExpenseById(
  db: SQLite.SQLiteDatabase,
  expenseId: string,
): Promise<ExpenseHistoryRow | null> {
  const row =
    (await db.getFirstAsync<ExpenseHistoryRow>(
      'SELECT id, expense_date, category, amount, note FROM Expenses WHERE id = ?;',
      [expenseId],
    )) ?? null;
  if (!row) return null;
  return {
    ...row,
    expense_date: Number(row.expense_date ?? 0),
    amount: Number(row.amount ?? 0),
  };
}

export async function updateExpense(
  db: SQLite.SQLiteDatabase,
  input: {
    id: string;
    category: string;
    amount: number;
    expenseDate: number;
    note: string | null;
  },
): Promise<void> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Invalid amount');
  }
  if (!input.category.trim()) {
    throw new Error('Invalid category');
  }

  await db.runAsync(
    'UPDATE Expenses SET category = ?, amount = ?, expense_date = ?, note = ? WHERE id = ?;',
    [input.category.trim(), input.amount, input.expenseDate, input.note, input.id],
  );
}

export type SaleEditRow = {
  id: string;
  variant_id: string;
  final_sold_price: number;
  quantity_sold: number;
  sale_date: number;
  is_return: number;
  notes: string | null;
  product_id: string;
  product_name: string;
  size_label: string;
  current_stock: number;
  min_selling_price: number | null;
  max_selling_price: number | null;
};

export async function getSaleByIdForEdit(db: SQLite.SQLiteDatabase, saleId: string): Promise<SaleEditRow | null> {
  const row =
    (await db.getFirstAsync<SaleEditRow>(
      `
      SELECT
        s.id AS id,
        s.variant_id AS variant_id,
        s.final_sold_price AS final_sold_price,
        s.quantity_sold AS quantity_sold,
        s.sale_date AS sale_date,
        s.is_return AS is_return,
        s.notes AS notes,
        p.id AS product_id,
        p.name AS product_name,
        v.size_label AS size_label,
        v.current_stock AS current_stock,
        v.min_selling_price AS min_selling_price,
        v.max_selling_price AS max_selling_price
      FROM Sales s
      INNER JOIN Variants v ON v.id = s.variant_id
      INNER JOIN Products p ON p.id = v.product_id
      WHERE s.id = ?;
      `,
      [saleId],
    )) ?? null;

  if (!row) return null;
  return {
    ...row,
    final_sold_price: Number(row.final_sold_price ?? 0),
    quantity_sold: Number(row.quantity_sold ?? 0),
    sale_date: Number(row.sale_date ?? 0),
    is_return: Number(row.is_return ?? 0),
    current_stock: Number(row.current_stock ?? 0),
    min_selling_price: row.min_selling_price == null ? null : Number(row.min_selling_price),
    max_selling_price: row.max_selling_price == null ? null : Number(row.max_selling_price),
  };
}

export async function updateSaleAndAdjustStock(
  db: SQLite.SQLiteDatabase,
  input: {
    saleId: string;
    nextVariantId: string;
    nextFinalSoldPrice: number;
    nextQuantity: number;
    nextSaleDate: number;
    nextIsReturn: boolean;
    nextNotes: string | null;
  },
): Promise<void> {
  if (!Number.isFinite(input.nextFinalSoldPrice) || input.nextFinalSoldPrice <= 0) {
    throw new Error('Invalid sold price');
  }
  if (!Number.isInteger(input.nextQuantity) || input.nextQuantity <= 0) {
    throw new Error('Invalid quantity');
  }

  await db.execAsync('BEGIN;');
  try {
    const prev = await db.getFirstAsync<{
      variant_id: string;
      quantity_sold: number;
      is_return: number;
    }>('SELECT variant_id, quantity_sold, is_return FROM Sales WHERE id = ?;', [input.saleId]);

    if (!prev) throw new Error('Sale not found');

    const prevQty = Number(prev.quantity_sold ?? 0);
    const prevIsReturn = Number(prev.is_return ?? 0) === 1;
    const prevDelta = prevIsReturn ? prevQty : -prevQty;

    const nextDelta = input.nextIsReturn ? input.nextQuantity : -input.nextQuantity;

    if (prev.variant_id === input.nextVariantId) {
      const stockRow = await db.getFirstAsync<{ current_stock: number }>(
        'SELECT current_stock FROM Variants WHERE id = ?;',
        [prev.variant_id],
      );
      if (!stockRow) throw new Error('Variant not found');
      const stockChange = nextDelta - prevDelta;
      const nextStock = Number(stockRow.current_stock ?? 0) + stockChange;
      if (nextStock < 0) throw new Error('Not enough stock');
      await db.runAsync('UPDATE Variants SET current_stock = ? WHERE id = ?;', [nextStock, prev.variant_id]);
    } else {
      const oldRow = await db.getFirstAsync<{ current_stock: number }>('SELECT current_stock FROM Variants WHERE id = ?;', [
        prev.variant_id,
      ]);
      const newRow = await db.getFirstAsync<{ current_stock: number }>('SELECT current_stock FROM Variants WHERE id = ?;', [
        input.nextVariantId,
      ]);
      if (!oldRow) throw new Error('Old variant not found');
      if (!newRow) throw new Error('New variant not found');

      const oldNextStock = Number(oldRow.current_stock ?? 0) + (-prevDelta);
      const newNextStock = Number(newRow.current_stock ?? 0) + nextDelta;
      if (oldNextStock < 0 || newNextStock < 0) throw new Error('Not enough stock');

      await db.runAsync('UPDATE Variants SET current_stock = ? WHERE id = ?;', [oldNextStock, prev.variant_id]);
      await db.runAsync('UPDATE Variants SET current_stock = ? WHERE id = ?;', [newNextStock, input.nextVariantId]);
    }

    await db.runAsync(
      `UPDATE Sales
       SET variant_id = ?, final_sold_price = ?, quantity_sold = ?, sale_date = ?, is_return = ?, notes = ?
       WHERE id = ?;`,
      [
        input.nextVariantId,
        input.nextFinalSoldPrice,
        input.nextQuantity,
        input.nextSaleDate,
        input.nextIsReturn ? 1 : 0,
        input.nextNotes,
        input.saleId,
      ],
    );

    await db.execAsync('COMMIT;');
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

export type SaleHistoryRow = {
  id: string;
  sale_date: number;
  is_return: number;
  final_sold_price: number;
  quantity_sold: number;
  cost_price: number;
  product_name: string;
  size_label: string;
};

export async function listSalesHistory(
  db: SQLite.SQLiteDatabase,
  input: {
    limit?: number;
    range?: DateRange;
  } = {},
): Promise<SaleHistoryRow[]> {
  const lim = input.limit ?? 200;
  const where = buildDateWhere('s.sale_date', input.range);
  const rows = await db.getAllAsync<SaleHistoryRow>(
    `
    SELECT
      s.id AS id,
      s.sale_date AS sale_date,
      s.is_return AS is_return,
      s.final_sold_price AS final_sold_price,
      s.quantity_sold AS quantity_sold,
      v.cost_price AS cost_price,
      p.name AS product_name,
      v.size_label AS size_label
    FROM Sales s
    INNER JOIN Variants v ON v.id = s.variant_id
    INNER JOIN Products p ON p.id = v.product_id
    ${where.clause}
    ORDER BY s.sale_date DESC
    LIMIT ?;
    `,
    [...where.args, lim],
  );
  return (rows ?? []).map((r) => ({
    ...r,
    sale_date: Number(r.sale_date ?? 0),
    is_return: Number(r.is_return ?? 0),
    final_sold_price: Number(r.final_sold_price ?? 0),
    quantity_sold: Number(r.quantity_sold ?? 0),
    cost_price: Number(r.cost_price ?? 0),
  }));
}

export type ExpenseHistoryRow = {
  id: string;
  expense_date: number;
  category: string;
  amount: number;
  note: string | null;
};

export type DailyAnalyticsRow = {
  day: string;
  day_ms: number;
  revenue: number;
  profit: number;
  expenses: number;
};

export async function getDailyAnalytics(
  db: SQLite.SQLiteDatabase,
  range: DateRange,
): Promise<DailyAnalyticsRow[]> {
  const startMs = range.startMs ?? 0;
  const endMs = range.endMs ?? Date.now();

  const salesRows = await db.getAllAsync<{
    day: string;
    revenue: number;
    cogs: number;
  }>(
    `
    SELECT
      strftime('%Y-%m-%d', s.sale_date / 1000, 'unixepoch', 'localtime') AS day,
      SUM((CASE WHEN s.is_return = 1 THEN -1 ELSE 1 END) * s.final_sold_price * s.quantity_sold) AS revenue,
      SUM((CASE WHEN s.is_return = 1 THEN -1 ELSE 1 END) * v.cost_price * s.quantity_sold) AS cogs
    FROM Sales s
    INNER JOIN Variants v ON v.id = s.variant_id
    WHERE s.sale_date >= ? AND s.sale_date < ?
    GROUP BY day
    ORDER BY day ASC;
    `,
    [startMs, endMs],
  );

  const expenseRows = await db.getAllAsync<{
    day: string;
    expenses: number;
  }>(
    `
    SELECT
      strftime('%Y-%m-%d', e.expense_date / 1000, 'unixepoch', 'localtime') AS day,
      SUM(e.amount) AS expenses
    FROM Expenses e
    WHERE e.expense_date >= ? AND e.expense_date < ?
    GROUP BY day
    ORDER BY day ASC;
    `,
    [startMs, endMs],
  );

  const salesMap = new Map<string, { revenue: number; profit: number }>();
  for (const r of salesRows ?? []) {
    const revenue = Number(r.revenue ?? 0);
    const cogs = Number(r.cogs ?? 0);
    salesMap.set(r.day, { revenue, profit: revenue - cogs });
  }

  const expenseMap = new Map<string, number>();
  for (const r of expenseRows ?? []) {
    expenseMap.set(r.day, Number(r.expenses ?? 0));
  }

  const out: DailyAnalyticsRow[] = [];
  const start = new Date(startMs);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const end = new Date(endMs);
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

  const oneDay = 24 * 60 * 60 * 1000;
  for (let t = startDay; t <= endDay; t += oneDay) {
    const d = new Date(t);
    const day = d.toISOString().slice(0, 10);
    const s = salesMap.get(day);
    const expenses = expenseMap.get(day) ?? 0;
    out.push({
      day,
      day_ms: t,
      revenue: s?.revenue ?? 0,
      profit: s?.profit ?? 0,
      expenses,
    });
  }

  return out;
}

export async function listExpensesHistory(
  db: SQLite.SQLiteDatabase,
  input: {
    limit?: number;
    range?: DateRange;
  } = {},
): Promise<ExpenseHistoryRow[]> {
  const lim = input.limit ?? 200;
  const where = buildDateWhere('e.expense_date', input.range);
  const rows = await db.getAllAsync<ExpenseHistoryRow>(
    `
    SELECT
      e.id AS id,
      e.expense_date AS expense_date,
      e.category AS category,
      e.amount AS amount,
      e.note AS note
    FROM Expenses e
    ${where.clause}
    ORDER BY e.expense_date DESC
    LIMIT ?;
    `,
    [...where.args, lim],
  );
  return (rows ?? []).map((r) => ({
    ...r,
    expense_date: Number(r.expense_date ?? 0),
    amount: Number(r.amount ?? 0),
  }));
}

export async function deleteExpense(db: SQLite.SQLiteDatabase, expenseId: string): Promise<void> {
  await db.runAsync('DELETE FROM Expenses WHERE id = ?;', [expenseId]);
}

export async function deleteSaleAndRollbackStock(db: SQLite.SQLiteDatabase, saleId: string): Promise<void> {
  await db.execAsync('BEGIN;');
  try {
    const s = await db.getFirstAsync<{
      variant_id: string;
      quantity_sold: number;
      is_return: number;
    }>('SELECT variant_id, quantity_sold, is_return FROM Sales WHERE id = ?;', [saleId]);

    if (!s) {
      throw new Error('Sale not found');
    }

    const qty = Number(s.quantity_sold ?? 0);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Invalid sale quantity');
    }

    const isReturn = Number(s.is_return ?? 0) === 1;
    const originalDelta = isReturn ? qty : -qty;
    const rollbackDelta = -originalDelta;

    const v = await db.getFirstAsync<{ current_stock: number }>('SELECT current_stock FROM Variants WHERE id = ?;', [
      s.variant_id,
    ]);
    if (!v) {
      throw new Error('Variant not found');
    }

    const nextStock = Number(v.current_stock ?? 0) + rollbackDelta;
    if (nextStock < 0) {
      throw new Error('Cannot delete: stock would become negative');
    }

    await db.runAsync('UPDATE Variants SET current_stock = ? WHERE id = ?;', [nextStock, s.variant_id]);
    await db.runAsync('DELETE FROM Sales WHERE id = ?;', [saleId]);

    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
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
