import { useState, useEffect, useCallback, useRef } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/useToast'
import PaymentModal from '../../components/pos/PaymentModal'
import ReceiptModal from '../../components/pos/ReceiptModal'
import CartPanel from '../../components/pos/CartPanel'

export default function POSPage() {
  const [stock, setStock]                   = useState([])
  const [path, setPath]                     = useState([])
  const [search, setSearch]                 = useState('')
  const [showPayment, setShowPayment]       = useState(false)
  const [completedSale, setCompletedSale]   = useState(null)

  const { user } = useAuthStore()
  const addItem = useCartStore(state => state.addItem)
  const toast = useToast()
  const barcodeBufferRef = useRef('')
  const barcodeTimerRef = useRef(null)

  // Load stock on mount
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
      if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'category', icon: item.icon, total_qty: 0, itemsCount: 0 }
      grouped[key].total_qty += item.stock_qty || 0
      grouped[key].itemsCount += 1
    })
    currentLevelItems = Object.values(grouped)
  } else if (path.length === 1) {
    const category = path[0]
    const grouped = {}
    filtered.filter(i => (i.category_name || 'Uncategorized') === category).forEach(item => {
      const key = item.subcategory || 'Uncategorized'
      if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'subcategory', icon: item.icon, total_qty: 0, itemsCount: 0 }
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
      if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'type', icon: item.icon, total_qty: 0, itemsCount: 0 }
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
         if (!grouped[key]) grouped[key] = { id: key, name: key, type: 'product', icon: item.icon, total_qty: 0, itemsCount: 0 }
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

  // Handle barcode scanning
  const resolveBarcodeVariant = useCallback(async (barcode) => {
    return stock.find(v => v.barcode === barcode || v.id === barcode || v.product_id === barcode)
  }, [stock])

  useEffect(() => {
    const handleKeydown = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === 'Enter') {
        const barcode = barcodeBufferRef.current.trim()
        if (!barcode) return

        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
        barcodeTimerRef.current = null

        const variant = await resolveBarcodeVariant(barcode)
        if (variant && Number(variant.stock_qty) > 0) {
          addItem({
            variantId: variant.id,
            productName: variant.product_name,
            color: variant.color,
            size: variant.size,
            price: variant.price,
            icon: variant.icon || '📦',
            qty: 1
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
    // Reload stock to reflect deductions
    if (window.api) {
      window.api.stock.getAll().then(res => {
        if (res.ok) setStock(res.data)
      })
    }
  }

  const stockLevel = (qty) => {
    if (qty === 0) return { label: 'Out of stock', color: 'text-red-500', barColor: 'bg-red-400', pct: 0 }
    if (qty <= 5)  return { label: `${qty} units — Low`,      color: 'text-orange-500', barColor: 'bg-orange-400', pct: (qty/50)*100 }
    return             { label: `${qty} units`,               color: 'text-green-600',  barColor: 'bg-green-500',  pct: Math.min(100,(qty/50)*100) }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT: Product Browser ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
        
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400"
            placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">×</button>}
        </div>

        <div className="flex items-center gap-2 mb-1 pl-1 flex-wrap">
          <button 
            onClick={() => setPath([])}
            className={`font-head font-bold text-xl transition-colors ${path.length === 0 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'}`}
          >
            Categories
          </button>
          {path.map((segment, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-gray-300 font-bold">/</span>
              <button 
                onClick={() => setPath(path.slice(0, idx + 1))}
                className={`font-head font-bold text-xl transition-colors
                            ${idx === path.length - 1 ? 'text-gray-800' : 'text-gray-400 hover:text-primary cursor-pointer'}`}
              >
                {segment}
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-20">
          {currentLevelItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <span className="text-4xl mb-2">📂</span>
              <p className="text-sm">No items found</p>
            </div>
          ) : viewType === 'folders' ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {currentLevelItems.map(folder => {
                const level = stockLevel(folder.total_qty)
                return (
                  <div key={folder.id} onClick={() => setPath([...path, folder.id])}
                    className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden flex flex-col justify-between
                               cursor-pointer hover:border-primary hover:shadow-card transition-all active:scale-95 group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl" />
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl mb-3 group-hover:bg-primary-light transition-colors">
                        {folder.icon || '📁'}
                      </div>
                      <p className="font-bold text-sm text-gray-800 mb-1 leading-tight">{folder.name}</p>
                      <p className="text-xs text-gray-400 mb-3">{folder.itemsCount} {folder.itemsCount === 1 ? 'item' : 'items'}</p>
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
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {currentLevelItems.map(item => {
                const level = stockLevel(item.stock_qty)
                const outOfStock = item.stock_qty === 0
                return (
                  <div key={item.id} 
                    onClick={() => {
                      if (outOfStock) return
                      addItem({
                        variantId: item.id,
                        productName: item.product_name,
                        color: item.color,
                        size: item.size,
                        price: item.price,
                        icon: item.icon || '📦',
                        qty: 1
                      })
                      toast.success(`Added 1 ${item.product_name} to cart`)
                    }}
                    className={`bg-white rounded-xl border-2 p-4 relative overflow-hidden flex flex-col justify-between transition-all
                                ${outOfStock ? 'opacity-60 cursor-not-allowed border-gray-100' : 'border-gray-200 cursor-pointer hover:border-primary hover:shadow-card active:scale-95'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                         <p className="font-bold text-sm text-gray-800 leading-tight pr-4">{item.product_name}</p>
                         <span className="text-xl">{item.icon || '📦'}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                        {item.color && (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: item.color_hex || '#ccc' }}></span>
                            {item.color} · 
                          </>
                        )}
                        Size {item.size}
                      </p>
                      <p className="text-base font-extrabold text-primary font-head mb-3">
                        KES {item.price?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${level.barColor} transition-all`}
                             style={{ width: `${level.pct}%` }} />
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

      {/* ── RIGHT: Cart Panel ── */}
      <CartPanel onCheckout={() => setShowPayment(true)} />

      {/* ── Modals ── */}
      {showPayment && (
        <PaymentModal onClose={() => setShowPayment(false)} onComplete={handlePaymentComplete} userId={user?.id} />
      )}
      {completedSale && (
        <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  )
}
