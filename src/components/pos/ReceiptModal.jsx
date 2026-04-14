import { format } from 'date-fns'

export default function ReceiptModal({ sale, onClose }) {
  const { receipt_no, items, customerName, method, change, total } = sale

  const handlePrint = async () => {
    if (window.api) {
      await window.api.print.receipt(sale)
    }
    window.print()
  }

  const methodLabels = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card' }
  const now = format(new Date(), 'EEE d MMM yyyy, HH:mm')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(10,20,40,0.6)', backdropFilter: 'blur(3px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-7 print:p-4" id="receipt-content">

          {/* Shop header */}
          <div className="text-center border-b-2 border-dashed border-gray-200 pb-5 mb-5">
            <h2 className="font-head font-extrabold text-2xl text-primary">MWALIMU UNIFORMS</h2>
            <p className="text-xs text-gray-500 mt-1">Quality School Uniforms & Accessories</p>
            <p className="text-xs text-gray-400">Tel: +254 700 000 000 · Mombasa Road</p>
            <p className="text-xs text-gray-400 mt-2 font-mono font-bold">{receipt_no}</p>
            <p className="text-xs text-gray-400">{now}</p>
          </div>

          {/* Line items */}
          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pb-2 text-gray-400 font-semibold uppercase tracking-wide">Item</th>
                <th className="text-center pb-2 text-gray-400 font-semibold uppercase tracking-wide">Qty</th>
                <th className="text-right pb-2 text-gray-400 font-semibold uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 pr-2">
                    <p className="font-semibold text-gray-800">{item.productName || item.name}</p>
                    <p className="text-gray-400">{item.color} · Sz {item.size}</p>
                    <p className="text-gray-400">@ KES {item.price?.toLocaleString()}</p>
                  </td>
                  <td className="py-2 text-center font-bold">{item.qty}</td>
                  <td className="py-2 text-right font-bold font-head text-gray-800">
                    KES {(item.price * item.qty).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{customerName || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium">{methodLabels[method] || method}</span>
            </div>
            {method === 'cash' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Change</span>
                <span className="font-medium">KES {(change || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-800">TOTAL</span>
              <span className="font-head font-extrabold text-xl text-primary">
                KES {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-5 pt-4 border-t-2 border-dashed border-gray-200">
            <p className="font-semibold text-sm text-gray-600">Thank you for shopping with us!</p>
            <p className="text-xs text-gray-400 mt-1">Exchange within 7 days with receipt</p>
            <p className="text-xs text-gray-300 mt-2">Mwalimu POS v1.0</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-7 pb-7 print:hidden">
          <button onClick={handlePrint}
            className="flex-[2] py-3.5 bg-primary text-white rounded-xl font-head font-bold
                       cursor-pointer hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
            🖨️ Print Receipt
          </button>
          <button onClick={onClose}
            className="flex-1 py-3.5 bg-green-50 text-green-700 rounded-xl font-head font-bold
                       cursor-pointer hover:bg-green-100 transition-colors">
            + New Sale
          </button>
        </div>
      </div>
    </div>
  )
}
