import { useToast } from '../../hooks/useToast'
import ReceiptPreview from './ReceiptPreview'
import { posTheme } from '../../styles/posTheme'

export default function ReceiptModal({ sale, onClose }) {
  const toast = useToast()
  const { receipt_no, items, customerName, method, change, total } = sale

  const handlePrint = async () => {
    const payload = { receipt_no, items, customerName, method, change, total }
    if (window.api?.print?.receipt) {
      const res = await window.api.print.receipt(payload)
      if (res?.ok && res.data) {
        const { printed, simulated, error } = res.data
        if (printed) toast.success('Sent to thermal printer')
        else if (simulated)
          toast.info(
            error ? `Simulation: ${error}` : 'Simulation mode — set MWALIMU_THERMAL_INTERFACE for hardware'
          )
      } else if (res && !res.ok) toast.error(res.error || 'Print failed')
    }
    window.print()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center print:static print:inset-auto pos-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pos-glass-modal rounded-2xl w-full max-w-md mx-4 overflow-hidden print:shadow-none print:max-w-none print:bg-white">
        <div
          className="px-6 py-4 print:hidden"
          style={{ borderBottom: `1px solid ${posTheme.panelBorder}` }}
        >
          <h2 className="font-head font-bold text-lg text-white">✓ Sale Complete</h2>
          <p className="text-sm mt-0.5" style={{ color: posTheme.textMuted }}>
            Receipt {receipt_no}
          </p>
        </div>

        <div className="p-4 print:p-4" id="receipt-content">
          <ReceiptPreview sale={sale} className="border-0 shadow-none rounded-lg" />
        </div>

        <div className="flex gap-3 px-6 pb-6 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-[2] min-h-[52px] py-3.5 rounded-xl pos-btn-ghost flex items-center justify-center gap-2"
            style={{ color: posTheme.text }}
          >
            🖨 Print / Thermal
          </button>
          <button type="button" onClick={onClose} className="flex-1 min-h-[52px] py-3.5 rounded-xl pos-btn-gold">
            New Sale
          </button>
        </div>
      </div>
    </div>
  )
}
