import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '../../hooks/useToast'
import ReceiptPreview from '../../components/pos/ReceiptPreview'
import { posTheme } from '../../styles/posTheme'

function matchesSaleSearch(sale, rawSearch) {
  const raw = String(rawSearch || '').trim()
  if (!raw) return true

  const q = raw.toLowerCase()
  const receipt = String(sale.receipt_no || '')
  const receiptDigits = receipt.replace(/\D/g, '')
  const client = String(sale.client_name || '').toLowerCase()
  const amount = Number(sale.total || 0)
  const amountPaid = Number(sale.amount_paid ?? sale.total ?? 0)

  const rawDigits = raw.replace(/\D/g, '')
  const numeric = Number(raw.replace(/,/g, ''))

  if (client.includes(q)) return true
  if (receipt.toLowerCase().includes(q)) return true
  if (rawDigits && receiptDigits.includes(rawDigits)) return true
  if (rawDigits.length > 0 && rawDigits.length <= 4 && receiptDigits.slice(-4) === rawDigits.padStart(4, '0')) {
    return true
  }
  if (Number.isFinite(numeric) && numeric > 0) {
    if (Math.round(amount * 100) === Math.round(numeric * 100)) return true
    if (Math.round(amountPaid * 100) === Math.round(numeric * 100)) return true
  }
  const amountStr = String(Math.round(amount))
  if (amountStr.includes(raw.replace(/,/g, ''))) return true

  return false
}

export default function SalesPage() {
  const [allSales, setAllSales] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [voiding, setVoiding] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const toast = useToast()

  const sales = useMemo(
    () => allSales.filter((row) => matchesSaleSearch(row, search)),
    [allSales, search]
  )

  const loadList = useCallback(async () => {
    if (!window.api) return
    const filters = {}
    if (from) filters.from = from
    if (to) filters.to = to
    const res = await window.api.sales.getAll(filters)
    if (res.ok) setAllSales(res.data || [])
    else toast.error(res.error || 'Failed to load sales')
  }, [from, to, toast])

  useEffect(() => {
    if (selectedId && sales.length > 0 && !sales.some((s) => s.id === selectedId)) {
      setSelectedId(null)
      setDetail(null)
      setIsReceiptOpen(false)
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

  const openReceipt = (id) => {
    setSelectedId(id)
    setIsReceiptOpen(true)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden admin-page !p-0">
      <div
        className="flex-shrink-0 p-4 admin-fade-in"
        style={{ borderBottom: `1px solid ${posTheme.panelBorder}`, background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-end gap-4">
          <div className="min-w-[220px]">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: posTheme.gold }}>
              Transactions
            </p>
            <h1 className="font-head font-bold text-xl text-white">Sales History</h1>
            <p className="text-sm mt-0.5" style={{ color: posTheme.textMuted }}>
              {sales.length} receipts · KES {totalListed.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search receipt, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pos-glass-input min-h-[44px] text-sm flex-[2] min-w-[220px]"
            />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="pos-glass-input min-h-[44px] text-sm w-[150px]"
            />
            <span className="text-xs font-semibold px-1" style={{ color: posTheme.textMuted }}>
              to
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="pos-glass-input min-h-[44px] text-sm w-[150px]"
            />
            <button type="button" onClick={() => loadList()} className="min-h-[44px] px-4 rounded-xl pos-btn-gold text-sm whitespace-nowrap">
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pos-dark-scroll">
        {sales.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm" style={{ color: posTheme.textMuted }}>
            No sales match your filters.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {sales.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openReceipt(s.id)}
                className="text-left rounded-xl p-4 transition-all cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${selectedId === s.id ? posTheme.goldBorder : posTheme.panelBorder}`,
                  boxShadow: selectedId === s.id ? '0 0 0 1px rgba(232,160,32,0.3)' : 'none',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono font-bold text-sm text-white">{s.receipt_no}</p>
                  <span className={`admin-badge ${s.status === 'voided' ? 'admin-badge-danger' : 'admin-badge-success'}`}>
                    {s.status === 'voided' ? 'VOIDED' : 'COMPLETED'}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: posTheme.textMuted }}>
                  {new Date(s.created_at).toLocaleString('en-KE')}
                </p>
                <p className="text-sm mt-2" style={{ color: posTheme.textSecondary }}>
                  Client: {s.client_name || 'Walk-in'}
                </p>
                <p className="text-lg font-head font-extrabold mt-2" style={{ color: posTheme.gold }}>
                  KES {s.total?.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {isReceiptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pos-overlay p-4"
          onClick={(e) => e.target === e.currentTarget && setIsReceiptOpen(false)}
        >
          <div className="pos-glass-modal rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            {!detail ? (
              <div className="p-10 text-center text-sm" style={{ color: posTheme.textMuted }}>
                Loading receipt...
              </div>
            ) : (
              <>
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${posTheme.panelBorder}` }}
                >
                  <div>
                    <h2 className="font-head font-bold text-lg text-white">Receipt {detail.receipt_no}</h2>
                    <p className="text-xs mt-1" style={{ color: posTheme.textMuted }}>
                      {new Date(detail.created_at).toLocaleString('en-KE')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReceiptOpen(false)}
                    className="w-9 h-9 rounded-lg pos-btn-ghost text-white/70"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pos-dark-scroll">
                  <ReceiptPreview sale={detail} monochrome />
                </div>

                <div
                  className="px-6 py-4 flex flex-wrap items-center justify-end gap-2"
                  style={{ borderTop: `1px solid ${posTheme.panelBorder}` }}
                >
                  <button
                    type="button"
                    onClick={handleReprint}
                    disabled={detail.status === 'voided'}
                    className="min-h-[44px] px-4 rounded-xl pos-btn-ghost text-sm disabled:opacity-40"
                  >
                    Reprint
                  </button>
                  {detail.status !== 'voided' && (
                    <button
                      type="button"
                      onClick={handleVoid}
                      disabled={voiding}
                      className="min-h-[44px] px-4 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{
                        background: posTheme.dangerBg,
                        color: posTheme.dangerText,
                        border: `1px solid ${posTheme.dangerBorder}`,
                      }}
                    >
                      {voiding ? 'Voiding…' : 'Void Sale'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsReceiptOpen(false)}
                    className="min-h-[44px] px-4 rounded-xl pos-btn-gold text-sm"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
