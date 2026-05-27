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
  AreaChart,
  Area,
  Cell,
} from 'recharts'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatCard from '../../components/admin/AdminStatCard'
import { ADMIN_CHART, adminTooltipStyle } from '../../lib/adminCharts'
import { posTheme } from '../../styles/posTheme'

const todayStr = () => new Date().toISOString().split('T')[0]

const fmtMoney = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString()}`

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

  const chartData = (byCategory || []).map((row, i) => ({
    name: row.category?.length > 12 ? `${row.category.slice(0, 10)}…` : row.category || '—',
    fullName: row.category,
    revenue: Math.round(Number(row.revenue) || 0),
    fill: i % 2 === 0 ? ADMIN_CHART.gold : ADMIN_CHART.cyan,
  }))

  const hourlyData = sales.reduce((acc, s) => {
    const h = new Date(s.created_at).getHours()
    const label = `${String(h).padStart(2, '0')}:00`
    const existing = acc.find((x) => x.hour === label)
    if (existing) existing.revenue += Number(s.total) || 0
    else acc.push({ hour: label, revenue: Number(s.total) || 0 })
    return acc
  }, []).sort((a, b) => a.hour.localeCompare(b.hour))

  const paymentBadge = (method) => {
    if (method === 'mpesa') return 'admin-badge admin-badge-warning'
    if (method === 'card') return 'admin-badge admin-badge-info'
    return 'admin-badge admin-badge-success'
  }

  return (
    <div className="admin-page pos-dark-scroll">
      <AdminPageHeader
        eyebrow="Operations Overview"
        title="Admin Dashboard"
        subtitle={`Today · ${todayStr()}`}
        actions={
          <>
            <div className="admin-view-toggle">
              <button type="button" className={view === 'executive' ? 'active' : ''} onClick={() => setView('executive')}>
                Executive
              </button>
              <button type="button" className={view === 'manager' ? 'active' : ''} onClick={() => setView('manager')}>
                Manager
              </button>
            </div>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          label="Today's Sales"
          value={summary.revenue}
          format="money"
          sub={`${summary.transactions} transactions`}
          icon="💰"
          accent="gold"
          delay={0}
        />
        <AdminStatCard
          label="Inventory Value"
          value={summary.inventory_value}
          format="compact"
          sub={`${summary.inventory_units.toLocaleString()} units (cost)`}
          icon="📦"
          accent="cyan"
          delay={1}
        />
        <AdminStatCard
          label="Low Stock Items"
          value={summary.low_stock}
          sub="Needs attention"
          icon="⚠️"
          accent="red"
          delay={2}
          to="/admin/stock"
        />
        <AdminStatCard
          label="Items Sold Today"
          value={summary.items_sold}
          sub="Units across all lines"
          icon="📈"
          accent="green"
          delay={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 admin-glass-panel p-5 min-h-[340px] admin-fade-in admin-fade-in-delay-2">
          <h2 className="font-head font-bold text-base text-white mb-1">Sales by Category</h2>
          <p className="text-xs mb-4" style={{ color: posTheme.textMuted }}>
            Revenue breakdown for today
          </p>
          {chartData.length === 0 ? (
            <p className="text-sm py-16 text-center" style={{ color: posTheme.textMuted }}>
              No category sales for this period yet.
            </p>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ADMIN_CHART.gold} stopOpacity={1} />
                      <stop offset="100%" stopColor={ADMIN_CHART.goldLight} stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={ADMIN_CHART.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: ADMIN_CHART.axis }} interval={0} angle={-18} textAnchor="end" height={52} />
                  <YAxis tick={{ fontSize: 11, fill: ADMIN_CHART.axis }} tickFormatter={(v) => `K${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...adminTooltipStyle}
                    formatter={(value) => [fmtMoney(value), 'Revenue']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                  />
                  <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1200}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill === ADMIN_CHART.cyan ? ADMIN_CHART.cyan : 'url(#barGold)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="admin-glass-panel p-5 admin-fade-in admin-fade-in-delay-3">
          <h2 className="font-head font-bold text-base text-white mb-3">Low Stock Alert</h2>
          <div className="space-y-1 max-h-[280px] overflow-y-auto pos-dark-scroll">
            {lowStock.length === 0 ? (
              <p className="text-sm" style={{ color: posTheme.textMuted }}>
                All variants healthy ✓
              </p>
            ) : (
              lowStock.slice(0, 12).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ borderBottom: i < 11 ? `1px solid ${posTheme.panelBorder}` : 'none' }}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-white truncate">{item.product_name}</p>
                    <p className="text-xs" style={{ color: posTheme.textMuted }}>
                      {item.color} · {item.size}
                    </p>
                  </div>
                  <span className={`admin-badge flex-shrink-0 ${item.stock_qty <= 2 ? 'admin-badge-danger' : 'admin-badge-warning'}`}>
                    {item.stock_qty}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {view === 'manager' && hourlyData.length > 0 && (
        <div className="admin-glass-panel p-5 mb-6 admin-fade-in">
          <h2 className="font-head font-bold text-base text-white mb-4">Hourly Revenue Pulse</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ADMIN_CHART.gold} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={ADMIN_CHART.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ADMIN_CHART.grid} vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: ADMIN_CHART.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: ADMIN_CHART.axis }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} />
                <Tooltip {...adminTooltipStyle} formatter={(v) => [fmtMoney(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={ADMIN_CHART.gold} strokeWidth={2} fill="url(#areaGold)" isAnimationActive animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="admin-glass-panel overflow-hidden admin-fade-in admin-fade-in-delay-4">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${posTheme.panelBorder}` }}>
          <h2 className="font-head font-bold text-base text-white">Recent Sales (today)</h2>
          <Link to="/admin/sales" className="text-sm font-semibold min-h-[44px] inline-flex items-center" style={{ color: posTheme.gold }}>
            View Sales History →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.04)' }}>
              <tr>
                {['Receipt #', 'Customer', 'Amount', 'Method', 'Time', 'Status'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: posTheme.textMuted }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm" style={{ color: posTheme.textMuted }}>
                    No sales recorded today yet.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-white/5" style={{ borderTop: `1px solid ${posTheme.panelBorder}` }}>
                    <td className="px-5 py-3.5 font-mono font-bold text-xs text-white">{s.receipt_no}</td>
                    <td className="px-5 py-3.5" style={{ color: posTheme.textSecondary }}>{s.client_name}</td>
                    <td className="px-5 py-3.5 font-bold font-head" style={{ color: posTheme.gold }}>
                      KES {s.total?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={paymentBadge(s.payment_method)}>{s.payment_method}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: posTheme.textMuted }}>
                      {new Date(s.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="admin-badge admin-badge-success">{s.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
