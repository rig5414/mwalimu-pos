import { useState, useEffect, useCallback, useRef } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/useToast'
import VariantModal from '../../components/pos/VariantModal'
import PaymentModal from '../../components/pos/PaymentModal'
import ReceiptModal from '../../components/pos/ReceiptModal'
import CartPanel from '../../components/pos/CartPanel'

// ── Fallback dummy data for dev without Electron ─────────────────────────────
const DUMMY_CATEGORIES = [
  { id: 'school-uniforms', name: 'School Uniforms',   icon: '👔' },
  { id: 'games-attires',   name: 'Games Attires',     icon: '🏃' },
  { id: 'footwear',        name: 'Footwear',          icon: '👟' },
  { id: 'inner-wear',      name: 'Inner Wear',        icon: '🧦' },
  { id: 'beddings',        name: 'Beddings',          icon: '🛏️' },
  { id: 'school-bags',     name: 'School Bags',       icon: '🎒' },
  { id: 'schools',         name: 'Schools',           icon: '🏫' },
]

const DUMMY_PRODUCTS = [
  // ── School Uniforms ──
  { id: '1', name: 'Navy Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', price: 1200, total_stock: 28, icon: '🧥' },
  { id: '2', name: 'School Shirt', category_id: 'school-uniforms', subcategory: 'Shirts', price: 650, total_stock: 35, icon: '👕' },
  { id: '3', name: 'Navy Trouser', category_id: 'school-uniforms', subcategory: 'Trousers', price: 1150, total_stock: 20, icon: '👖' },
  { id: '4', name: 'Navy Dress', category_id: 'school-uniforms', subcategory: 'Dresses', price: 1350, total_stock: 15, icon: '👗' },
  { id: '5', name: 'Half Sweater', category_id: 'school-uniforms', subcategory: 'Half Sweaters', price: 950, total_stock: 22, icon: '🧤' },
  { id: '6', name: 'School Socks (6-pack)', category_id: 'school-uniforms', subcategory: 'Socks', price: 480, total_stock: 40, icon: '🧦' },
  { id: '7', name: 'Navy Skirt', category_id: 'school-uniforms', subcategory: 'Skirts', price: 1100, total_stock: 18, icon: '👗' },
  { id: '8', name: "Marvin's (Male Vest)", category_id: 'school-uniforms', subcategory: "Marvin's", price: 450, total_stock: 32, icon: '👕' },
  { id: '9', name: 'School Gloves', category_id: 'school-uniforms', subcategory: 'Gloves', price: 350, total_stock: 25, icon: '🧤' },

  // ── Games Attires ──
  { id: '10', name: 'Games T-Shirt', category_id: 'games-attires', subcategory: 'Tshirts', price: 550, total_stock: 45, icon: '👕' },
  { id: '11', name: 'Full Tracksuit', category_id: 'games-attires', subcategory: 'Tracksuits', price: 2450, total_stock: 14, icon: '🥋' },
  { id: '12', name: 'Games Shorts', category_id: 'games-attires', subcategory: 'Games Shorts', price: 750, total_stock: 35, icon: '🩳' },
  { id: '13', name: 'Wrappers/Bloomers', category_id: 'games-attires', subcategory: 'Wrappers Bloomers', price: 650, total_stock: 28, icon: '👗' },
  { id: '14', name: 'Jersey', category_id: 'games-attires', subcategory: 'Jersey', price: 850, total_stock: 22, icon: '👕' },
  { id: '15', name: 'Girls Shorts', category_id: 'games-attires', subcategory: 'Girls shorts', price: 700, total_stock: 30, icon: '🩳' },

  // ── Footwear ──
  { id: '16', name: 'Toughees (Kids)', category_id: 'footwear', subcategory: 'Toughees', price: 2800, total_stock: 12, icon: '👞' },
  { id: '17', name: 'Studeez Shoes', category_id: 'footwear', subcategory: 'Studeez', price: 2600, total_stock: 16, icon: '👟' },
  { id: '18', name: 'Semi + Toughees', category_id: 'footwear', subcategory: 'Semi + Toughees', price: 2400, total_stock: 14, icon: '👞' },
  { id: '19', name: 'Rubber Shoes', category_id: 'footwear', subcategory: 'Rubber shoes', price: 1800, total_stock: 24, icon: '👟' },
  { id: '20', name: 'Slippers', category_id: 'footwear', subcategory: 'Slippers', price: 800, total_stock: 42, icon: '🩴' },
  { id: '21', name: 'Crocs', category_id: 'footwear', subcategory: 'Crocs', price: 1500, total_stock: 20, icon: '👟' },
  { id: '22', name: 'Bata Breathers', category_id: 'footwear', subcategory: 'Bata Breathers', price: 2200, total_stock: 18, icon: '👟' },

  // ── Inner Wear ──
  { id: '23', name: 'Boxers', category_id: 'inner-wear', subcategory: 'Boxers', price: 400, total_stock: 50, icon: '👖' },
  { id: '24', name: 'Panties', category_id: 'inner-wear', subcategory: 'Panties', price: 380, total_stock: 55, icon: '👖' },
  { id: '25', name: 'Vests', category_id: 'inner-wear', subcategory: 'Vests', price: 350, total_stock: 48, icon: '🧤' },
  { id: '26', name: 'Sports Bra', category_id: 'inner-wear', subcategory: 'Sports bra', price: 650, total_stock: 30, icon: '🧤' },

  // ── Beddings ──
  { id: '27', name: 'Blanket', category_id: 'beddings', subcategory: 'Blankets', price: 2500, total_stock: 10, icon: '🛏️' },
  { id: '28', name: 'Bed Cover', category_id: 'beddings', subcategory: 'Bed covers', price: 1800, total_stock: 12, icon: '🛏️' },
  { id: '29', name: 'Bedsheet Set', category_id: 'beddings', subcategory: 'Bedsheets', price: 1500, total_stock: 15, icon: '🛏️' },
  { id: '30', name: 'Pajamas Set', category_id: 'beddings', subcategory: 'Pajamas', price: 1200, total_stock: 20, icon: '👕' },
  { id: '31', name: 'Nightdress', category_id: 'beddings', subcategory: 'Nightdress', price: 1100, total_stock: 18, icon: '👗' },
  { id: '32', name: 'Towel', category_id: 'beddings', subcategory: 'Towels', price: 600, total_stock: 35, icon: '🧴' },

  // ── School Bags ──
  { id: '33', name: 'Canvas School Backpack 18"', category_id: 'school-bags', subcategory: 'Backpacks', price: 1800, total_stock: 12, icon: '🎒' },
  { id: '34', name: 'Nylon Backpack 16"', category_id: 'school-bags', subcategory: 'Backpacks', price: 1350, total_stock: 16, icon: '🎒' },
  { id: '35', name: 'Sports Duffel Bag', category_id: 'school-bags', subcategory: 'Duffel Bags', price: 1600, total_stock: 10, icon: '🧳' },
  { id: '36', name: 'Lunch Bag', category_id: 'school-bags', subcategory: 'Lunch Bags', price: 550, total_stock: 28, icon: '🍱' },

  // ── Schools ──
  // Londiani Christian Academy
  { id: '37', name: 'Londiani Christian Academy - Pullover', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 1300, total_stock: 15, icon: '🧥' },
  { id: '38', name: 'Londiani Christian Academy - Half Sweater', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 950, total_stock: 18, icon: '🧤' },
  { id: '39', name: 'Londiani Christian Academy - Shirt', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 700, total_stock: 25, icon: '👕' },
  { id: '40', name: 'Londiani Christian Academy - Dress', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 1400, total_stock: 12, icon: '👗' },
  { id: '41', name: 'Londiani Christian Academy - Girls Trouser', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 1200, total_stock: 14, icon: '👖' },
  { id: '42', name: 'Londiani Christian Academy - Long Trouser', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 1250, total_stock: 16, icon: '👖' },
  { id: '43', name: 'Londiani Christian Academy - Tracksuit', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 2500, total_stock: 10, icon: '🥋' },
  { id: '44', name: 'Londiani Christian Academy - Socks', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 500, total_stock: 35, icon: '🧦' },
  { id: '45', name: 'Londiani Christian Academy - Tie', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 300, total_stock: 40, icon: '👔' },
  { id: '46', name: 'Londiani Christian Academy - Marvin', category_id: 'schools', subcategory: 'Londiani Christian Academy', price: 450, total_stock: 28, icon: '👕' },

  // Londiani Junior Secondary
  { id: '47', name: 'Londiani Junior Secondary - Pullover', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 1350, total_stock: 18, icon: '🧥' },
  { id: '48', name: 'Londiani Junior Secondary - Half Sweater', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 1000, total_stock: 16, icon: '🧤' },
  { id: '49', name: 'Londiani Junior Secondary - Shirt', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 750, total_stock: 22, icon: '👕' },
  { id: '50', name: 'Londiani Junior Secondary - Trouser', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 1300, total_stock: 18, icon: '👖' },
  { id: '51', name: 'Londiani Junior Secondary - Girls Trouser', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 1250, total_stock: 16, icon: '👖' },
  { id: '52', name: 'Londiani Junior Secondary - Tracksuit', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 2600, total_stock: 12, icon: '🥋' },
  { id: '53', name: 'Londiani Junior Secondary - Tshirt', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 600, total_stock: 30, icon: '👕' },
  { id: '54', name: 'Londiani Junior Secondary - Tie', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 320, total_stock: 38, icon: '👔' },
  { id: '55', name: 'Londiani Junior Secondary - Girls Socks', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 520, total_stock: 32, icon: '🧦' },
  { id: '56', name: 'Londiani Junior Secondary - Boys Socks', category_id: 'schools', subcategory: 'Londiani Junior Secondary', price: 520, total_stock: 32, icon: '🧦' },
]

