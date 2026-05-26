/**
 * migrate.js — runs once on startup.
 * Creates tables if they don't exist. Safe to run repeatedly.
 * Manages schema versions via PRAGMA user_version.
 */

const {
  seedDefaultSubcategories,
  migrateProductsToLeafCategories,
  migrateLegacyIdsToUuids,
  serializeVariantAttributes,
  findCategoryByName,
} = require('./categoryHelpers')

module.exports = function migrate(db) {
  const columnExists = (table, column) => {
    const pragma = db.prepare(`PRAGMA table_info(${table})`).all()
    return pragma.some((col) => col.name === column)
  }

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      parent_id   TEXT REFERENCES categories(id),
      icon        TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      category_id   TEXT REFERENCES categories(id),
      subcategory   TEXT,
      school_id     TEXT REFERENCES categories(id),
      icon          TEXT,
      cost_price    REAL NOT NULL DEFAULT 0,
      price         REAL NOT NULL DEFAULT 0,
      barcode       TEXT UNIQUE,
      description   TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS stock_movements (
      id            TEXT PRIMARY KEY,
      variant_id    TEXT NOT NULL REFERENCES product_variants(id),
      type          TEXT NOT NULL CHECK(type IN ('in','out','adjustment','sale')),
      quantity      INTEGER NOT NULL,
      note          TEXT,
      user_id       TEXT REFERENCES users(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      phone       TEXT,
      school      TEXT,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id              TEXT PRIMARY KEY,
      receipt_no      TEXT NOT NULL UNIQUE,
      client_id       TEXT REFERENCES clients(id),
      client_name     TEXT,
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

    CREATE TABLE IF NOT EXISTS sale_items (
      id            TEXT PRIMARY KEY,
      sale_id       TEXT NOT NULL REFERENCES sales(id),
      variant_id    TEXT REFERENCES product_variants(id),
      product_name  TEXT NOT NULL,
      color         TEXT,
      size          TEXT,
      quantity      INTEGER NOT NULL,
      unit_price    REAL NOT NULL,
      total_price   REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('pending','success','failed')),
      payload     TEXT,
      synced_at   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sales_created    ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale  ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_variant    ON stock_movements(variant_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  `)

  let version = db.prepare('PRAGMA user_version').get().user_version

  if (version < 1) {
    try { db.exec('ALTER TABLE products ADD COLUMN school_id TEXT REFERENCES categories(id)') } catch (_e) { /* exists */ }
    try { db.exec('ALTER TABLE products ADD COLUMN icon TEXT') } catch (_e) { /* exists */ }
    try { db.exec('ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0') } catch (_e) { /* exists */ }
    db.exec('PRAGMA user_version = 1')
    version = 1
    console.log('✅ Database upgraded to v1')
  }

  if (version < 2) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pos_favorites (
        variant_id  TEXT PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pos_favorites_sort ON pos_favorites(sort_order, created_at);
    `)
    db.exec('PRAGMA user_version = 2')
    version = 2
    console.log('✅ Database upgraded to v2 (POS favorites)')
  }

  if (version < 3) {
    const runV3 = db.transaction(() => {
      if (!columnExists('product_variants', 'attributes')) {
        db.exec('ALTER TABLE product_variants ADD COLUMN attributes TEXT')
      }

      if (!columnExists('categories', 'type')) {
        db.exec("ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'category'")
        db.exec("UPDATE categories SET type = 'root' WHERE parent_id IS NULL")
        db.exec("UPDATE categories SET type = 'subcategory' WHERE parent_id IS NOT NULL AND type = 'category'")
      }

      // seedDefaultSubcategories(db)
      migrateProductsToLeafCategories(db)

      db.exec(`
        UPDATE product_variants
        SET attributes = json_object('badge', 'plain')
        WHERE attributes IS NULL
          AND product_id IN (SELECT id FROM products WHERE school_id IS NULL)
      `)
      db.exec(`
        UPDATE product_variants
        SET attributes = json_object('badge', 'badged')
        WHERE attributes IS NULL
          AND product_id IN (SELECT id FROM products WHERE school_id IS NOT NULL)
      `)
    })

    runV3()
    db.exec('PRAGMA user_version = 3')
    version = 3
    console.log('✅ Database upgraded to v3 (category tree, variant attributes)')
  }

  if (version < 4) {
    const result = migrateLegacyIdsToUuids(db)
    if (result.categories > 0 || result.products > 0) {
      console.log(
        `  → Migrated ${result.categories} category id(s) and ${result.products} product id(s) to UUIDs`
      )
    }
    db.exec('PRAGMA user_version = 4')
    version = 4
    console.log('✅ Database upgraded to v4 (UUID primary keys)')
  }

  if (version < 5) {
    // v5: taxonomy alignment slot — fixCategories was never shipped; do not block startup.
    db.exec('PRAGMA user_version = 5')
    version = 5
    console.log('✅ Database upgraded to v5 (taxonomy version marker)')
  }

  if (version < 6) {
    const runV6 = db.transaction(() => {
      if (!columnExists('categories', 'icon_data')) {
        db.exec('ALTER TABLE categories ADD COLUMN icon_data BLOB')
      }
    })
    runV6()
    db.exec('PRAGMA user_version = 6')
    version = 6
    console.log('✅ Database upgraded to v6 (add category icon_data BLOB)')
  }

  const { v4: uuidv4 } = require('uuid')
  const crypto = require('crypto')
  const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex')

  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()
  if (!adminExists) {
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

    const rootCategories = [
      { name: 'School Uniforms', icon: '👔', sort_order: 0 },
      { name: 'Games Attires', icon: '🏃', sort_order: 1 },
      { name: 'Footwear', icon: '👟', sort_order: 2 },
      { name: 'Inner Wear', icon: '🧦', sort_order: 3 },
      { name: 'Beddings', icon: '🛏️', sort_order: 4 },
      { name: 'School Bags', icon: '🎒', sort_order: 5 },
      { name: 'Schools', icon: '🏫', sort_order: 6 },
    ]

    const hasType = columnExists('categories', 'type')
    rootCategories.forEach((cat) => {
      const id = uuidv4()
      if (hasType) {
        db.prepare(
          'INSERT INTO categories (id, name, parent_id, icon, sort_order, type) VALUES (?,?,?,?,?,?)'
        ).run(id, cat.name, null, cat.icon, cat.sort_order, 'root')
      } else {
        db.prepare(
          'INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES (?,?,?,?,?)'
        ).run(id, cat.name, null, cat.icon, cat.sort_order)
      }
    })
    console.log('✅ Categories seeded')

    seedDefaultSubcategories(db)

    const leafId = (rootName, subName) => {
      const root = findCategoryByName(db, { name: rootName })
      if (!root) return null
      return findCategoryByName(db, { name: subName, parentId: root.id })?.id || root.id
    }

    const products = [
      {
        name: 'Navy Pullover',
        category_id: leafId('School Uniforms', 'Pullovers'),
        subcategory: 'Pullovers',
        school_id: null,
        icon: '🧥',
        cost_price: 800,
        price: 1200,
        variants: [
          { color: 'Navy', color_hex: '#1a3a5c', size: 'S', stock: 10, attributes: { badge: 'plain' } },
          { color: 'Navy', color_hex: '#1a3a5c', size: 'M', stock: 10, attributes: { badge: 'plain' } },
          { color: 'Navy', color_hex: '#1a3a5c', size: 'L', stock: 8, attributes: { badge: 'plain' } },
        ],
      },
      {
        name: 'School Shirt',
        category_id: leafId('School Uniforms', 'Shirts'),
        subcategory: 'Shirts',
        school_id: null,
        icon: '👕',
        cost_price: 400,
        price: 650,
        variants: [
          { color: 'White', color_hex: '#ffffff', size: 'S', stock: 15 },
          { color: 'White', color_hex: '#ffffff', size: 'M', stock: 20 },
        ],
      },
      {
        name: 'Navy Trouser',
        category_id: leafId('School Uniforms', 'Trousers'),
        subcategory: 'Trousers',
        school_id: null,
        icon: '👖',
        cost_price: 700,
        price: 1150,
        variants: [
          { color: 'Navy', color_hex: '#1a3a5c', size: '28', stock: 10 },
          { color: 'Navy', color_hex: '#1a3a5c', size: '30', stock: 10 },
        ],
      },
      {
        name: 'Toughees (Kids)',
        category_id: leafId('Footwear', 'Toughees'),
        subcategory: 'Toughees',
        school_id: null,
        icon: '👞',
        cost_price: 1800,
        price: 2800,
        variants: [
          { color: 'Black', color_hex: '#000000', size: '36', stock: 6 },
          { color: 'Black', color_hex: '#000000', size: '38', stock: 6 },
        ],
      },
      {
        name: 'Canvas Backpack',
        category_id: leafId('School Bags', 'Backpacks'),
        subcategory: 'Backpacks',
        school_id: null,
        icon: '🎒',
        cost_price: 1200,
        price: 1800,
        variants: [{ color: 'Black', color_hex: '#000000', size: '18"', stock: 12 }],
      },
    ]

    const insertVariant = db.prepare(`
      INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty, attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    products.forEach((prod) => {
      const productId = uuidv4()
      db.prepare(`
        INSERT INTO products (id, name, category_id, subcategory, school_id, icon, cost_price, price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        prod.name,
        prod.category_id,
        prod.subcategory,
        prod.school_id,
        prod.icon,
        prod.cost_price,
        prod.price
      )

      prod.variants.forEach((v) => {
        insertVariant.run(
          uuidv4(),
          productId,
          v.color,
          v.color_hex,
          v.size,
          `${prod.name.split(' ')[0]}-${v.color.substring(0, 3)}-${v.size}`,
          v.stock,
          serializeVariantAttributes(v.attributes || { badge: 'plain' })
        )
      })
    })
    console.log('✅ Products & variants seeded')

    const clients = [
      { id: uuidv4(), name: 'Mary Wanjiku', phone: '0712345678', school: 'Nairobi Primary' },
      { id: uuidv4(), name: 'James Ochieng', phone: '0723456789', school: 'Langata Secondary' },
      { id: uuidv4(), name: 'Fatuma Hassan', phone: '0734567890', school: 'Eastleigh High' },
    ]
    clients.forEach((client) => {
      db.prepare('INSERT INTO clients (id, name, phone, school) VALUES (?, ?, ?, ?)').run(
        client.id,
        client.name,
        client.phone,
        client.school
      )
    })
    console.log('✅ Clients seeded')

    const sampleSales = [
      {
        receipt_no: 'MU-000038',
        client_name: 'Mary Wanjiku',
        total: 3250,
        method: 'mpesa',
        items: [
          { product_name: 'Navy Pullovers', color: 'Navy', size: 'M', qty: 2, price: 1500 },
          { product_name: 'White T-Shirts', color: 'White', size: 'L', qty: 1, price: 800 },
        ],
      },
      {
        receipt_no: 'MU-000037',
        client_name: 'Walk-in',
        total: 1700,
        method: 'cash',
        items: [
          { product_name: 'White T-Shirts', color: 'White', size: 'M', qty: 2, price: 800 },
        ],
      },
      {
        receipt_no: 'MU-000036',
        client_name: 'James Ochieng',
        total: 5400,
        method: 'card',
        items: [
          { product_name: 'Blue School Shoes', color: 'Blue', size: '40', qty: 1, price: 3500 },
          { product_name: 'Black School Bag', color: 'Black', size: '18"', qty: 1, price: 2200 },
        ],
      },
      {
        receipt_no: 'MU-000035',
        client_name: 'Walk-in',
        total: 850,
        method: 'cash',
        items: [
          { product_name: 'White T-Shirts', color: 'White', size: 'S', qty: 1, price: 800 },
        ],
      },
      {
        receipt_no: 'MU-000034',
        client_name: 'Fatuma Hassan',
        total: 2850,
        method: 'mpesa',
        items: [
          { product_name: 'Navy Trousers', color: 'Navy', size: '30', qty: 1, price: 2500 },
          { product_name: 'White T-Shirts', color: 'White', size: 'M', qty: 1, price: 800 },
        ],
      },
    ]

    sampleSales.forEach((sale) => {
      const saleId = uuidv4()
      const timeOffset = Math.floor(Math.random() * 480)
      const createdAt = new Date(Date.now() - timeOffset * 60000)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)

      db.prepare(`
        INSERT INTO sales (id, receipt_no, client_name, subtotal, tax, total, payment_method, amount_paid, change_given, status, served_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(
        saleId,
        sale.receipt_no,
        sale.client_name,
        sale.total,
        0,
        sale.total,
        sale.method,
        sale.total,
        0,
        shopkeeperId,
        createdAt
      )

      sale.items.forEach((item) => {
        db.prepare(`
          INSERT INTO sale_items (id, sale_id, variant_id, product_name, color, size, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          saleId,
          null,
          item.product_name,
          item.color,
          item.size,
          item.qty,
          item.price,
          item.price * item.qty
        )
      })
    })
    console.log('✅ Sample sales seeded')
  }

  console.log('✅ Migrations complete')
}
