import { useState } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useToast } from '../../hooks/useToast'

const METHODS = [
  { id: 'cash',  label: 'Cash',   icon: '💵' },
  { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { id: 'card',  label: 'Card',   icon: '💳' },
]

export default function PaymentModal({ onClose, onComplete, userId }) {
  const { items, customerName, clear } = useCartStore()
  const toast = useToast()
  const [method,       setMethod]      = useState('cash')
  const [cashReceived, setCash]        = useState('')
  const [mpesaPhone,   setMpesaPhone]  = useState('')
  const [cardRef,      setCardRef]     = useState('')
  const [loading,      setLoading]     = useState(false)

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const total    = subtotal  // tax = 0 for now
  const received = parseFloat(cashReceived) || 0
  const change   = Math.max(0, received - total)

  const canConfirm = () => {
    if (method === 'cash')  return received >= total
    if (method === 'mpesa') return mpesaPhone.length >= 9
    if (method === 'card')  return cardRef.length >= 3
    return false
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const salePayload = {
        client_name:    customerName || 'Walk-in',
        items:          items.map(i => ({
          variant_id:   i.variantId,
          product_name: i.productName,
          color:        i.color,
          size:         i.size,
          quantity:     i.qty,
          unit_price:   i.price,
          total_price:  i.price * i.qty,
        })),
        payment_method: method,
        amount_paid:    method === 'cash' ? received : total,
        mpesa_ref:      method === 'mpesa' ? mpesaPhone : undefined,
        card_ref:       method === 'card'  ? cardRef    : undefined,
        served_by:      userId,
      }

      let saleResult
      if (window.api) {
        const res = await window.api.sales.create(salePayload)
        if (!res.ok) throw new Error(res.error)
        saleResult = res.data
      } else {
        // Dev fallback
        saleResult = {
          receipt_no:   'MU-' + String(Math.floor(Math.random() * 999999)).padStart(6, '0'),
          total,
          change_given: change,
          payment_method: method,
        }
      }

      clear()
      onComplete({ ...saleResult, items, customerName, method, change, total })
    } catch (err) {
      toast.error('Payment failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(10,20,40,0.6)', backdropFilter: 'blur(3px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-7 py-6 text-white" style={{ background: '#1a3a5c' }}>
          <h2 className="font-head font-bold text-xl">💳 Payment</h2>
          <p className="text-white/60 text-sm mt-1">Select method and confirm</p>
          <p className="font-head font-extrabold text-4xl mt-3" style={{ color: '#e8a020' }}>
            KES {total.toLocaleString()}
          </p>
        </div>

        <div className="p-7 space-y-5">

          {/* Method selector */}
          <div className="grid grid-cols-3 gap-3">
            {METHODS.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`py-3.5 px-2 rounded-xl border-2 text-center transition-all cursor-pointer
                            ${method === m.id
                              ? 'border-primary bg-primary-light'
                              : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="text-2xl block mb-1">{m.icon}</span>
                <span className={`text-xs font-bold ${method === m.id ? 'text-primary' : 'text-gray-500'}`}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          {/* Cash section */}
          {method === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="label">Amount Received (KES)</label>
                <input type="number" value={cashReceived} onChange={e => setCash(e.target.value)}
                  placeholder="0" autoFocus
                  className="input font-head font-bold text-2xl text-center" />
              </div>
              <div className={`flex justify-between items-center p-4 rounded-xl border-2
                              ${received >= total ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`font-semibold text-sm ${received >= total ? 'text-green-700' : 'text-gray-500'}`}>
                  Change Due
                </span>
                <span className={`font-head font-extrabold text-2xl ${received >= total ? 'text-green-600' : 'text-gray-400'}`}>
                  KES {change.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* M-Pesa section */}
          {method === 'mpesa' && (
            <div className="space-y-3">
              <div>
                <label className="label">Customer M-Pesa Number</label>
                <input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)}
                  placeholder="07XXXXXXXX" autoFocus className="input text-lg" />
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#fff8e8', border: '1.5px solid #f0c857' }}>
                <p className="font-bold text-sm mb-1" style={{ color: '#8a5e00' }}>📲 STK Push</p>
                <p className="text-xs" style={{ color: '#8a5e00' }}>
                  Customer will receive a prompt to pay <strong>KES {total.toLocaleString()}</strong>.
                  Confirm only after customer approves the request on their phone.
                </p>
              </div>
            </div>
          )}

          {/* Card section */}
          {method === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="label">Authorization Code</label>
                <input type="text" value={cardRef} onChange={e => setCardRef(e.target.value)}
                  placeholder="Enter 6-digit auth code" autoFocus className="input text-lg tracking-widest" />
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="font-bold text-sm text-blue-700 mb-1">💳 Card Terminal</p>
                <p className="text-xs text-blue-600">
                  Swipe or tap card on terminal. Enter the authorization code once the terminal approves.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 font-head font-semibold
                         text-gray-500 hover:border-gray-300 cursor-pointer transition-colors">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={!canConfirm() || loading}
              className={`flex-[2] py-3.5 rounded-xl font-head font-bold text-base transition-all
                          ${canConfirm() && !loading
                            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer active:scale-98'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {loading ? 'Processing…' : '✓ Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
