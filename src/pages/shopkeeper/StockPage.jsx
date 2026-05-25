import { useState, useEffect, useRef } from 'react'
import { useToast } from '../../hooks/useToast'
import { computeBrowseState, barcodeMatchesVariant } from '../../lib/hierarchyNav'

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
          window.api.categories?.getBrowseTree?.() || Promise.resolve({ ok: false })
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

  const stockLevel = (q) => {
    if (q === 0) return { label: 'Out of stock', color: 'text-red-500', barColor: 'bg-red-400', pct: 0 }
    if (q <= 5)
      return { label: `${q} units — Low`, color: 'text-orange-500', barColor: 'bg-orange-400', pct: (q / 50) * 100 }
    return { label: `${q} units`, color: 'text-green-600', barColor: 'bg-green-500', pct: Math.min(100, (q / 50) * 100) }
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <button
              type="button"
              onClick={() => setPath([])}
              className={`font-head font-bold text-xl transition-colors ${
                path.length === 0 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'
              }`}
            >
              Stock
            </button>
            {path.map((segment, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-300 font-bold text-xl">/</span>
                <button
                  type="button"
                  onClick={() => setPath(path.slice(0, idx + 1))}
                  className={`font-head font-bold text-xl transition-colors ${
                    idx === path.length - 1 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'
                  }`}
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {viewType === 'variants'
              ? 'Select a variant to add stock. Scan an unknown barcode to quick-add a product.'
              : 'Select a folder. Scan an unknown barcode to quick-add.'}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5 min-h-[48px]">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            className="outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400 w-48 min-h-[40px]"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col justify-between min-h-[100px]"
                onClick={() => setPath([...path, folder.id])}
                onKeyDown={(ev) => ev.key === 'Enter' && setPath([...path, folder.id])}
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="font-bold text-sm text-gray-800 mb-0.5 group-hover:text-primary transition-colors line-clamp-1">
                    {folder.name}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">{folder.itemsCount} items inside</p>
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
      )}

      {viewType === 'variants' && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentLevelItems.map((item) => {
            const level = stockLevel(item.stock_qty)
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <p className="font-bold text-sm text-gray-800 mb-0.5">{item.product_name}</p>
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
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
                </div>
                <div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${level.barColor} transition-all`} style={{ width: `${level.pct}%` }} />
                  </div>
                  <p className={`text-xs font-semibold ${level.color} mb-3`}>{level.label}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingTo(item)
                      setQty(10)
                    }}
                    className="w-full min-h-[44px] py-2 bg-primary-light text-primary rounded-lg text-sm font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    + Add Stock
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {addingTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(10,20,40,0.6)' }}
          onClick={(e) => e.target === e.currentTarget && setAddingTo(null)}
        >
          <div className="bg-white rounded-2xl p-7 w-full max-w-xs mx-4 shadow-modal">
            <h3 className="font-head font-bold text-lg mb-1">Add Stock</h3>
            <p className="text-sm text-gray-400 mb-5">
              {addingTo.product_name} — {addingTo.color} · Size {addingTo.size}
            </p>
            <label className="label">Quantity to Add</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
              min="1"
              className="input font-head font-bold text-2xl text-center mb-5"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAddingTo(null)}
                className="flex-1 min-h-[44px] py-3 rounded-xl border-2 border-gray-200 font-head font-semibold text-gray-500 cursor-pointer hover:border-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStock}
                disabled={saving}
                className="flex-[2] min-h-[44px] py-3 rounded-xl bg-primary text-white font-head font-bold cursor-pointer hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : `+ Add ${qty} unit(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {quickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,20,40,0.6)' }}
          onClick={(e) => e.target === e.currentTarget && setQuickAddOpen(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-modal max-h-[90vh] overflow-y-auto">
            <h3 className="font-head font-bold text-lg mb-1">Quick Add Product</h3>
            <p className="text-sm text-gray-500 mb-4">
              Barcode / SKU: <span className="font-mono font-bold">{qaBarcode}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={qa.name} onChange={(e) => setQa({ ...qa, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={qa.category_id}
                  onChange={(e) => setQa({ ...qa, category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Subcategory</label>
                <input
                  className="input"
                  value={qa.subcategory}
                  onChange={(e) => setQa({ ...qa, subcategory: e.target.value })}
                  placeholder="e.g. Pullovers"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (KES) *</label>
                  <input
                    type="number"
                    className="input"
                    value={qa.price}
                    onChange={(e) => setQa({ ...qa, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Cost (KES)</label>
                  <input
                    type="number"
                    className="input"
                    value={qa.cost_price}
                    onChange={(e) => setQa({ ...qa, cost_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Color</label>
                  <input className="input" value={qa.color} onChange={(e) => setQa({ ...qa, color: e.target.value })} />
                </div>
                <div>
                  <label className="label">Size</label>
                  <input className="input" value={qa.size} onChange={(e) => setQa({ ...qa, size: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Initial stock</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={qa.stock_qty}
                  onChange={(e) => setQa({ ...qa, stock_qty: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitQuickAdd}
                disabled={saving}
                className="flex-[2] min-h-[48px] rounded-xl bg-primary text-white font-head font-bold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
