export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS Dealers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    logo_uri TEXT,
    location TEXT,
    WhatsApp TEXT,
    facebook TEXT,
    instagram TEXT,
    tiktok TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS Products (
    id TEXT PRIMARY KEY NOT NULL,
    dealer_id TEXT,
    name TEXT NOT NULL,
    image_uri TEXT,
    purchase_date INTEGER,
    category TEXT,
    material TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (dealer_id) REFERENCES Dealers(id)
  );`,
  `CREATE TABLE IF NOT EXISTS Variants (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    size_label TEXT NOT NULL,
    cost_price REAL NOT NULL,
    min_selling_price REAL,
    max_selling_price REAL,
    current_stock INTEGER NOT NULL,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES Products(id)
  );`,
  `CREATE TABLE IF NOT EXISTS Sales (
    id TEXT PRIMARY KEY NOT NULL,
    variant_id TEXT NOT NULL,
    final_sold_price REAL NOT NULL,
    quantity_sold INTEGER NOT NULL,
    sale_date INTEGER NOT NULL,
    is_return INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES Variants(id)
  );`,
  `CREATE TABLE IF NOT EXISTS Expenses (
    id TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date INTEGER NOT NULL,
    image_uri TEXT,
    note TEXT,
    created_at INTEGER NOT NULL
  );`,
];
