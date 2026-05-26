/**
 * Category tree helpers — seeding, migration, UUID normalization, path resolution.
 * All new category/product IDs use uuid v4 for multi-environment sync safety.
 */

const { v4: uuidv4 } = require('uuid')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Default subcategories per root category name (canonical labels). */
const DEFAULT_SUBCATEGORIES = {
  'School Uniforms': [
    'Pullovers', 'Shirts', 'Trousers', 'Dresses', 'Windbreakers', 'Socks', 'Skirts', 'Marvins', 'Gloves',
  ],
  'Games Attires': [
    'T-Shirts', 'Tracksuits', 'Games Shorts', 'Wrappers/Bloomers', 'Jersey', 'Girls Shorts',
  ],
  'Footwear': [
    'Toughees', 'Studeez', 'Semi-Toughees', 'Rubber Shoes', 'Slippers', 'Crocs', 'Bata Breathers',
  ],
  'Inner Wear': ['Boxers', 'Panties', 'Vests', 'Sports Bra',
  ],
  'Beddings': ['Blankets', 'Bed Covers', 'Bedsheets', 'Pajamas', 'Nightdress', 'Towels',
  ],
  'School Bags': ['Backpacks', 'Duffel Bags', 'Lunch Bags'],
}

const DEFAULT_SCHOOLS = [
  'Londiani Christian Academy',
  'Londiani Girls',
  'Londiani Boys',
  'Baraka Senior',
  'Sacred Hills',
  'Township Senior',
  'Kimasian Boys',
  'Lelu',
  'Chepseon Complex',
  'Bethel',
  'Bishop Ndingi',
  'Kedowa Girls',
  'Londiani Township',
  'Finch',
  'Baraka',
  'Kapkondoo',
  'Cheres',
  'Kipsirichet',
  'Kalyet',
]

const LCA_PHASES = ['Primary', 'Junior Secondary']

function isUuid(id) {
  return typeof id === 'string' && UUID_RE.test(id)
}

function normalizeRootName(name) {
  if (!name) return name
  if (name === 'Inner Wear') return 'Innerwear'
  return name
}

function inferCategoryType(parentRow) {
  if (!parentRow) return 'root'
  const parentType = parentRow.type || 'category'
  const parentName = parentRow.name || ''

  if (parentType === 'root' && parentName === 'Schools') return 'school'
  if (parentType === 'school' && parentName === 'Londiani Christian Academy') return 'phase'
  if (parentType === 'root') return 'subcategory'
  if (parentType === 'school') return 'subcategory'
  if (parentType === 'phase') return 'subcategory'
  return 'subcategory'
}

function serializeVariantAttributes(attrs) {
  if (attrs == null) return null
  if (typeof attrs === 'string') return attrs
  try {
    return JSON.stringify(attrs)
  } catch {
    return null
  }
}

