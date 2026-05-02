// Admin Sales Page
import { useState, useEffect } from 'react'

const DUMMY = [
  { receipt_no:'MU-000038', client_name:'Mary Wanjiku',  total:3250, payment_method:'mpesa', created_at:'2026-04-14T14:32:00', status:'completed' },
  { receipt_no:'MU-000037', client_name:'Walk-in',       total:1700, payment_method:'cash',  created_at:'2026-04-14T13:58:00', status:'completed' },
  { receipt_no:'MU-000036', client_name:'James Ochieng', total:5400, payment_method:'card',  created_at:'2026-04-14T12:45:00', status:'completed' },
  { receipt_no:'MU-000035', client_name:'Walk-in',       total:850,  payment_method:'cash',  created_at:'2026-04-14T11:20:00', status:'completed' },
  { receipt_no:'MU-000034', client_name:'Fatuma Hassan', total:2850, payment_method:'mpesa', created_at:'2026-04-14T10:05:00', status:'completed' },
]

export default function SalesPage() {
  const [sales, setSales] = useState(DUMMY)

  useEffect(() => {
    if (!window.api) return
    window.api.sales.getAll({}).then(res => { if (res.ok) setSales(res.data) })
  }, [])

  const total = sales.reduce((s, r) => s + (r.total || 0), 0)

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-head font-bold text-xl text-gray-800">All Transactions</h1>
          <p className="text-sm text-gray-400 mt-0.5">{sales.length} transactions · Ksh. {total.toLocaleString()} total</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Receipt #','Customer','Amount','Method','Date','Status','Action'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.receipt_no} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-xs">{s.receipt_no}</td>
                <td className="px-4 py-3">{s.client_name}</td>
                <td className="px-4 py-3 font-bold font-head text-primary">Ksh. {s.total?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${s.payment_method === 'mpesa' ? 'badge-warning' : s.payment_method === 'card' ? 'badge-info' : 'badge-success'}`}>
                    {s.payment_method}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.created_at).toLocaleString('en-KE')}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${s.status === 'voided' ? 'badge-danger' : 'badge-success'}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3">
                  {s.status !== 'voided' && (
                    <button className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer">
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