const DUMMY_VARIANTS = {
  // School Uniforms
  '1': [  // Navy Pullover
    { id:'v1a', product_id:'1', color:'Navy', color_hex:'#1a3a5c', size:'10', stock_qty: 4 },
    { id:'v1b', product_id:'1', color:'Navy', color_hex:'#1a3a5c', size:'12', stock_qty: 6 },
    { id:'v1c', product_id:'1', color:'Navy', color_hex:'#1a3a5c', size:'14', stock_qty: 8 },
    { id:'v1d', product_id:'1', color:'Navy', color_hex:'#1a3a5c', size:'16', stock_qty: 5 },
    { id:'v1e', product_id:'1', color:'Navy', color_hex:'#1a3a5c', size:'XL', stock_qty: 5 },
  ],
  '2': [  // School Shirt
    { id:'v2a', product_id:'2', color:'White', color_hex:'#ffffff', size:'10', stock_qty: 8 },
    { id:'v2b', product_id:'2', color:'White', color_hex:'#ffffff', size:'12', stock_qty: 10 },
    { id:'v2c', product_id:'2', color:'White', color_hex:'#ffffff', size:'14', stock_qty: 10 },
    { id:'v2d', product_id:'2', color:'White', color_hex:'#ffffff', size:'16', stock_qty: 7 },
  ],
  '3': [  // Navy Trouser
    { id:'v3a', product_id:'3', color:'Navy', color_hex:'#1a3a5c', size:'28', stock_qty: 3 },
    { id:'v3b', product_id:'3', color:'Navy', color_hex:'#1a3a5c', size:'30', stock_qty: 5 },
    { id:'v3c', product_id:'3', color:'Navy', color_hex:'#1a3a5c', size:'32', stock_qty: 6 },
    { id:'v3d', product_id:'3', color:'Navy', color_hex:'#1a3a5c', size:'34', stock_qty: 6 },
  ],
  '4': [  // Navy Dress
    { id:'v4a', product_id:'4', color:'Navy', color_hex:'#1a3a5c', size:'10', stock_qty: 4 },
    { id:'v4b', product_id:'4', color:'Navy', color_hex:'#1a3a5c', size:'12', stock_qty: 5 },
    { id:'v4c', product_id:'4', color:'Navy', color_hex:'#1a3a5c', size:'14', stock_qty: 6 },
  ],
  
  // Games Attires
  '10': [  // Games T-Shirt
    { id:'v10a', product_id:'10', color:'White', color_hex:'#ffffff', size:'10', stock_qty: 10 },
    { id:'v10b', product_id:'10', color:'White', color_hex:'#ffffff', size:'12', stock_qty: 12 },
    { id:'v10c', product_id:'10', color:'White', color_hex:'#ffffff', size:'14', stock_qty: 13 },
    { id:'v10d', product_id:'10', color:'White', color_hex:'#ffffff', size:'16', stock_qty: 10 },
  ],
  '11': [  // Full Tracksuit
    { id:'v11a', product_id:'11', color:'Navy', color_hex:'#1a3a5c', size:'10', stock_qty: 3 },
    { id:'v11b', product_id:'11', color:'Navy', color_hex:'#1a3a5c', size:'12', stock_qty: 4 },
    { id:'v11c', product_id:'11', color:'Navy', color_hex:'#1a3a5c', size:'14', stock_qty: 4 },
    { id:'v11d', product_id:'11', color:'Navy', color_hex:'#1a3a5c', size:'16', stock_qty: 3 },
  ],

  // Footwear
  '16': [  // Toughees
    { id:'v16a', product_id:'16', color:'Black', color_hex:'#000000', size:'32', stock_qty: 2 },
    { id:'v16b', product_id:'16', color:'Black', color_hex:'#000000', size:'33', stock_qty: 3 },
    { id:'v16c', product_id:'16', color:'Black', color_hex:'#000000', size:'34', stock_qty: 3 },
    { id:'v16d', product_id:'16', color:'Black', color_hex:'#000000', size:'35', stock_qty: 4 },
  ],
  '17': [  // Studeez
    { id:'v17a', product_id:'17', color:'Black', color_hex:'#000000', size:'33', stock_qty: 3 },
    { id:'v17b', product_id:'17', color:'Black', color_hex:'#000000', size:'34', stock_qty: 4 },
    { id:'v17c', product_id:'17', color:'Black', color_hex:'#000000', size:'35', stock_qty: 4 },
    { id:'v17d', product_id:'17', color:'Black', color_hex:'#000000', size:'36', stock_qty: 5 },
  ],

  // School-Specific (Londiani Christian Academy)
  '37': [  // LCA Primary Pullover
    { id:'v37a', product_id:'37', color:'Navy', color_hex:'#1a3a5c', size:'10', stock_qty: 3 },
    { id:'v37b', product_id:'37', color:'Navy', color_hex:'#1a3a5c', size:'12', stock_qty: 5 },
    { id:'v37c', product_id:'37', color:'Navy', color_hex:'#1a3a5c', size:'14', stock_qty: 7 },
  ],
  '47': [  // LCA JS Pullover
    { id:'v47a', product_id:'47', color:'Navy', color_hex:'#1a3a5c', size:'12', stock_qty: 5 },
    { id:'v47b', product_id:'47', color:'Navy', color_hex:'#1a3a5c', size:'14', stock_qty: 6 },
    { id:'v47c', product_id:'47', color:'Navy', color_hex:'#1a3a5c', size:'16', stock_qty: 7 },
  ],
}
// Generate simple variants for products without detailed ones
const getVariants = (productId) => {
  if (DUMMY_VARIANTS[productId]) return DUMMY_VARIANTS[productId]
  const p = DUMMY_PRODUCTS.find(pr => pr.id === productId)
  return [{ id: `v-${productId}-default`, product_id: productId, color: 'Standard', color_hex: '#1a3a5c', size: 'One Size', stock_qty: p?.total_stock || 10 }]
}

