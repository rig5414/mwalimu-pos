import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const todayStr = () => new Date().toISOString().split('T')[0]

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    revenue: 0,
    transactions: 0,
    items_sold: 0,
    low_stock: 0,
    inventory_value: 0,
    inventory_units: 0,
  })
  const [sales, setSales] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [byCategory, setByCategory] = useState([])
  const [view, setView] = useState('executive')

  useEffect(() => {
    if (!window.api) return
    const t = todayStr()
    Promise.all([
      window.api.sales.getSummary({ from: t, to: t }),
      window.api.reports.itemsSoldInRange({ from: t, to: t }),
      window.api.reports.inventorySummary(),
      window.api.sales.getToday(),
      window.api.stock.getLowStock(),
      window.api.reports.salesByCategory({ from: t, to: t }),
    ]).then(([sum, itemsSold, inv, todaySales, low, cat]) => {
      if (sum.ok && Array.isArray(sum.data)) {
        const reduced = sum.data.reduce(
          (acc, row) => ({
            revenue: acc.revenue + (Number(row.total_revenue) || 0),
            transactions: acc.transactions + (Number(row.transaction_count) || 0),
          }),
          { revenue: 0, transactions: 0 }
        )
        setSummary((prev) => ({ ...prev, ...reduced }))
      }
      if (itemsSold.ok && itemsSold.data) {
        setSummary((prev) => ({ ...prev, items_sold: Number(itemsSold.data.items_sold) || 0 }))
      }
      if (inv.ok && inv.data) {
        setSummary((prev) => ({
          ...prev,
          inventory_value: Number(inv.data.inventory_value) || 0,
          inventory_units: Number(inv.data.units) || 0,
        }))
      }
      if (todaySales.ok) setSales(todaySales.data || [])
      if (low.ok) {
        setLowStock(low.data || [])
        setSummary((prev) => ({ ...prev, low_stock: low.data?.length || 0 }))
      }
      if (cat.ok) setByCategory(cat.data || [])
    })
  }, [])

  const chartData = (byCategory || []).map((row) => ({
    name: row.category?.length > 14 ? `${row.category.slice(0, 12)}…` : row.category || '—',
    fullName: row.category,
    revenue: Math.round(Number(row.revenue) || 0),
  }))

  const fmtMoney = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString()}`
  const fmtCompact = (n) => {
    const v = Number(n) || 0
    if (v >= 1e6) return `KES ${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `KES ${(v / 1e3).toFixed(0)}k`
    return fmtMoney(v)
  }

  return (
    <div className="h-full overflow-y-auto p-5 bg-gray-50">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">All Categories / Overview</p>
          <h1 className="font-head font-bold text-2xl text-gray-800">Admin Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView('executive')}
              className={`px-4 py-2 min-h-[40px] rounded-md text-sm font-semibold cursor-pointer ${
                view === 'executive' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Executive
            </button>
            <button
              type="button"
              onClick={() => setView('manager')}
              className={`px-4 py-2 min-h-[40px] rounded-md text-sm font-semibold cursor-pointer ${
                view === 'manager' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Manager
            </button>
          </div>
          <span className="text-sm text-gray-500 px-2">Today · {todayStr()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px]">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Today&apos;s Sales</p>
          <p className="font-head font-extrabold text-2xl text-primary mb-1">{fmtMoney(summary.revenue)}</p>
          <p className="text-xs font-semibold text-green-600">{summary.transactions} transactions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Inventory Value (cost)</p>
          <p className="font-head font-extrabold text-2xl text-gray-900 mb-1">{fmtCompact(summary.inventory_value)}</p>
          <p className="text-xs text-gray-500">{summary.inventory_units.toLocaleString()} units</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Low Stock Items</p>
          <p className="font-head font-extrabold text-2xl text-red-500 mb-1">{summary.low_stock}</p>
          <Link to="/admin/stock" className="text-xs font-semibold text-primary hover:underline">
            View stock →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items Sold Today</p>
          <p className="font-head font-extrabold text-2xl text-gray-900 mb-1">{summary.items_sold}</p>
          <p className="text-xs text-amber-600 font-semibold">Units across all lines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 min-h-[320px]">
          <h2 className="font-head font-bold text-base text-gray-800 mb-4">Sales by Category (today)</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">No category sales for this period yet.</p>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `K${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={(value) => [fmtMoney(value), 'Revenue']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue (KES)" fill="#1a3a5c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-head font-bold text-base text-gray-800 mb-3">Low stock</h2>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-400">No low-stock variants.</p>
            ) : (
              lowStock.slice(0, 12).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400">
                      {item.color} · {item.size}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ${item.stock_qty <= 2 ? 'badge-danger' : 'badge-warning'}`}>
                    {item.stock_qty}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-head font-bold text-base text-gray-800">Recent Sales (today)</h2>
          <Link to="/admin/sales" className="text-sm font-semibold text-primary hover:underline min-h-[44px] inline-flex items-center">
            View Sales History →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Receipt #', 'Customer', 'Amount', 'Method', 'Time', 'Status'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-xs text-gray-700">{s.receipt_no}</td>
                <td className="px-4 py-3 text-gray-700">{s.client_name}</td>
                <td className="px-4 py-3 font-bold font-head text-primary">KES {s.total?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${s.payment_method === 'mpesa' ? 'badge-warning' : s.payment_method === 'card' ? 'badge-info' : 'badge-success'}`}
                  >
                    {s.payment_method}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(s.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
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
  )
}
