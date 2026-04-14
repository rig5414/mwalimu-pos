import { useState, useEffect } from 'react'

const DUMMY_STOCK = [
  { id:'v1a', product_name:'Pull-over Sweater', category_name:'Uniforms',   color:'Navy',   size:'S',        stock_qty:6  },
  { id:'v1b', product_name:'Pull-over Sweater', category_name:'Uniforms',   color:'Navy',   size:'M',        stock_qty:8  },
  { id:'v2a', product_name:'School T-Shirt',    category_name:'Uniforms',   color:'White',  size:'S',        stock_qty:10 },
  { id:'v3a', product_name:'School Trouser',    category_name:'Uniforms',   color:'Navy',   size:'28',       stock_qty:2  },
  { id:'v3b', product_name:'School Trouser',    category_name:'Uniforms',   color:'Navy',   size:'30',       stock_qty:1  },
  { id:'v6a', product_name:'Backpack 18"',      category_name:'Bags',       color:'Black',  size:'One Size', stock_qty:4  },
  { id:'v9a', product_name:'Full Tracksuit',    category_name:'Tracksuits', color:'Black',  size:'S',        stock_qty:4  },
  { id:'v12a', product_name:'Boys Shoes',       category_name:'Shoes',      color:'Black',  size:'37',       stock_qty:3  },
]

export default function StockPageAdmin() {
  const [stock, setStock]       = useState(DUMMY_STOCK)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null) // { type:'add'|'remove', item }
  const [qty, setQty]           = useState(10)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!window.api) return
    window.api.stock.getAll().then(res => { if (res.ok) setStock(res.data) })
  }, [])

  const filtered = stock.filter(s =>
    !search || s.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const doStock = async () => {
    setSaving(true)
    try {
      if (window.api) {
        const fn = modal.type === 'add' ? window.api.stock.addStock : window.api.stock.removeStock
        await fn({ variant_id: modal.item.id, quantity: qty })
      }
      const delta = modal.type === 'add' ? qty : -qty
      setStock(prev => prev.map(s => s.id === modal.item.id ? { ...s, stock_qty: s.stock_qty + delta } : s))
      setModal(null)
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
        <h1 className="font-head font-bold text-xl text-gray-800">Stock Management</h1>
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Product','Category','Variant','Stock','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800">{item.product_name}</td>
                <td className="px-4 py-3 text-gray-500">{item.category_name}</td>
                <td className="px-4 py-3 text-gray-500">{item.color} · Size {item.size}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${stockLevel(item.stock_qty)}`}>{item.stock_qty} units</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setModal({ type:'add', item }); setQty(10) }}
                      className="text-xs font-semibold text-primary bg-primary-light px-3 py-1.5
                                 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                      + Add
                    </button>
                    <button onClick={() => { setModal({ type:'remove', item }); setQty(1) }}
                      className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5
                                 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                      − Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
