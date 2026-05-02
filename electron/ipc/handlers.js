/**
 * handlers.js — registers all IPC channels.
 * Each handler is the bridge between React (renderer) and SQLite (main).
 */

const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')

const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex')

module.exports.register = function (ipcMain, db) {

  // ── Helper ─────────────────────────────────────────────────────────────────
  const handle = (channel, fn) => {
    ipcMain.handle(channel, async (_event, payload) => {
      try {
        return { ok: true, data: fn(payload) }
      } catch (err) {
        console.error(`IPC error [${channel}]:`, err.message)
        return { ok: false, error: err.message }
      }
    })
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  handle('auth:login', ({ username, pin, role }) => {
    const user = db.prepare(
      'SELECT * FROM users WHERE username = ? AND is_active = 1'
    ).get(username)
    if (!user) throw new Error('User not found')
    if (user.pin_hash !== hashPin(pin)) throw new Error('Incorrect PIN')
    if (user.role !== role) throw new Error(`Not a ${role} account`)
    const { pin_hash, ...safeUser } = user
    return safeUser
  })

  // ── Categories ─────────────────────────────────────────────────────────────
  handle('categories:getAll', () => {
    return db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
  })

  handle('categories:create', ({ name, parent_id, icon, sort_order }) => {
    const id = uuidv4()
    db.prepare(
      'INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES (?,?,?,?,?)'
    ).run(id, name, parent_id || null, icon || null, sort_order || 0)
    return { id }
  })

  handle('categories:update', ({ id, name, parent_id, icon, sort_order }) => {
    db.prepare(`
      UPDATE categories
      SET name = ?, parent_id = ?, icon = ?, sort_order = ?
      WHERE id = ?
    `).run(name, parent_id || null, icon || null, sort_order || 0, id)
    return { ok: true }
  })

  handle('categories:delete', (id) => {
    const category = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id)
    if (!category) throw new Error('Category not found')

    const productsInCategory = db.prepare(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?'
    ).get(id)

    let reassignedTo = null
    if (productsInCategory.count > 0) {
      // Keep product records valid by reassigning to a stable fallback category.
      const uncategorized = db.prepare(
        'SELECT id FROM categories WHERE name = ? LIMIT 1'
      ).get('Uncategorized')

      reassignedTo = uncategorized?.id || uuidv4()
      if (!uncategorized) {
        db.prepare(
          'INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)'
        ).run(reassignedTo, 'Uncategorized', '📦', 9999)
      }

      db.prepare(
        'UPDATE products SET category_id = ?, updated_at = datetime(\'now\') WHERE category_id = ?'
      ).run(reassignedTo, id)
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return { ok: true, reassigned_count: productsInCategory.count, reassigned_to: reassignedTo }
  })

  // ── Products ───────────────────────────────────────────────────────────────
  handle('products:getAll', (filters = {}) => {
    let query = `
      SELECT p.*, c.name as category_name,
             GROUP_CONCAT(DISTINCT pv.color) as colors,
             SUM(pv.stock_qty) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      WHERE 1 = 1
    `
    const params = []
    if (!filters.include_inactive) query += ' AND p.is_active = 1'
    if (filters.category_id) { query += ' AND p.category_id = ?'; params.push(filters.category_id) }
    if (filters.search) { query += ' AND p.name LIKE ?'; params.push(`%${filters.search}%`) }
    query += ' GROUP BY p.id ORDER BY p.name'
    return db.prepare(query).all(...params)
  })

  handle('products:getByBarcode', (barcode) => {
    const product = db.prepare(`
      SELECT p.*, c.name as category_name,
             SUM(pv.stock_qty) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      WHERE p.barcode = ? AND p.is_active = 1
      GROUP BY p.id
      LIMIT 1
    `).get(barcode)

    if (!product) throw new Error('Product not found')
    return product
  })

  handle('products:getById', (id) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    if (!product) throw new Error('Product not found')
    product.variants = db.prepare(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY color, size'
    ).all(id)
    return product
  })

  handle('products:create', ({ name, category_id, subcategory, price, barcode, description, variants }) => {
    const id = uuidv4()
    db.prepare(`
      INSERT INTO products (id, name, category_id, subcategory, price, barcode, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category_id, subcategory || null, price, barcode || null, description || null)

    // Insert variants
    if (variants && variants.length > 0) {
      const insertVariant = db.prepare(`
        INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const v of variants) {
        insertVariant.run(uuidv4(), id, v.color || null, v.color_hex || null, v.size || null, v.sku || null, v.stock_qty || 0)
      }
    }
    return { id }
  })

  handle('products:update', ({ id, name, category_id, subcategory, price, barcode, description, is_active, variants }) => {
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id)
    if (!existing) throw new Error('Product not found')

    db.prepare(`
      UPDATE products
      SET name = ?, category_id = ?, subcategory = ?, price = ?, barcode = ?, description = ?,
          is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name,
      category_id || null,
      subcategory || null,
      price,
      barcode || null,
      description || null,
      is_active === 0 || is_active === false ? 0 : 1,
      id
    )

    if (Array.isArray(variants) && variants.length > 0) {
      const insertVariant = db.prepare(`
        INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const v of variants) {
        insertVariant.run(
          uuidv4(),
          id,
          v.color || null,
          v.color_hex || null,
          v.size || null,
          v.sku || null,
          Number(v.stock_qty) || 0
        )
      }
    }

    return { ok: true }
  })

  handle('products:delete', (id) => {
    const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id)
    if (!product) throw new Error('Product not found')

    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── Stock ──────────────────────────────────────────────────────────────────
  handle('stock:getAll', () => {
    return db.prepare(`
      SELECT pv.*, p.name as product_name, p.category_id, c.name as category_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.name, pv.color, pv.size
    `).all()
  })

  handle('stock:getLow', () => {
    return db.prepare(`
      SELECT pv.*, p.name as product_name, c.name as category_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE pv.stock_qty <= 5
      ORDER BY pv.stock_qty ASC
    `).all()
  })

  handle('stock:add', ({ variant_id, quantity, note, user_id }) => {
    db.prepare(
      'UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ?'
    ).run(quantity, variant_id)
    db.prepare(
      'INSERT INTO stock_movements (id, variant_id, type, quantity, note, user_id) VALUES (?,?,?,?,?,?)'
    ).run(uuidv4(), variant_id, 'in', quantity, note || null, user_id || null)
    return { ok: true }
  })

  handle('stock:remove', ({ variant_id, quantity, note, user_id }) => {
    const variant = db.prepare('SELECT stock_qty FROM product_variants WHERE id = ?').get(variant_id)
    if (!variant) throw new Error('Variant not found')
    if (variant.stock_qty < quantity) throw new Error('Insufficient stock')
    db.prepare(
      'UPDATE product_variants SET stock_qty = stock_qty - ? WHERE id = ?'
    ).run(quantity, variant_id)
    db.prepare(
      'INSERT INTO stock_movements (id, variant_id, type, quantity, note, user_id) VALUES (?,?,?,?,?,?)'
    ).run(uuidv4(), variant_id, 'out', quantity, note || null, user_id || null)
    return { ok: true }
  })

  // ── Sales ──────────────────────────────────────────────────────────────────
  handle('sales:create', ({ client_id, client_name, items, payment_method, amount_paid, mpesa_ref, card_ref, served_by }) => {
    const subtotal = items.reduce((sum, i) => sum + i.total_price, 0)
    const tax = 0  // configure when needed
    const total = subtotal + tax
    const change_given = payment_method === 'cash' ? Math.max(0, amount_paid - total) : 0
    const saleId = uuidv4()
    const receiptNo = generateReceiptNo(db)

    // Use transaction — all or nothing
    const runSale = db.transaction(() => {
      db.prepare(`
        INSERT INTO sales (id, receipt_no, client_id, client_name, subtotal, tax, total,
          payment_method, amount_paid, change_given, mpesa_ref, card_ref, served_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(saleId, receiptNo, client_id || null, client_name || 'Walk-in',
             subtotal, tax, total, payment_method, amount_paid, change_given,
             mpesa_ref || null, card_ref || null, served_by || null)

      const insertItem = db.prepare(`
        INSERT INTO sale_items (id, sale_id, variant_id, product_name, color, size, quantity, unit_price, total_price)
        VALUES (?,?,?,?,?,?,?,?,?)
      `)
      const deductStock = db.prepare(
        'UPDATE product_variants SET stock_qty = stock_qty - ? WHERE id = ?'
      )
      const logMovement = db.prepare(
        'INSERT INTO stock_movements (id, variant_id, type, quantity, note, user_id) VALUES (?,?,?,?,?,?)'
      )

      for (const item of items) {
        insertItem.run(uuidv4(), saleId, item.variant_id, item.product_name,
          item.color, item.size, item.quantity, item.unit_price, item.total_price)
        deductStock.run(item.quantity, item.variant_id)
        logMovement.run(uuidv4(), item.variant_id, 'sale', item.quantity, `Sale ${receiptNo}`, served_by || null)
      }
    })

    runSale()
    return { id: saleId, receipt_no: receiptNo, total, change_given }
  })

  handle('sales:getToday', () => {
    const today = new Date().toISOString().split('T')[0]
    return db.prepare(`
      SELECT s.*, u.name as served_by_name
      FROM sales s
      LEFT JOIN users u ON s.served_by = u.id
      WHERE date(s.created_at) = ? AND s.status = 'completed'
      ORDER BY s.created_at DESC
    `).all(today)
  })

  handle('sales:getAll', (filters = {}) => {
    let query = `
      SELECT s.*, u.name as served_by_name FROM sales s
      LEFT JOIN users u ON s.served_by = u.id WHERE 1=1
    `
    const params = []
    if (filters.from) { query += ' AND date(s.created_at) >= ?'; params.push(filters.from) }
    if (filters.to)   { query += ' AND date(s.created_at) <= ?'; params.push(filters.to) }
    query += ' ORDER BY s.created_at DESC LIMIT 200'
    return db.prepare(query).all(...params)
  })

  handle('sales:getById', (id) => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id)
    if (!sale) throw new Error('Sale not found')
    sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
    return sale
  })

  handle('sales:getSummary', ({ from, to } = {}) => {
    const today = new Date().toISOString().split('T')[0]
    const f = from || today
    const t = to || today
    return db.prepare(`
      SELECT
        COUNT(*)            as transaction_count,
        SUM(total)          as total_revenue,
        SUM(subtotal)       as total_subtotal,
        AVG(total)          as avg_transaction,
        payment_method,
        COUNT(*) as method_count
      FROM sales
      WHERE date(created_at) BETWEEN ? AND ? AND status = 'completed'
      GROUP BY payment_method
    `).all(f, t)
  })

  handle('sales:void', (id) => {
    db.prepare("UPDATE sales SET status = 'voided' WHERE id = ?").run(id)
    return { ok: true }
  })

  // ── Clients ────────────────────────────────────────────────────────────────
  handle('clients:getAll', (search) => {
    if (search) {
      return db.prepare(
        "SELECT * FROM clients WHERE name LIKE ? OR phone LIKE ? ORDER BY name"
      ).all(`%${search}%`, `%${search}%`)
    }
    return db.prepare('SELECT * FROM clients ORDER BY name').all()
  })

  handle('clients:create', ({ name, phone, school, notes }) => {
    const id = uuidv4()
    db.prepare(
      'INSERT INTO clients (id, name, phone, school, notes) VALUES (?,?,?,?,?)'
    ).run(id, name, phone || null, school || null, notes || null)
    return { id }
  })

  handle('clients:update', ({ id, name, phone, school, notes }) => {
    db.prepare(`
      UPDATE clients SET name=?, phone=?, school=?, notes=?, updated_at=datetime('now') WHERE id=?
    `).run(name, phone || null, school || null, notes || null, id)
    return { ok: true }
  })

  // ── Users ──────────────────────────────────────────────────────────────────
  handle('users:getAll', () => {
    return db.prepare(
      'SELECT id, name, username, role, is_active, created_at FROM users ORDER BY role, name'
    ).all()
  })

  handle('users:create', ({ name, username, pin, role }) => {
    const id = uuidv4()
    db.prepare(
      'INSERT INTO users (id, name, username, pin_hash, role) VALUES (?,?,?,?,?)'
    ).run(id, name, username, hashPin(pin), role)
    return { id }
  })

  handle('users:update', ({ id, name, pin, is_active }) => {
    if (pin) {
      db.prepare(
        "UPDATE users SET name=?, pin_hash=?, is_active=?, updated_at=datetime('now') WHERE id=?"
      ).run(name, hashPin(pin), is_active, id)
    } else {
      db.prepare(
        "UPDATE users SET name=?, is_active=?, updated_at=datetime('now') WHERE id=?"
      ).run(name, is_active, id)
    }
    return { ok: true }
  })

  // ── Reports ────────────────────────────────────────────────────────────────
  handle('reports:daily', (date) => {
    const d = date || new Date().toISOString().split('T')[0]
    const summary = db.prepare(`
      SELECT COUNT(*) as transactions, SUM(total) as revenue, SUM(change_given) as change_given
      FROM sales WHERE date(created_at) = ? AND status = 'completed'
    `).get(d)
    const byMethod = db.prepare(`
      SELECT payment_method, COUNT(*) as count, SUM(total) as total
      FROM sales WHERE date(created_at) = ? AND status = 'completed'
      GROUP BY payment_method
    `).all(d)
    const topItems = db.prepare(`
      SELECT si.product_name, SUM(si.quantity) as qty_sold, SUM(si.total_price) as revenue
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE date(s.created_at) = ? AND s.status = 'completed'
      GROUP BY si.product_name ORDER BY qty_sold DESC LIMIT 10
    `).all(d)
    return { summary, byMethod, topItems }
  })

  // ── Print ──────────────────────────────────────────────────────────────────
  handle('print:receipt', (receiptData) => {
    // Phase 2: integrate node-thermal-printer here
    // For now, return data for browser print
    console.log('🖨️ Print request received:', receiptData.receipt_no)
    return { ok: true, message: 'Print queued' }
  })

  // ── Sync ───────────────────────────────────────────────────────────────────
  handle('sync:online', () => {
    // Simple connectivity check
    const https = require('https')
    return new Promise((resolve) => {
      https.get('https://8.8.8.8', () => resolve(true)).on('error', () => resolve(false))
    })
  })

  handle('sync:status', () => {
    const pending = db.prepare(
      "SELECT COUNT(*) as count FROM sync_log WHERE status = 'pending'"
    ).get()
    const last = db.prepare(
      "SELECT * FROM sync_log WHERE status = 'success' ORDER BY synced_at DESC LIMIT 1"
    ).get()
    return { pending_count: pending.count, last_sync: last?.synced_at || null }
  })
}

// ── Receipt number generator ──────────────────────────────────────────────────
function generateReceiptNo(db) {
  const last = db.prepare(
    "SELECT receipt_no FROM sales ORDER BY created_at DESC LIMIT 1"
  ).get()
  if (!last) return 'MU-000001'
  const num = parseInt(last.receipt_no.split('-')[1] || '0') + 1
  return 'MU-' + String(num).padStart(6, '0')
}
