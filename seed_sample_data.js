/**
 * Additive taxonomy + sample product seed for Mwalimu POS (SQLite).
 *
 * DEFAULT (safe for production / client machines):
 *   - Only INSERTS missing categories, schools, and sample products
 *   - Never deletes or updates existing client rows (products, clients, sales, users, stock)
 *
 * Run: npx electron seed_sample_data.js
 *
 * DESTRUCTIVE reset (dev only — wipes products + variants + favorites):
 *   set MWALIMU_SEED_RESET=1 && npx electron seed_sample_data.js
 *   — or — npx electron seed_sample_data.js --reset
 */

const Database = require('better-sqlite3')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const args = process.argv.slice(2)
const ALLOW_RESET =
  process.env.MWALIMU_SEED_RESET === '1' ||
  process.env.MWALIMU_SEED_RESET === 'true' ||
  args.includes('--reset')

const dbPath = path.join(__dirname, 'dev-data.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const stats = {
  categoriesInserted: 0,
  schoolsInserted: 0,
  productsInserted: 0,
  productsSkipped: 0,
}

// ── Price bands (KES): [min, max] selling price; cost ≈ 70–75% random ────────
const PRICE_BANDS = {
  Pullovers: [800, 1500],
  Shirts: [450, 850],
  Trousers: [900, 1800],
  Skirts: [900, 1800],
  Dresses: [1200, 2200],
  Windbreakers: [1000, 1800],
  Socks: [200, 450],
  Marvins: [350, 700],
  Gloves: [250, 550],
  'T-Shirts': [500, 900],
  Tracksuits: [1800, 3000],
  'Games Shorts': [400, 750],
  'Wrappers/Bloomers': [450, 800],
  Jersey: [650, 1200],
  'Girls Shorts': [400, 700],
  Toughees: [2500, 4000],
  Studeez: [2200, 3800],
  'Semi-Toughees': [1800, 3200],
  'Rubber Shoes': [400, 800],
  Slippers: [350, 700],
  Crocs: [1200, 2200],
  'Bata Breathers': [1500, 2800],
  Boxers: [400, 900],
  Panties: [400, 900],
  Vests: [400, 900],
  'Sports Bra': [500, 900],
  Blankets: [1500, 5000],
  'Bed Covers': [1200, 3500],
  Bedsheets: [900, 2800],
  Pajamas: [800, 1800],
  Nightdress: [900, 2000],
  Towels: [400, 1200],
  Primary: [900, 1600],
  'Junior Secondary': [1000, 1800],
  school_default: [700, 1500],
}

function randBetween(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1))
}

function sellingPrice(subKey) {
  const band = PRICE_BANDS[subKey] || PRICE_BANDS.school_default
  return randBetween(band[0], band[1])
}

function costFromPrice(price) {
  const ratio = 0.7 + Math.random() * 0.05
  return Math.round(price * ratio)
}

const SCHOOL_UNIFORM_SUBS = [
  'Pullovers',
  'Shirts',
  'Trousers',
  'Dresses',
  'Windbreakers',
  'Socks',
  'Skirts',
  'Marvins',
  'Gloves',
]

const GAMES_SUBS = ['T-Shirts', 'Tracksuits', 'Games Shorts', 'Wrappers/Bloomers', 'Jersey', 'Girls Shorts']
const FOOTWEAR_SUBS = ['Toughees', 'Studeez', 'Semi-Toughees', 'Rubber Shoes', 'Slippers', 'Crocs', 'Bata Breathers']
const INNER_SUBS = ['Boxers', 'Panties', 'Vests', 'Sports Bra']
const BEDDING_SUBS = ['Blankets', 'Bed Covers', 'Bedsheets', 'Pajamas', 'Nightdress', 'Towels']

const SCHOOL_BRANCHES = [
  'Londiani Christian Academy',
  'Londiani Girls',
  'Londiani Boys',
  'Baraka Senior',
  'Sacred Hills',
  'Township Senior',
  'Kimasian Senior',
  'Lelu',
]

