import { useState } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useToast } from '../../hooks/useToast'
import { posTheme } from '../../styles/posTheme'

const METHODS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { id: 'card', label: 'Card', icon: '💳' },
]

export default function PaymentModal({ onClose, onComplete, userId }) {
  const { items, customerName, clear } = useCartStore()
  const toast = useToast()
  const [method, setMethod] = useState('cash')
  const [cashReceived, setCash] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [cardRef, setCardRef] = useState('')
  const [loading, setLoading] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const total = subtotal
  const received = parseFloat(cashReceived) || 0
  const change = Math.max(0, received - total)

  const canConfirm = () => {
    if (method === 'cash') return received >= total
    if (method === 'mpesa') return mpesaPhone.length >= 9
    if (method === 'card') return cardRef.length >= 3
    return false
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const salePayload = {
        client_name: customerName || 'Walk-in',
        items: items.map((i) => ({
          variant_id: i.variantId,
          product_name: i.productName,
          color: i.color,
          size: i.size,
          quantity: i.qty,
          unit_price: i.price,
          total_price: i.price * i.qty,
        })),
        payment_method: method,
        amount_paid: method === 'cash' ? received : total,
        mpesa_ref: method === 'mpesa' ? mpesaPhone : undefined,
        card_ref: method === 'card' ? cardRef : undefined,
        served_by: userId,
      }

      let saleResult
      if (window.api) {
        const res = await window.api.sales.create(salePayload)
        if (!res.ok) throw new Error(res.error)
        saleResult = res.data
      } else {
        saleResult = {
          receipt_no: 'MU-' + String(Math.floor(Math.random() * 999999)).padStart(6, '0'),
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pos-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pos-glass-modal rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div
          className="px-7 py-6"
          style={{
            borderBottom: `1px solid ${posTheme.panelBorder}`,
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          <h2 className="font-head font-bold text-xl text-white">💳 Payment</h2>
          <p className="text-sm mt-1" style={{ color: posTheme.textMuted }}>
            Select method and confirm
          </p>
          <p className="font-head font-extrabold text-4xl mt-3" style={{ color: posTheme.gold }}>
            KES {total.toLocaleString()}
          </p>
        </div>

        <div className="p-7 space-y-5">
          {/* Method selector */}
          <div className="grid grid-cols-3 gap-3">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`py-3.5 px-2 rounded-xl text-center pos-method-btn ${
                  method === m.id ? 'pos-method-btn-active' : ''
                }`}
              >
                <span className="text-2xl block mb-1">{m.icon}</span>
                <span className="text-xs font-bold">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Cash */}
          {method === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="pos-glass-label">Amount Received (KES)</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="pos-glass-input font-head font-bold text-2xl text-center"
                />
              </div>
              <div
                className="flex justify-between items-center p-4 rounded-xl"
                style={{
                  background: received >= total ? posTheme.successBg : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${received >= total ? posTheme.successBorder : posTheme.panelBorder}`,
                }}
              >
                <span
                  className="font-semibold text-sm"
                  style={{ color: received >= total ? posTheme.successText : posTheme.textMuted }}
                >
                  Change Due
                </span>
                <span
                  className="font-head font-extrabold text-2xl"
                  style={{ color: received >= total ? posTheme.successText : posTheme.textDim }}
                >
                  KES {change.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* M-Pesa */}
          {method === 'mpesa' && (
            <div className="space-y-3">
              <div>
                <label className="pos-glass-label">Customer M-Pesa Number</label>
                <input
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  autoFocus
                  className="pos-glass-input text-lg"
                />
              </div>
              <div
                className="p-4 rounded-xl"
                style={{ background: posTheme.warnBg, border: `1.5px solid ${posTheme.warnBorder}` }}
              >
                <p className="font-bold text-sm mb-1" style={{ color: posTheme.gold }}>
                  📲 Record M-Pesa Payment
                </p>
                <p className="text-xs" style={{ color: posTheme.warnText }}>
                  Confirm that the customer has sent <strong>KES {total.toLocaleString()}</strong> via M-Pesa.
                  Enter the phone number used. STK push integration is coming in a future update.
                </p>
              </div>
            </div>
          )}

          {/* Card */}
          {method === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="pos-glass-label">Authorization Code</label>
                <input
                  type="text"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                  placeholder="Enter 6-digit auth code"
                  autoFocus
                  className="pos-glass-input text-lg tracking-widest"
                />
              </div>
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(96,165,250,0.12)',
                  border: '1px solid rgba(96,165,250,0.3)',
                }}
              >
                <p className="font-bold text-sm mb-1" style={{ color: '#93c5fd' }}>
                  💳 Card Terminal
                </p>
                <p className="text-xs" style={{ color: 'rgba(147,197,253,0.85)' }}>
                  Swipe or tap card on terminal. Enter the authorization code once the terminal approves.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl pos-btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm() || loading}
              className="flex-[2] py-3.5 rounded-xl pos-btn-gold text-base"
            >
              {loading ? 'Processing…' : '✓ Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
