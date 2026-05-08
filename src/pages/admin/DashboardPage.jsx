import { useState, useEffect } from 'react'



const STAT_CARDS = [
  { label:"Today's Revenue",   key:'revenue',       prefix:'KES ', suffix:'',   change:'+12%', up:true  },
  { label:'Transactions',      key:'transactions',   prefix:'',     suffix:'',   change:'+5',   up:true  },
  { label:'Items Sold',        key:'items_sold',     prefix:'',     suffix:'',   change:'+8%',  up:true  },
  { label:'Low Stock Alerts',  key:'low_stock',      prefix:'',     suffix:'',   change:'↑ 2',  up:false, danger:true },
]

export default function DashboardPage() {
  const [summary, setSummary] = useState({ transactions: 0, revenue: 0, items_sold: 0, low_stock: 0 })
  const [sales, setSales]     = useState([])
  const [lowStock, setLowStock] = useState([])

  useEffect(() => {
    if (!window.api) return
    Promise.all([
      window.api.sales.getSummary({}),
      window.api.sales.getToday(),
      window.api.stock.getLowStock(),
    ]).then(([s, t, l]) => {
      if (s.ok && Array.isArray(s.data)) {
        // getSummary returns rows grouped by payment_method — reduce to totals
        const reduced = s.data.reduce(
          (acc, row) => ({
            revenue:      acc.revenue      + (Number(row.total_revenue) || 0),
            transactions: acc.transactions + (Number(row.transaction_count) || 0),
            items_sold:   acc.items_sold,   // not tracked in this query
            low_stock:    acc.low_stock,
          }),
          { revenue: 0, transactions: 0, items_sold: 0, low_stock: 0 }
        )
        setSummary(reduced)
      }
      if (t.ok) setSales(t.data)
      if (l.ok) {
        setLowStock(l.data)
        setSummary(prev => ({ ...prev, low_stock: l.data.length }))
      }
    }).catch(() => { /* silent — dummy data already shown */ })
  }, [])

  const fmt = (key) => {
    const v = summary[key]
    if (key === 'revenue') return 'Ksh. ' + Number(v || 0).toLocaleString()
    return String(v || 0)
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map(card => (
          <div key={card.key} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{card.label}</p>
            <p className={`font-head font-extrabold text-3xl mb-1 ${card.danger ? 'text-red-500' : 'text-primary'}`}>
              {fmt(card.key)}
            </p>
            <p className={`text-xs font-semibold ${card.up ? 'text-green-600' : 'text-orange-500'}`}>
              {card.change} vs yesterday
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Recent sales */}
        <div className="col-span-2">
          <h2 className="font-head font-bold text-base text-gray-800 mb-3">Recent Sales</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Receipt #','Customer','Amount','Method','Time','Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.receipt_no} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-gray-700">{s.receipt_no}</td>
                    <td className="px-4 py-3 text-gray-700">{s.client_name}</td>
                    <td className="px-4 py-3 font-bold font-head text-primary">KES {s.total?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.payment_method === 'mpesa' ? 'badge-warning' : s.payment_method === 'card' ? 'badge-info' : 'badge-success'}`}>
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(s.created_at).toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-success">{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock */}
        <div>
          <h2 className="font-head font-bold text-base text-gray-800 mb-3">⚠ Low Stock</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {lowStock.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0 border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.product_name}</p>
                  <p className="text-xs text-gray-400">{item.color} · Size {item.size}</p>
                </div>
                <span className={`badge ${item.stock_qty <= 2 ? 'badge-danger' : 'badge-warning'}`}>
                  {item.stock_qty} left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