function parseVariantAttributes(raw) {
  if (raw == null || raw === '') return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function findCategoryByName(db, { name, parentId = null }) {
  if (parentId == null) {
    return db.prepare(
      'SELECT * FROM categories WHERE name COLLATE NOCASE = ? AND parent_id IS NULL LIMIT 1'
    ).get(name)
  }
  return db.prepare(
    'SELECT * FROM categories WHERE name COLLATE NOCASE = ? AND parent_id = ? LIMIT 1'
  ).get(name, parentId)
}

function ensureCategory(db, { name, parentId = null, icon = null, sortOrder = 0, type = null }) {
  const existing = findCategoryByName(db, { name, parentId })
  if (existing) return existing

  const parentRow = parentId
    ? db.prepare('SELECT * FROM categories WHERE id = ?').get(parentId)
    : null
  const resolvedType = type || inferCategoryType(parentRow)
  const id = uuidv4()

  db.prepare(
    'INSERT INTO categories (id, name, parent_id, icon, sort_order, type) VALUES (?,?,?,?,?,?)'
  ).run(id, name, parentId, icon, sortOrder, resolvedType)

  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
}

/** Seed default subcategories under existing root categories (idempotent). */
function seedDefaultSubcategories(db) {
  const roots = db.prepare(
    "SELECT * FROM categories WHERE parent_id IS NULL AND name != 'Schools' ORDER BY sort_order, name"
  ).all()

  for (const root of roots) {
    const key = root.name === 'Inner Wear' ? 'Inner Wear' : root.name
    const subs = DEFAULT_SUBCATEGORIES[key] || DEFAULT_SUBCATEGORIES[normalizeRootName(root.name)] || []
    subs.forEach((subName, idx) => {
      ensureCategory(db, {
        name: subName,
        parentId: root.id,
        sortOrder: idx,
        type: 'subcategory',
      })
    })
  }

  const schoolsRoot = findCategoryByName(db, { name: 'Schools' })
  if (schoolsRoot) {
    DEFAULT_SCHOOLS.forEach((schoolName, idx) => {
      const school = ensureCategory(db, {
        name: schoolName,
        parentId: schoolsRoot.id,
        icon: '🏫',
        sortOrder: idx,
        type: 'school',
      })
      if (schoolName === 'Londiani Christian Academy') {
        LCA_PHASES.forEach((phase, pIdx) => {
          ensureCategory(db, {
            name: phase,
            parentId: school.id,
            sortOrder: pIdx,
            type: 'phase',
          })
        })
      }
    })
  }
}

function isInnerwearAlias(name) {
  const n = String(name || '').trim()
  return n === 'Innerwear' || n === 'Inner Wear'
}

/**
 * Canonicalize Innerwear and remove duplicate root/child rows.
 * Reassigns products from bogus "Innerwear" child folders to real subcategory leaves.
 */
function reconcileInnerwearCategories(db) {
  const roots = db.prepare(`
    SELECT id, name, parent_id, sort_order
    FROM categories
    WHERE parent_id IS NULL AND (name = 'Innerwear' OR name = 'Inner Wear')
    ORDER BY
      (SELECT COUNT(*) FROM products WHERE category_id = categories.id) DESC,
      sort_order,
      name
  `).all()

  if (roots.length === 0) return { removed: 0, canonicalId: null }

  const canonical = roots[0]
  db.prepare("UPDATE categories SET name = 'Inner Wear', type = 'root' WHERE id = ?").run(canonical.id)

  let removed = 0

  const mergeRootIntoCanonical = (dupId) => {
    db.prepare('UPDATE categories SET parent_id = ? WHERE parent_id = ?').run(canonical.id, dupId)
    db.prepare('UPDATE products SET category_id = ? WHERE category_id = ?').run(canonical.id, dupId)
    db.prepare('UPDATE products SET school_id = ? WHERE school_id = ?').run(canonical.id, dupId)
    db.prepare('DELETE FROM categories WHERE id = ?').run(dupId)
    removed += 1
  }

  for (const dup of roots.slice(1)) {
    mergeRootIntoCanonical(dup.id)
  }

  const updateProduct = db.prepare(`
    UPDATE products
    SET category_id = ?, subcategory = ?, updated_at = datetime('now')
    WHERE id = ?
  `)

  const misplaced = db.prepare(`
    SELECT c.id, c.name, c.parent_id
    FROM categories c
    WHERE c.parent_id IS NOT NULL AND (c.name = 'Innerwear' OR c.name = 'Inner Wear')
  `).all()

  for (const row of misplaced) {
    const parent = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(row.parent_id)
    const parentIsInnerwear = parent && (isInnerwearAlias(parent.name) || parent.id === canonical.id)

    const childCats = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(row.id)
    for (const ch of childCats) {
      db.prepare('UPDATE categories SET parent_id = ? WHERE parent_id = ?').run(canonical.id, ch.id)
    }

    const products = db.prepare('SELECT id, subcategory FROM products WHERE category_id = ?').all(row.id)
    for (const p of products) {
      const subName = String(p.subcategory || '').trim() || 'Boxers'
      let leaf =
        findCategoryByName(db, { name: subName, parentId: canonical.id }) ||
        findCategoryByName(db, { name: subName, parentId: parent?.id })

      if (!leaf && parentIsInnerwear) {
        leaf = ensureCategory(db, {
          name: subName,
          parentId: canonical.id,
          sortOrder: 0,
          type: 'subcategory',
        })
      }

      if (leaf) {
        updateProduct.run(leaf.id, leaf.name, p.id)
      } else if (parent) {
        updateProduct.run(parent.id, subName, p.id)
      } else {
        updateProduct.run(canonical.id, subName, p.id)
      }
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(row.id)
    removed += 1
  }

  return { removed, canonicalId: canonical.id }
}

/** Move products from root categories to leaf subcategory rows; keep subcategory text in sync. */
function migrateProductsToLeafCategories(db) {
  const products = db.prepare(`
    SELECT p.id, p.category_id, p.subcategory, c.name as root_name, c.parent_id as cat_parent_id
    FROM products p
    JOIN categories c ON p.category_id = c.id
  `).all()

  const updateProduct = db.prepare(`
    UPDATE products
    SET category_id = ?, subcategory = ?, updated_at = datetime('now')
    WHERE id = ?
  `)

  for (const p of products) {
    const subName = String(p.subcategory || '').trim()
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(p.category_id)
    if (!cat) continue

    const isRoot = cat.parent_id == null
    const isLeaf = !db.prepare('SELECT 1 FROM categories WHERE parent_id = ? LIMIT 1').get(cat.id)

    if (isRoot && subName) {
      const leaf = findCategoryByName(db, { name: subName, parentId: cat.id })
        || findCategoryByName(db, { name: subName, parentId: null })
      if (leaf && leaf.id !== cat.id) {
        updateProduct.run(leaf.id, leaf.name, p.id)
      }
    } else if (isLeaf && !subName) {
      updateProduct.run(cat.id, cat.name, p.id)
    } else if (isLeaf && subName && subName !== cat.name) {
      const sibling = findCategoryByName(db, { name: subName, parentId: cat.parent_id })
      if (sibling) {
        updateProduct.run(sibling.id, sibling.name, p.id)
      }
    }
  }
}

/** Walk from leaf category up to root; returns names root → leaf. */
function getCategoryPathNames(db, categoryId) {
  if (!categoryId) return []
  const names = []
  let current = db.prepare('SELECT id, name, parent_id FROM categories WHERE id = ?').get(categoryId)
  const guard = new Set()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    names.unshift(current.name)
    current = current.parent_id
      ? db.prepare('SELECT id, name, parent_id FROM categories WHERE id = ?').get(current.parent_id)
      : null
  }
  return names
}

function getRootCategory(db, categoryId) {
  const path = getCategoryPathNames(db, categoryId)
  return path[0] || null
}

/** Replace slug / legacy ids with UUIDs across categories and referencing tables. */
function migrateLegacyIdsToUuids(db) {
  const categories = db.prepare('SELECT * FROM categories').all()
  const legacyCats = categories.filter((c) => !isUuid(c.id))
  if (legacyCats.length === 0) return { categories: 0, products: 0 }

  const idMap = new Map()
  for (const cat of legacyCats) {
    idMap.set(cat.id, uuidv4())
  }

  const legacyProducts = db.prepare('SELECT id FROM products').all().filter((p) => !isUuid(p.id))
  const productMap = new Map()
  for (const p of legacyProducts) {
    productMap.set(p.id, uuidv4())
  }

  db.pragma('foreign_keys = OFF')
  try {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, parent_id, icon, sort_order, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const cat of legacyCats) {
      const newId = idMap.get(cat.id)
      const newParent = cat.parent_id ? (idMap.get(cat.parent_id) || cat.parent_id) : null
      insertCat.run(newId, cat.name, newParent, cat.icon, cat.sort_order, cat.type || 'category', cat.created_at)
    }

    for (const [oldId, newId] of idMap) {
      db.prepare('UPDATE categories SET parent_id = ? WHERE parent_id = ?').run(newId, oldId)
      db.prepare('UPDATE products SET category_id = ? WHERE category_id = ?').run(newId, oldId)
      db.prepare('UPDATE products SET school_id = ? WHERE school_id = ?').run(newId, oldId)
    }

    for (const cat of legacyCats) {
      db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id)
    }

    // Product IDs are TEXT and can remain legacy safely; avoid risky FK churn on live installs.
  } finally {
    db.pragma('foreign_keys = ON')
  }

  return { categories: legacyCats.length, products: legacyProducts.length }
}

