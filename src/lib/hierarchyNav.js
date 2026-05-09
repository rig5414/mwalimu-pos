/** Shared hierarchy: Linear Category Taxonomy (Mwalimu POS) + navigation + barcode matching. */

/** Top-level categories in sidebar / browse order */
export const TOP_LEVEL_ORDER = [
  'School Uniforms',
  'Games Attires',
  'Footwear',
  'Innerwear',
  'Beddings',
  'Schools',
]

/** Allowed subcategories per top-level category (canonical labels). */
export const SUBCATEGORIES_BY_PARENT = {
  'School Uniforms': [
    'Pullovers',
    'Shirts',
    'Trousers',
    'Dresses',
    'Windbreakers',
    'Socks',
    'Skirts',
    'Marvins',
    'Gloves',
  ],
  'Games Attires': [
    'T-Shirts',
    'Tracksuits',
    'Games Shorts',
    'Wrappers/Bloomers',
    'Jersey',
    'Girls Shorts',
  ],
  Footwear: [
    'Toughees',
    'Studeez',
    'Semi-Toughees',
    'Rubber Shoes',
    'Slippers',
    'Crocs',
    'Bata Breathers',
  ],
  Innerwear: ['Boxers', 'Panties', 'Vests', 'Sports Bra'],
  Beddings: ['Blankets', 'Bed Covers', 'Bedsheets', 'Pajamas', 'Nightdress', 'Towels'],
}

/** School nodes under "Schools" (order). LCA has an extra phase level. */
export const SCHOOL_BRANCH_ORDER = [
  'Londiani Christian Academy',
  'Londiani Girls',
  'Londiani Boys',
  'Baraka Senior',
  'Sacred Hills',
  'Township Senior',
  'Kimasian Senior',
  'Lelu',
]

export const LCA_PHASES = ['Primary', 'Junior Secondary']

/** Short labels for breadcrumbs (full segment stays in path for matching). */
export const PATH_DISPLAY_SHORT = {
  'Londiani Christian Academy': 'LCA',
  'Londiani Girls': 'Londiani Girls',
  'Londiani Boys': 'Londiani Boys',
  'Baraka Senior': 'Baraka Senior',
  'Sacred Hills': 'Sacred Hills',
  'Township Senior': 'Township Senior',
  'Kimasian Senior': 'Kimasian Senior',
  Lelu: 'Lelu',
}

const SUB_ALIASES = {
  // Games Attires
  tshirts: 'T-Shirts',
  't-shirts': 'T-Shirts',
  tshirt: 'T-Shirts',
  tracksuit: 'Tracksuits',
  'games shorts': 'Games Shorts',
  'wrappers bloomers': 'Wrappers/Bloomers',
  wrappers: 'Wrappers/Bloomers',
  bloomers: 'Wrappers/Bloomers',
  jersey: 'Jersey',
  'girls shorts': 'Girls Shorts',
  // Footwear
  'semi toughees': 'Semi-Toughees',
  'semi-toughees': 'Semi-Toughees',
  'rubber shoes': 'Rubber Shoes',
  crocs: 'Crocs',
  slippers: 'Slippers',
  studeez: 'Studeez',
  toughees: 'Toughees',
  'bata breathers': 'Bata Breathers',
  // Innerwear / legacy
  'inner wear': 'Innerwear',
  innerwear: 'Innerwear',
  // School Uniforms
  windbreaker: 'Windbreakers',
  windbreakers: 'Windbreakers',
  marvin: 'Marvins',
  marvins: 'Marvins',
  glove: 'Gloves',
  gloves: 'Gloves',
  trouser: 'Trousers',
  trousers: 'Trousers',
  shirt: 'Shirts',
  shirts: 'Shirts',
  pullover: 'Pullovers',
  pullovers: 'Pullovers',
  dress: 'Dresses',
  dresses: 'Dresses',
  sock: 'Socks',
  socks: 'Socks',
  skirt: 'Skirts',
  skirts: 'Skirts',
  // Beddings
  blanket: 'Blankets',
  blankets: 'Blankets',
  bedsheet: 'Bedsheets',
  bedsheets: 'Bedsheets',
  towel: 'Towels',
  towels: 'Towels',
  pajama: 'Pajamas',
  pajamas: 'Pajamas',
  nightdress: 'Nightdress',
  'bed cover': 'Bed Covers',
  'bed covers': 'Bed Covers',
  // LCA phases
  primary: 'Primary',
  'junior secondary': 'Junior Secondary',
  'junior-secondary': 'Junior Secondary',
}

export function normalizeCategoryName(name) {
  if (!name) return 'Uncategorized'
  if (name === 'Inner Wear') return 'Innerwear'
  return name
}

