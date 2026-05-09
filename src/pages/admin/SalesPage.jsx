import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import ReceiptPreview from '../../components/pos/ReceiptPreview'

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [voiding, setVoiding] = useState(false)
  const toast = useToast()

  const loadList = useCallback(async () => {
    if (!window.api) return
    const filters = {}
    if (from) filters.from = from
    if (to) filters.to = to
    if (search.trim()) filters.search = search.trim()
    const res = await window.api.sales.getAll(filters)
    if (res.ok) setSales(res.data || [])
  }, [from, to, search])

  useEffect(() => {
    if (selectedId && sales.length > 0 && !sales.some((s) => s.id === selectedId)) {
      setSelectedId(null)
      setDetail(null)
    }
  }, [sales, selectedId])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    let cancelled = false
    async function loadDetail() {
      if (!selectedId || !window.api) {
        setDetail(null)
        return
      }
      const res = await window.api.sales.getById(selectedId)
      if (!cancelled && res.ok) setDetail(res.data)
    }
    loadDetail()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const totalListed = sales.reduce((s, r) => s + (r.total || 0), 0)

  const handleReprint = async () => {
    if (!detail) return
    const payload = {
      receipt_no: detail.receipt_no,
      items: detail.items,
      customerName: detail.client_name,
      method: detail.payment_method,
      change: detail.change_given,
      total: detail.total,
      subtotal: detail.subtotal,
      tax: detail.tax,
      created_at: detail.created_at,
      client_name: detail.client_name,
      payment_method: detail.payment_method,
    }
    if (window.api?.print?.receipt) {
      const res = await window.api.print.receipt(payload)
      if (res?.ok && res.data?.printed) toast.success('Sent to thermal printer')
      else if (res?.ok && res.data?.simulated) toast.info('Simulation mode — no printer or interface not configured')
    }
  }

  const handleVoid = async () => {
    if (!detail || detail.status === 'voided') return
    if (!window.confirm(`Void receipt ${detail.receipt_no}? This cannot be undone.`)) return
    setVoiding(true)
    try {
      const res = await window.api.sales.void(detail.id)
      if (!res.ok) throw new Error(res.error)
      toast.success('Sale voided')
      setDetail({ ...detail, status: 'voided' })
      await loadList()
    } catch (e) {
      toast.error(e.message || 'Void failed')
    } finally {
      setVoiding(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white flex flex-wrap items-end gap-3">
        <div>
          <h1 className="font-head font-bold text-xl text-gray-800">Sales History</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {sales.length} receipts · KES {totalListed.toLocaleString()}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search receipt, customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] px-3 border border-gray-200 rounded-lg text-sm flex-1 min-w-[200px] max-w-md"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="min-h-[44px] px-3 border border-gray-200 rounded-lg text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="min-h-[44px] px-3 border border-gray-200 rounded-lg text-sm"
        />
        <button
          type="button"
          onClick={() => loadList()}
          className="min-h-[44px] px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold cursor-pointer hover:bg-gray-800"
        >
          Apply
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-[min(400px,36vw)] min-w-[280px] border-r border-gray-200 bg-white overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-gray-400 border-b border-gray-100">
            RECENT TRANSACTIONS
          </div>
          {sales.length === 0 ? (
            <p className="p-6 text-sm text-gray-400">No sales match your filters.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sales.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left px-4 py-4 min-h-[72px] transition-colors cursor-pointer border-l-4 ${
                      selectedId === s.id ? 'bg-gray-100 border-gray-900' : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-mono font-bold text-sm text-gray-900">{s.receipt_no}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.created_at).toLocaleString('en-KE')}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Client: {s.client_name || '—'}</p>
                    <p className="text-base font-head font-extrabold text-primary mt-1">KES {s.total?.toLocaleString()}</p>
                    <span
                      className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                        s.status === 'voided' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {s.status === 'voided' ? 'VOIDED' : 'COMPLETED'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!detail ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select a receipt to view details
            </div>
          ) : (
            <div className="max-w-lg mx-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-head font-bold text-lg text-gray-800">Receipt Overview</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleReprint}
                    disabled={detail.status === 'voided'}
                    className="min-h-[44px] px-4 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Reprint
                  </button>
                  {detail.status !== 'voided' && (
                    <button
                      type="button"
                      onClick={handleVoid}
                      disabled={voiding}
                      className="min-h-[44px] px-4 rounded-lg bg-red-50 text-red-700 text-sm font-semibold border border-red-200 hover:bg-red-100 cursor-pointer disabled:opacity-50"
                    >
                      {voiding ? 'Voiding…' : 'Void'}
                    </button>
                  )}
                </div>
              </div>
              <ReceiptPreview sale={detail} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
