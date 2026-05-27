import { format } from 'date-fns'

const METHOD_LABELS = { cash: 'Cash', mpesa: 'M-Pesa', card: 'Card' }

/**
 * Thermal-style receipt body for preview / print CSS.
 * `sale` can be post-checkout object or DB row from sales:getById.
 */
export default function ReceiptPreview({ sale, className = '', monochrome = false }) {
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
      className={`receipt-paper bg-white text-black rounded-lg border shadow-sm px-6 py-6 max-w-sm mx-auto font-mono text-xs leading-relaxed ${className}`}
      style={{ borderColor: monochrome ? '#00000022' : undefined }}
    >
      <div className="text-center border-b-2 border-dashed pb-4 mb-4" style={{ borderColor: monochrome ? '#00000033' : undefined }}>
        <h2 className={`font-head font-extrabold text-lg tracking-tight ${monochrome ? 'text-black' : 'text-primary'}`}>MWALIMU UNIFORMS</h2>
        <p className={`text-[11px] mt-1 ${monochrome ? 'text-black' : 'text-gray-500'}`}>Quality School Uniforms & Accessories</p>
        <p className={`text-[10px] ${monochrome ? 'text-black' : 'text-gray-400'}`}>Tel: +254 729 899 174</p>
        <p className={`text-[10px] ${monochrome ? 'text-black' : 'text-gray-400'}`}>Londiani Town, Kericho</p>
        <p className={`text-[10px] mt-2 font-bold ${monochrome ? 'text-black' : 'text-gray-500'}`}>TAX INVOICE</p>
        <p className={`text-[10px] mt-1 ${monochrome ? 'text-black' : 'text-gray-400'}`}>{when}</p>
        <p className="text-[11px] font-bold mt-1">{receiptNo}</p>
      </div>

      <table className="w-full text-[11px] mb-3">
        <thead>
          <tr className="border-b uppercase" style={{ borderColor: monochrome ? '#00000022' : undefined, color: monochrome ? '#000' : undefined }}>
            <th className="text-left pb-2 font-semibold">Item</th>
            <th className="text-center pb-2 font-semibold w-8">Qty</th>
            <th className="text-right pb-2 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b align-top" style={{ borderColor: monochrome ? '#00000012' : undefined }}>
              <td className="py-2 pr-2">
                <p className="font-bold text-black">{item.title}</p>
                {(item.color || item.size) && (
                  <p className={`text-[10px] ${monochrome ? 'text-black' : 'text-gray-400'}`}>
                    {item.color}
                    {item.color && item.size ? ' · ' : ''}
                    {item.size ? `Sz ${item.size}` : ''}
                  </p>
                )}
                <p className={`text-[10px] ${monochrome ? 'text-black' : 'text-gray-400'}`}>@ KES {item.unit.toLocaleString()}</p>
              </td>
              <td className="py-2 text-center font-bold">{item.qty}</td>
              <td className="py-2 text-right font-bold">KES {item.line.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-dashed pt-3 space-y-1 text-[11px]" style={{ borderColor: monochrome ? '#00000033' : undefined }}>
        <div className="flex justify-between">
          <span className={monochrome ? 'text-black' : 'text-gray-500'}>Customer</span>
          <span className="font-medium">{client}</span>
        </div>
        <div className="flex justify-between">
          <span className={monochrome ? 'text-black' : 'text-gray-500'}>Payment</span>
          <span className="font-medium">{METHOD_LABELS[method] || method}</span>
        </div>
        <div className="flex justify-between">
          <span className={monochrome ? 'text-black' : 'text-gray-500'}>Subtotal</span>
          <span>KES {Math.max(0, subtotal).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className={monochrome ? 'text-black' : 'text-gray-500'}>Tax</span>
          <span>KES {tax.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: monochrome ? '#00000022' : undefined }}>
          <span className="font-bold">TOTAL</span>
          <span className={`font-head font-extrabold text-base ${monochrome ? 'text-black' : 'text-primary'}`}>KES {total.toLocaleString()}</span>
        </div>
      </div>

      <div className={`text-center mt-4 pt-3 border-t-2 border-dashed text-[10px] ${monochrome ? 'text-black' : 'text-gray-500'}`} style={{ borderColor: monochrome ? '#00000033' : undefined }}>
        <p className={`font-semibold ${monochrome ? 'text-black' : 'text-gray-600'}`}>Thank you for shopping with us!</p>
        <p className="mt-1">Exchange within 7 days with receipt</p>
      </div>
    </div>
  )
}