const isElectron = !!window.api

async function loadCategories()        { return isElectron ? (await window.api.categories.getAll()).data : DUMMY_CATEGORIES }
async function loadProducts(catId)     { return isElectron ? (await window.api.products.getAll({ category_id: catId })).data : DUMMY_PRODUCTS.filter(p => p.category_id === catId) }
async function loadProductById(id)     { return isElectron ? (await window.api.products.getById(id)).data : { ...DUMMY_PRODUCTS.find(p => p.id === id), variants: getVariants(id) } }

// ─────────────────────────────────────────────────────────────────────────────

export default function POSPage() {
  const [categories, setCategories]         = useState([])
  const [products, setProducts]             = useState([])
  const [activeCat, setActiveCat]           = useState(null)
  const [activeSubcat, setActiveSubcat]     = useState('All')
  const [search, setSearch]                 = useState('')
  const [variantProduct, setVariantProduct] = useState(null)
  const [showPayment, setShowPayment]       = useState(false)
  const [completedSale, setCompletedSale]   = useState(null)

  const { user } = useAuthStore()
  const toast = useToast()
  const barcodeBufferRef = useRef('')
  const barcodeTimerRef = useRef(null)

  // Load categories on mount
  useEffect(() => {
    loadCategories().then(cats => {
      setCategories(cats)
      if (cats.length > 0) setActiveCat(cats[0].id)
    })
  }, [])

  // Load products when category changes
  useEffect(() => {
    if (!activeCat) return
    loadProducts(activeCat).then(prods => {
      setProducts(prods)
      setActiveSubcat('All')
      setSearch('')
    })
  }, [activeCat])

  // Open variant picker for a product
  const openVariant = useCallback(async (productId) => {
    const product = await loadProductById(productId)
    setVariantProduct(product)
  }, [])

  const resolveBarcodeProduct = useCallback(async (barcode) => {
    if (window.api?.products?.getByBarcode) {
      const res = await window.api.products.getByBarcode(barcode)
      if (res.ok) return res.data
    }

    const currentProducts = products.length > 0 ? products : DUMMY_PRODUCTS
    return currentProducts.find((p) => p.barcode === barcode || p.id === barcode) || null
  }, [products])

  // Barcode scanner handler
  useEffect(() => {
    const handleKeydown = async (e) => {
      // Ignore if typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === 'Enter') {
        const barcode = barcodeBufferRef.current.trim()
        if (!barcode) return

        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
        barcodeTimerRef.current = null

        const product = await resolveBarcodeProduct(barcode)
        if (product && Number(product.total_stock) > 0) {
          openVariant(product.id)
        } else if (!product) {
          toast.warning(`Product with barcode "${barcode}" not found`)
        } else {
          toast.error(`Product "${product.name}" is out of stock`)
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
  }, [openVariant, resolveBarcodeProduct, toast])

  // Subcategories derived from current products
  const subcats = ['All', ...new Set(products.map(p => p.subcategory).filter(Boolean))]

  // Filtered product list
  const filtered = products.filter(p => {
    const matchSub = activeSubcat === 'All' || p.subcategory === activeSubcat
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchSub && matchSearch
  })

  // Handle completed payment
  const handlePaymentComplete = (saleResult) => {
    setShowPayment(false)
    setCompletedSale(saleResult)
  }

  const CAT_COLORS = {
    uniforms: '#e8f0f8', bags: '#fff3e8', tracksuits: '#e8f5ee',
    shoes: '#fdecea', accessories: '#f0e8f8',
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Product Browser ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400"
            placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">×</button>}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-shrink-0">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                          border-2 whitespace-nowrap transition-all cursor-pointer flex-shrink-0
                          ${activeCat === cat.id
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-primary hover:text-primary'}`}>
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>

        {/* Subcategory filter */}
        {subcats.length > 1 && (
          <div className="flex gap-2 flex-wrap flex-shrink-0">
            {subcats.map(sub => (
              <button key={sub} onClick={() => setActiveSubcat(sub)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                            ${activeSubcat === sub
                              ? 'bg-accent border-accent text-white'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <span className="text-4xl mb-2">🔍</span>
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
              {filtered.map(product => (
                <ProductCard key={product.id} product={product}
                  catColor={CAT_COLORS[activeCat] || '#f0f2f5'}
                  onSelect={openVariant} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart Panel ── */}
      <CartPanel onCheckout={() => setShowPayment(true)} />

      {/* ── Modals ── */}
      {variantProduct && (
        <VariantModal product={variantProduct} onClose={() => setVariantProduct(null)} />
      )}
      {showPayment && (
        <PaymentModal onClose={() => setShowPayment(false)} onComplete={handlePaymentComplete} userId={user?.id} />
      )}
      {completedSale && (
        <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, catColor, onSelect }) {
  const outOfStock = product.total_stock === 0
  const lowStock   = product.total_stock > 0 && product.total_stock <= 5

  return (
    <div onClick={() => !outOfStock && onSelect(product.id)}
      className={`bg-white rounded-xl border-2 p-3.5 transition-all relative
                  ${outOfStock
                    ? 'opacity-50 cursor-not-allowed border-gray-100'
                    : 'border-gray-200 hover:border-primary hover:shadow-card cursor-pointer active:scale-95'}`}>

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl mb-2.5"
           style={{ background: catColor }}>
        {product.icon || '📦'}
      </div>

      <p className="text-sm font-bold text-gray-800 leading-snug mb-1">{product.name}</p>
      <p className="text-xs text-gray-400 mb-2">{product.subcategory}</p>
      <p className="text-base font-extrabold text-primary font-head">
        KES {product.price?.toLocaleString()}
      </p>

      {/* Stock indicator */}
      <p className={`text-xs mt-1 font-medium ${lowStock ? 'text-orange-500' : outOfStock ? 'text-red-500' : 'text-green-600'}`}>
        {outOfStock ? '✕ Out of stock' : lowStock ? `⚠ ${product.total_stock} left` : `✓ ${product.total_stock} in stock`}
      </p>

      {/* Add badge */}
      {!outOfStock && (
        <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-primary-light rounded-md
                        flex items-center justify-center text-primary font-bold text-base">+</div>
      )}
    </div>
  )
}
