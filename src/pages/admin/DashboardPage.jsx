import { useState, useEffect } from 'react'

const DUMMY_SUMMARY = {
  transactions: 38, revenue: 24800, items_sold: 142, low_stock: 4
}
const DUMMY_SALES = [
  { receipt_no:'MU-000038', client_name:'Mary Wanjiku', item_count:4, total:3250, payment_method:'mpesa', created_at:'2026-04-14T14:32:00', status:'completed', served_by_name:'Jane' },
  { receipt_no:'MU-000037', client_name:'Walk-in',      item_count:2, total:1700, payment_method:'cash',  created_at:'2026-04-14T13:58:00', status:'completed', served_by_name:'Jane' },
  { receipt_no:'MU-000036', client_name:'James Ochieng',item_count:6, total:5400, payment_method:'card',  created_at:'2026-04-14T12:45:00', status:'completed', served_by_name:'Jane' },
  { receipt_no:'MU-000035', client_name:'Walk-in',      item_count:1, total:850,  payment_method:'cash',  created_at:'2026-04-14T11:20:00', status:'completed', served_by_name:'Jane' },
  { receipt_no:'MU-000034', client_name:'Fatuma Hassan',item_count:3, total:2850, payment_method:'mpesa', created_at:'2026-04-14T10:05:00', status:'completed', served_by_name:'Jane' },
]
const DUMMY_LOW_STOCK = [
  { product_name:'Navy Trouser',    category_name:'Uniforms',   color:'Navy',  size:'28', stock_qty:2 },
  { product_name:'Red Tracksuit',   category_name:'Tracksuits', color:'Red',   size:'L',  stock_qty:3 },
  { product_name:'Black School Bag',category_name:'Bags',       color:'Black', size:'18"',stock_qty:4 },
  { product_name:'White T-Shirt',   category_name:'Uniforms',   color:'White', size:'S',  stock_qty:5 },
]

const STAT_CARDS = [
  { label:"Today's Revenue",   key:'revenue',       prefix:'KES ', suffix:'',   change:'+12%', up:true  },
  { label:'Transactions',      key:'transactions',   prefix:'',     suffix:'',   change:'+5',   up:true  },
  { label:'Items Sold',        key:'items_sold',     prefix:'',     suffix:'',   change:'+8%',  up:true  },
  { label:'Low Stock Alerts',  key:'low_stock',      prefix:'',     suffix:'',   change:'↑ 2',  up:false, danger:true },
]

export default function DashboardPage() {
  const [summary, setSummary] = useState(DUMMY_SUMMARY)
  const [sales, setSales]     = useState(DUMMY_SALES)
  const [lowStock, setLowStock] = useState(DUMMY_LOW_STOCK)

  useEffect(() => {
    if (!window.api) return
    Promise.all([
      window.api.sales.getSummary({}),
      window.api.sales.getToday(),
      window.api.stock.getLowStock(),
    ]).then(([s, t, l]) => {
      if (s.ok) { /* map summary */ }
      if (t.ok) setSales(t.data)
      if (l.ok) setLowStock(l.data)
    })
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
