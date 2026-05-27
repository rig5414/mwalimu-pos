/** DB tree-driven stock browse (unlimited category depth). */

import { stockMatchesSearch } from './hierarchyNav'

export function findTreeNodeByPath(tree, pathIds = []) {
  if (!pathIds.length) return { node: null, children: tree || [] }
  let nodes = tree || []
  let node = null
  for (const id of pathIds) {
    node = nodes.find((n) => n.id === id)
    if (!node) return { node: null, children: [] }
    nodes = node.children || []
  }
  return { node, children: node?.children || [] }
}

export function buildTreeBreadcrumbs(catTree, pathIds = []) {
  const crumbs = [{ id: null, name: 'Stock' }]
  let nodes = catTree || []
  for (const id of pathIds) {
    const node = nodes.find((n) => n.id === id)
    if (!node) break
    crumbs.push({ id: node.id, name: node.name })
    nodes = node.children || []
  }
  return crumbs
}

function stockMatchesNode(row, node) {
  if (!node) return false
  if (row.category_id === node.id) return true
  const nodePath = node.path || []
  const rowPath = row.category_path || []
  if (!nodePath.length || !rowPath.length) return false
  if (rowPath.length < nodePath.length) return false
  return nodePath.every((seg, i) => rowPath[i] === seg)
}

function aggregateForNode(stock, node) {
  let total_qty = 0
  let itemsCount = 0
  for (const row of stock) {
    if (stockMatchesNode(row, node)) {
      total_qty += row.stock_qty || 0
      itemsCount += 1
    }
  }
  return { total_qty, itemsCount }
}

export function computeTreeBrowseState(stock, pathIds, catTree, search) {
  if (search?.trim()) {
    const rows = (stock || []).filter((s) => stockMatchesSearch(s, search))
    return {
      viewType: 'variants',
      currentLevelItems: rows.map((r) => ({ ...r, isVariant: true })),
      breadcrumbs: buildTreeBreadcrumbs(catTree, []),
    }
  }

  if (!catTree?.length) {
    return { viewType: 'folders', currentLevelItems: [], breadcrumbs: buildTreeBreadcrumbs([], []) }
  }

  const { node: currentNode, children } = findTreeNodeByPath(catTree, pathIds)
  const breadcrumbs = buildTreeBreadcrumbs(catTree, pathIds)

  const atLeaf = currentNode && (!children.length || currentNode.is_leaf)

  if (atLeaf) {
    const rows = (stock || []).filter((row) => row.category_id === currentNode.id)
    return {
      viewType: 'variants',
      currentLevelItems: rows.map((r) => ({ ...r, isVariant: true })),
      breadcrumbs,
    }
  }

  const folderNodes = pathIds.length === 0 ? catTree : children
  const folders = folderNodes.map((child) => {
    const counts = aggregateForNode(stock, child)
    return {
      id: child.id,
      name: child.name,
      type: 'folder',
      icon: child.icon || '📁',
      categoryId: child.id,
      path_label: child.path_label,
      total_qty: counts.total_qty,
      itemsCount: counts.itemsCount,
      is_leaf: child.is_leaf || !(child.children?.length),
    }
  })

  return { viewType: 'folders', currentLevelItems: folders, breadcrumbs }
}
