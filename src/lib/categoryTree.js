/** Flatten nested category tree for select options and admin UI. */

export function collectDescendantIds(tree, targetId) {
  const ids = new Set()
  let found = false

  function collect(node) {
    ids.add(node.id)
    for (const child of node.children || []) collect(child)
  }

  function walk(nodes) {
    for (const node of nodes || []) {
      if (node.id === targetId) {
        collect(node)
        found = true
        return true
      }
      if (node.children?.length && walk(node.children)) return true
    }
    return false
  }

  walk(tree)
  return found ? ids : new Set()
}

export function flattenCategoryTree(tree, { leavesOnly = false, excludeId = null, excludeIds = null } = {}) {
  const blocked = excludeIds instanceof Set ? excludeIds : new Set()
  if (excludeId) blocked.add(excludeId)

  const out = []
  function visit(nodes, depth = 0) {
    for (const n of nodes || []) {
      if (blocked.has(n.id)) continue
      const row = { ...n, depth }
      if (!leavesOnly || n.is_leaf) out.push(row)
      if (n.children?.length) visit(n.children, depth + 1)
    }
  }
  visit(tree)
  return out
}

export function buildTreeFromFlat(categories) {
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

export function optionLabel(category, { showType = false } = {}) {
  const indent = category.depth ? `${'— '.repeat(category.depth)}` : ''
  const type = showType && category.type ? ` (${category.type})` : ''
  return `${indent}${category.path_label || category.name}${type}`
}
