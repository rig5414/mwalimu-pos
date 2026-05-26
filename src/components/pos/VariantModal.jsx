import { useState, useMemo } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useToast } from '../../hooks/useToast'
import { posTheme } from '../../styles/posTheme'

export default function VariantModal({ product, onClose }) {
  const variants = product.variants || []
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const [added, setAdded] = useState(false)

  const colors = useMemo(() => {
    const seen = new Map()
    variants.forEach((v) => {
      if (v.color && !seen.has(v.color)) seen.set(v.color, v.color_hex)
    })
    return Array.from(seen.entries()).map(([color, hex]) => ({ color, hex }))
  }, [variants])

  const [selectedColor, setSelectedColor] = useState(colors[0]?.color || '')
  const [selectedSize, setSelectedSize] = useState('')
  const [qty, setQty] = useState(1)

  const availableSizes = useMemo(
    () => variants.filter((v) => v.color === selectedColor).map((v) => ({ size: v.size, stock: v.stock_qty })),
    [variants, selectedColor]
  )

  const handleColorChange = (color) => {
    setSelectedColor(color)
    setSelectedSize('')
    setQty(1)
  }

  const selectedVariant = variants.find((v) => v.color === selectedColor && v.size === selectedSize)
  const maxQty = selectedVariant?.stock_qty || 0
  const total = product.price * qty
  const canAdd = selectedColor && selectedSize && maxQty > 0

  const handleAdd = () => {
    if (!canAdd) return
    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      color: selectedColor,
      size: selectedSize,
      price: product.price,
      icon: product.icon || '📦',
      qty,
    })
    toast.success(`${product.name} (${selectedColor} / ${selectedSize}) added to cart`)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      onClose()
    }, 800)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pos-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pos-glass-modal rounded-2xl w-full max-w-sm mx-4 overflow-hidden animate-[slideUp_0.2s_ease]">
        <div
          className="flex items-start justify-between p-6 pb-4"
          style={{ borderBottom: `1px solid ${posTheme.panelBorder}` }}
        >
          <div>
            <p className="pos-glass-label mb-1">Select Options</p>
            <h3 className="font-head text-lg font-bold text-white">
              {product.icon} {product.name}
            </h3>
            {product.subcategory && (
              <p className="text-sm mt-0.5" style={{ color: posTheme.textMuted }}>
                {product.subcategory}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none cursor-pointer mt-1 w-9 h-9 rounded-lg flex items-center justify-center pos-btn-ghost"
            style={{ padding: 0, minWidth: '36px' }}
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {colors.length > 0 && (
            <div>
              <p className="pos-glass-label">
                Color
                {selectedColor && (
                  <span className="normal-case font-normal ml-1" style={{ color: posTheme.textSecondary }}>
                    — {selectedColor}
                  </span>
                )}
              </p>
              <div className="flex gap-2 flex-wrap">
                {colors.map(({ color, hex }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    title={color}
                    className="w-9 h-9 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center"
                    style={{
                      background: hex,
                      borderColor: selectedColor === color ? posTheme.gold : 'rgba(255,255,255,0.25)',
                      boxShadow: selectedColor === color ? `0 0 0 2px ${posTheme.goldBorder}` : 'none',
                    }}
                  >
                    {selectedColor === color && (
                      <span className="text-white text-sm font-bold drop-shadow">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="pos-glass-label">Size</p>
            <div className="flex gap-2 flex-wrap">
              {availableSizes.map(({ size, stock }) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setSelectedSize(size)
                    setQty(1)
                  }}
                  disabled={stock === 0}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold border-2 transition-all cursor-pointer ${
                    stock === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : selectedSize === size
                        ? 'pos-method-btn-active'
                        : 'pos-method-btn'
                  }`}
                >
                  {size}
                  {stock > 0 && stock <= 3 && (
                    <span className="text-xs ml-1" style={{ color: '#fb923c' }}>
                      ({stock})
                    </span>
                  )}
                </button>
              ))}
            </div>
            {!selectedColor && (
              <p className="text-xs mt-2" style={{ color: posTheme.textDim }}>
                Select a color first
              </p>
            )}
          </div>

          {selectedSize && maxQty > 0 && (
            <div>
              <p className="pos-glass-label">
                Quantity{' '}
                <span className="normal-case font-normal" style={{ color: posTheme.textMuted }}>
                  ({maxQty} available)
                </span>
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl pos-btn-ghost text-xl font-bold flex items-center justify-center"
                >
                  −
                </button>
                <span className="font-head font-extrabold text-3xl w-12 text-center text-white">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="w-11 h-11 rounded-xl pos-btn-ghost text-xl font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between py-1">
            <span className="text-sm" style={{ color: posTheme.textMuted }}>
              Item total
            </span>
            <span className="font-head font-extrabold text-2xl" style={{ color: posTheme.gold }}>
              KES {total.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className={`w-full py-4 rounded-xl font-head font-bold text-base transition-all ${
              canAdd ? (added ? '' : 'pos-btn-gold') : ''
            }`}
            style={
              !canAdd
                ? { background: 'rgba(255,255,255,0.06)', color: posTheme.textDim, cursor: 'not-allowed' }
                : added
                  ? { background: posTheme.successBg, color: posTheme.successText, border: `1px solid ${posTheme.successBorder}` }
                  : {}
            }
          >
            {added ? '✓ Added!' : canAdd ? '+ Add to Cart' : 'Select color & size'}
          </button>
        </div>
      </div>
    </div>
  )
}
