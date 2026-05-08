import { useState, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'

export default function StockPageSK() {
  const [stock, setStock]     = useState([])
  const [search, setSearch]   = useState('')
  const [addingTo, setAddingTo] = useState(null)
  const [qty, setQty]         = useState(10)
  const [path, setPath]       = useState([])
  const [saving, setSaving]   = useState(false)
  const toast = useToast()

  useEffect(() => {
    const load = async () => {
      if (window.api) {
        const res = await window.api.stock.getAll()
        if (res.ok) setStock(res.data)
      }
    }
    load()
  }, [])

  const filtered = stock.filter(s =>
    !search || s.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const getTypeFolder = (item) => {
    const sub = item.subcategory || 'Uncategorized'
    const name = item.product_name || ''
    if (sub === 'Pullovers') {
      if (item.school_id) return 'Badged'
      if (name.toLowerCase().includes('plain')) return 'Plain'
      if (name.toLowerCase().includes('striped')) return 'Striped'
    }
    if (sub === 'Ties' || sub === 'Tie') {
       if (name.toLowerCase().includes('elastic')) return 'Elastic'
       if (name.toLowerCase().includes('long')) return 'Long'
    }
    if (sub === 'Marvins') {
       if (name.toLowerCase().includes('best')) return 'Best Quality'
       if (name.toLowerCase().includes('normal')) return 'Normal Quality'
    }
    return name
  }

  let currentLevelItems = []
  let viewType = 'folders'

  if (search) {
     currentLevelItems = filtered.map(item => ({ ...item, isVariant: true }))
     viewType = 'variants'
  } else if (path.length === 0) {
    const grouped = {}
    filtered.forEach(item => {
      const key = item.category_name || 'Uncategorized'
      if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'category', total_qty: 0, itemsCount: 0 }
      grouped[key].total_qty += item.stock_qty || 0
      grouped[key].itemsCount += 1
    })
    currentLevelItems = Object.values(grouped)
  } else if (path.length === 1) {
    const category = path[0]
    const grouped = {}
    filtered.filter(i => (i.category_name || 'Uncategorized') === category).forEach(item => {
      const key = item.subcategory || 'Uncategorized'
      if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'subcategory', total_qty: 0, itemsCount: 0 }
      grouped[key].total_qty += item.stock_qty || 0
      grouped[key].itemsCount += 1
    })
    currentLevelItems = Object.values(grouped)
  } else if (path.length === 2) {
    const category = path[0]
    const subcat = path[1]
    const grouped = {}
    filtered.filter(i => (i.category_name || 'Uncategorized') === category && (i.subcategory || 'Uncategorized') === subcat).forEach(item => {
      const key = getTypeFolder(item)
      if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'type', total_qty: 0, itemsCount: 0 }
      grouped[key].total_qty += item.stock_qty || 0
      grouped[key].itemsCount += 1
    })
    currentLevelItems = Object.values(grouped)
  } else if (path.length === 3) {
     const category = path[0]
     const subcat = path[1]
     const typeFolder = path[2]
     const itemsInType = filtered.filter(i => (i.category_name || 'Uncategorized') === category && (i.subcategory || 'Uncategorized') === subcat && getTypeFolder(i) === typeFolder)
     
     const uniqueProducts = new Set(itemsInType.map(i => i.product_name))
     if (uniqueProducts.size === 1) {
       currentLevelItems = itemsInType.map(item => ({ ...item, isVariant: true }))
       viewType = 'variants'
     } else {
       const grouped = {}
       itemsInType.forEach(item => {
         const key = item.product_name
         if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'product', total_qty: 0, itemsCount: 0 }
         grouped[key].total_qty += item.stock_qty || 0
         grouped[key].itemsCount += 1
       })
       currentLevelItems = Object.values(grouped)
     }
  } else if (path.length === 4) {
     const category = path[0]
     const subcat = path[1]
     const typeFolder = path[2]
     const productName = path[3]
     currentLevelItems = filtered.filter(i => 
       (i.category_name || 'Uncategorized') === category &&
       (i.subcategory || 'Uncategorized') === subcat && 
       getTypeFolder(i) === typeFolder && 
       i.product_name === productName
     ).map(item => ({ ...item, isVariant: true }))
     viewType = 'variants'
  }

  const handleAddStock = async () => {
    if (!addingTo || qty <= 0) return
    setSaving(true)
    try {
      if (window.api) {
        const res = await window.api.stock.addStock({ variant_id: addingTo.id, quantity: qty })
        if (!res.ok) throw new Error(res.error)
      }
      setStock(prev => prev.map(s => s.id === addingTo.id ? { ...s, stock_qty: s.stock_qty + qty } : s))
      toast.success(`Added ${qty} units for ${addingTo.product_name}`)
      setAddingTo(null)
      setQty(10)
    } catch (err) {
      toast.error(err.message || 'Failed to add stock')
    } finally {
      setSaving(false)
    }
  }

  const stockLevel = (qty) => {
    if (qty === 0) return { label: 'Out of stock', color: 'text-red-500', barColor: 'bg-red-400', pct: 0 }
    if (qty <= 5)  return { label: `${qty} units — Low`,      color: 'text-orange-500', barColor: 'bg-orange-400', pct: (qty/50)*100 }
    return             { label: `${qty} units`,               color: 'text-green-600',  barColor: 'bg-green-500',  pct: Math.min(100,(qty/50)*100) }
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button 
              onClick={() => setPath([])}
              className={`font-head font-bold text-xl transition-colors ${path.length === 0 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'}`}
            >
              Stock
            </button>
            {path.map((segment, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-300 font-bold text-xl">/</span>
                <button 
                  onClick={() => setPath(path.slice(0, idx + 1))}
                  className={`font-head font-bold text-xl transition-colors ${idx === path.length - 1 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'}`}
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {viewType === 'variants' ? `Select a variant to add stock.` : `Select a folder to view stock.`}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input className="outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400 w-48"
            placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* FOLDERS GRID */}
      {viewType === 'folders' && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentLevelItems.map(folder => {
            const level = stockLevel(folder.total_qty)
            return (
              <div 
                key={folder.id} 
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col justify-between"
                onClick={() => setPath([...path, folder.name])}
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="font-bold text-sm text-gray-800 mb-0.5 group-hover:text-primary transition-colors line-clamp-1">{folder.name}</p>
                  <p className="text-xs text-gray-400 mb-4">
                    {folder.itemsCount} items inside
                  </p>
                </div>
                <div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${level.barColor} transition-all`}
                         style={{ width: `${level.pct}%` }} />
                  </div>
                  <p className={`text-xs font-semibold ${level.color}`}>{folder.total_qty} total units</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VARIANTS GRID */}
      {viewType === 'variants' && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {currentLevelItems.map(item => {
            const level = stockLevel(item.stock_qty)
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-800 mb-0.5">{item.product_name}</p>
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                    {item.color && (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: item.color_hex || '#ccc' }}></span>
                        {item.color} · 
                      </>
                    )}
                    Size {item.size}
                  </p>
                </div>
                <div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${level.barColor} transition-all`}
                         style={{ width: `${level.pct}%` }} />
                  </div>
                  <p className={`text-xs font-semibold ${level.color} mb-3`}>{level.label}</p>
                  <button onClick={() => { setAddingTo(item); setQty(10) }}
                    className="w-full py-2 bg-primary-light text-primary rounded-lg text-sm font-semibold
                               cursor-pointer hover:bg-blue-100 transition-colors">
                    + Add Stock
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add stock modal */}
      {addingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(10,20,40,0.6)' }}
             onClick={e => e.target === e.currentTarget && setAddingTo(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-xs mx-4 shadow-modal">
            <h3 className="font-head font-bold text-lg mb-1">Add Stock</h3>
            <p className="text-sm text-gray-400 mb-5">
              {addingTo.product_name} — {addingTo.color} · Size {addingTo.size}
            </p>
            <label className="label">Quantity to Add</label>
            <input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)}
              min="1" className="input font-head font-bold text-2xl text-center mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setAddingTo(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-head font-semibold
                           text-gray-500 cursor-pointer hover:border-gray-300">Cancel</button>
              <button onClick={handleAddStock} disabled={saving}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-head font-bold
                           cursor-pointer hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : `+ Add ${qty} unit(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