function buildCategoryTreeRows(categories) {
  const byParent = new Map()
  for (const c of categories) {
    const key = c.parent_id || '__root__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(c)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))
  }

  function walk(parentKey, depth, pathNames) {
    const nodes = byParent.get(parentKey) || []
    return nodes.map((c) => {
      const path = [...pathNames, c.name]
      const children = walk(c.id, depth + 1, path)
      return {
        ...c,
        depth,
        path,
        path_label: path.join(' › '),
        is_leaf: children.length === 0,
        children,
      }
    })
  }

  return walk('__root__', 0, [])
}

function flattenCategoryTree(tree, { leavesOnly = false } = {}) {
  const out = []
  function visit(nodes) {
    for (const n of nodes) {
      if (!leavesOnly || n.is_leaf) out.push(n)
      if (n.children?.length) visit(n.children)
    }
  }
  visit(tree)
  return out
}

function resolveProductCategoryId(db, categoryId, subcategory) {
  if (!categoryId) return null
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId)
  if (!cat) return categoryId

  const hasChildren = db.prepare(
    'SELECT 1 as ok FROM categories WHERE parent_id = ? LIMIT 1'
  ).get(cat.id)
  if (!hasChildren) return cat.id

  const sub = String(subcategory || '').trim()
  if (sub) {
    const underParent = findCategoryByName(db, { name: sub, parentId: cat.id })
    if (underParent) return underParent.id
    const globalLeaf = db.prepare(`
      SELECT c.id FROM categories c
      WHERE c.name = ? AND c.parent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM categories ch WHERE ch.parent_id = c.id)
      LIMIT 1
    `).get(sub)
    if (globalLeaf) return globalLeaf.id
  }
  return cat.id
}

module.exports = {
  UUID_RE,
  isUuid,
  inferCategoryType,
  serializeVariantAttributes,
  parseVariantAttributes,
  findCategoryByName,
  ensureCategory,
  seedDefaultSubcategories,
  migrateProductsToLeafCategories,
  getCategoryPathNames,
  getRootCategory,
  migrateLegacyIdsToUuids,
  buildCategoryTreeRows,
  flattenCategoryTree,
  resolveProductCategoryId,
  reconcileInnerwearCategories,
  isInnerwearAlias,
  DEFAULT_SUBCATEGORIES,
  DEFAULT_SCHOOLS,
}
