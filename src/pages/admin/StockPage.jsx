import { useState, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'

export default function StockPageAdmin() {
  const [stock, setStock]       = useState([])
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null) // { type:'add'|'remove', item }
  const [qty, setQty]           = useState(10)
  const [path, setPath]         = useState([])
  const [saving, setSaving]     = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!window.api) return
    window.api.stock.getAll().then(res => { if (res.ok) setStock(res.data) })
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

  const doStock = async () => {
    setSaving(true)
    try {
      if (window.api) {
        const fn = modal.type === 'add' ? window.api.stock.addStock : window.api.stock.removeStock
        const res = await fn({ variant_id: modal.item.id, quantity: qty })
        if (!res.ok) throw new Error(res.error)
      }
      const delta = modal.type === 'add' ? qty : -qty
      setStock(prev => prev.map(s => s.id === modal.item.id ? { ...s, stock_qty: s.stock_qty + delta } : s))
      toast.success(`${modal.type === 'add' ? 'Added' : 'Removed'} ${qty} units for ${modal.item.product_name}`)
      setModal(null)
    } catch (err) {
      toast.error(err.message || 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  const stockLevel = (qty) => {
    if (qty === 0) return 'badge-danger'
    if (qty <= 5)  return 'badge-warning'
    return 'badge-success'
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
              Stock Management
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
            {viewType === 'variants' ? `Add or remove stock for specific variants.` : `Select a folder to view stock.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input className="outline-none text-sm bg-transparent placeholder-gray-400 w-44"
              placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
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
                    <div className={`h-full rounded-full ${level === 'badge-success' ? 'bg-green-500' : level === 'badge-warning' ? 'bg-orange-400' : 'bg-red-400'} transition-all`}
                         style={{ width: `${Math.min(100, (folder.total_qty/50)*100)}%` }} />
                  </div>
                  <p className={`text-xs font-semibold ${level === 'badge-success' ? 'text-green-600' : level === 'badge-warning' ? 'text-orange-500' : 'text-red-500'}`}>{folder.total_qty} total units</p>
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
                    <div className={`h-full rounded-full ${level === 'badge-success' ? 'bg-green-500' : level === 'badge-warning' ? 'bg-orange-400' : 'bg-red-400'} transition-all`}
                         style={{ width: `${Math.min(100, (item.stock_qty/50)*100)}%` }} />
                  </div>
                  <p className={`text-xs font-semibold ${level === 'badge-success' ? 'text-green-600' : level === 'badge-warning' ? 'text-orange-500' : 'text-red-500'} mb-3`}>{item.stock_qty} units</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setModal({ type:'add', item }); setQty(10) }}
                      className="flex-1 py-2 bg-primary-light text-primary rounded-lg text-sm font-semibold
                                 cursor-pointer hover:bg-blue-100 transition-colors">
                      + Add
                    </button>
                    <button onClick={() => { setModal({ type:'remove', item }); setQty(1) }}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold
                                 cursor-pointer hover:bg-red-100 transition-colors">
                      − Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stock modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(10,20,40,0.6)' }}
             onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-xs mx-4 shadow-modal">
            <h3 className="font-head font-bold text-lg mb-1">
              {modal.type === 'add' ? '+ Add Stock' : '− Remove Stock'}
            </h3>
            <p className="text-sm text-gray-400 mb-5">
              {modal.item.product_name} · {modal.item.color} · Size {modal.item.size}
              <br /><span className="font-semibold text-gray-600">Current: {modal.item.stock_qty} units</span>
            </p>
            <label className="label">Quantity</label>
            <input type="number" value={qty} min="1"
              max={modal.type === 'remove' ? modal.item.stock_qty : undefined}
              onChange={e => setQty(parseInt(e.target.value) || 0)}
              className="input font-head font-bold text-2xl text-center mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-head font-semibold
                           text-gray-500 cursor-pointer">Cancel</button>
              <button onClick={doStock} disabled={saving || qty <= 0}
                className={`flex-[2] py-3 rounded-xl font-head font-bold text-white cursor-pointer
                            ${modal.type === 'add' ? 'bg-primary hover:bg-primary-dark' : 'bg-red-500 hover:bg-red-600'}
                            disabled:bg-gray-200 disabled:text-gray-400`}>
                {saving ? 'Saving…' : modal.type === 'add' ? `+ Add ${qty}` : `− Remove ${qty}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
