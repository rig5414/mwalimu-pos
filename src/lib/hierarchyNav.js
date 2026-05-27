/** Shared hierarchy: Linear Category Taxonomy (Mwalimu POS) + navigation + barcode matching. */

/** Top-level categories in sidebar / browse order */
export const TOP_LEVEL_ORDER = [
  'School Uniforms',
  'Games Attires',
  'Footwear',
  'Innerwear',
  'Beddings',
  'School Bags',
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
  'Kimasian Boys',
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
  'semi toughees': 'Semi-Toughees',
  'semi-toughees': 'Semi-Toughees',
  'rubber shoes': 'Rubber Shoes',
  crocs: 'Crocs',
  slippers: 'Slippers',
  studeez: 'Studeez',
  toughees: 'Toughees',
  'bata breathers': 'Bata Breathers',
  'inner wear': 'Innerwear',
  innerwear: 'Innerwear',
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
  primary: 'Primary',
  'junior secondary': 'Junior Secondary',
  'junior-secondary': 'Junior Secondary',
}

export function normalizeCategoryName(name) {
  if (!name) return 'Uncategorized'
  if (name === 'Inner Wear') return 'Innerwear'
  return name
}

function isInnerwearAlias(name) {
  const n = String(name || '').trim()
  return n === 'Innerwear' || n === 'Inner Wear'
}

/** Remove duplicate Innerwear root/child rows from DB-driven trees (display safety net). */
export function filterDuplicateInnerwearNodes(nodes, parentName = null) {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes

  let sawInnerwearRoot = false
  return nodes
    .filter((n) => {
      const name = n.name || n.label || ''
      if (!parentName && isInnerwearAlias(name)) {
        if (sawInnerwearRoot) return false
        sawInnerwearRoot = true
      }
      if (parentName && isInnerwearAlias(parentName) && isInnerwearAlias(name)) return false
      return true
    })
    .map((n) => ({
      ...n,
      children: n.children?.length
        ? filterDuplicateInnerwearNodes(n.children, n.name || n.label)
        : n.children,
    }))
}

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

export function getNavSegments(row) {
  const product = row.product_name || 'Product'

  if (Array.isArray(row.category_path) && row.category_path.length > 0) {
    const path = row.category_path.map((p) => normalizeCategoryName(p))
    const root = path[0]

    if (root === 'Schools') {
      const school = row.school_name || path[1] || 'Unknown School'
      if (school === 'Londiani Christian Academy') {
        const phase = path[2] ? normalizeLcaPhase(path[2]) : normalizeLcaPhase(row.subcategory)
        return [root, school, phase, product]
      }
      return [root, school, product]
    }

    const attrs = row.attributes || {}
    const badge = attrs.badge || (row.school_id ? 'badged' : 'plain')
    const typeLabel = badge === 'badged' ? 'Badged' : 'Plain'

    // Full DB path to the leaf category, then Plain/Badged, then product (unlimited depth)
    return [...path, typeLabel, product]
  }

  const cat = normalizeCategoryName(row.category_name || row.root_category || 'Uncategorized')

  if (cat === 'Schools') {
    const school = row.school_name || 'Unknown School'
    if (school === 'Londiani Christian Academy') {
      const phase = normalizeLcaPhase(row.subcategory)
      return [cat, school, phase, product]
    }
    return [cat, school, product]
  }

  const sub = normalizeSubcategory(cat, row.subcategory)
  const attrs = row.attributes || {}
  const badge = attrs.badge || (row.school_id ? 'badged' : 'plain')
  const typeLabel = badge === 'badged' ? 'Badged' : 'Plain'
  return [cat, sub, typeLabel, product]
}

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

export function getDisplayBreadcrumb(row) {
  return getFolderSegments(row).map(formatPathSegmentForDisplay).join(' › ')
}