const LCA_PHASES = ['Primary', 'Junior Secondary']

/** Canonical root name → legacy aliases (migrate uses "Inner Wear", POS uses "Innerwear"). */
const ROOT_ALIASES = {
  'School Uniforms': ['School Uniforms', 'school-uniforms'],
  'Games Attires': ['Games Attires', 'games-attires'],
  Footwear: ['Footwear', 'footwear'],
  Innerwear: ['Innerwear', 'Inner Wear', 'inner-wear', 'innerwear'],
  Beddings: ['Beddings', 'beddings'],
  Schools: ['Schools', 'schools'],
}

const TOP_CATEGORIES = [
  { id: 'school-uniforms', name: 'School Uniforms', icon: '👔', sort: 0 },
  { id: 'games-attires', name: 'Games Attires', icon: '🏃', sort: 1 },
  { id: 'footwear', name: 'Footwear', icon: '👟', sort: 2 },
  { id: 'inner-wear', name: 'Innerwear', icon: '🧦', sort: 3 },
  { id: 'beddings', name: 'Beddings', icon: '🛏️', sort: 4 },
  { id: 'schools', name: 'Schools', icon: '🏫', sort: 5 },
]

function slugId(prefix, name) {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${prefix}-${s}`.slice(0, 80)
}

function normalizeRootKey(name) {
  const n = String(name || '').trim()
  if (n === 'Inner Wear' || n === 'Innerwear') return 'Innerwear'
  return n
}

/** Find existing root by canonical name or any alias (avoids duplicate Innerwear root). */
function findExistingRoot(canonicalName) {
  const aliases = ROOT_ALIASES[canonicalName] || [canonicalName]
  for (const alias of aliases) {
    const byId = db
      .prepare('SELECT id, name FROM categories WHERE id = ? AND parent_id IS NULL')
      .get(alias)
    if (byId) return byId
    const byName = db
      .prepare('SELECT id, name FROM categories WHERE name = ? AND parent_id IS NULL')
      .get(alias)
    if (byName) return byName
  }
  return null
}

/** Remove seed-template products on a category (never touches client-named catalog). */
function removeSeedTemplateProductsOnCategory(categoryId) {
  const products = db
    .prepare(
      `SELECT id FROM products WHERE category_id = ?
       AND (
         name LIKE '% Pack'
         OR name LIKE '% Standard'
         OR name LIKE '% Premium'
         OR name LIKE '% Sample%'
         OR name LIKE '% — House Line'
       )`
    )
    .all(categoryId)
  let n = 0
  for (const p of products) {
    db.prepare(
      'DELETE FROM pos_favorites WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)'
    ).run(p.id)
    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(p.id)
    db.prepare('DELETE FROM products WHERE id = ?').run(p.id)
    n += 1
  }
  return n
}

/**
 * Fix duplicate Innerwear from earlier seed runs:
 * - Remove misplaced categories named Innerwear/Inner Wear that are NOT roots
 * - Remove extra root when canonical "Inner Wear" already exists
 * Only removes seed-template products on those categories.
 */
function reconcileInnerwearDuplicates() {
  const canonical = findExistingRoot('Innerwear')
  if (!canonical) return { categoriesRemoved: 0, productsRemoved: 0 }

  let categoriesRemoved = 0
  let productsRemoved = 0

  const misplaced = db
    .prepare(
      `SELECT id FROM categories
       WHERE parent_id IS NOT NULL
         AND trim(name) IN ('Innerwear', 'Inner Wear')`
    )
    .all()

  for (const row of misplaced) {
    productsRemoved += removeSeedTemplateProductsOnCategory(row.id)
    const prods = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(row.id).c
    const kids = db.prepare('SELECT COUNT(*) as c FROM categories WHERE parent_id = ?').get(row.id).c
    if (prods === 0 && kids === 0) {
      db.prepare('DELETE FROM categories WHERE id = ?').run(row.id)
      categoriesRemoved += 1
    }
  }

  const roots = db
    .prepare(
      `SELECT id, name FROM categories
       WHERE parent_id IS NULL AND trim(name) IN ('Innerwear', 'Inner Wear')`
    )
    .all()

  for (const dup of roots) {
    if (dup.id === canonical.id) continue
    productsRemoved += removeSeedTemplateProductsOnCategory(dup.id)
    const prods = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(dup.id).c
    const kids = db.prepare('SELECT COUNT(*) as c FROM categories WHERE parent_id = ?').get(dup.id).c
    if (prods === 0 && kids === 0) {
      db.prepare('DELETE FROM categories WHERE id = ?').run(dup.id)
      categoriesRemoved += 1
    }
  }

  return { categoriesRemoved, productsRemoved }
}

/** Insert top-level category only if missing — never UPDATE existing client rows. */
function ensureTopCategories() {
  for (const c of TOP_CATEGORIES) {
    if (findExistingRoot(c.name)) continue
    db.prepare(
      'INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES (?,?,NULL,?,?)'
    ).run(c.id, c.name, c.icon, c.sort)
    stats.categoriesInserted += 1
  }
}

/** Map canonical root names → category id (merges Inner Wear + Innerwear). */
function buildCanonicalCatMap() {
  const map = {}
  for (const row of db.prepare('SELECT id, name FROM categories WHERE parent_id IS NULL').all()) {
    const key = normalizeRootKey(row.name)
    if (!map[key]) map[key] = row.id
  }
  return map
}

/** Insert school child category only if missing. */
function ensureSchoolChildren(parentId) {
  const ids = {}
  let sort = 0
  for (const name of SCHOOL_BRANCHES) {
    const id = slugId('sch', name)
    const ex = db.prepare('SELECT id FROM categories WHERE id = ? OR name = ?').get(id, name)
    if (ex) {
      ids[name] = ex.id
    } else {
      db.prepare(
        'INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES (?,?,?,?,?)'
      ).run(id, name, parentId, '🎓', sort)
      ids[name] = id
      stats.schoolsInserted += 1
    }
    sort += 1
  }
  return ids
}

function clearProductsDevOnly() {
  console.warn('⚠️  MWALIMU_SEED_RESET: deleting products, variants, and pos_favorites (DEV ONLY)')
  db.pragma('foreign_keys = OFF')
  db.exec('DELETE FROM pos_favorites')
  db.exec('DELETE FROM product_variants')
  db.exec('DELETE FROM products')
  db.pragma('foreign_keys = ON')
}

function productExists({ name, category_id, subcategory, school_id }) {
  const row = db
    .prepare(
      `SELECT id FROM products
       WHERE name = ? AND category_id = ?
         AND IFNULL(subcategory,'') = IFNULL(?, '')
         AND IFNULL(school_id,'') = IFNULL(?, '')`
    )
    .get(name, category_id, subcategory || null, school_id || null)
  return Boolean(row)
}

function variantSkuExists(sku) {
  if (!sku) return false
  return Boolean(db.prepare('SELECT 1 FROM product_variants WHERE sku = ?').get(sku))
}

function insertProductIfMissing({ name, category_id, subcategory, school_id, icon, price, cost, variants }) {
  if (productExists({ name, category_id, subcategory, school_id })) {
    stats.productsSkipped += 1
    return false
  }

  const planned = variants.map((v) => ({
    ...v,
    sku: v.sku || `${slugId('sku', name)}-${v.size}`.slice(0, 40),
  }))
  if (planned.every((v) => variantSkuExists(v.sku))) {
    stats.productsSkipped += 1
    return false
  }

  const pid = uuidv4()
  db.prepare(
    `INSERT INTO products (id, name, category_id, subcategory, school_id, icon, cost_price, price, is_active)
     VALUES (?,?,?,?,?,?,?,?,1)`
  ).run(pid, name, category_id, subcategory || null, school_id || null, icon || '📦', cost, price)

  const insV = db.prepare(
    `INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty) VALUES (?,?,?,?,?,?,?)`
  )
  let insertedVariants = 0
  for (const v of planned) {
    if (variantSkuExists(v.sku)) continue
    insV.run(
      uuidv4(),
      pid,
      v.color || null,
      v.color_hex || null,
      v.size,
      v.sku,
      v.stock_qty != null ? v.stock_qty : randBetween(8, 80)
    )
    insertedVariants += 1
  }
  if (insertedVariants === 0) {
    db.prepare('DELETE FROM products WHERE id = ?').run(pid)
    stats.productsSkipped += 1
    return false
  }
  stats.productsInserted += 1
  return true
}

function seedUniformsAndGeneral(catMap) {
  const cid = catMap['School Uniforms']
  for (const sub of SCHOOL_UNIFORM_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProductIfMissing({
      name: `${sub.slice(0, -1)} Sample (${sub})`,
      category_id: cid,
      subcategory: sub,
      icon: '👔',
      price,
      cost,
      variants: [
        { size: 'S', color: 'Navy', color_hex: '#1a3a5c' },
        { size: 'M', color: 'Navy', color_hex: '#1a3a5c' },
        { size: 'L', color: 'Navy', color_hex: '#1a3a5c' },
      ],
    })
  }

  const g = catMap['Games Attires']
  for (const sub of GAMES_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProductIfMissing({
      name: `${sub} — House Line`,
      category_id: g,
      subcategory: sub,
      icon: '🏃',
      price,
      cost,
      variants: [
        { size: 'S', color: 'Royal', color_hex: '#1e3a8a' },
        { size: 'M', color: 'Royal', color_hex: '#1e3a8a' },
        { size: 'L', color: 'White', color_hex: '#ffffff' },
      ],
    })
  }

  const f = catMap.Footwear
  for (const sub of FOOTWEAR_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProductIfMissing({
      name: `${sub} Standard`,
      category_id: f,
      subcategory: sub,
      icon: '👟',
      price,
      cost,
      variants: [
        { size: '38', color: 'Black', color_hex: '#111' },
        { size: '40', color: 'Black', color_hex: '#111' },
        { size: '42', color: 'Black', color_hex: '#111' },
      ],
    })
  }

  const inn = catMap.Innerwear
  if (!inn) {
    console.warn('  ⚠ Skipping Innerwear products — no root category (Inner Wear / Innerwear)')
  } else for (const sub of INNER_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProductIfMissing({
      name: `${sub} Pack`,
      category_id: inn,
      subcategory: sub,
      icon: '🧦',
      price,
      cost,
      variants: [
        { size: 'S', color: 'Assorted', color_hex: '#ccc' },
        { size: 'M', color: 'Assorted', color_hex: '#ccc' },
        { size: 'L', color: 'Assorted', color_hex: '#ccc' },
      ],
    })
  }

  const b = catMap.Beddings
  for (const sub of BEDDING_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProductIfMissing({
      name: `${sub} Premium`,
      category_id: b,
      subcategory: sub,
      icon: '🛏️',
      price,
      cost,
      variants: [
        { size: 'Std', color: 'Grey', color_hex: '#888' },
        { size: 'Large', color: 'Grey', color_hex: '#888' },
      ],
    })
  }
}

function seedSchools(catMap, schoolIds) {
  const schoolsCid = catMap.Schools
  const lca = schoolIds['Londiani Christian Academy']

  for (const phase of LCA_PHASES) {
    const price = sellingPrice(phase)
    const cost = costFromPrice(price)
    insertProductIfMissing({
      name: `LCA ${phase} Pullover`,
      category_id: schoolsCid,
      subcategory: phase,
      school_id: lca,
      icon: '🏫',
      price,
      cost,
      variants: [
        { size: 'S', color: 'Navy', color_hex: '#1a3a5c' },
        { size: 'M', color: 'Navy', color_hex: '#1a3a5c' },
        { size: 'L', color: 'Navy', color_hex: '#1a3a5c' },
      ],
    })
    const p2 = sellingPrice(phase)
    const c2 = costFromPrice(p2)
    insertProductIfMissing({
      name: `LCA ${phase} White Shirt`,
      category_id: schoolsCid,
      subcategory: phase,
      school_id: lca,
      icon: '👕',
      price: p2,
      cost: c2,
      variants: [
        { size: 'S', color: 'White', color_hex: '#fff' },
        { size: 'M', color: 'White', color_hex: '#fff' },
      ],
    })
  }

  const otherSchools = SCHOOL_BRANCHES.filter((n) => n !== 'Londiani Christian Academy')
  for (const schoolName of otherSchools) {
    const sid = schoolIds[schoolName]
    const price = sellingPrice('school_default')
    const cost = costFromPrice(price)
    insertProductIfMissing({
      name: `${schoolName} Pullover`,
      category_id: schoolsCid,
      subcategory: 'Pullovers',
      school_id: sid,
      icon: '🏫',
      price,
      cost,
      variants: [
        { size: 'M', color: 'Navy', color_hex: '#1a3a5c' },
        { size: 'L', color: 'Navy', color_hex: '#1a3a5c' },
      ],
    })
    const p2 = sellingPrice('Shirts')
    const c2 = costFromPrice(p2)
    insertProductIfMissing({
      name: `${schoolName} Shirt`,
      category_id: schoolsCid,
      subcategory: 'Shirts',
      school_id: sid,
      icon: '👕',
      price: p2,
      cost: c2,
      variants: [
        { size: 'S', color: 'White', color_hex: '#fff' },
        { size: 'M', color: 'White', color_hex: '#fff' },
      ],
    })
  }
}

console.log('Mwalimu POS — additive taxonomy seed')
console.log('Database:', dbPath)
console.log('Mode:', ALLOW_RESET ? 'RESET (destructive)' : 'ADDITIVE (safe — no deletes)')

if (ALLOW_RESET) clearProductsDevOnly()

const innerFix = reconcileInnerwearDuplicates()
if (innerFix.categoriesRemoved || innerFix.productsRemoved) {
  console.log(
    `  Reconciled Innerwear duplicates: ${innerFix.categoriesRemoved} categor(ies), ${innerFix.productsRemoved} seed product(s) removed`
  )
}

ensureTopCategories()
const schoolsRow = db.prepare("SELECT id FROM categories WHERE id = 'schools' OR name = 'Schools' LIMIT 1").get()
if (!schoolsRow) {
  throw new Error('Schools category missing — open the app once to run migrations, then re-run seed.')
}
const schoolIds = ensureSchoolChildren(schoolsRow.id)

const catMap = buildCanonicalCatMap()

const run = db.transaction(() => {
  seedUniformsAndGeneral(catMap)
  seedSchools(catMap, schoolIds)
})

run()

const { c: pc } = db.prepare('SELECT COUNT(*) as c FROM products').get()
const { c: vc } = db.prepare('SELECT COUNT(*) as c FROM product_variants').get()
const { c: cc } = db.prepare('SELECT COUNT(*) as c FROM clients').get()
const { c: sc } = db.prepare('SELECT COUNT(*) as c FROM sales').get()

console.log('── Summary ──')
console.log(`Categories added: ${stats.categoriesInserted}`)
console.log(`Schools added:    ${stats.schoolsInserted}`)
console.log(`Products added:   ${stats.productsInserted}`)
console.log(`Products skipped: ${stats.productsSkipped} (already exist)`)
console.log(`DB totals: ${pc} products, ${vc} variants, ${cc} clients, ${sc} sales (unchanged by seed)`)
if (!ALLOW_RESET) {
  console.log('Client data preserved. To wipe catalog in dev only: MWALIMU_SEED_RESET=1 npx electron seed_sample_data.js')
}
