/**
 * handlers.js — registers all IPC channels.
 * Each handler is the bridge between React (renderer) and SQLite (main).
 */

const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const {
  inferCategoryType,
  serializeVariantAttributes,
  parseVariantAttributes,
  getCategoryPathNames,
  buildCategoryTreeRows,
  flattenCategoryTree,
  resolveProductCategoryId,
  isInnerwearAlias,
  validateCategoryParent,
  validateUniqueNameUnderParent,
  getDescendantIds,
  getNextSortOrder,
  getProductAssignableLeaves,
  assertProductCategoryLeaf,
} = require('../db/categoryHelpers')

const hashPin = (pin) => crypto.createHash('sha256').update(pin).digest('hex')

function toNodeBuffer(data) {
  if (data == null) return null
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  if (data?.type === 'Buffer' && Array.isArray(data.data)) return Buffer.from(data.data)
  if (Array.isArray(data)) return Buffer.from(data)
  if (typeof data === 'object') {
    const values = Object.values(data)
    if (values.length > 0 && typeof values[0] === 'number') return Buffer.from(values)
  }
  return Buffer.from(data)
}

function bufferToIconDataUrl(buffer) {
  const buf = toNodeBuffer(buffer)
  if (!buf?.length) return null
  let mime = 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8) mime = 'image/jpeg'
  else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) mime = 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