/**
 * Canonical subcategory for a product row (non-Schools).
 */
export function normalizeSubcategory(parentCat, raw) {
  const parent = normalizeCategoryName(parentCat)
  const allowed = SUBCATEGORIES_BY_PARENT[parent]
  if (!allowed) return raw?.trim() || 'Uncategorized'
  const s = String(raw || '').trim()
  if (!s) return 'Uncategorized'
  if (allowed.includes(s)) return s
  const key = s.toLowerCase()
  if (SUB_ALIASES[key]) {
    const c = SUB_ALIASES[key]
    if (allowed.includes(c)) return c
  }
  const fuzzy = allowed.find((a) => a.toLowerCase() === key)
  if (fuzzy) return fuzzy
  return s
}

export function normalizeLcaPhase(raw) {
  const s = String(raw || '').trim()
  if (LCA_PHASES.includes(s)) return s
  const key = s.toLowerCase()
  if (SUB_ALIASES[key] && LCA_PHASES.includes(SUB_ALIASES[key])) return SUB_ALIASES[key]
  return LCA_PHASES[0]
}

/**
 * Full navigation segments for a variant row: [folders..., productName].
 * Schools / LCA: [Schools, Londiani Christian Academy, Primary|Junior Secondary, productName]
 * Other schools: [Schools, SchoolName, productName]
 * Other categories: [Category, Subcategory, productName]
 */
export function getNavSegments(row) {
  const cat = normalizeCategoryName(row.category_name || 'Uncategorized')
  const product = row.product_name || 'Product'

  if (cat === 'Schools') {
    const school = row.school_name || 'Unknown School'
    if (school === 'Londiani Christian Academy') {
      const phase = normalizeLcaPhase(row.subcategory)
      return [cat, school, phase, product]
    }
    return [cat, school, product]
  }

  const sub = normalizeSubcategory(cat, row.subcategory)
  return [cat, sub, product]
}

/** Folder segments only (for tree / breadcrumbs on cards). */
export function getFolderSegments(row) {
  const full = getNavSegments(row)
  return full.slice(0, -1)
}

export function rowMatchesPathPrefix(row, path) {
  if (!path || path.length === 0) return true
  const segs = getNavSegments(row)
  return path.every((p, i) => segs[i] === p)
}

export function formatPathSegmentForDisplay(segment) {
  return PATH_DISPLAY_SHORT[segment] || segment
}

/** Subtle path line for product cards, e.g. "Schools › LCA › Primary" */
export function getDisplayBreadcrumb(row) {
  return getFolderSegments(row).map(formatPathSegmentForDisplay).join(' › ')
}

function sortByTaxonomyOrder(keys, orderList) {
  const idx = (k) => {
    const i = orderList.indexOf(k)
    return i === -1 ? 9999 : i
  }
  return [...keys].sort((a, b) => idx(a) - idx(b) || a.localeCompare(b))
}

function sortKeysAtLevel(keys, parentPath) {
  if (parentPath.length === 0) return sortByTaxonomyOrder(keys, TOP_LEVEL_ORDER)
  if (parentPath.length === 1) {
    const parent = parentPath[0]
    if (parent === 'Schools') return sortByTaxonomyOrder(keys, SCHOOL_BRANCH_ORDER)
    const subOrder = SUBCATEGORIES_BY_PARENT[parent]
    if (subOrder) return sortByTaxonomyOrder(keys, subOrder)
    return [...keys].sort((a, b) => a.localeCompare(b))
  }
  if (
    parentPath.length === 2 &&
    parentPath[0] === 'Schools' &&
    parentPath[1] === 'Londiani Christian Academy'
  ) {
    return sortByTaxonomyOrder(keys, LCA_PHASES)
  }
  return [...keys].sort((a, b) => a.localeCompare(b))
}

/**
 * Build sidebar tree: nested nodes { id, label, path, count, children? }
 * `label` uses short display where defined; `path` uses full segment strings for POS matching.
 */
export function buildHierarchyTree(stock) {
  if (!Array.isArray(stock) || stock.length === 0) return []

  function walkInto(rootMap, segments, row) {
    let map = rootMap
    const pathSoFar = []
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const isLast = i === segments.length - 1
      pathSoFar.push(seg)
      const pathKey = pathSoFar.join('›')
      if (!map.has(seg)) {
        map.set(seg, {
          id: pathKey,
          label: formatPathSegmentForDisplay(seg),
          path: [...pathSoFar],
          count: 0,
          children: isLast ? undefined : new Map(),
        })
      }
      const node = map.get(seg)
      node.count += 1
      if (!isLast) {
        if (!node.children) node.children = new Map()
        map = node.children
      }
    }
  }


  const root = new Map()
  for (const row of stock) {
    const segments = getNavSegments(row)
    walkInto(root, segments, row)
  }

  function mapToNodes(m, parentPath) {
    const keys = sortKeysAtLevel([...m.keys()], parentPath)
    return keys.map((k) => {
      const n = m.get(k)
      const children = n.children instanceof Map && n.children.size > 0 ? mapToNodes(n.children, n.path) : undefined
      return {
        id: n.id,
        label: n.label,
        path: n.path,
        count: n.count,
        children,
      }
    })
  }

  return mapToNodes(root, [])
}

