import { useState, useMemo } from 'react'
import { buildHierarchyTree } from '../../lib/hierarchyNav'
import { posTheme } from '../../styles/posTheme'

function TreeRows({ nodes, depth, expandedNodes, toggleExpanded, onSelect, activePath }) {
  if (!nodes?.length) return null
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        ...(depth > 0
          ? {
              marginTop: '2px',
              borderLeft: `1px solid ${posTheme.panelBorder}`,
              marginLeft: '10px',
              paddingLeft: '8px',
            }
          : {}),
      }}
    >
      {nodes.map((node) => {
        const hasKids = node.children && node.children.length > 0
        const key = node.id
        const open = Boolean(expandedNodes[key])
        const isActive =
          activePath.length === node.path.length &&
          node.path.every((seg, i) => seg === activePath[i])

        return (
          <li key={key} style={{ marginBottom: '2px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                minHeight: '40px',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              {hasKids ? (
                <button
                  type="button"
                  aria-label={open ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(key)
                  }}
                  style={ts.expandBtn}
                >
                  {open ? '▾' : '▸'}
                </button>
              ) : (
                <span style={{ width: '32px', flexShrink: 0 }} />
              )}
              <button
                type="button"
                onClick={() => onSelect(node.path)}
                style={{
                  ...ts.nodeBtn,
                  ...(isActive ? ts.nodeBtnActive : ts.nodeBtnIdle),
                }}
                className="tree-node-btn"
              >
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.label}
                </span>
                <span
                  style={{
                    ...ts.countBadge,
                    ...(isActive ? ts.countBadgeActive : ts.countBadgeIdle),
                  }}
                >
                  {node.count}
                </span>
              </button>
            </div>
            {hasKids && open && (
              <TreeRows
                nodes={node.children}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                toggleExpanded={toggleExpanded}
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

export default function HierarchyTreeSidebar({
  stock,
  path,
  setPath,
  collapsed,
  onToggleCollapse,
  catTree,
}) {
  const tree = useMemo(() => buildHierarchyTree(stock, catTree), [stock, catTree])
  /** Keys present = expanded. Default empty → all branches collapsed until user expands. */
  const [expandedNodes, setExpandedNodes] = useState({})

  const toggleExpanded = (key) => {
    setExpandedNodes((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }

  if (collapsed) {
    return (
      <div style={ts.collapsedBar}>
        <button type="button" title="Show category tree" onClick={onToggleCollapse} style={ts.collapsedBtn}>
          ▸
        </button>
        <style>{`
          .tree-node-btn:hover { background: rgba(255,255,255,0.12) !important; }
        `}</style>
      </div>
    )
  }

  return (
    <aside style={ts.sidebar}>
      <div style={ts.sidebarHeader}>
        <span style={ts.sidebarTitle}>CATEGORIES</span>
        <button type="button" title="Collapse sidebar" onClick={onToggleCollapse} style={ts.collapseBtn}>
          ◂
        </button>
      </div>

      <div style={ts.treeScroll} className="pos-dark-scroll">
        <TreeRows
          nodes={tree}
          depth={0}
          expandedNodes={expandedNodes}
          toggleExpanded={toggleExpanded}
          onSelect={setPath}
          activePath={path}
        />
      </div>

      <style>{`
        .tree-node-btn:hover { background: rgba(255,255,255,0.12) !important; }
      `}</style>
    </aside>
  )
}

const ts = {
  sidebar: {
    width: 'min(26vw, 270px)',
    minWidth: '195px',
    maxWidth: '310px',
    flexShrink: 0,
    background: posTheme.panelBg,
    borderRight: `1px solid ${posTheme.panelBorder}`,
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 0.9rem',
    borderBottom: `1px solid ${posTheme.panelBorder}`,
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: posTheme.textMuted,
  },
  collapseBtn: {
    minWidth: '36px',
    minHeight: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid ${posTheme.panelBorder}`,
    color: posTheme.textSecondary,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  treeScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
  },
  collapsedBar: {
    width: '46px',
    flexShrink: 0,
    borderRight: `1px solid ${posTheme.panelBorder}`,
    background: posTheme.panelBg,
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '0.8rem',
  },
  collapsedBtn: {
    width: '34px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.12)',
    border: `1px solid ${posTheme.cardBorder}`,
    color: posTheme.text,
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtn: {
    width: '32px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: posTheme.textMuted,
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  nodeBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    textAlign: 'left',
    padding: '0.4rem 0.6rem',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s',
    overflow: 'hidden',
  },
  nodeBtnActive: {
    background: posTheme.goldBg,
    color: posTheme.gold,
    fontWeight: 700,
    boxShadow: `inset 0 0 0 1px ${posTheme.goldBorder}`,
  },
  nodeBtnIdle: {
    background: 'transparent',
    color: posTheme.textSecondary,
  },
  countBadge: {
    flexShrink: 0,
    fontSize: '0.65rem',
    fontWeight: 700,
    borderRadius: '999px',
    padding: '0.1rem 0.45rem',
  },
  countBadgeActive: {
    background: 'rgba(232,160,32,0.35)',
    color: posTheme.goldDark,
  },
  countBadgeIdle: {
    background: 'rgba(255,255,255,0.10)',
    color: posTheme.textMuted,
  },
}
