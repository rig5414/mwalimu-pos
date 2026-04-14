import { useCartStore } from '../../store/cartStore'

export default function CartPanel({ onCheckout }) {
  const { items, customerName, setCustomerName, updateQty, clear } = useCartStore()

  const subtotal   = items.reduce((s, i) => s + i.price * i.qty, 0)
  const itemCount  = items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-head font-bold text-gray-800 text-base">Cart</h2>
          {itemCount > 0 && (
            <span className="bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5">
              {itemCount}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={clear} className="text-xs text-red-500 font-medium cursor-pointer hover:text-red-700">
            Clear all
          </button>
        )}
      </div>

      {/* Customer name */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <input className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none
                          focus:border-primary transition-colors placeholder-gray-400"
          placeholder="Customer name (optional)"
          value={customerName} onChange={e => setCustomerName(e.target.value)} />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
            <span className="text-5xl mb-3">🛒</span>
            <p className="text-sm text-center">Cart is empty.<br />Tap an item to add.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <CartItem key={item.key} item={item} onUpdateQty={updateQty} />
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="px-5 py-3 border-t border-gray-200 flex-shrink-0">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">KES {subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Tax (0%)</span>
          <span className="font-medium">KES 0</span>
        </div>
        <div className="h-px bg-gray-200 my-2" />
        <div className="flex justify-between items-baseline">
          <span className="font-bold text-gray-800">Total</span>
          <span className="font-extrabold text-primary text-xl font-head">
            KES {subtotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Checkout button */}
      <div className="px-4 pb-4 flex-shrink-0">
        <button onClick={onCheckout} disabled={items.length === 0}
          className={`w-full py-4 rounded-xl font-head font-bold text-base flex items-center
                      justify-center gap-2 transition-all
                      ${items.length > 0
                        ? 'bg-primary text-white hover:bg-primary-dark cursor-pointer active:scale-98'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
          💳 Checkout
          {items.length > 0 && (
            <span className="text-sm font-normal opacity-75">
              KES {subtotal.toLocaleString()}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Single cart item row ──────────────────────────────────────────────────────
function CartItem({ item, onUpdateQty }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-transparent
                    hover:border-gray-200 transition-colors group">
      <span className="text-xl flex-shrink-0">{item.icon || '📦'}</span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-800 truncate">{item.productName}</p>
        <p className="text-xs text-gray-400">{item.color} · Size {item.size}</p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={() => onUpdateQty(item.key, item.qty - 1)}
          className={`w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center
                      justify-center text-sm font-bold transition-colors cursor-pointer
                      ${item.qty === 1
                        ? 'text-red-400 hover:border-red-300'
                        : 'text-gray-500 hover:border-gray-400'}`}>
          {item.qty === 1 ? '×' : '−'}
        </button>
        <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
        <button onClick={() => onUpdateQty(item.key, item.qty + 1)}
          className="w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center
                     justify-center text-sm font-bold text-gray-500 hover:border-gray-400
                     transition-colors cursor-pointer">
          +
        </button>
      </div>

      <p className="text-sm font-extrabold text-primary font-head flex-shrink-0 min-w-[60px] text-right">
        KES {(item.price * item.qty).toLocaleString()}
      </p>
    </div>
  )
}