/**
 * @deprecated Use getNavSegments / normalizeSubcategory instead. Kept for any stray imports.
 */
export function getTypeFolder(item) {
  const cat = normalizeCategoryName(item.category_name || '')
  if (cat === 'Schools') return item.product_name
  return normalizeSubcategory(cat, item.subcategory)
}

export function barcodeMatchesVariant(row, barcode) {
  if (!barcode) return false
  const b = String(barcode).trim()
  if (!b) return false
  return (
    row.id === b ||
    row.product_id === b ||
    (row.sku && String(row.sku) === b) ||
    (row.product_barcode && String(row.product_barcode) === b)
  )
}

/**
 * POS / Stock folder browser: given current path, return folder cards or variants.
 */
export function computeBrowseState(filteredStock, path, search) {
  if (search && String(search).trim()) {
    const q = String(search).toLowerCase()
    const rows = filteredStock.filter(
      (s) =>
        s.product_name?.toLowerCase().includes(q) ||
        s.sku?.toLowerCase().includes(q) ||
        s.product_barcode?.toLowerCase().includes(q)
    )
    return { viewType: 'variants', currentLevelItems: rows.map((item) => ({ ...item, isVariant: true })) }
  }

  if (path.length === 0) {
    const grouped = {}
    filteredStock.forEach((item) => {
      const key = normalizeCategoryName(item.category_name || 'Uncategorized')
      if (!grouped[key])
        grouped[key] = { id: key, name: key, type: 'category', icon: item.icon, total_qty: 0, itemsCount: 0 }
      grouped[key].total_qty += item.stock_qty || 0
      grouped[key].itemsCount += 1
    })
    const list = Object.values(grouped)
    list.sort((a, b) => {
      const ia = TOP_LEVEL_ORDER.indexOf(a.name)
      const ib = TOP_LEVEL_ORDER.indexOf(b.name)
      const va = ia === -1 ? 999 : ia
      const vb = ib === -1 ? 999 : ib
      return va - vb || a.name.localeCompare(b.name)
    })
    return { viewType: 'folders', currentLevelItems: list }
  }

  const matched = filteredStock.filter((r) => rowMatchesPathPrefix(r, path))
  if (!matched.length) return { viewType: 'folders', currentLevelItems: [] }

  const atFullProductPath = matched.every((r) => path.length === getNavSegments(r).length)
  if (atFullProductPath) {
    return {
      viewType: 'variants',
      currentLevelItems: matched.map((item) => ({ ...item, isVariant: true })),
    }
  }

  const isProductChoiceLevel = matched.every((r) => path.length === getNavSegments(r).length - 1)
  const nextIdx = path.length

  if (isProductChoiceLevel) {
    const byProduct = new Map()
    for (const r of matched) {
      const pname = getNavSegments(r)[nextIdx]
      if (!byProduct.has(pname)) byProduct.set(pname, [])
      byProduct.get(pname).push(r)
    }
    if (byProduct.size === 1) {
      const only = [...byProduct.values()][0]
      return { viewType: 'variants', currentLevelItems: only.map((item) => ({ ...item, isVariant: true })) }
    }
    const folders = []
    for (const [name, rows] of byProduct) {
      folders.push({
        id: name,
        name,
        type: 'product',
        icon: rows[0]?.icon,
        total_qty: rows.reduce((s, x) => s + (x.stock_qty || 0), 0),
        itemsCount: rows.length,
      })
    }
    folders.sort((a, b) => a.name.localeCompare(b.name))
    return { viewType: 'folders', currentLevelItems: folders }
  }

  const nextKeys = [...new Set(matched.map((r) => getNavSegments(r)[nextIdx]).filter(Boolean))]
  const sortedKeys = sortKeysAtLevel(nextKeys, path)
  const folders = sortedKeys.map((key) => {
    const rows = matched.filter((r) => getNavSegments(r)[nextIdx] === key)
    return {
      id: key,
      name: key,
      type: 'folder',
      icon: rows[0]?.icon,
      total_qty: rows.reduce((s, x) => s + (x.stock_qty || 0), 0),
      itemsCount: rows.length,
    }
  })
  return { viewType: 'folders', currentLevelItems: folders }
}
