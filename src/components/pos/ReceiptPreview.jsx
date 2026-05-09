import { format } from 'date-fns'

const METHOD_LABELS = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card' }

/**
 * Thermal-style receipt body for preview / print CSS.
 * `sale` can be post-checkout object or DB row from sales:getById.
 */
export default function ReceiptPreview({ sale, className = '' }) {
  const receiptNo = sale?.receipt_no || sale?.receiptNo || '—'
  const created = sale?.created_at ? new Date(sale.created_at) : new Date()
  const when = format(created, 'EEE d MMM yyyy, HH:mm')
  const client = sale?.client_name || sale?.customerName || 'Walk-in'
  const method = sale?.payment_method || sale?.method || 'cash'

  const rawItems = sale?.items || []
  const items = rawItems.map((i) => ({
    title: i.product_name || i.productName || i.name || 'Item',
    color: i.color || '',
    size: i.size || '',
    qty: Number(i.quantity ?? i.qty ?? 1),
    unit: Number(i.unit_price ?? i.price ?? 0),
    line: Number(i.total_price ?? (Number(i.unit_price ?? i.price ?? 0) * Number(i.quantity ?? i.qty ?? 1))),
  }))
  const linesTotal = items.reduce((s, i) => s + i.line, 0)
  const tax = Number(sale?.tax ?? 0)
  const subtotal = sale?.subtotal != null ? Number(sale.subtotal) : linesTotal - tax
  const total = Number(sale?.total ?? linesTotal)

  return (
    <div
      className={`bg-white text-gray-900 rounded-lg border border-gray-200 shadow-sm px-6 py-6 max-w-sm mx-auto font-mono text-xs leading-relaxed ${className}`}
    >
      <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
        <h2 className="font-head font-extrabold text-lg text-primary tracking-tight">MWALIMU UNIFORMS</h2>
        <p className="text-[11px] text-gray-500 mt-1">Quality School Uniforms & Accessories</p>
        <p className="text-[10px] text-gray-400">Tel: +254 700 000 000 · Mombasa Road</p>
        <p className="text-[10px] text-gray-500 mt-2 font-bold">TAX INVOICE</p>
        <p className="text-[10px] text-gray-400 mt-1">{when}</p>
        <p className="text-[11px] font-bold mt-1">{receiptNo}</p>
      </div>

      <table className="w-full text-[11px] mb-3">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 uppercase">
            <th className="text-left pb-2 font-semibold">Item</th>
            <th className="text-center pb-2 font-semibold w-8">Qty</th>
            <th className="text-right pb-2 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-50 align-top">
              <td className="py-2 pr-2">
                <p className="font-bold text-gray-800">{item.title}</p>
                {(item.color || item.size) && (
                  <p className="text-gray-400 text-[10px]">
                    {item.color}
                    {item.color && item.size ? ' · ' : ''}
                    {item.size ? `Sz ${item.size}` : ''}
                  </p>
                )}
                <p className="text-gray-400 text-[10px]">@ KES {item.unit.toLocaleString()}</p>
              </td>
              <td className="py-2 text-center font-bold">{item.qty}</td>
              <td className="py-2 text-right font-bold">KES {item.line.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-500">Customer</span>
          <span className="font-medium">{client}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Payment</span>
          <span className="font-medium">{METHOD_LABELS[method] || method}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>KES {Math.max(0, subtotal).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tax</span>
          <span>KES {tax.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
          <span className="font-bold">TOTAL</span>
          <span className="font-head font-extrabold text-base text-primary">KES {total.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-gray-200 text-[10px] text-gray-500">
        <p className="font-semibold text-gray-600">Thank you for shopping with us!</p>
        <p className="mt-1">Exchange within 7 days with receipt</p>
      </div>
    </div>
  )
}
