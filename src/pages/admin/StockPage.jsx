import { useState, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'
import { computeTreeBrowseState } from '../../lib/categoryBrowse'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { posTheme } from '../../styles/posTheme'

export default function StockPageAdmin() {
  const [stock, setStock] = useState([])
  const [catTree, setCatTree] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [qty, setQty] = useState(10)
  const [pathIds, setPathIds] = useState([])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!window.api) return
    Promise.all([
      window.api.stock.getAll(),
      window.api.categories?.getBrowseTree?.() || Promise.resolve({ ok: false }),
    ]).then(([stockRes, catRes]) => {
      if (stockRes.ok) setStock(stockRes.data || [])
      if (catRes?.ok) setCatTree(catRes.data || [])
    })
  }, [])

  const { viewType, currentLevelItems, breadcrumbs } = computeTreeBrowseState(
    stock,
    pathIds,
    catTree,
    search
  )

  const doStock = async () => {
    setSaving(true)
    try {
      if (window.api) {
        const fn = modal.type === 'add' ? window.api.stock.addStock : window.api.stock.removeStock
        const res = await fn({ variant_id: modal.item.id, quantity: qty })
        if (!res.ok) throw new Error(res.error)
      }
      const delta = modal.type === 'add' ? qty : -qty
      setStock((prev) =>
        prev.map((s) => (s.id === modal.item.id ? { ...s, stock_qty: s.stock_qty + delta } : s))
      )
      toast.success(
        `${modal.type === 'add' ? 'Added' : 'Removed'} ${qty} units for ${modal.item.product_name}`
      )
      setModal(null)
    } catch (err) {
      toast.error(err.message || 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  const stockLevel = (n) => {
    if (n === 0) return 'badge-danger'
    if (n <= 5) return 'badge-warning'
    return 'badge-success'
  }

  const navigateToCrumb = (index) => {
    if (index === 0) setPathIds([])
    else setPathIds(pathIds.slice(0, index))
  }

  const openFolder = (folder) => {
    setPathIds((prev) => [...prev, folder.id])
  }

  return (
    <div className="admin-page pos-dark-scroll">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Stock"
        subtitle={
          viewType === 'variants'
            ? 'Adjust quantities for variants at this category level.'
            : 'Drill into folders — depth follows your category tree.'
        }
        actions={
          <div className="pos-search-bar min-h-[40px] py-1 w-full sm:w-72">
            <svg
              className="w-4 h-4 flex-shrink-0"
              style={{ color: posTheme.textMuted }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search stock…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      {breadcrumbs.length > 1 && !search.trim() && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-sm">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.id ?? 'root'} className="flex items-center gap-1.5">
              {idx > 0 && <span style={{ color: posTheme.textMuted }}>/</span>}
              <button
                type="button"
                onClick={() => navigateToCrumb(idx)}
                className={`font-semibold transition-colors cursor-pointer ${
                  idx === breadcrumbs.length - 1 ? 'text-white' : 'hover:text-[#e8a020]'
                }`}
                style={idx === breadcrumbs.length - 1 ? undefined : { color: posTheme.textMuted }}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {viewType === 'folders' && (
        <div className="grid gap-3 admin-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentLevelItems.map((folder) => {
            const level = stockLevel(folder.total_qty)
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => openFolder(folder)}
                className="admin-glass-panel text-left p-4 cursor-pointer transition-all hover:border-[rgba(232,160,32,0.35)] group flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-xl"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    {folder.icon || '📁'}
                  </div>
                  <p className="font-bold text-sm text-white mb-0.5 line-clamp-2">{folder.name}</p>
                  <p className="text-xs mb-3" style={{ color: posTheme.textMuted }}>
                    {folder.itemsCount} variant{folder.itemsCount === 1 ? '' : 's'}
                    {folder.is_leaf ? ' · leaf' : ''}
                  </p>
                </div>
                <div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className={`h-full rounded-full ${level === 'badge-success' ? 'bg-green-500' : level === 'badge-warning' ? 'bg-orange-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, (folder.total_qty / 50) * 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs font-semibold admin-badge inline-flex ${level}`}>{folder.total_qty} units</p>
                </div>
              </button>
            )
          })}
          {currentLevelItems.length === 0 && (
            <div className="col-span-full admin-glass-panel p-10 text-center text-sm" style={{ color: posTheme.textMuted }}>
              No folders here yet. Add categories or assign products to see stock.
            </div>
          )}
        </div>
      )}

      {viewType === 'variants' && (
        <div className="grid gap-3 admin-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentLevelItems.map((item) => {
            const level = stockLevel(item.stock_qty)
            return (
              <div key={item.id} className="admin-glass-panel p-4 flex flex-col justify-between min-h-[160px]">
                <div>
                  <p className="font-bold text-sm text-white mb-0.5">{item.product_name}</p>
                  <p className="text-xs mb-1" style={{ color: posTheme.textMuted }}>
                    {(item.category_path || []).join(' › ')}
                  </p>
                  <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: posTheme.textSecondary }}>
                    {item.color && (
                      <>
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: item.color_hex || '#ccc' }}
                        />
                        {item.color} ·
                      </>
                    )}
                    Size {item.size || '—'}
                  </p>
                </div>
                <div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className={`h-full rounded-full ${level === 'badge-success' ? 'bg-green-500' : level === 'badge-warning' ? 'bg-orange-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, (item.stock_qty / 50) * 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs font-semibold admin-badge inline-flex mb-3 ${level}`}>{item.stock_qty} units</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModal({ type: 'add', item })
                        setQty(10)
                      }}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer pos-btn-gold"
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModal({ type: 'remove', item })
                        setQty(1)
                      }}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer admin-cat-action admin-cat-action--danger"
                    >
                      − Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {currentLevelItems.length === 0 && (
            <div className="col-span-full admin-glass-panel p-10 text-center text-sm" style={{ color: posTheme.textMuted }}>
              {search.trim() ? 'No variants match your search.' : 'No stock at this category level.'}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pos-overlay"
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div className="pos-glass-modal rounded-2xl p-7 w-full max-w-xs mx-4">
            <h3 className="font-head font-bold text-lg mb-1 text-white">
              {modal.type === 'add' ? '+ Add Stock' : '− Remove Stock'}
            </h3>
            <p className="text-sm mb-5" style={{ color: posTheme.textMuted }}>
              {modal.item.product_name} · {modal.item.color} · Size {modal.item.size}
              <br />
              <span className="font-semibold text-white/80">Current: {modal.item.stock_qty} units</span>
            </p>
            <label className="pos-glass-label">Quantity</label>
            <input
              type="number"
              value={qty}
              min="1"
              max={modal.type === 'remove' ? modal.item.stock_qty : undefined}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
              className="pos-glass-input font-head font-bold text-2xl text-center mb-5"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl pos-btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={doStock}
                disabled={saving || qty <= 0}
                className={`flex-[2] py-3 rounded-xl font-head font-bold cursor-pointer disabled:opacity-40 ${
                  modal.type === 'add' ? 'pos-btn-gold' : ''
                }`}
                style={
                  modal.type === 'remove'
                    ? {
                        background: 'rgba(248,113,113,0.35)',
                        color: '#fecaca',
                        border: '1px solid rgba(248,113,113,0.5)',
                      }
                    : {}
                }
              >
                {saving ? 'Saving…' : modal.type === 'add' ? `+ Add ${qty}` : `− Remove ${qty}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
