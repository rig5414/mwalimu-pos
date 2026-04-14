import { useState, useEffect, useCallback } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import VariantModal from '../../components/pos/VariantModal'
import PaymentModal from '../../components/pos/PaymentModal'
import ReceiptModal from '../../components/pos/ReceiptModal'
import CartPanel from '../../components/pos/CartPanel'

// ── Fallback dummy data for dev without Electron ─────────────────────────────
const DUMMY_CATEGORIES = [
  { id: 'uniforms',    name: 'Uniforms',     icon: '👔' },
  { id: 'bags',        name: 'School Bags',  icon: '🎒' },
  { id: 'tracksuits',  name: 'Tracksuits',   icon: '🩳' },
  { id: 'shoes',       name: 'Shoes',        icon: '👟' },
  { id: 'accessories', name: 'Accessories',  icon: '🧢' },
]

const DUMMY_PRODUCTS = [
  { id: '1', name: 'Pull-over Sweater', category_id: 'uniforms',    subcategory: 'Pull-overs',  price: 850,  total_stock: 24, icon: '🧥' },
  { id: '2', name: 'School T-Shirt',    category_id: 'uniforms',    subcategory: 'T-Shirts',    price: 450,  total_stock: 38, icon: '👕' },
  { id: '3', name: 'School Trouser',    category_id: 'uniforms',    subcategory: 'Trousers',    price: 750,  total_stock: 5,  icon: '👖' },
  { id: '4', name: 'School Skirt',      category_id: 'uniforms',    subcategory: 'Skirts',      price: 650,  total_stock: 19, icon: '👗' },
  { id: '5', name: 'School Short',      category_id: 'uniforms',    subcategory: 'Shorts',      price: 550,  total_stock: 22, icon: '🩳' },
  { id: '6', name: 'Backpack 18"',      category_id: 'bags',        subcategory: 'Backpacks',   price: 1200, total_stock: 4,  icon: '🎒' },
  { id: '7', name: 'Backpack 16"',      category_id: 'bags',        subcategory: 'Backpacks',   price: 950,  total_stock: 11, icon: '🎒' },
  { id: '8', name: 'Lunch Bag',         category_id: 'bags',        subcategory: 'Lunch Bags',  price: 350,  total_stock: 28, icon: '🧳' },
  { id: '9', name: 'Full Tracksuit',    category_id: 'tracksuits',  subcategory: 'Full Suits',  price: 1800, total_stock: 13, icon: '🥋' },
  { id:'10', name: 'Track Bottoms',     category_id: 'tracksuits',  subcategory: 'Bottoms',     price: 900,  total_stock: 20, icon: '👖' },
  { id:'11', name: 'Track Top',         category_id: 'tracksuits',  subcategory: 'Tops',        price: 900,  total_stock: 17, icon: '🧥' },
  { id:'12', name: "Boys School Shoes", category_id: 'shoes',       subcategory: 'Boys',        price: 2200, total_stock: 9,  icon: '👟' },
  { id:'13', name: "Girls School Shoes",category_id: 'shoes',       subcategory: 'Girls',       price: 2100, total_stock: 7,  icon: '👠' },
  { id:'14', name: 'School Belt',       category_id: 'accessories', subcategory: 'Belts',       price: 200,  total_stock: 45, icon: '🔧' },
  { id:'15', name: 'School Tie',        category_id: 'accessories', subcategory: 'Ties',        price: 180,  total_stock: 32, icon: '👔' },
  { id:'16', name: 'Sport Socks 3-pack',category_id: 'accessories', subcategory: 'Socks',       price: 250,  total_stock: 60, icon: '🧦' },
]

const DUMMY_VARIANTS = {
  '1': [
    { id:'v1a', product_id:'1', color:'Navy',   color_hex:'#1a3a5c', size:'S',  stock_qty: 6 },
    { id:'v1b', product_id:'1', color:'Navy',   color_hex:'#1a3a5c', size:'M',  stock_qty: 8 },
    { id:'v1c', product_id:'1', color:'Navy',   color_hex:'#1a3a5c', size:'L',  stock_qty: 6 },
    { id:'v1d', product_id:'1', color:'Green',  color_hex:'#2d5a1e', size:'M',  stock_qty: 4 },
  ],
  '2': [
    { id:'v2a', product_id:'2', color:'White',    color_hex:'#f5f5f5', size:'S',  stock_qty:10 },
    { id:'v2b', product_id:'2', color:'White',    color_hex:'#f5f5f5', size:'M',  stock_qty:12 },
    { id:'v2c', product_id:'2', color:'Sky Blue', color_hex:'#d0e8ff', size:'M',  stock_qty: 8 },
    { id:'v2d', product_id:'2', color:'Sky Blue', color_hex:'#d0e8ff', size:'L',  stock_qty: 8 },
  ],
  '3': [
    { id:'v3a', product_id:'3', color:'Navy',   color_hex:'#2c2c54', size:'28', stock_qty: 2 },
    { id:'v3b', product_id:'3', color:'Navy',   color_hex:'#2c2c54', size:'30', stock_qty: 1 },
    { id:'v3c', product_id:'3', color:'Black',  color_hex:'#2d2d2d', size:'30', stock_qty: 2 },
  ],
  '6': [
    { id:'v6a', product_id:'6', color:'Black', color_hex:'#1a1a1a', size:'One Size', stock_qty: 4 },
  ],
  '9': [
    { id:'v9a', product_id:'9', color:'Black', color_hex:'#1a1a1a', size:'S',  stock_qty: 4 },
    { id:'v9b', product_id:'9', color:'Black', color_hex:'#1a1a1a', size:'M',  stock_qty: 5 },
    { id:'v9c', product_id:'9', color:'Navy',  color_hex:'#1a3a5c', size:'L',  stock_qty: 4 },
  ],
  '12': [
    { id:'v12a', product_id:'12', color:'Black', color_hex:'#1a1a1a', size:'37', stock_qty: 3 },
    { id:'v12b', product_id:'12', color:'Black', color_hex:'#1a1a1a', size:'38', stock_qty: 3 },
    { id:'v12c', product_id:'12', color:'Black', color_hex:'#1a1a1a', size:'39', stock_qty: 3 },
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
  const cartItems = useCartStore(s => s.items)

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
