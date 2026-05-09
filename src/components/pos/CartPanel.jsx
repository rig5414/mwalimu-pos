import { useCartStore } from '../../store/cartStore'

export default function CartPanel({ onCheckout }) {
  const { items, customerName, setCustomerName, updateQty, clear } = useCartStore()

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="w-[min(360px,32vw)] min-w-[280px] max-w-[400px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 min-h-[56px]">
        <div className="flex items-center gap-2">
          <h2 className="font-head font-bold text-gray-800 text-base">Current Transaction</h2>
          {itemCount > 0 && (
            <span className="bg-gray-900 text-white text-xs font-bold rounded-full min-w-[28px] h-7 px-2 inline-flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="min-h-[44px] px-3 text-sm text-red-600 font-semibold cursor-pointer hover:text-red-800"
          >
            Clear
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <input
          className="w-full text-sm px-3 py-3 min-h-[48px] border border-gray-200 rounded-xl outline-none focus:border-primary transition-colors placeholder-gray-400"
          placeholder="Enter customer name (optional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
            <span className="text-5xl mb-3">🛒</span>
            <p className="text-sm text-center px-4">
              Cart is empty.
              <br />
              Tap a product to add.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <CartItem key={item.key} item={item} onUpdateQty={updateQty} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
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
          <span className="font-extrabold text-primary text-xl font-head">KES {subtotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="px-4 pb-4 flex-shrink-0">
        <button
          type="button"
          onClick={onCheckout}
          disabled={items.length === 0}
          className={`w-full min-h-[52px] rounded-xl font-head font-bold text-base flex items-center justify-center gap-2 transition-all
            ${
              items.length > 0
                ? 'bg-gray-900 text-white hover:bg-gray-800 cursor-pointer active:scale-[0.99]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          Checkout
          {items.length > 0 && <span className="text-sm font-normal opacity-90">KES {subtotal.toLocaleString()}</span>}
        </button>
      </div>
    </div>
  )
}

function CartItem({ item, onUpdateQty }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-transparent hover:border-gray-200 transition-colors group">
      <span className="text-xl flex-shrink-0 w-10 h-10 flex items-center justify-center">{item.icon || '📦'}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{item.productName}</p>
        <p className="text-xs text-gray-400">
          {item.color} · Size {item.size}
        </p>
        <p className="text-xs font-semibold text-primary mt-0.5">KES {item.price?.toLocaleString()} ea.</p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onUpdateQty(item.key, item.qty - 1)}
          className={`min-w-[44px] min-h-[44px] rounded-lg border border-gray-200 bg-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer
            ${item.qty === 1 ? 'text-red-500 hover:border-red-300' : 'text-gray-600 hover:border-gray-400'}`}
        >
          {item.qty === 1 ? '×' : '−'}
        </button>
        <span className="text-base font-bold w-8 text-center tabular-nums">{item.qty}</span>
        <button
          type="button"
          onClick={() => onUpdateQty(item.key, item.qty + 1)}
          className="min-w-[44px] min-h-[44px] rounded-lg border border-gray-200 bg-white flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
        >
          +
        </button>
      </div>

      <p className="text-sm font-extrabold text-primary font-head flex-shrink-0 min-w-[72px] text-right tabular-nums">
        KES {(item.price * item.qty).toLocaleString()}
      </p>
    </div>
  )
}
