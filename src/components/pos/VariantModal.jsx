import { useState, useMemo } from 'react'
import { useCartStore } from '../../store/cartStore'

export default function VariantModal({ product, onClose }) {
  const variants   = product.variants || []
  const addItem    = useCartStore(s => s.addItem)
  const [toast, setToast] = useState(false)

  // Derive unique colors and sizes from variants
  const colors = useMemo(() => {
    const seen = new Map()
    variants.forEach(v => { if (v.color && !seen.has(v.color)) seen.set(v.color, v.color_hex) })
    return Array.from(seen.entries()).map(([color, hex]) => ({ color, hex }))
  }, [variants])

  const [selectedColor, setSelectedColor] = useState(colors[0]?.color || '')
  const [selectedSize,  setSelectedSize]  = useState('')
  const [qty, setQty] = useState(1)

  // Sizes available for selected color
  const availableSizes = useMemo(() =>
    variants.filter(v => v.color === selectedColor).map(v => ({ size: v.size, stock: v.stock_qty }))
  , [variants, selectedColor])

  // Reset size when color changes
  const handleColorChange = (color) => {
    setSelectedColor(color)
    setSelectedSize('')
    setQty(1)
  }

  // Selected variant
  const selectedVariant = variants.find(v => v.color === selectedColor && v.size === selectedSize)
  const maxQty = selectedVariant?.stock_qty || 0
  const total  = product.price * qty

  const canAdd = selectedColor && selectedSize && maxQty > 0

  const handleAdd = () => {
    if (!canAdd) return
    addItem({
      variantId:   selectedVariant.id,
      productName: product.name,
      color:       selectedColor,
      size:        selectedSize,
      price:       product.price,
      icon:        product.icon || '📦',
      qty,
    })
    setToast(true)
    setTimeout(() => { setToast(false); onClose() }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(10,20,40,0.6)', backdropFilter: 'blur(3px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm mx-4 overflow-hidden
                      animate-[slideUp_0.2s_ease]">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Select Options</p>
            <h3 className="font-head text-lg font-bold text-gray-900">
              {product.icon} {product.name}
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">{product.subcategory}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer mt-1">×</button>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* Color */}
          {colors.length > 0 && (
            <div>
              <p className="label">Color
                {selectedColor && <span className="text-gray-500 normal-case font-normal ml-1">— {selectedColor}</span>}
              </p>
              <div className="flex gap-2 flex-wrap">
                {colors.map(({ color, hex }) => (
                  <button key={color} onClick={() => handleColorChange(color)} title={color}
                    className={`w-9 h-9 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center
                                ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2' : 'border-gray-200'}`}
                    style={{ background: hex }}>
                    {selectedColor === color && (
                      <span className="text-white text-sm font-bold drop-shadow">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          <div>
            <p className="label">Size</p>
            <div className="flex gap-2 flex-wrap">
              {availableSizes.map(({ size, stock }) => (
                <button key={size} onClick={() => { setSelectedSize(size); setQty(1) }}
                  disabled={stock === 0}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold border-2 transition-all cursor-pointer
                              ${stock === 0 ? 'opacity-40 cursor-not-allowed border-gray-100 text-gray-400'
                                : selectedSize === size
                                  ? 'bg-primary text-white border-primary'
                                  : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}>
                  {size}
                  {stock > 0 && stock <= 3 && (
                    <span className="text-orange-400 text-xs ml-1">({stock})</span>
                  )}
                </button>
              ))}
            </div>
            {!selectedColor && (
              <p className="text-xs text-gray-400 mt-2">Select a color first</p>
            )}
          </div>

          {/* Quantity */}
          {selectedSize && maxQty > 0 && (
            <div>
              <p className="label">Quantity <span className="text-gray-400 normal-case font-normal">({maxQty} available)</span></p>
              <div className="flex items-center gap-4">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl border-2 border-gray-200 flex items-center justify-center
                             text-xl font-bold text-gray-600 hover:border-primary hover:text-primary
                             transition-colors cursor-pointer">−</button>
                <span className="font-head font-extrabold text-3xl w-12 text-center">{qty}</span>
                <button onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                  className="w-11 h-11 rounded-xl border-2 border-gray-200 flex items-center justify-center
                             text-xl font-bold text-gray-600 hover:border-primary hover:text-primary
                             transition-colors cursor-pointer">+</button>
              </div>
            </div>
          )}

          {/* Price total */}
          <div className="flex items-baseline justify-between py-1">
            <span className="text-sm text-gray-500">Item total</span>
            <span className="font-head font-extrabold text-2xl text-primary">
              KES {total.toLocaleString()}
            </span>
          </div>

          {/* Add to cart */}
          <button onClick={handleAdd} disabled={!canAdd}
            className={`w-full py-4 rounded-xl font-head font-bold text-base transition-all
                        ${canAdd
                          ? toast
                            ? 'bg-green-500 text-white'
                            : 'bg-primary text-white hover:bg-primary-dark cursor-pointer active:scale-98'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
            {toast ? '✓ Added!' : canAdd ? '+ Add to Cart' : 'Select color & size'}
          </button>
        </div>
      </div>
    </div>
  )
}