module.exports.register = function (ipcMain, db) {

  const enrichStockRow = (row) => {
    const category_path = getCategoryPathNames(db, row.category_id)
    const root_category = category_path[0] || row.category_name
    let attributes = parseVariantAttributes(row.attributes)
    if (!attributes && row.school_id) attributes = { badge: 'badged' }
    if (!attributes) attributes = { badge: 'plain' }
    return {
      ...row,
      category_path,
      root_category,
      attributes,
      subcategory: row.subcategory || category_path[category_path.length - 1] || null,
    }
  }

  const syncProductSubcategory = (categoryId) => {
    const path = getCategoryPathNames(db, categoryId)
    return path.length > 1 ? path[path.length - 1] : path[0] || null
  }

  const normalizeProductCategory = (category_id, subcategory) => {
    const resolvedId = resolveProductCategoryId(db, category_id, subcategory)
    const sub = subcategory?.trim() || syncProductSubcategory(resolvedId)
    return { category_id: resolvedId, subcategory: sub }
  }

  const insertVariants = (productId, variants, { school_id } = {}) => {
    const insertVariant = db.prepare(`
      INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty, attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const v of variants || []) {
      const badge = v.attributes?.badge || (school_id ? 'badged' : 'plain')
      const attrs = serializeVariantAttributes(v.attributes || { badge })
      insertVariant.run(
        uuidv4(),
        productId,
        v.color || null,
        v.color_hex || null,
        v.size || null,
        v.sku || null,
        Number(v.stock_qty) || 0,
        attrs
      )
    }
  }

  // ── Helper ─────────────────────────────────────────────────────────────────
  const handle = (channel, fn) => {
    ipcMain.handle(channel, async (_event, payload) => {
      try {
        const data = await Promise.resolve(fn(payload))
        return { ok: true, data }
      } catch (err) {
        console.error(`IPC error [${channel}]:`, err.message)
        return { ok: false, error: err.message }
      }
    })
  }

  // ── Browse tree (category-driven, shows empty folders) ────────────────────
  handle('categories:getBrowseTree', () => {
    const allCategories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()

    const productCounts = new Map()
    const stockTotals = new Map()
    const products = db.prepare(`
      SELECT p.category_id, COUNT(DISTINCT p.id) as p_cnt, COALESCE(SUM(pv.stock_qty), 0) as qty
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      WHERE p.is_active = 1
      GROUP BY p.category_id
    `).all()
    for (const p of products) {
      productCounts.set(p.category_id, Number(p.p_cnt))
      stockTotals.set(p.category_id, Number(p.qty))
    }

    const catMap = new Map()
    for (const c of allCategories) {
      catMap.set(c.id, { ...c, pCount: productCounts.get(c.id) || 0, qty: stockTotals.get(c.id) || 0 })
    }

    // Accumulate leaf counts upward to parents
    for (const cat of allCategories) {
      const pCount = productCounts.get(cat.id) || 0
      const qty = stockTotals.get(cat.id) || 0
      if (pCount === 0 && qty === 0) continue
      let current = cat.parent_id ? catMap.get(cat.parent_id) : null
      while (current) {
        current.pCount += pCount
        current.qty += qty
        current = current.parent_id ? catMap.get(current.parent_id) : null
      }
    }

    const byParent = new Map()
    for (const c of allCategories) {
      const key = c.parent_id || '__root__'
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key).push(c)
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))
    }

    function walk(parentKey, depth, pathNames, parentRow = null) {
      let nodes = byParent.get(parentKey) || []
      let sawInnerwearRoot = false
      nodes = nodes.filter((c) => {
        if (parentKey === '__root__' && isInnerwearAlias(c.name)) {
          if (sawInnerwearRoot) return false
          sawInnerwearRoot = true
        }
        if (parentRow && isInnerwearAlias(parentRow.name) && isInnerwearAlias(c.name)) return false
        return true
      })

      return nodes.map((c) => {
        const path = [...pathNames, c.name]
        const children = walk(c.id, depth + 1, path, c)
        const enriched = catMap.get(c.id) || c
        return {
          ...c,
          depth,
          path,
          path_label: path.join(' › '),
          is_leaf: children.length === 0,
          product_count: enriched.pCount || 0,
          total_qty: enriched.qty || 0,
          children,
        }
      })
    }
    return walk('__root__', 0, [])
  })

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
    const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
    const prodCounts = db.prepare(`
      SELECT category_id, COUNT(*) as cnt FROM products WHERE is_active = 1 GROUP BY category_id
    `).all()
    const countMap = new Map(prodCounts.map(p => [p.category_id, p.cnt]))
    return rows.map((c) => ({
      ...c,
      path: getCategoryPathNames(db, c.id),
      path_label: getCategoryPathNames(db, c.id).join(' › '),
      product_count: countMap.get(c.id) || 0,
    }))
  })

  // Alias for AdminDevTools
  handle('categories:list', () => {
    const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    return rows.map((c) => ({
      ...c,
      path: getCategoryPathNames(db, c.id),
      path_label: getCategoryPathNames(db, c.id).join(' › '),
    }));
  });

  handle('categories:getTree', () => {
    const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
    return buildCategoryTreeRows(rows)
  })

  handle('categories:getLeaves', () => {
    const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
    const tree = buildCategoryTreeRows(rows)
    return flattenCategoryTree(tree, { leavesOnly: true })
  })

  handle('categories:getProductLeaves', () => getProductAssignableLeaves(db))

  handle('categories:create', ({ name, parent_id, icon, sort_order, type }) => {
    const parentId = parent_id || null
    validateCategoryParent(db, null, parentId)
    const trimmedName = validateUniqueNameUnderParent(db, name, parentId)
    const parentRow = parentId
      ? db.prepare('SELECT * FROM categories WHERE id = ?').get(parentId)
      : null
    const id = uuidv4()
    const resolvedType = type || inferCategoryType(parentRow)
    const resolvedSort = sort_order ?? getNextSortOrder(db, parentId)
    db.prepare(
      'INSERT INTO categories (id, name, parent_id, icon, sort_order, type) VALUES (?,?,?,?,?,?)'
    ).run(id, trimmedName, parentId, icon || null, resolvedSort, resolvedType)
    return { id }
  })

  handle('categories:update', ({ id, name, parent_id, icon, sort_order, type }) => {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
    if (!existing) throw new Error('Category not found')

    const parentId = parent_id || null
    validateCategoryParent(db, id, parentId)
    const trimmedName = validateUniqueNameUnderParent(db, name, parentId, id)

    const parentRow = parentId
      ? db.prepare('SELECT * FROM categories WHERE id = ?').get(parentId)
      : null
    const parentChanged = (parentId || null) !== (existing.parent_id || null)
    const resolvedType = type || (parentChanged ? inferCategoryType(parentRow) : (existing.type || inferCategoryType(parentRow)))
    db.prepare(`
      UPDATE categories
      SET name = ?, parent_id = ?, icon = ?, sort_order = ?, type = ?
      WHERE id = ?
    `).run(
      trimmedName,
      parentId,
      icon ?? existing.icon ?? null,
      sort_order ?? existing.sort_order ?? 0,
      resolvedType,
      id
    )
    return { ok: true }
  })

  handle('categories:delete', (id) => {
    const category = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id)
    if (!category) throw new Error('Category not found')

    const childCount = db.prepare(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?'
    ).get(id)
    if (childCount.count > 0) {
      throw new Error('Delete or reassign subcategories first')
    }

    const productsInCategory = db.prepare(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?'
    ).get(id)

    let reassignedTo = null
    if (productsInCategory.count > 0) {
      const uncategorized = db.prepare(
        'SELECT id FROM categories WHERE name = ? LIMIT 1'
      ).get('Uncategorized')

      reassignedTo = uncategorized?.id || uuidv4()
      if (!uncategorized) {
        db.prepare(
          "INSERT INTO categories (id, name, icon, sort_order, type) VALUES (?, ?, ?, ?, 'root')"
        ).run(reassignedTo, 'Uncategorized', '📦', 9999)
      }

      db.prepare(
        'UPDATE products SET category_id = ?, updated_at = datetime(\'now\') WHERE category_id = ?'
      ).run(reassignedTo, id)
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return { ok: true, reassigned_count: productsInCategory.count, reassigned_to: reassignedTo }
  })

  handle('categories:uploadIcon', ({ category_id, file }) => {
    if (!file || !file.data) {
      throw new Error('No file data provided')
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image file is too large (max 5MB)')
    }
    const allowedMimeTypes = ['image/jpeg', 'image/png']
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error('Invalid file format. Only JPEG and PNG are allowed.')
    }

    const buffer = toNodeBuffer(file.data)
    if (!buffer?.length) throw new Error('Invalid file data')

    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
    if (!isJpeg && !isPng) {
      throw new Error('Invalid image file. Only genuine JPEG and PNG files are accepted.')
    }

    db.prepare('UPDATE categories SET icon_data = ? WHERE id = ?').run(buffer, category_id)
    const dataUrl = bufferToIconDataUrl(buffer)
    return { size: file.size, mimeType: isJpeg ? 'image/jpeg' : 'image/png', dataUrl }
  })

  handle('categories:getIcon', ({ category_id }) => {
    const row = db.prepare('SELECT icon_data FROM categories WHERE id = ?').get(category_id)
    if (!row?.icon_data) return null
    return bufferToIconDataUrl(row.icon_data)
  })

  handle('categories:deleteIcon', ({ category_id }) => {
    db.prepare('UPDATE categories SET icon_data = NULL WHERE id = ?').run(category_id)
    return { ok: true }
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
    const rows = db.prepare(query).all(...params)
    return rows.map((p) => {
      const path = getCategoryPathNames(db, p.category_id)
      const school = p.school_id
        ? db.prepare('SELECT name FROM categories WHERE id = ?').get(p.school_id)
        : null
      return {
        ...p,
        category_path: path,
        path_label: path.length ? path.join(' › ') : p.category_name || 'Uncategorized',
        school_name: school?.name || null,
      }
    })
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

  handle('products:create', ({ name, category_id, subcategory, school_id, icon, cost_price, price, barcode, description, variants }) => {
    assertProductCategoryLeaf(db, category_id)
    const id = uuidv4()
    const { category_id: catId, subcategory: sub } = normalizeProductCategory(category_id, subcategory)
    try {
      db.prepare(`
        INSERT INTO products (id, name, category_id, subcategory, school_id, icon, cost_price, price, barcode, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, catId, sub || null, school_id || null, icon || null, cost_price || 0, price, barcode || null, description || null)

      if (variants && variants.length > 0) {
        insertVariants(id, variants, { school_id })
      }
      return { id }
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed: products.barcode')) {
        throw new Error(`Barcode "${barcode}" is already assigned to another product.`)
      }
      throw err
    }
  })

  handle('products:update', ({ id, name, category_id, subcategory, school_id, icon, cost_price, price, barcode, description, is_active, variants }) => {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    if (!existing) throw new Error('Product not found')

    const merged = {
      name: name ?? existing.name,
      category_id: category_id ?? existing.category_id,
      subcategory: subcategory !== undefined ? subcategory : existing.subcategory,
      school_id: school_id !== undefined ? school_id : existing.school_id,
      icon: icon !== undefined ? icon : existing.icon,
      cost_price: cost_price !== undefined ? cost_price : existing.cost_price,
      price: price !== undefined ? price : existing.price,
      barcode: barcode !== undefined ? barcode : existing.barcode,
      description: description !== undefined ? description : existing.description,
      is_active: is_active !== undefined ? is_active : existing.is_active,
    }

    if (merged.category_id) assertProductCategoryLeaf(db, merged.category_id)

    const { category_id: catId, subcategory: sub } = normalizeProductCategory(
      merged.category_id,
      merged.subcategory
    )

    try {
      db.prepare(`
        UPDATE products
        SET name = ?, category_id = ?, subcategory = ?, school_id = ?, icon = ?, cost_price = ?, price = ?, barcode = ?, description = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        merged.name,
        catId || null,
        sub || null,
        merged.school_id || null,
        merged.icon || null,
        merged.cost_price || 0,
        merged.price,
        merged.barcode || null,
        merged.description || null,
        merged.is_active ?? 1,
        id
      )

      if (Array.isArray(variants)) {
        db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id)
        insertVariants(id, variants, { school_id: merged.school_id })
      }
      return { ok: true }
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed: products.barcode')) {
        throw new Error(`Barcode "${barcode}" is already assigned to another product.`)
      }
      throw err
    }
  })

  handle('products:delete', (id) => {
    const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id)
    if (!product) throw new Error('Product not found')

    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id)
    db.prepare('DELETE FROM products WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── Variants (direct management) ───────────────────────────────────────────
  handle('variants:list', (productId) => {
    if (!productId) throw new Error('productId required');
    const rows = db.prepare(`
    SELECT pv.*, p.name as product_name
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE pv.product_id = ?
    ORDER BY pv.color, pv.size
  `).all(productId);
    return rows.map(v => ({
      ...v,
      attributes: parseVariantAttributes(v.attributes),
    }));
  });

  handle('variants:create', ({ product_id, color, color_hex, size, sku, stock_qty, attributes }) => {
    if (!product_id) throw new Error('product_id required');
    const product = db.prepare('SELECT id, school_id FROM products WHERE id = ?').get(product_id);
    if (!product) throw new Error('Product not found');

    const id = uuidv4();
    const finalSku = sku?.trim() || `${product_id.slice(0, 8)}-${color || ''}-${size || ''}`;
    const badge = attributes?.badge || (product.school_id ? 'badged' : 'plain');
    const attrs = serializeVariantAttributes(attributes || { badge });

    try {
      db.prepare(`
      INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty, attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, product_id, color || null, color_hex || null, size || null, finalSku, stock_qty || 0, attrs);
      return { id };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed: product_variants.sku')) {
        throw new Error(`SKU "${finalSku}" already exists`);
      }
      throw err;
    }
  });

  handle('variants:update', ({ id, color, color_hex, size, sku, stock_qty, attributes }) => {
    const existing = db.prepare('SELECT id FROM product_variants WHERE id = ?').get(id);
    if (!existing) throw new Error('Variant not found');

    const variantRow = db.prepare(`
    SELECT pv.*, p.school_id FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE pv.id = ?
  `).get(id);
    const badge = attributes?.badge || (variantRow.school_id ? 'badged' : 'plain');
    const attrs = serializeVariantAttributes(attributes || { badge });
    const finalSku = sku?.trim() || variantRow.sku;

    try {
      db.prepare(`
      UPDATE product_variants
      SET color = ?, color_hex = ?, size = ?, sku = ?, stock_qty = ?, attributes = ?
      WHERE id = ?
    `).run(color || null, color_hex || null, size || null, finalSku, stock_qty || 0, attrs, id);
      return { ok: true };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed: product_variants.sku')) {
        throw new Error(`SKU "${finalSku}" already exists`);
      }
      throw err;
    }
  });

  handle('variants:delete', (id) => {
    const variant = db.prepare('SELECT id FROM product_variants WHERE id = ?').get(id);
    if (!variant) throw new Error('Variant not found');
    const usedInSales = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE variant_id = ?').get(id);
    if (usedInSales.count > 0) {
      throw new Error('Cannot delete variant that has been sold. Consider marking product inactive instead.');
    }
    db.prepare('DELETE FROM product_variants WHERE id = ?').run(id);
    return { ok: true };
  });

  /** Bulk import: each row = { name, category_id, subcategory, school_id, price, cost_price, barcode, icon, description, color, size, sku, stock_qty } */
  handle('products:importMapped', ({ rows, default_category_id }) => {
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('No import rows')

    const summary = { imported: 0, failed: [] }

    const runBatch = db.transaction((list) => {
      for (const r of list) {
        try {
          const name = String(r.name || '').trim()
          if (!name) throw new Error('Missing name')
          const categoryId = r.category_id || default_category_id
          if (!categoryId) throw new Error('Missing category')
          const { category_id: catId, subcategory: sub } = normalizeProductCategory(categoryId, r.subcategory)
          const price = Number(r.price)
          if (!Number.isFinite(price) || price < 0) throw new Error('Invalid price')

          const id = uuidv4()
          db.prepare(`
            INSERT INTO products (id, name, category_id, subcategory, school_id, icon, cost_price, price, barcode, description)
            VALUES (?,?,?,?,?,?,?,?,?,?)
          `).run(
            id,
            name,
            catId,
            sub || null,
            r.school_id || null,
            r.icon || '📦',
            Number(r.cost_price) || 0,
            price,
            r.barcode ? String(r.barcode).trim() || null : null,
            r.description || null
          )
          const badge = r.school_id ? 'badged' : 'plain'
          db.prepare(`
            INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty, attributes)
            VALUES (?,?,?,?,?,?,?,?)
          `).run(
            uuidv4(),
            id,
            (r.color && String(r.color).trim()) || '—',
            r.color_hex || null,
            (r.size && String(r.size).trim()) || '—',
            r.sku ? String(r.sku).trim() || null : null,
            Math.max(0, Number(r.stock_qty) || 0),
            serializeVariantAttributes({ badge })
          )
          summary.imported += 1
        } catch (err) {
          summary.failed.push({ name: r.name, error: err.message })
        }
      }
    })

    runBatch(rows)
    return summary
  })

  // ── Stock ──────────────────────────────────────────────────────────────────
  handle('stock:getAll', () => {
    const rows = db.prepare(`
      SELECT pv.*,
             p.name as product_name,
             p.price,
             p.icon,
             p.barcode as product_barcode,
             p.category_id,
             p.subcategory,
             p.school_id,
             c.name as category_name,
             sch.name as school_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sch ON p.school_id = sch.id
      WHERE p.is_active = 1
      ORDER BY p.name, pv.color, pv.size
    `).all()
    return rows.map(enrichStockRow)
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

  handle('stock:adjust', ({ variant_id, quantity, note, user_id }) => {
    if (quantity === 0) throw new Error('Quantity must be non-zero');
    const isAdd = quantity > 0;
    const type = isAdd ? 'in' : 'out';
    const absQty = Math.abs(quantity);
    if (!isAdd) {
      const variant = db.prepare('SELECT stock_qty FROM product_variants WHERE id = ?').get(variant_id);
      if (!variant) throw new Error('Variant not found');
      if (variant.stock_qty < absQty) throw new Error('Insufficient stock');
    }
    db.prepare('UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ?').run(quantity, variant_id);
    db.prepare(`
    INSERT INTO stock_movements (id, variant_id, type, quantity, note, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), variant_id, type, absQty, note || null, user_id || null);
    return { ok: true };
  });

  // ── Sales ──────────────────────────────────────────────────────────────────
  handle('sales:create', ({ client_id, client_name, items, payment_method, amount_paid, mpesa_ref, card_ref, served_by }) => {
    const subtotal = items.reduce((sum, i) => sum + i.total_price, 0)
    const tax = 0
    const total = subtotal + tax
    const change_given = payment_method === 'cash' ? Math.max(0, amount_paid - total) : 0
    const saleId = uuidv4()
    const receiptNo = generateReceiptNo(db)

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
        const variant = db.prepare(
          'SELECT pv.stock_qty, p.is_active, p.name as product_name FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE pv.id = ?'
        ).get(item.variant_id)
        if (!variant) throw new Error('Variant not found')
        if (!variant.is_active) throw new Error(`"${variant.product_name}" is inactive and cannot be sold`)
        if (variant.stock_qty < item.quantity) {
          throw new Error(`Insufficient stock for "${item.product_name}" (have ${variant.stock_qty}, need ${item.quantity})`)
        }
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
      SELECT DISTINCT s.*, u.name as served_by_name
      FROM sales s
      LEFT JOIN users u ON s.served_by = u.id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE 1=1
    `
    const params = []
    if (filters.from) { query += ' AND date(s.created_at) >= ?'; params.push(filters.from) }
    if (filters.to)   { query += ' AND date(s.created_at) <= ?'; params.push(filters.to) }
    // Search is handled client-side on SalesPage (receipt, client, amount).
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

  handle('clients:getById', (id) => {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
    if (!client) throw new Error('Client not found')
    return client
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
      `SELECT id, name, username, role, is_active, created_at, deleted_at
       FROM users
       WHERE COALESCE(hidden_from_ui, 0) = 0
       ORDER BY role, name`
    ).all()
  })

  handle('users:create', ({ name, username, pin, role }) => {
    const id = uuidv4()
    db.prepare(
      'INSERT INTO users (id, name, username, pin_hash, role) VALUES (?,?,?,?,?)'
    ).run(id, name, username, hashPin(pin), role)
    return { id }
  })

  handle('users:update', ({ id, name, username, role, pin, is_active, actingUserId }) => {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!existing) throw new Error('User not found')

    const finalName = name ?? existing.name
    const finalUsername = username ?? existing.username
    const finalRole = role ?? existing.role
    const finalActive = is_active !== undefined ? is_active : existing.is_active

    if (actingUserId && id === actingUserId && finalActive === 0) {
      throw new Error('You cannot deactivate your own account')
    }

    if (pin) {
      db.prepare(
        "UPDATE users SET name=?, username=?, role=?, pin_hash=?, is_active=?, updated_at=datetime('now') WHERE id=?"
      ).run(finalName, finalUsername, finalRole, hashPin(pin), finalActive, id)
    } else {
      db.prepare(
        "UPDATE users SET name=?, username=?, role=?, is_active=?, updated_at=datetime('now') WHERE id=?"
      ).run(finalName, finalUsername, finalRole, finalActive, id)
    }
    return { ok: true }
  })

  const parseUserAction = (arg) => {
    if (typeof arg === 'string') return { id: arg }
    if (arg && typeof arg === 'object') return { id: arg.id, actingUserId: arg.actingUserId }
    return { id: null }
  }

  handle('users:delete', (arg) => {
    const { id, actingUserId } = parseUserAction(arg)
    if (!id) throw new Error('User id required')
    if (actingUserId && id === actingUserId) {
      throw new Error('You cannot delete your own account')
    }
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id)
    if (!user) throw new Error('User not found')
    db.prepare(
      "UPDATE users SET is_active = 0, deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(id)
    return { ok: true }
  })

  handle('users:restore', (id) => {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id)
    if (!user) throw new Error('User not found')
    db.prepare(
      "UPDATE users SET is_active = 1, deleted_at = NULL, hidden_from_ui = 0, updated_at = datetime('now') WHERE id = ?"
    ).run(id)
    return { ok: true }
  })

  handle('users:removeFromUi', (id) => {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id)
    if (!user) throw new Error('User not found')
    db.prepare(
      "UPDATE users SET is_active = 0, deleted_at = COALESCE(deleted_at, datetime('now')), hidden_from_ui = 1, updated_at = datetime('now') WHERE id = ?"
    ).run(id)
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

  handle('reports:inventorySummary', () => {
    return db.prepare(`
      SELECT COALESCE(SUM(pv.stock_qty * p.cost_price), 0) as inventory_value,
             COALESCE(SUM(pv.stock_qty), 0) as units
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE p.is_active = 1
    `).get()
  })

  handle('reports:salesByCategory', ({ from, to } = {}) => {
    const today = new Date().toISOString().split('T')[0]
    const f = from || today
    const t = to || today
    return db.prepare(`
      SELECT COALESCE(c.name, 'Uncategorized') as category,
             SUM(si.total_price) as revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN product_variants pv ON si.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE date(s.created_at) BETWEEN date(?) AND date(?) AND s.status = 'completed'
      GROUP BY c.name
      ORDER BY revenue DESC
    `).all(f, t)
  })

  handle('reports:itemsSoldInRange', ({ from, to } = {}) => {
    const today = new Date().toISOString().split('T')[0]
    const f = from || today
    const t = to || today
    return db.prepare(`
      SELECT COALESCE(SUM(si.quantity), 0) as items_sold
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.created_at) BETWEEN date(?) AND date(?) AND s.status = 'completed'
    `).get(f, t)
  })

  // ── POS favorites (pinned variants) ────────────────────────────────────────
  handle('favorites:list', () => {
    const rows = db.prepare(`
      SELECT pv.*, p.name as product_name, p.price, p.icon, p.barcode as product_barcode,
             p.subcategory, p.school_id, p.category_id, c.name as category_name, f.sort_order
      FROM pos_favorites f
      JOIN product_variants pv ON f.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY f.sort_order ASC, f.created_at ASC
    `).all()
    return rows.map(enrichStockRow)
  })

  handle('favorites:add', ({ variant_id }) => {
    if (!variant_id) throw new Error('variant_id required')
    const v = db.prepare('SELECT id FROM product_variants WHERE id = ?').get(variant_id)
    if (!v) throw new Error('Variant not found')
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM pos_favorites').get()
    db.prepare('INSERT OR IGNORE INTO pos_favorites (variant_id, sort_order) VALUES (?, ?)').run(
      variant_id,
      (maxSort?.m || 0) + 1
    )
    return { ok: true }
  })

  handle('favorites:remove', ({ variant_id }) => {
    db.prepare('DELETE FROM pos_favorites WHERE variant_id = ?').run(variant_id)
    return { ok: true }
  })

  // ── Print ──────────────────────────────────────────────────────────────────
  const { printThermalReceipt } = require('./printReceipt')
  handle('print:receipt', async (receiptData) => {
    const result = await printThermalReceipt(receiptData)
    console.log('🖨️ Print:', receiptData?.receipt_no, result)
    return result
  })

  // ── Sync ───────────────────────────────────────────────────────────────────
  handle('sync:online', () => {
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
  let num = 1
  const last = db.prepare(
    "SELECT receipt_no FROM sales ORDER BY receipt_no DESC LIMIT 1"
  ).get()

  if (last && last.receipt_no.includes('-')) {
    num = parseInt(last.receipt_no.split('-')[1] || '0') + 1
  }

  let receiptNo = 'MU-' + String(num).padStart(6, '0')

  while (db.prepare('SELECT id FROM sales WHERE receipt_no = ?').get(receiptNo)) {
    num++
    receiptNo = 'MU-' + String(num).padStart(6, '0')
  }

  return receiptNo
}