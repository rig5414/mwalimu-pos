/**
 * Realistic taxonomy + pricing seed for Mwalimu POS (SQLite).
 * Run: npx electron seed_sample_data.js
 *
 * Aligns with Linear Category Taxonomy in src/lib/hierarchyNav.js
 */

const Database = require('better-sqlite3')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const dbPath = path.join(__dirname, 'dev-data.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

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
  // Schools (badged / uniform lines)
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

const TOP_CATEGORIES = [
  { id: 'school-uniforms', name: 'School Uniforms', icon: '👔', sort: 0 },
  { id: 'games-attires', name: 'Games Attires', icon: '🏃', sort: 1 },
  { id: 'footwear', name: 'Footwear', icon: '👟', sort: 2 },
  { id: 'inner-wear', name: 'Innerwear', icon: '🧦', sort: 3 },
  { id: 'beddings', name: 'Beddings', icon: '🛏️', sort: 4 },
  { id: 'schools', name: 'Schools', icon: '🏫', sort: 5 },
]

function ensureTopCategories() {
  for (const c of TOP_CATEGORIES) {
    const row = db.prepare('SELECT id FROM categories WHERE id = ? OR name = ?').get(c.id, c.name)
    if (row) {
      db.prepare('UPDATE categories SET name = ?, icon = ?, sort_order = ?, parent_id = NULL WHERE id = ?').run(
        c.name,
        c.icon,
        c.sort,
        row.id
      )
      continue
    }
    db.prepare(
      'INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES (?,?,NULL,?,?)'
    ).run(c.id, c.name, c.icon, c.sort)
  }
}

function slugId(prefix, name) {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${prefix}-${s}`.slice(0, 80)
}

function ensureSchoolChildren(parentId) {
  const ids = {}
  let sort = 0
  for (const name of SCHOOL_BRANCHES) {
    const id = slugId('sch', name)
    const ex = db.prepare('SELECT id FROM categories WHERE id = ? OR name = ?').get(id, name)
    if (ex) {
      db.prepare('UPDATE categories SET parent_id = ?, sort_order = ? WHERE id = ?').run(parentId, sort, ex.id)
      ids[name] = ex.id
    } else {
      db.prepare(
        'INSERT INTO categories (id, name, parent_id, icon, sort_order) VALUES (?,?,?,?,?)'
      ).run(id, name, parentId, '🎓', sort)
      ids[name] = id
    }
    sort += 1
  }
  return ids
}

function clearProducts() {
  try {
    db.pragma('foreign_keys = OFF')
    db.exec('DELETE FROM pos_favorites')
    db.exec('DELETE FROM product_variants')
    db.exec('DELETE FROM products')
    db.pragma('foreign_keys = ON')
    console.log('Cleared products, variants, and POS favorites.')
  } catch (e) {
    console.warn('Partial clear:', e.message)
  }
}

function insertProduct({ name, category_id, subcategory, school_id, icon, price, cost, variants }) {
  const pid = uuidv4()
  db.prepare(
    `INSERT INTO products (id, name, category_id, subcategory, school_id, icon, cost_price, price, is_active)
     VALUES (?,?,?,?,?,?,?,?,1)`
  ).run(pid, name, category_id, subcategory || null, school_id || null, icon || '📦', cost, price)

  const insV = db.prepare(
    `INSERT INTO product_variants (id, product_id, color, color_hex, size, sku, stock_qty) VALUES (?,?,?,?,?,?,?)`
  )
  for (const v of variants) {
    insV.run(
      uuidv4(),
      pid,
      v.color || null,
      v.color_hex || null,
      v.size,
      v.sku || `${slugId('sku', name)}-${v.size}`.slice(0, 40),
      v.stock_qty != null ? v.stock_qty : randBetween(8, 80)
    )
  }
}

function seedUniformsAndGeneral(catMap) {
  const cid = catMap['School Uniforms']
  for (const sub of SCHOOL_UNIFORM_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    const base = `${sub.slice(0, -1)} Sample`
    insertProduct({
      name: `${base} (${sub})`,
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
    insertProduct({
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

  const f = catMap['Footwear']
  for (const sub of FOOTWEAR_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProduct({
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

  const inn = catMap['Innerwear']
  for (const sub of INNER_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProduct({
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

  const b = catMap['Beddings']
  for (const sub of BEDDING_SUBS) {
    const price = sellingPrice(sub)
    const cost = costFromPrice(price)
    insertProduct({
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
    insertProduct({
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
    insertProduct({
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
    insertProduct({
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
    insertProduct({
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

console.log('Mwalimu POS — taxonomy + pricing seed')
console.log('Database:', dbPath)

ensureTopCategories()
const schoolsRow = db.prepare("SELECT id FROM categories WHERE id = 'schools' OR name = 'Schools' LIMIT 1").get()
if (!schoolsRow) throw new Error('Schools category missing — open the app once to run migrations, then re-run seed.')
const schoolIds = ensureSchoolChildren(schoolsRow.id)

const catMap = {}
for (const row of db.prepare('SELECT id, name FROM categories WHERE parent_id IS NULL').all()) {
  catMap[row.name] = row.id
}

clearProducts()

const run = db.transaction(() => {
  seedUniformsAndGeneral(catMap)
  seedSchools(catMap, schoolIds)
})

run()

const { c: pc } = db.prepare('SELECT COUNT(*) as c FROM products').get()
const { c: vc } = db.prepare('SELECT COUNT(*) as c FROM product_variants').get()
console.log(`Done. Products: ${pc}, variants: ${vc}.`)
console.log('Open the app — POS tree should show Schools → LCA → Primary / Junior Secondary, etc.')
