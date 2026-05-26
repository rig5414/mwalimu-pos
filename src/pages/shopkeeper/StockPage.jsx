import { useState, useEffect, useRef } from 'react'
import { useToast } from '../../hooks/useToast'
import { computeBrowseState, barcodeMatchesVariant } from '../../lib/hierarchyNav'
import { posTheme } from '../../styles/posTheme'

function stockLevel(q) {
  if (q === 0)
    return { label: 'Out of stock', color: '#f87171', barColor: '#f87171', pct: 0 }
  if (q <= 5)
    return { label: `${q} units — Low`, color: '#fb923c', barColor: '#fb923c', pct: (q / 50) * 100 }
  return { label: `${q} units`, color: '#4ade80', barColor: '#4ade80', pct: Math.min(100, (q / 50) * 100) }
}

function GlassModal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pos-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-glass-modal rounded-2xl w-full max-w-md shadow-none max-h-[90vh] overflow-y-auto pos-dark-scroll">
        <div className="p-6 pb-4" style={{ borderBottom: `1px solid ${posTheme.panelBorder}` }}>
          <h3 className="font-head font-bold text-lg text-white">{title}</h3>
          {subtitle && <p className="text-sm mt-1" style={{ color: posTheme.textMuted }}>{subtitle}</p>}
        </div>
        <div className="p-6 pt-4">{children}</div>
        {footer && <div className="px-6 pb-6 flex gap-3">{footer}</div>}
      </div>
    </div>
  )
}

