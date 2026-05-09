import { useToast } from '../../hooks/useToast'
import ReceiptPreview from './ReceiptPreview'

export default function ReceiptModal({ sale, onClose }) {
  const toast = useToast()
  const { receipt_no, items, customerName, method, change, total } = sale

  const handlePrint = async () => {
    const payload = {
      receipt_no,
      items,
      customerName,
      method,
      change,
      total,
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center print:static print:inset-auto"
      style={{ background: 'rgba(10,20,40,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md mx-4 overflow-hidden print:shadow-none print:max-w-none">
        <div className="print:p-4" id="receipt-content">
          <ReceiptPreview sale={sale} className="border-0 shadow-none rounded-none" />
        </div>

        <div className="flex gap-3 px-7 pb-7 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-[2] min-h-[52px] py-3.5 bg-gray-900 text-white rounded-xl font-head font-bold cursor-pointer hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            Print / Thermal
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[52px] py-3.5 bg-green-50 text-green-700 rounded-xl font-head font-bold cursor-pointer hover:bg-green-100 transition-colors"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  )
}
