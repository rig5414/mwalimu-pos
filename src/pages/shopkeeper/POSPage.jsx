import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useDisplayModeStore } from '../../store/displayModeStore'
import { useToast } from '../../hooks/useToast'
import { useIconDisplay } from '../../hooks/useIconDisplay'
import PaymentModal from '../../components/pos/PaymentModal'
import ReceiptModal from '../../components/pos/ReceiptModal'
import CartPanel from '../../components/pos/CartPanel'
import HierarchyTreeSidebar from '../../components/pos/HierarchyTreeSidebar'
import {
  getDisplayBreadcrumb,
  barcodeMatchesVariant,
  stockMatchesSearch,
} from '../../lib/hierarchyNav'
import { computeTreeBrowseState } from '../../lib/categoryBrowse'
import { posTheme } from '../../styles/posTheme'

/* ── tiny category icon helper ──────────────────────────────────────────────── */
function CategoryIcon({ categoryId, fallbackEmoji }) {
  const { imageUrl, isLoading, fallback } = useIconDisplay(categoryId, fallbackEmoji)
  if (isLoading) return <span className="w-12 h-12 rounded-lg animate-pulse flex-shrink-0 block" style={{ background: 'rgba(255,255,255,0.12)' }} />
  if (imageUrl) return <img src={imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
  return <span className="text-2xl flex-shrink-0">{fallback}</span>
}

/* ── stock-level helper ─────────────────────────────────────────────────────── */
const stockLevel = (qty) => {
  if (qty === 0)  return { label: 'Out of stock', color: '#f87171', barColor: '#f87171', pct: 0 }
  if (qty <= 5)   return { label: `${qty} in stock`, color: '#fb923c', barColor: '#fb923c', pct: (qty / 50) * 100 }
  return           { label: `${qty} in stock`, color: '#4ade80', barColor: '#4ade80', pct: Math.min(100, (qty / 50) * 100) }
}

export default function POSPage() {
  const [stock, setStock]               = useState([])
  const [catTree, setCatTree]           = useState(null)
  const [path, setPath]                 = useState([])
  const [search, setSearch]             = useState('')
  const [showPayment, setShowPayment]   = useState(false)
  const [completedSale, setCompletedSale] = useState(null)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [favoriteIds, setFavoriteIds]   = useState(() => new Set())
  const [favoritesRows, setFavoritesRows] = useState([])

  const user       = useAuthStore((s) => s.user)
  const addItem    = useCartStore((s) => s.addItem)
  const mode       = useDisplayModeStore((s) => s.mode)
  const toggleMode = useDisplayModeStore((s) => s.toggleMode)
  const toast      = useToast()
  const barcodeBufferRef = useRef('')
  const barcodeTimerRef  = useRef(null)

  const reloadFavorites = useCallback(async () => {
    if (!window.api?.favorites) return
    const res = await window.api.favorites.list()
    if (res.ok && Array.isArray(res.data)) {
      setFavoritesRows(res.data)
      setFavoriteIds(new Set(res.data.map((r) => r.id)))
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      if (window.api) {
        const [stockRes, catRes] = await Promise.all([
          window.api.stock.getAll(),
          window.api.categories?.getBrowseTree?.() || Promise.resolve({ ok: false }),
        ])
        if (stockRes.ok) setStock(stockRes.data)
        if (catRes.ok)   setCatTree(catRes.data)
        await reloadFavorites()
      }
    }
    load()
  }, [reloadFavorites])

  const filtered = useMemo(() => {
    if (!search.trim()) return stock
    return stock.filter((s) => stockMatchesSearch(s, search))
  }, [stock, search])

  const { viewType, currentLevelItems, breadcrumbs } = computeTreeBrowseState(filtered, path, catTree, search)

  const resolveBarcodeVariant = useCallback(
    (barcode) => stock.find((v) => barcodeMatchesVariant(v, barcode)),
    [stock]
  )

  const toggleFavorite = async (e, variantRow) => {
    e?.stopPropagation?.()
    if (!window.api?.favorites) { toast.warning('Favorites require the desktop app'); return }
    const id = variantRow.id
    try {
      if (favoriteIds.has(id)) {
        const res = await window.api.favorites.remove(id)
        if (!res.ok) throw new Error(res.error)
        toast.info('Removed from favorites')
      } else {
        const res = await window.api.favorites.add(id)
        if (!res.ok) throw new Error(res.error)
        toast.success('Pinned to favorites')
      }
      await reloadFavorites()
    } catch (err) {
      toast.error(err.message || 'Could not update favorites')
    }
  }

  useEffect(() => {
    const handleKeydown = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Enter') {
        const barcode = barcodeBufferRef.current.trim()
        if (!barcode) return
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
        barcodeTimerRef.current = null
        const variant = resolveBarcodeVariant(barcode)
        if (variant && Number(variant.stock_qty) > 0) {
          addItem({ variantId: variant.id, productName: variant.product_name, color: variant.color, size: variant.size, price: variant.price, icon: variant.icon || '📦', qty: 1 })
          toast.success(`Added 1 ${variant.product_name} to cart`)
        } else if (!variant) {
          toast.warning(`Item with barcode "${barcode}" not found`)
        } else {
          toast.error(`Item "${variant.product_name}" is out of stock`)
        }
        barcodeBufferRef.current = ''
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeBufferRef.current += e.key
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
        barcodeTimerRef.current = setTimeout(() => { barcodeBufferRef.current = ''; barcodeTimerRef.current = null }, 120)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => { window.removeEventListener('keydown', handleKeydown); if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current) }
  }, [resolveBarcodeVariant, toast, addItem])

  const handlePaymentComplete = (saleResult) => {
    setShowPayment(false)
    setCompletedSale(saleResult)
    if (window.api) window.api.stock.getAll().then((res) => { if (res.ok) setStock(res.data) })
  }

  const dense      = mode === 'dense'
  const folderMin  = dense ? 'minmax(155px, 1fr)' : 'minmax(195px, 1fr)'
  const variantMin = dense ? 'minmax(175px, 1fr)' : 'minmax(230px, 1fr)'

  const addVariantToCart = (item) => {
    if (item.stock_qty === 0) return
    addItem({ variantId: item.id, productName: item.product_name, color: item.color, size: item.size, price: item.price, icon: item.icon || '📦', qty: 1 })
    toast.success(`Added 1 ${item.product_name} to cart`)
  }

  return (
    <div style={s.root}>
      {/* ── Left: hierarchy sidebar ─────────────────────────────── */}
      <HierarchyTreeSidebar
        path={path}
        setPath={setPath}
        collapsed={treeCollapsed}
        onToggleCollapse={() => setTreeCollapsed((v) => !v)}
        catTree={catTree}
      />

      {/* ── Centre: browse area ─────────────────────────────────── */}
      <div style={s.centre}>

        {/* Top bar */}
        <div style={s.topBar}>
          {/* Search */}
          <div style={s.searchWrap}>
            <svg style={s.searchIcon} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              style={s.searchInput}
              className="pos-search-input"
              placeholder="Search by name, SKU, barcode, school, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} style={s.searchClear}>×</button>
            )}
          </div>

          {/* Mode toggle */}
          <button type="button" onClick={toggleMode} style={s.modeBtn}>
            {dense ? '⊞ Touch mode' : '⊟ Dense mode'}
          </button>
        </div>

        {/* Breadcrumb */}
        <div style={s.breadcrumb}>
          <span style={s.browsingLabel}>Browsing:</span>
          <button
            type="button"
            onClick={() => setPath([])}
            style={{ ...s.crumbBtn, ...(path.length === 0 ? s.crumbActive : s.crumbIdle) }}
          >
            Categories
          </button>
          {breadcrumbs?.slice(1).map((crumb, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={s.crumbSep}>›</span>
              <button
                type="button"
                onClick={() => setPath(path.slice(0, idx + 1))}
                style={{ ...s.crumbBtn, ...(idx === path.length - 1 ? s.crumbActive : s.crumbIdle) }}
              >
                {crumb.name}
              </button>
            </div>
          ))}
          <span style={s.itemCount}>{currentLevelItems.length} items</span>
        </div>

        {/* Grid */}
        <div style={s.gridScroll} className="pos-dark-scroll">
          {currentLevelItems.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📂</span>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No items found</p>
            </div>
          ) : viewType === 'folders' ? (
            <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: `repeat(auto-fill, ${folderMin})` }}>
              {currentLevelItems.map((folder) => {
                const lvl = stockLevel(folder.total_qty)
                return (
                  <div
                    key={folder.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPath([...path, folder.id])}
                    onKeyDown={(ev) => ev.key === 'Enter' && setPath([...path, folder.id])}
                    className="pos-folder-card"
                    style={s.folderCard}
                  >
                    <div style={s.folderAccent} />
                    <div style={s.folderIconWrap}>
                      <CategoryIcon categoryId={folder.categoryId} fallbackEmoji={folder.icon} />
                    </div>
                    <p style={s.folderName}>{folder.name}</p>
                    <p style={s.folderMeta}>{folder.itemsCount} {folder.itemsCount === 1 ? 'variant' : 'variants'}</p>
                    <div style={s.stockBarTrack}>
                      <div style={{ ...s.stockBarFill, width: `${lvl.pct}%`, background: lvl.barColor }} />
                    </div>
                    <p style={{ ...s.stockLabel, color: lvl.color }}>{folder.total_qty} total units</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: `repeat(auto-fill, ${variantMin})` }}>
              {currentLevelItems.map((item) => {
                const lvl        = stockLevel(item.stock_qty)
                const outOfStock = item.stock_qty === 0
                const pinned     = favoriteIds.has(item.id)
                const low        = item.stock_qty > 0 && item.stock_qty <= 5
                const pathLine   = getDisplayBreadcrumb(item)
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (!outOfStock) addVariantToCart(item) }}
                    onKeyDown={(ev) => ev.key === 'Enter' && !outOfStock && addVariantToCart(item)}
                    className="pos-variant-card"
                    style={{ ...s.variantCard, ...(outOfStock ? s.variantOos : {}) }}
                  >
                    {/* Fav star */}
                    <button
                      type="button"
                      title={pinned ? 'Remove from favorites' : 'Pin to favorites'}
                      onClick={(e) => toggleFavorite(e, item)}
                      style={{ ...s.starBtn, color: pinned ? posTheme.gold : posTheme.textMuted }}
                    >
                      {pinned ? '★' : '☆'}
                    </button>

                    {/* Low stock badge */}
                    {!dense && (
                      <span style={{ ...s.stockBadge, ...(low ? s.stockBadgeLow : s.stockBadgeOk) }}>
                        {low? 'Low stock' : 'In stock'}
                      </span>
                    )}
                    <div style={dense ? {} : { marginTop: '1.5rem' }}>
                      <div style={s.variantTopRow}>
                        <p style={s.variantName}>{item.product_name}</p>
                        <span style={{ fontSize: '1.25rem' }}>{item.icon || '📦'}</span>
                      </div>
                      <p style={s.variantPath} title={pathLine}>{pathLine}</p>
                      <p style={s.variantAttrs}>
                        {item.color && (
                          <>
                            <span style={{ ...s.colorDot, background: item.color_hex || '#888' }} />
                            {item.color} ·{' '}
                          </>
                        )}
                        Size {item.size}
                      </p>
                      <p style={s.variantPrice}>KES {item.price?.toLocaleString()}</p>
                    </div>

                    <div>
                      <div style={s.stockBarTrack}>
                        <div style={{ ...s.stockBarFill, width: `${lvl.pct}%`, background: lvl.barColor }} />
                      </div>
                      <p style={{ ...s.stockLabel, color: lvl.color }}>{lvl.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Favourites strip */}
        {favoritesRows.length > 0 && (
          <div style={s.favStrip}>
            <span style={s.favLabel}>FAVORITES</span>
            {favoritesRows.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (Number(f.stock_qty) <= 0) { toast.error('Out of stock'); return }
                  addVariantToCart(f)
                }}
                className="pos-fav-chip"
                style={s.favChip}
              >
                {f.product_name}{f.size ? ` · ${f.size}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Cart ─────────────────────────────────────────── */}
      <CartPanel onCheckout={() => setShowPayment(true)} />

      {showPayment && (
        <PaymentModal onClose={() => setShowPayment(false)} onComplete={handlePaymentComplete} userId={user?.id} />
      )}
      {completedSale && <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />}

      <style>{`
        .pos-folder-card:hover {
          border-color: rgba(232,160,32,0.55) !important;
          background: rgba(255,255,255,0.18) !important;
          box-shadow: 0 12px 36px rgba(0,0,0,0.35), 0 0 0 1px rgba(232,160,32,0.25) !important;
          transform: translateY(-2px);
        }
        .pos-variant-card:hover {
          border-color: rgba(232,160,32,0.55) !important;
          background: rgba(255,255,255,0.18) !important;
          box-shadow: 0 12px 36px rgba(0,0,0,0.35) !important;
          transform: translateY(-2px);
        }
        .pos-folder-card, .pos-variant-card { transition: all 0.18s ease; }
        .pos-folder-card:active, .pos-variant-card:active { transform: scale(0.97) !important; }
        .pos-search-input::placeholder { color: rgba(255,255,255,0.35); }
        .pos-search-input { caret-color: #e8a020; }
        .pos-search-input:focus { outline: none; }
        .pos-fav-chip:hover { background: rgba(232,160,32,0.18) !important; border-color: rgba(232,160,32,0.5) !important; color: #e8a020 !important; }
      `}</style>
    </div>
  )
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  root: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
    background: posTheme.bg,
  },
  centre: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.9rem 1rem',
    background: posTheme.panelBg,
    borderBottom: `1px solid ${posTheme.panelBorder}`,
    flexShrink: 0,
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
  },
  searchWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: posTheme.inputBg,
    border: `1px solid ${posTheme.inputBorder}`,
    borderRadius: '16px',
    padding: '0 1rem',
    minHeight: '52px',
    backdropFilter: posTheme.blur,
  },
  searchIcon: {
    width: '18px',
    height: '18px',
    color: posTheme.textMuted,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: posTheme.text,
    fontSize: '0.95rem',
    fontFamily: "'DM Sans', sans-serif",
  },
  searchClear: {
    background: 'transparent',
    border: 'none',
    color: posTheme.textMuted,
    fontSize: '1.4rem',
    cursor: 'pointer',
    padding: '0 0.2rem',
    lineHeight: 1,
  },
  modeBtn: {
    height: '46px',
    padding: '0 1rem',
    borderRadius: '16px',
    border: `1px solid ${posTheme.inputBorder}`,
    background: posTheme.inputBg,
    color: posTheme.text,
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.3rem',
    padding: '0.5rem 1rem',
    flexShrink: 0,
  },
  browsingLabel: {
    fontSize: '0.75rem',
    color: posTheme.textMuted,
    fontWeight: 600,
    marginRight: '0.2rem',
  },
  crumbBtn: {
    background: 'transparent',
    border: 'none',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.25rem 0.35rem',
    borderRadius: '6px',
    transition: 'all 0.15s',
  },
  crumbActive: { color: posTheme.text },
  crumbIdle: { color: posTheme.textSecondary, cursor: 'pointer' },
  crumbSep: {
    color: posTheme.textDim,
    fontWeight: 700,
    fontSize: '1rem',
  },
  itemCount: {
    marginLeft: 'auto',
    fontSize: '0.78rem',
    color: posTheme.textMuted,
    fontVariantNumeric: 'tabular-nums',
  },
  gridScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem 1rem 1rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '12rem',
  },
  folderCard: {
    background: posTheme.cardBg,
    border: `1px solid ${posTheme.cardBorder}`,
    borderRadius: '18px',
    padding: '1.1rem',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '130px',
    cursor: 'pointer',
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
    boxShadow: posTheme.cardShadow,
  },
  folderAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '60px',
    height: '60px',
    background: 'radial-gradient(circle at top right, rgba(232,160,32,0.22), transparent 65%)',
    borderRadius: '0 18px 0 60px',
  },
  folderIconWrap: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.12)',
    border: `1px solid ${posTheme.panelBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.8rem',
    overflow: 'hidden',
  },
  folderName: {
    fontWeight: 700,
    fontSize: '0.92rem',
    color: posTheme.text,
    marginBottom: '0.2rem',
    lineHeight: 1.3,
  },
  folderMeta: {
    fontSize: '0.72rem',
    color: posTheme.textMuted,
    marginBottom: '0.75rem',
  },
  variantCard: {
    background: posTheme.cardBg,
    border: `1px solid ${posTheme.cardBorder}`,
    borderRadius: '18px',
    padding: '1rem',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
    boxShadow: posTheme.cardShadow,
  },
  variantOos: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  starBtn: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    zIndex: 10,
    minWidth: '40px',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'color 0.15s',
  },
  stockBadge: {
    position: 'absolute',
    top: '0.5rem',
    left: '0.5rem',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
  },
  stockBadgeLow: {
    background: 'rgba(248,113,113,0.22)',
    color: '#fecaca',
    border: '1px solid rgba(248,113,113,0.4)',
  },
  stockBadgeOk: {
    background: 'rgba(74,222,128,0.18)',
    color: '#bbf7d0',
    border: '1px solid rgba(74,222,128,0.35)',
  },
  variantTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: '2rem',
    marginBottom: '0.25rem',
  },
  variantName: {
    fontWeight: 700,
    fontSize: '0.94rem',
    color: posTheme.text,
    lineHeight: 1.3,
  },
  variantPath: {
    fontSize: '0.72rem',
    color: posTheme.textMuted,
    marginBottom: '0.35rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  variantAttrs: {
    fontSize: '0.78rem',
    color: posTheme.textSecondary,
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  colorDot: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.35)',
    flexShrink: 0,
  },
  variantPrice: {
    fontWeight: 800,
    fontSize: '1rem',
    color: posTheme.gold,
    fontFamily: "'Space Grotesk', sans-serif",
    marginBottom: '0.75rem',
  },
  stockBarTrack: {
    height: '4px',
    background: posTheme.trackBg,
    borderRadius: '999px',
    overflow: 'hidden',
    marginBottom: '0.3rem',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  stockLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: posTheme.textSecondary,
  },
  favStrip: {
    flexShrink: 0,
    borderTop: `1px solid ${posTheme.panelBorder}`,
    background: posTheme.panelBg,
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
    padding: '0.5rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    overflowX: 'auto',
  },
  favLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: posTheme.textMuted,
    flexShrink: 0,
  },
  favChip: {
    flexShrink: 0,
    padding: '0.4rem 0.9rem',
    minHeight: '36px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.10)',
    border: `1px solid ${posTheme.inputBorder}`,
    color: posTheme.textSecondary,
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s ease',
  },
}