export default function StockPageSK() {
  const [stock, setStock] = useState([])
  const [catTree, setCatTree] = useState(null)
  const [search, setSearch] = useState('')
  const [addingTo, setAddingTo] = useState(null)
  const [qty, setQty] = useState(10)
  const [path, setPath] = useState([])
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [qaBarcode, setQaBarcode] = useState('')
  const [qa, setQa] = useState({
    name: '',
    category_id: '',
    subcategory: '',
    price: '',
    cost_price: '',
    color: '—',
    size: '—',
    stock_qty: '0',
  })
  const toast = useToast()
  const barcodeBufferRef = useRef('')
  const barcodeTimerRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (window.api) {
        const [stockRes, catRes] = await Promise.all([
          window.api.stock.getAll(),
          window.api.categories?.getBrowseTree?.() || Promise.resolve({ ok: false }),
        ])
        if (stockRes.ok) setStock(stockRes.data)
        if (catRes?.ok) setCatTree(catRes.data)
        const c = await window.api.categories.getAll()
        if (c.ok && c.data?.length) {
          setCategories(c.data)
          setQa((prev) => ({ ...prev, category_id: prev.category_id || c.data[0].id }))
        }
      }
    }
    load()
  }, [])

  const filtered = stock.filter(
    (s) =>
      !search ||
      s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.sku?.toLowerCase().includes(search.toLowerCase()) ||
      s.product_barcode?.toLowerCase().includes(search.toLowerCase())
  )

  const { viewType, currentLevelItems } = computeBrowseState(filtered, path, search, catTree)

  useEffect(() => {
    const onKey = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (quickAddOpen) return

      if (e.key === 'Enter') {
        const code = barcodeBufferRef.current.trim()
        barcodeBufferRef.current = ''
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
        if (!code) return

        const existing = stock.find((s) => barcodeMatchesVariant(s, code))
        if (existing) {
          setAddingTo(existing)
          setQty(10)
          toast.success('Scanned — add stock for this variant')
          return
        }
        if (window.api?.products?.getByBarcode) {
          const res = await window.api.products.getByBarcode(code)
          if (res.ok) {
            toast.warning('This barcode exists on a product. Open inventory to adjust stock.')
            return
          }
        }
        setQaBarcode(code)
        setQa((prev) => ({
          ...prev,
          category_id: prev.category_id || categories[0]?.id || '',
        }))
        setQuickAddOpen(true)
        toast.info('Quick Add Product — new barcode')
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeBufferRef.current += e.key
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = ''
        }, 100)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stock, categories, toast, quickAddOpen])

  const submitQuickAdd = async () => {
    if (!qa.name.trim() || !qa.category_id || Number(qa.price) <= 0) {
      toast.error('Name, category, and price are required')
      return
    }
    setSaving(true)
    try {
      if (!window.api) throw new Error('API unavailable')
      const res = await window.api.products.create({
        name: qa.name.trim(),
        category_id: qa.category_id,
        subcategory: qa.subcategory.trim() || null,
        school_id: null,
        icon: '📦',
        cost_price: Number(qa.cost_price) || 0,
        price: Number(qa.price),
        barcode: qaBarcode.trim() || null,
        description: null,
        variants: [
          {
            color: qa.color.trim() || '—',
            size: qa.size.trim() || '—',
            stock_qty: Math.max(0, Number(qa.stock_qty) || 0),
            sku: qaBarcode.trim() || null,
          },
        ],
      })
      if (!res.ok) throw new Error(res.error)
      toast.success('Product created')
      setQuickAddOpen(false)
      setQaBarcode('')
      const st = await window.api.stock.getAll()
      if (st.ok) setStock(st.data)
    } catch (err) {
      toast.error(err.message || 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const handleAddStock = async () => {
    if (!addingTo || qty <= 0) return
    setSaving(true)
    try {
      if (window.api) {
        const res = await window.api.stock.addStock({ variant_id: addingTo.id, quantity: qty })
        if (!res.ok) throw new Error(res.error)
      }
      setStock((prev) =>
        prev.map((s) => (s.id === addingTo.id ? { ...s, stock_qty: s.stock_qty + qty } : s))
      )
      toast.success(`Added ${qty} units for ${addingTo.product_name}`)
      setAddingTo(null)
      setQty(10)
    } catch (err) {
      toast.error(err.message || 'Failed to add stock')
    } finally {
      setSaving(false)
    }
  }

  const cardStyle = {
    background: posTheme.cardBg,
    border: `1px solid ${posTheme.cardBorder}`,
    borderRadius: '18px',
    backdropFilter: posTheme.blur,
    WebkitBackdropFilter: posTheme.blur,
    boxShadow: posTheme.cardShadow,
  }

  return (
    <div className="h-full overflow-y-auto p-5 pos-dark-scroll">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <button
              type="button"
              onClick={() => setPath([])}
              className="font-head font-bold text-xl transition-colors cursor-pointer"
              style={{ color: path.length === 0 ? posTheme.text : posTheme.textMuted }}
            >
              Stock
            </button>
            {path.map((segment, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-bold text-xl" style={{ color: posTheme.textDim }}>
                  /
                </span>
                <button
                  type="button"
                  onClick={() => setPath(path.slice(0, idx + 1))}
                  className="font-head font-bold text-xl transition-colors cursor-pointer"
                  style={{ color: idx === path.length - 1 ? posTheme.text : posTheme.textMuted }}
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm mt-0.5" style={{ color: posTheme.textMuted }}>
            {viewType === 'variants'
              ? 'Select a variant to add stock. Scan an unknown barcode to quick-add a product.'
              : 'Select a folder. Scan an unknown barcode to quick-add.'}
          </p>
        </div>
        <div className="pos-search-bar min-w-[200px]">
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: posTheme.textMuted }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {viewType === 'folders' && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentLevelItems.map((folder) => {
            const level = stockLevel(folder.total_qty)
            return (
              <div
                key={folder.id}
                role="button"
                tabIndex={0}
                className="p-4 cursor-pointer transition-all flex flex-col justify-between min-h-[100px] stock-folder-card"
                style={cardStyle}
                onClick={() => setPath([...path, folder.id])}
                onKeyDown={(ev) => ev.key === 'Enter' && setPath([...path, folder.id])}
              >
                <div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: posTheme.goldBg, border: `1px solid ${posTheme.goldBorder}`, color: posTheme.gold }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-bold text-sm mb-0.5 line-clamp-1" style={{ color: posTheme.text }}>
                    {folder.name}
                  </p>
                  <p className="text-xs mb-4" style={{ color: posTheme.textMuted }}>
                    {folder.itemsCount} items inside
                  </p>
                </div>
                <div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: posTheme.trackBg }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${level.pct}%`, background: level.barColor }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: level.color }}>
                    {folder.total_qty} total units
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewType === 'variants' && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentLevelItems.map((item) => {
            const level = stockLevel(item.stock_qty)
            return (
              <div key={item.id} className="p-4 relative overflow-hidden flex flex-col justify-between" style={cardStyle}>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: posTheme.text }}>
                    {item.product_name}
                  </p>
                  <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: posTheme.textMuted }}>
                    {item.color && (
                      <>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color_hex || '#888', border: '1px solid rgba(255,255,255,0.3)' }}
                        />
                        {item.color} ·{' '}
                      </>
                    )}
                    Size {item.size}
                  </p>
                </div>
                <div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: posTheme.trackBg }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${level.pct}%`, background: level.barColor }} />
                  </div>
                  <p className="text-xs font-semibold mb-3" style={{ color: level.color }}>
                    {level.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingTo(item)
                      setQty(10)
                    }}
                    className="w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold cursor-pointer pos-btn-gold"
                  >
                    + Add Stock
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {currentLevelItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: posTheme.textMuted }}>
          <span className="text-4xl mb-3">📦</span>
          <p className="text-sm">No items found</p>
        </div>
      )}

      {addingTo && (
        <GlassModal
          title="Add Stock"
          subtitle={`${addingTo.product_name} — ${addingTo.color} · Size ${addingTo.size}`}
          onClose={() => setAddingTo(null)}
          footer={
            <>
              <button type="button" onClick={() => setAddingTo(null)} className="flex-1 min-h-[44px] py-3 rounded-xl pos-btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStock}
                disabled={saving}
                className="flex-[2] min-h-[44px] py-3 rounded-xl pos-btn-gold disabled:opacity-50"
              >
                {saving ? 'Saving...' : `+ Add ${qty} unit(s)`}
              </button>
            </>
          }
        >
          <label className="pos-glass-label">Quantity to Add</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
            min="1"
            className="pos-glass-input font-head font-bold text-2xl text-center"
          />
        </GlassModal>
      )}

      {quickAddOpen && (
        <GlassModal
          title="Quick Add Product"
          subtitle={
            <>
              Barcode / SKU: <span className="font-mono font-bold text-white">{qaBarcode}</span>
            </>
          }
          onClose={() => setQuickAddOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setQuickAddOpen(false)} className="flex-1 min-h-[48px] rounded-xl pos-btn-ghost">
                Cancel
              </button>
              <button type="button" onClick={submitQuickAdd} disabled={saving} className="flex-[2] min-h-[48px] rounded-xl pos-btn-gold">
                {saving ? 'Saving…' : 'Create product'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="pos-glass-label">Name *</label>
              <input className="pos-glass-input" value={qa.name} onChange={(e) => setQa({ ...qa, name: e.target.value })} />
            </div>
            <div>
              <label className="pos-glass-label">Category *</label>
              <select className="pos-glass-select" value={qa.category_id} onChange={(e) => setQa({ ...qa, category_id: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="pos-glass-label">Subcategory</label>
              <input
                className="pos-glass-input"
                value={qa.subcategory}
                onChange={(e) => setQa({ ...qa, subcategory: e.target.value })}
                placeholder="e.g. Pullovers"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="pos-glass-label">Price (KES) *</label>
                <input type="number" className="pos-glass-input" value={qa.price} onChange={(e) => setQa({ ...qa, price: e.target.value })} />
              </div>
              <div>
                <label className="pos-glass-label">Cost (KES)</label>
                <input type="number" className="pos-glass-input" value={qa.cost_price} onChange={(e) => setQa({ ...qa, cost_price: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="pos-glass-label">Color</label>
                <input className="pos-glass-input" value={qa.color} onChange={(e) => setQa({ ...qa, color: e.target.value })} />
              </div>
              <div>
                <label className="pos-glass-label">Size</label>
                <input className="pos-glass-input" value={qa.size} onChange={(e) => setQa({ ...qa, size: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="pos-glass-label">Initial stock</label>
              <input type="number" className="pos-glass-input" min="0" value={qa.stock_qty} onChange={(e) => setQa({ ...qa, stock_qty: e.target.value })} />
            </div>
          </div>
        </GlassModal>
      )}

      <style>{`
        .stock-folder-card:hover {
          border-color: rgba(232,160,32,0.5) !important;
          background: rgba(255,255,255,0.18) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  )
}
