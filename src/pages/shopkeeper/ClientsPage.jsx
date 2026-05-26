import { useState, useEffect } from 'react'
import { posTheme } from '../../styles/posTheme'

export default function ClientsPageSK() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', school: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (window.api) {
        const res = await window.api.clients.getAll()
        if (res.ok) setClients(res.data)
      }
    }
    load()
  }, [])

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  )

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (window.api) {
        const res = await window.api.clients.create(form)
        if (res.ok) setClients((prev) => [...prev, { ...form, id: res.data.id, created_at: new Date().toISOString() }])
      } else {
        setClients((prev) => [...prev, { ...form, id: Date.now().toString(), created_at: new Date().toISOString() }])
      }
      setForm({ name: '', phone: '', school: '' })
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-5 pos-dark-scroll">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-head font-bold text-xl text-white">Clients</h1>
        <div className="flex gap-3 flex-wrap">
          <div className="pos-search-bar min-w-[200px]">
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: posTheme.textMuted }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => setShowAdd(true)} className="px-5 py-2.5 text-sm rounded-xl pos-btn-gold">
            + New Client
          </button>
        </div>
      </div>

      <div className="pos-glass-table rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Phone</th>
              <th className="text-left px-5 py-3">School</th>
              <th className="text-left px-5 py-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: posTheme.goldBg, color: posTheme.gold, border: `1px solid ${posTheme.goldBorder}` }}
                    >
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5" style={{ color: posTheme.textSecondary }}>
                  {c.phone || '—'}
                </td>
                <td className="px-5 py-3.5" style={{ color: posTheme.textSecondary }}>
                  {c.school || '—'}
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: posTheme.textMuted }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-KE') : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-sm" style={{ color: posTheme.textMuted }}>
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pos-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="pos-glass-modal rounded-2xl p-7 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-head font-bold text-lg text-white">New Client</h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-2xl cursor-pointer w-9 h-9 rounded-lg pos-btn-ghost flex items-center justify-center"
                style={{ padding: 0, color: posTheme.textMuted }}
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="pos-glass-label">Full Name *</label>
                <input
                  className="pos-glass-input"
                  placeholder="e.g. Mary Wanjiku"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="pos-glass-label">Phone Number</label>
                <input
                  className="pos-glass-input"
                  placeholder="07XXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="pos-glass-label">School</label>
                <input
                  className="pos-glass-input"
                  placeholder="e.g. Londiani Christian Academy"
                  value={form.school}
                  onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl pos-btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="flex-[2] py-3 rounded-xl pos-btn-gold"
              >
                {saving ? 'Saving…' : 'Save Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
