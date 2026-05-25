import { useState, useEffect, useCallback, useRef } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useDisplayModeStore } from '../../store/displayModeStore'
import { useToast } from '../../hooks/useToast'
import PaymentModal from '../../components/pos/PaymentModal'
import ReceiptModal from '../../components/pos/ReceiptModal'
import CartPanel from '../../components/pos/CartPanel'
import HierarchyTreeSidebar from '../../components/pos/HierarchyTreeSidebar'
import {
  computeBrowseState,
  getDisplayBreadcrumb,
  formatPathSegmentForDisplay,
  barcodeMatchesVariant,
} from '../../lib/hierarchyNav'

export default function POSPage() {
  const [stock, setStock] = useState([])
  const [catTree, setCatTree] = useState(null)
  const [path, setPath] = useState([])
  const [search, setSearch] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [completedSale, setCompletedSale] = useState(null)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState(() => new Set())
  const [favoritesRows, setFavoritesRows] = useState([])

  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((state) => state.addItem)
  const mode = useDisplayModeStore((s) => s.mode)
  const toggleMode = useDisplayModeStore((s) => s.toggleMode)
  const toast = useToast()
  const barcodeBufferRef = useRef('')
  const barcodeTimerRef = useRef(null)

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
          window.api.categories?.getBrowseTree?.() || Promise.resolve({ ok: false })
        ])
        if (stockRes.ok) setStock(stockRes.data)
        if (catRes.ok) setCatTree(catRes.data)
        await reloadFavorites()
      }
    }
    load()
  }, [reloadFavorites])

  const filtered = stock.filter(
    (s) =>
      !search ||
      s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.sku?.toLowerCase().includes(search.toLowerCase()) ||
      s.product_barcode?.toLowerCase().includes(search.toLowerCase())
  )

  const { viewType, currentLevelItems } = computeBrowseState(filtered, path, search, catTree)

  const resolveBarcodeVariant = useCallback(
    (barcode) => stock.find((v) => barcodeMatchesVariant(v, barcode)),
    [stock]
  )

  const toggleFavorite = async (e, variantRow) => {
    e?.stopPropagation?.()
    if (!window.api?.favorites) {
      toast.warning('Favorites require the desktop app')
      return
    }
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
          addItem({
            variantId: variant.id,
            productName: variant.product_name,
            color: variant.color,
            size: variant.size,
            price: variant.price,
            icon: variant.icon || '📦',
            qty: 1,
          })
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
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = ''
          barcodeTimerRef.current = null
        }, 120)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
    }
  }, [resolveBarcodeVariant, toast, addItem])

  const handlePaymentComplete = (saleResult) => {
    setShowPayment(false)
    setCompletedSale(saleResult)
    if (window.api) {
      window.api.stock.getAll().then((res) => {
        if (res.ok) setStock(res.data)
      })
    }
  }

  const stockLevel = (qty) => {
    if (qty === 0) return { label: 'Out of stock', color: 'text-red-500', barColor: 'bg-red-400', pct: 0 }
    if (qty <= 5)
      return {
        label: `${qty} in stock`,
        color: 'text-orange-500',
        barColor: 'bg-orange-400',
        pct: (qty / 50) * 100,
      }
    return { label: `${qty} in stock`, color: 'text-green-600', barColor: 'bg-green-500', pct: Math.min(100, (qty / 50) * 100) }
  }

  const dense = mode === 'dense'
  const folderMin = dense ? 'minmax(160px, 1fr)' : 'minmax(200px, 1fr)'
  const variantMin = dense ? 'minmax(180px, 1fr)' : 'minmax(240px, 1fr)'

  const addVariantToCart = (item) => {
    if (item.stock_qty === 0) return
    addItem({
      variantId: item.id,
      productName: item.product_name,
      color: item.color,
      size: item.size,
      price: item.price,
      icon: item.icon || '📦',
      qty: 1,
    })
    toast.success(`Added 1 ${item.product_name} to cart`)
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-100/50">
      <HierarchyTreeSidebar
        stock={stock}
        path={path}
        setPath={setPath}
        collapsed={treeCollapsed}
        onToggleCollapse={() => setTreeCollapsed((v) => !v)}
        catTree={catTree}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-1 min-w-[200px] items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm min-h-[48px]">
              <svg
                className="w-5 h-5 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400 min-h-[44px]"
                placeholder="Search products by name, SKU or school…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="text-gray-300 text-lg" title="Barcode">
                ▤
              </span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={toggleMode}
              className="min-h-[48px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm"
            >
              {dense ? 'Touch mode' : 'Dense mode'}
            </button>
          </div>

          <div className="flex items-center gap-2 mb-1 pl-1 flex-wrap text-sm">
            <span className="text-gray-400 font-medium">Browsing:</span>
            <button
              type="button"
              onClick={() => setPath([])}
              className={`font-head font-bold text-base sm:text-lg transition-colors min-h-[44px] px-1 ${
                path.length === 0 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'
              }`}
            >
              Categories
            </button>
            {path.map((segment, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-300 font-bold">›</span>
                <button
                  type="button"
                  onClick={() => setPath(path.slice(0, idx + 1))}
                  className={`font-head font-bold text-base sm:text-lg transition-colors min-h-[44px] px-1 ${
                    idx === path.length - 1 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'
                  }`}
                >
                  {formatPathSegmentForDisplay(segment)}
                </button>
              </div>
            ))}
            <span className="ml-auto text-gray-400 text-sm tabular-nums">
              {viewType === 'variants' ? currentLevelItems.length : currentLevelItems.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-2">
            {currentLevelItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <span className="text-4xl mb-2">📂</span>
                <p className="text-sm">No items found</p>
              </div>
            ) : viewType === 'folders' ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${folderMin})` }}>
                {currentLevelItems.map((folder) => {
                  const level = stockLevel(folder.total_qty)
                  return (
                    <div
                      key={folder.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPath([...path, folder.id])}
                      onKeyDown={(ev) => ev.key === 'Enter' && setPath([...path, folder.id])}
                      className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden flex flex-col justify-between
                                 cursor-pointer hover:border-primary hover:shadow-card transition-all active:scale-[0.98] group min-h-[120px]"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl" />
                      <div>
                        <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-2xl mb-3 group-hover:bg-primary-light transition-colors">
                          {folder.icon || '📁'}
                        </div>
                        <p className="font-bold text-sm text-gray-800 mb-1 leading-tight">{folder.name}</p>
                        <p className="text-xs text-gray-400 mb-3">
                          {folder.itemsCount} {folder.itemsCount === 1 ? 'variant' : 'variants'}
                        </p>
                      </div>
                      <div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                          <div className={`h-full rounded-full ${level.barColor} transition-all`} style={{ width: `${level.pct}%` }} />
                        </div>
                        <p className={`text-xs font-semibold ${level.color}`}>{folder.total_qty} total units</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${variantMin})` }}>
                {currentLevelItems.map((item) => {
                  const level = stockLevel(item.stock_qty)
                  const outOfStock = item.stock_qty === 0
                  const pinned = favoriteIds.has(item.id)
                  const low = item.stock_qty > 0 && item.stock_qty <= 5
                  const pathLine = getDisplayBreadcrumb(item)
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (outOfStock) return
                        addVariantToCart(item)
                      }}
                      onKeyDown={(ev) => ev.key === 'Enter' && !outOfStock && addVariantToCart(item)}
                      className={`bg-white rounded-xl border-2 p-4 relative overflow-hidden flex flex-col justify-between transition-all
                        ${outOfStock ? 'opacity-60 cursor-not-allowed border-gray-100' : 'border-gray-200 cursor-pointer hover:border-primary hover:shadow-card active:scale-[0.98]'}`}
                    >
                      <button
                        type="button"
                        title={pinned ? 'Remove from favorites' : 'Pin to favorites'}
                        onClick={(e) => toggleFavorite(e, item)}
                        className="absolute top-2 right-2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg cursor-pointer border-0 bg-white/90"
                      >
                        {pinned ? '★' : '☆'}
                      </button>
                      {!dense && (
                        <div
                          className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full ${
                            low ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.stock_qty} in stock
                        </div>
                      )}
                      <div className={dense ? '' : 'mt-6'}>
                        <div className="flex justify-between items-start mb-2 pr-10">
                          <p className="font-bold text-sm text-gray-800 leading-tight">{item.product_name}</p>
                          <span className="text-xl">{item.icon || '📦'}</span>
                        </div>
                        <p
                          className="text-[10px] text-gray-400 mb-2 truncate font-medium tracking-tight"
                          title={pathLine}
                        >
                          {pathLine}
                        </p>
                        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                          {item.color && (
                            <>
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-gray-300"
                                style={{ backgroundColor: item.color_hex || '#ccc' }}
                              />
                              {item.color} ·{' '}
                            </>
                          )}
                          Size {item.size}
                        </p>
                        <p className={`font-extrabold text-primary font-head mb-3 ${dense ? 'text-sm' : 'text-base'}`}>
                          KES {item.price?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                          <div className={`h-full rounded-full ${level.barColor} transition-all`} style={{ width: `${level.pct}%` }} />
                        </div>
                        <p className={`text-xs font-semibold ${level.color}`}>{level.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {favoritesRows.length > 0 && (
          <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-2 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 flex-shrink-0">FAVORITES</span>
            {favoritesRows.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (Number(f.stock_qty) <= 0) {
                    toast.error('Out of stock')
                    return
                  }
                  addVariantToCart(f)
                }}
                className="flex-shrink-0 px-3 py-2 min-h-[44px] rounded-full bg-gray-100 hover:bg-primary-light text-sm font-semibold text-gray-800 border border-gray-200 cursor-pointer"
              >
                {f.product_name}
                {f.size ? ` · ${f.size}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <CartPanel onCheckout={() => setShowPayment(true)} />

      {showPayment && (
        <PaymentModal onClose={() => setShowPayment(false)} onComplete={handlePaymentComplete} userId={user?.id} />
      )}
      {completedSale && <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
    </div>
  )
}
