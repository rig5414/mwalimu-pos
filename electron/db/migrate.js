/**
 * migrate.js — runs once on startup.
 * Creates tables if they don't exist. Safe to run repeatedly.
 */

module.exports = function migrate(db) {
  db.exec(`
    -- ── Users ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      username    TEXT NOT NULL UNIQUE,
      pin_hash    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('admin','shopkeeper')),
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Categories ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      parent_id   TEXT REFERENCES categories(id),
      icon        TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Products ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS products (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      category_id   TEXT REFERENCES categories(id),
      subcategory   TEXT,
      price         REAL NOT NULL DEFAULT 0,
      barcode       TEXT UNIQUE,
      description   TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Product Variants (color + size combinations) ────────────────────── 
    CREATE TABLE IF NOT EXISTS product_variants (
      id          TEXT PRIMARY KEY,
      product_id  TEXT NOT NULL REFERENCES products(id),
      color       TEXT,
      color_hex   TEXT,
      size        TEXT,
      sku         TEXT UNIQUE,
      stock_qty   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Stock Movements (full audit trail) ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS stock_movements (
      id            TEXT PRIMARY KEY,
      variant_id    TEXT NOT NULL REFERENCES product_variants(id),
      type          TEXT NOT NULL CHECK(type IN ('in','out','adjustment','sale')),
      quantity      INTEGER NOT NULL,
      note          TEXT,
      user_id       TEXT REFERENCES users(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Clients ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS clients (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      phone       TEXT,
      school      TEXT,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Sales ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sales (
      id              TEXT PRIMARY KEY,
      receipt_no      TEXT NOT NULL UNIQUE,
      client_id       TEXT REFERENCES clients(id),
      client_name     TEXT,               -- snapshot (client may be walk-in)
      subtotal        REAL NOT NULL DEFAULT 0,
      tax             REAL NOT NULL DEFAULT 0,
      total           REAL NOT NULL DEFAULT 0,
      payment_method  TEXT NOT NULL CHECK(payment_method IN ('cash','mpesa','card')),
      amount_paid     REAL NOT NULL DEFAULT 0,
      change_given    REAL NOT NULL DEFAULT 0,
      mpesa_ref       TEXT,
      card_ref        TEXT,
      status          TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','voided')),
      served_by       TEXT REFERENCES users(id),
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Sale Items ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sale_items (
      id            TEXT PRIMARY KEY,
      sale_id       TEXT NOT NULL REFERENCES sales(id),
      variant_id    TEXT NOT NULL REFERENCES product_variants(id),
      product_name  TEXT NOT NULL,   -- snapshot
      color         TEXT,            -- snapshot
      size          TEXT,            -- snapshot
      quantity      INTEGER NOT NULL,
      unit_price    REAL NOT NULL,
      total_price   REAL NOT NULL
    );

    -- ── Sync Log ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sync_log (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('pending','success','failed')),
      payload     TEXT,
      synced_at   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Indexes ────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_sales_created    ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale  ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_variant    ON stock_movements(variant_id);
  `)

  // ── Seed default users & demo data on first run ──────────────────────────
  const { v4: uuidv4 } = require('uuid')
  const crypto = require('crypto')
  const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex')

  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()
  if (!adminExists) {
    // Seed default users
    const adminId = uuidv4()
    const shopkeeperId = uuidv4()
    db.prepare(`
      INSERT INTO users (id, name, username, pin_hash, role)
      VALUES (?, 'Administrator', 'admin', ?, 'admin')
    `).run(adminId, hashPin('9999'))

    db.prepare(`
      INSERT INTO users (id, name, username, pin_hash, role)
      VALUES (?, 'Shopkeeper', 'shopkeeper', ?, 'shopkeeper')
    `).run(shopkeeperId, hashPin('1234'))

    console.log('✅ Default users seeded')

    // Seed categories
    const categories = [
      { id: uuidv4(), name: 'Uniforms', parent_id: null, icon: '👕', sort_order: 0 },
      { id: uuidv4(), name: 'School Bags', parent_id: null, icon: '🎒', sort_order: 1 },
      { id: uuidv4(), name: 'Tracksuits', parent_id: null, icon: '🏃', sort_order: 2 },
      { id: uuidv4(), name: 'Shoes', parent_id: null, icon: '👟', sort_order: 3 },
      { id: uuidv4(), name: 'Accessories', parent_id: null, icon: '🧢', sort_order: 4 },
    ]
    categories.forEach(cat => {
      db.prepare(`
        INSERT INTO categories (id, name, parent_id, icon, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(cat.id, cat.name, cat.parent_id, cat.icon, cat.sort_order)
    })
    console.log('✅ Categories seeded')

    // Seed products & variants
    const uniformsCat = categories[0].id
    const bagsCat = categories[1].id
    const trackCat = categories[2].id
    const shoesCat = categories[3].id
    const accCat = categories[4].id

    const products = [
      { id: uuidv4(), name: 'Navy Pullovers', category_id: uniformsCat, price: 1500, variants: [
        { color: 'Navy', color_hex: '#1a3a5c', size: 'S', stock: 25 },
        { color: 'Navy', color_hex: '#1a3a5c', size: 'M', stock: 18 },
        { color: 'Navy', color_hex: '#1a3a5c', size: 'L', stock: 12 },
        { color: 'Navy', color_hex: '#1a3a5c', size: 'XL', stock: 8 },
      ]},
      { id: uuidv4(), name: 'White T-Shirts', category_id: uniformsCat, price: 800, variants: [
        { color: 'White', color_hex: '#ffffff', size: 'S', stock: 5 },
        { color: 'White', color_hex: '#ffffff', size: 'M', stock: 15 },
        { color: 'White', color_hex: '#ffffff', size: 'L', stock: 22 },
      ]},
      { id: uuidv4(), name: 'Navy Trousers', category_id: uniformsCat, price: 2500, variants: [
        { color: 'Navy', color_hex: '#1a3a5c', size: '26', stock: 10 },
        { color: 'Navy', color_hex: '#1a3a5c', size: '28', stock: 2 },  // Low stock
        { color: 'Navy', color_hex: '#1a3a5c', size: '30', stock: 14 },
        { color: 'Navy', color_hex: '#1a3a5c', size: '32', stock: 8 },
      ]},
      { id: uuidv4(), name: 'Red Tracksuits', category_id: trackCat, price: 3200, variants: [
        { color: 'Red', color_hex: '#e74c3c', size: 'S', stock: 8 },
        { color: 'Red', color_hex: '#e74c3c', size: 'M', stock: 12 },
        { color: 'Red', color_hex: '#e74c3c', size: 'L', stock: 3 },  // Low stock
        { color: 'Red', color_hex: '#e74c3c', size: 'XL', stock: 5 },
      ]},
      { id: uuidv4(), name: 'Black School Bag', category_id: bagsCat, price: 2200, variants: [
        { color: 'Black', color_hex: '#000000', size: '16"', stock: 18 },
        { color: 'Black', color_hex: '#000000', size: '18"', stock: 4 },  // Low stock
        { color: 'Black', color_hex: '#000000', size: '20"', stock: 7 },
      ]},
      { id: uuidv4(), name: 'Blue School Shoes', category_id: shoesCat, price: 3500, variants: [
        { color: 'Blue', color_hex: '#3498db', size: '36', stock: 9 },
        { color: 'Blue', color_hex: '#3498db', size: '38', stock: 14 },
        { color: 'Blue', color_hex: '#3498db', size: '40', stock: 11 },
        { color: 'Blue', color_hex: '#3498db', size: '42', stock: 7 },
      ]},
    ]

    products.forEach(prod => {
      db.prepare(`
        INSERT INTO products (id, name, category_id, price)
        VALUES (?, ?, ?, ?)
      `).run(prod.id, prod.name, prod.category_id, prod.price)

      prod.variants.forEach(v => {
        const variantId = uuidv4()
        db.prepare(`
          INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(variantId, prod.id, v.color, v.color_hex, v.size, `${prod.name.split(' ')[0]}-${v.color.substring(0,3)}-${v.size}`, v.stock)
      })
    })
    console.log('✅ Products & variants seeded')

    // Seed clients
    const clients = [
      { id: uuidv4(), name: 'Mary Wanjiku', phone: '0712345678', school: 'Nairobi Primary' },
      { id: uuidv4(), name: 'James Ochieng', phone: '0723456789', school: 'Langata Secondary' },
      { id: uuidv4(), name: 'Fatuma Hassan', phone: '0734567890', school: 'Eastleigh High' },
    ]
    clients.forEach(client => {
      db.prepare(`
        INSERT INTO clients (id, name, phone, school)
        VALUES (?, ?, ?, ?)
      `).run(client.id, client.name, client.phone, client.school)
    })
    console.log('✅ Clients seeded')

    // Seed sample sales (last 5 transactions)
    const sampleSales = [
      { receipt_no: 'MU-000038', client_name: 'Mary Wanjiku', total: 3250, method: 'mpesa', items: [
        { product_name: 'Navy Pullovers', color: 'Navy', size: 'M', qty: 2, price: 1500 },
        { product_name: 'White T-Shirts', color: 'White', size: 'L', qty: 1, price: 800 },
      ]},
      { receipt_no: 'MU-000037', client_name: 'Walk-in', total: 1700, method: 'cash', items: [
        { product_name: 'White T-Shirts', color: 'White', size: 'M', qty: 2, price: 800 },
      ]},
      { receipt_no: 'MU-000036', client_name: 'James Ochieng', total: 5400, method: 'card', items: [
        { product_name: 'Blue School Shoes', color: 'Blue', size: '40', qty: 1, price: 3500 },
        { product_name: 'Black School Bag', color: 'Black', size: '18"', qty: 1, price: 2200 },
      ]},
      { receipt_no: 'MU-000035', client_name: 'Walk-in', total: 850, method: 'cash', items: [
        { product_name: 'White T-Shirts', color: 'White', size: 'S', qty: 1, price: 800 },
      ]},
      { receipt_no: 'MU-000034', client_name: 'Fatuma Hassan', total: 2850, method: 'mpesa', items: [
        { product_name: 'Navy Trousers', color: 'Navy', size: '30', qty: 1, price: 2500 },
        { product_name: 'White T-Shirts', color: 'White', size: 'M', qty: 1, price: 800 },
      ]},
    ]

    sampleSales.forEach(sale => {
      const saleId = uuidv4()
      const timeOffset = Math.floor(Math.random() * 480) // random time in last 8 hours
      const createdAt = new Date(Date.now() - timeOffset * 60000).toISOString().replace('T', ' ').substring(0, 19)

      db.prepare(`
        INSERT INTO sales (id, receipt_no, client_name, subtotal, tax, total, payment_method, amount_paid, change_given, status, served_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(saleId, sale.receipt_no, sale.client_name, sale.total, 0, sale.total, sale.method, sale.total, 0, shopkeeperId, createdAt)

      sale.items.forEach(item => {
        db.prepare(`
          INSERT INTO sale_items (id, sale_id, variant_id, product_name, color, size, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), saleId, null, item.product_name, item.color, item.size, item.qty, item.price, item.price * item.qty)
      })
    })
    console.log('✅ Sample sales seeded')
  }

  console.log('✅ Migrations complete')
}
