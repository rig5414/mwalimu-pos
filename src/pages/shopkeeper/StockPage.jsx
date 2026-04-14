import { useState, useEffect } from 'react'

const DUMMY_STOCK = [
  { id:'v1b', product_name:'Pull-over Sweater', category_name:'Uniforms', color:'Navy', size:'M', stock_qty:8 },
  { id:'v2a', product_name:'School T-Shirt',    category_name:'Uniforms', color:'White', size:'S', stock_qty:10 },
  { id:'v3a', product_name:'School Trouser',    category_name:'Uniforms', color:'Navy', size:'28', stock_qty:2 },
  { id:'v6a', product_name:'Backpack 18"',      category_name:'School Bags', color:'Black', size:'One Size', stock_qty:4 },
  { id:'v9a', product_name:'Full Tracksuit',    category_name:'Tracksuits', color:'Black', size:'S', stock_qty:4 },
  { id:'v12a', product_name:'Boys School Shoes', category_name:'Shoes', color:'Black', size:'37', stock_qty:3 },
]

export default function StockPageSK() {
  const [stock, setStock]     = useState([])
  const [search, setSearch]   = useState('')
  const [addingTo, setAddingTo] = useState(null)
  const [qty, setQty]         = useState(10)

  useEffect(() => {
    const load = async () => {
      if (window.api) {
        const res = await window.api.stock.getAll()
        if (res.ok) setStock(res.data)
      } else {
        setStock(DUMMY_STOCK)
      }
    }
    load()
  }, [])

  const filtered = stock.filter(s =>
    !search || s.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddStock = async () => {
    if (!addingTo || qty <= 0) return
    if (window.api) {
      await window.api.stock.addStock({ variant_id: addingTo.id, quantity: qty })
    }
    setStock(prev => prev.map(s => s.id === addingTo.id ? { ...s, stock_qty: s.stock_qty + qty } : s))
    setAddingTo(null)
    setQty(10)
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
          <h1 className="font-head font-bold text-xl text-gray-800">Stock Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">You can add stock. Contact admin to remove.</p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input className="outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400 w-48"
            placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {filtered.map(item => {
          const level = stockLevel(item.stock_qty)
          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="font-bold text-sm text-gray-800 mb-0.5">{item.product_name}</p>
              <p className="text-xs text-gray-400 mb-3">
                {item.category_name} · {item.color} · Size {item.size}
              </p>
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
          )
        })}
      </div>

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
              <button onClick={handleAddStock}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-head font-bold
                           cursor-pointer hover:bg-primary-dark">
                + Add {qty} units
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