/** Client-side POS/stock search: name, codes, school, category path, breadcrumb. */
export function stockMatchesSearch(row, rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase()
  if (!q) return true
  const pathStr = Array.isArray(row.category_path) ? row.category_path.join(' ').toLowerCase() : ''
  const crumb = getDisplayBreadcrumb(row).toLowerCase()
  return (
    row.product_name?.toLowerCase().includes(q) ||
    row.sku?.toLowerCase().includes(q) ||
    row.product_barcode?.toLowerCase().includes(q) ||
    (row.school_name && String(row.school_name).toLowerCase().includes(q)) ||
    (row.category_name && String(row.category_name).toLowerCase().includes(q)) ||
    pathStr.includes(q) ||
    crumb.includes(q)
  )
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
 * Find a catTree node matching a given name path, returning the matching node (or undefined).
 */
function findCatNode(tree, path) {
  if (!path || path.length === 0 || !Array.isArray(tree)) return undefined
  let nodes = tree
  const normPath = path.map(normalizeCategoryName)
  for (let i = 0; i < normPath.length; i++) {
    const seg = normPath[i]
    const found = nodes.find((n) => normalizeCategoryName(n.name) === seg)
    if (!found) return undefined
    // If this is the last segment, return the matched node
    if (i === normPath.length - 1) return found
    // Otherwise descend into children
    if (found.children && found.children.length > 0) {
      nodes = found.children
    } else {
      return undefined // path goes deeper than tree
    }
  }
  return undefined
}

export function sortBrowseTreeRoots(nodes) {
  if (!Array.isArray(nodes)) return []
  return [...nodes].sort((a, b) => {
    const ia = TOP_LEVEL_ORDER.indexOf(normalizeCategoryName(a.name))
    const ib = TOP_LEVEL_ORDER.indexOf(normalizeCategoryName(b.name))
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || String(a.name).localeCompare(String(b.name))
  })
}

export function buildHierarchyTree(stock, catTree) {
  if (catTree && Array.isArray(catTree)) {
    const counts = new Map()
    for (const row of stock || []) {
      const segs = getNavSegments(row)
      let key = ''
      for (const s of segs.slice(0, -1)) {
        key += '›' + s
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }

    function catNodeToTree(node) {
      const pathKey = '›' + node.path.join('›')
      const children = node.children?.length ? node.children.map(catNodeToTree) : undefined
      return {
        id: node.id,
        label: formatPathSegmentForDisplay(node.name),
        path: node.path,
        count: counts.get(pathKey) || 0,
        children,
      }
    }

    return filterDuplicateInnerwearNodes(sortBrowseTreeRoots(catTree.map(catNodeToTree)))
  }

  if (!Array.isArray(stock) || stock.length === 0) return []

  function walkInto(rootMap, segments) {
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
    walkInto(root, segments)
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

  return sortBrowseTreeRoots(mapToNodes(root, []))
}

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
 * Build folder list from catTree children merged with stock counts.
 */
function buildFoldersFromCatTree(catTree, path, filteredStock) {
  // Get the category node at the current path
  const node = findCatNode(catTree, path)
  if (!node || !node.children || node.children.length === 0) {
    return null
  }

  // Count stock items per child folder name
  const stockCounts = new Map()
  for (const item of filteredStock) {
    const segs = getNavSegments(item)
    const nextIdx = path.length
    if (segs.length > nextIdx) {
      const key = segs[nextIdx]
      if (!stockCounts.has(key)) {
        stockCounts.set(key, { total_qty: 0, itemsCount: 0, icon: item.icon })
      }
      const c = stockCounts.get(key)
      c.total_qty += item.stock_qty || 0
      c.itemsCount += 1
      if (item.icon && !c.icon) c.icon = item.icon
    }
  }

  const result = node.children.map((child) => {
    const name = normalizeCategoryName(child.name)
    const counts = stockCounts.get(name) || { total_qty: 0, itemsCount: 0 }
    return {
      id: name,
      name,
      type: 'folder',
      icon: child.icon || counts.icon || '📁',
      categoryId: child.id,
      total_qty: counts.total_qty,
      itemsCount: counts.itemsCount,
    }
  })

  const nextPath = path
  const sortedKeys = sortKeysAtLevel(result.map((f) => f.name), nextPath)
  result.sort((a, b) => {
    const ia = sortedKeys.indexOf(a.name)
    const ib = sortedKeys.indexOf(b.name)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  return result
}

/**
 * POS / Stock folder browser: given current path, return folder cards or variants.
 * Accepts optional catTree for category-driven folder display.
 */
export function computeBrowseState(filteredStock, path, search, catTree) {
  if (search && String(search).trim()) {
    const rows = filteredStock.filter((s) => stockMatchesSearch(s, search))
    return { viewType: 'variants', currentLevelItems: rows.map((item) => ({ ...item, isVariant: true })) }
  }

  if (path.length === 0) {
    if (catTree && Array.isArray(catTree)) {
      const grouped = {}
      for (const item of filteredStock) {
        const key = normalizeCategoryName(
          item.root_category || item.category_path?.[0] || item.category_name || 'Uncategorized'
        )
        if (!grouped[key]) {
          grouped[key] = { id: key, name: key, type: 'category', icon: null, total_qty: 0, itemsCount: 0 }
        }
        grouped[key].total_qty += item.stock_qty || 0
        grouped[key].itemsCount += 1
      }
      const result = []
      for (const rootNode of catTree) {
        const name = normalizeCategoryName(rootNode.name)
        const existing = grouped[name]
        result.push({
          id: name,
          name,
          type: 'category',
          icon: rootNode.icon || existing?.icon || '📁',
          categoryId: rootNode.id,
          total_qty: existing?.total_qty || 0,
          itemsCount: existing?.itemsCount || 0,
        })
        delete grouped[name]
      }
      for (const [name, g] of Object.entries(grouped)) {
        result.push({ ...g, id: g.id || name })
      }
      result.sort((a, b) => {
        const ia = TOP_LEVEL_ORDER.indexOf(a.name)
        const ib = TOP_LEVEL_ORDER.indexOf(b.name)
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.name.localeCompare(b.name)
      })
      return { viewType: 'folders', currentLevelItems: result }
    }

    const grouped = {}
    filteredStock.forEach((item) => {
      const key = normalizeCategoryName(
        item.root_category || item.category_path?.[0] || item.category_name || 'Uncategorized'
      )
      if (!grouped[key])
        grouped[key] = { id: key, name: key, type: 'category', icon: item.icon, total_qty: 0, itemsCount: 0 }
      grouped[key].total_qty += item.stock_qty || 0
      grouped[key].itemsCount += 1
    })
    const list = Object.values(grouped)
    list.sort((a, b) => {
      const ia = TOP_LEVEL_ORDER.indexOf(a.name)
      const ib = TOP_LEVEL_ORDER.indexOf(b.name)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.name.localeCompare(b.name)
    })
    return { viewType: 'folders', currentLevelItems: list }
  }

  // Deeper levels
  const matched = filteredStock.filter((r) => rowMatchesPathPrefix(r, path))
  const hasVariantsAtPath = matched.length > 0

  if (!hasVariantsAtPath && catTree) {
    // No stock at this path — show catTree children as empty folders
    const catFolders = buildFoldersFromCatTree(catTree, path, [])
    if (catFolders) {
      return { viewType: 'folders', currentLevelItems: catFolders }
    }
  }

  if (!hasVariantsAtPath) {
    return { viewType: 'folders', currentLevelItems: [] }
  }

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

  // Derive next-level folders from stock matches + catTree
  const nextKeys = [...new Set(matched.map((r) => getNavSegments(r)[nextIdx]).filter(Boolean))]

  // If catTree is available, merge in any children that exist in the tree but have no stock
  if (catTree) {
    const catNode = findCatNode(catTree, path)
    if (catNode && catNode.children) {
      for (const child of catNode.children) {
        const childName = normalizeCategoryName(child.name)
        if (!nextKeys.includes(childName)) {
          nextKeys.push(childName)
        }
      }
    }
  }

  const sortedKeys = sortKeysAtLevel(nextKeys, path)
  // Build icon lookup from catTree children if available
  const catChildIcons = new Map()
  if (catTree) {
    const catNode = findCatNode(catTree, path)
    if (catNode && catNode.children) {
      for (const child of catNode.children) {
        catChildIcons.set(normalizeCategoryName(child.name), child.icon || '📁')
      }
    }
  }
  const folders = sortedKeys.map((key) => {
    const rows = matched.filter((r) => getNavSegments(r)[nextIdx] === key)
    const folderNode = catTree ? findCatNode(catTree, [...path, key]) : null
    return {
      id: key,
      name: key,
      type: 'folder',
      icon: rows[0]?.icon || catChildIcons.get(key) || '📁',
      categoryId: folderNode?.id || null,
      total_qty: rows.reduce((s, x) => s + (x.stock_qty || 0), 0),
      itemsCount: rows.length,
    }
  })
  return { viewType: 'folders', currentLevelItems: folders }
}