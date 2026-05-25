import { useState, useMemo } from 'react'
import { buildHierarchyTree } from '../../lib/hierarchyNav'

function TreeRows({ nodes, depth, collapsedNodes, toggleCollapsed, onSelect, activePath }) {
  if (!nodes?.length) return null
  return (
    <ul className={depth === 0 ? 'space-y-0.5' : 'mt-0.5 space-y-0.5 border-l border-gray-200 ml-2 pl-2'}>
      {nodes.map((node) => {
        const hasKids = node.children && node.children.length > 0
        const key = node.id
        const open = !collapsedNodes[key]
        const isActive =
          activePath.length === node.path.length &&
          node.path.every((seg, i) => seg === activePath[i])

        return (
          <li key={key}>
            <div className="flex items-stretch min-h-[44px] rounded-lg overflow-hidden">
              {hasKids ? (
                <button
                  type="button"
                  aria-label={open ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleCollapsed(key)
                  }}
                  className="w-10 flex-shrink-0 flex items-center justify-center text-gray-400 hover:bg-gray-100
                             border-0 bg-transparent cursor-pointer text-sm"
                >
                  {open ? '▾' : '▸'}
                </button>
              ) : (
                <span className="w-10 flex-shrink-0" />
              )}
              <button
                type="button"
                onClick={() => onSelect(node.path)}
                className={`flex-1 text-left px-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{node.label}</span>
                  <span
                    className={`flex-shrink-0 text-xs font-bold tabular-nums rounded-full px-2 py-0.5
                      ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {node.count}
                  </span>
                </span>
              </button>
            </div>
            {hasKids && open && (
              <TreeRows
                nodes={node.children}
                depth={depth + 1}
                collapsedNodes={collapsedNodes}
                toggleCollapsed={toggleCollapsed}
                onSelect={onSelect}
                activePath={activePath}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Collapsible hierarchical picker ~20–25% width; syncs with `path` + `setPath` from POS/Stock.
 */
export default function HierarchyTreeSidebar({ stock, path, setPath, collapsed, onToggleCollapse, catTree }) {
  const tree = useMemo(() => buildHierarchyTree(stock, catTree), [stock, catTree])

  const [collapsedNodes, setCollapsedNodes] = useState({})

  const toggleCollapsed = (key) => {
    setCollapsedNodes((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }

  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col items-center py-3">
        <button
          type="button"
          title="Show category tree"
          onClick={onToggleCollapse}
          className="w-10 h-11 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          ▸
        </button>
      </div>
    )
  }

  return (
    <aside className="w-[min(26vw,280px)] min-w-[200px] max-w-[320px] flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white/80">
        <span className="text-[10px] font-bold tracking-wider text-gray-400">HIERARCHICAL PICKER</span>
        <button
          type="button"
          title="Collapse sidebar"
          onClick={onToggleCollapse}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer text-sm"
        >
          ◂
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <TreeRows
          nodes={tree}
          depth={0}
          collapsedNodes={collapsedNodes}
          toggleCollapsed={toggleCollapsed}
          onSelect={setPath}
          activePath={path}
        />
      </div>
    </aside>
  )
}
