import { useState, useEffect } from 'react'

const DUMMY_CLIENTS = [
  { id:'c1', name:'Mary Wanjiku',   phone:'0722 345 678', school:'Mombasa Primary', created_at:'2026-01-10' },
  { id:'c2', name:'James Ochieng', phone:'0733 456 789', school:'Coast Academy',   created_at:'2026-02-05' },
  { id:'c3', name:'Fatuma Hassan', phone:'0711 567 890', school:'Tudor Boys',       created_at:'2026-03-01' },
  { id:'c4', name:'David Mutua',   phone:'0744 678 901', school:'Mbaraki Primary', created_at:'2026-03-22' },
]

export default function ClientsPageSK() {
  const [clients, setClients]   = useState([])
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({ name:'', phone:'', school:'' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const load = async () => {
      if (window.api) {
        const res = await window.api.clients.getAll()
        if (res.ok) setClients(res.data)
      } else {
        setClients(DUMMY_CLIENTS)
      }
    }
    load()
  }, [])

  const filtered = clients.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  )

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (window.api) {
        const res = await window.api.clients.create(form)
        if (res.ok) setClients(prev => [...prev, { ...form, id: res.data.id, created_at: new Date().toISOString() }])
      } else {
        setClients(prev => [...prev, { ...form, id: Date.now().toString(), created_at: new Date().toISOString() }])
      }
      setForm({ name:'', phone:'', school:'' })
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-head font-bold text-xl text-gray-800">Clients</h1>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input className="outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400 w-44"
              placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="btn-primary px-5 py-2.5 text-sm">+ New Client</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">School</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Added</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center
                                    text-xs font-bold text-primary flex-shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-600">{c.phone || '—'}</td>
                <td className="px-5 py-3.5 text-gray-600">{c.school || '—'}</td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-KE') : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400 text-sm">No clients found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(10,20,40,0.6)' }}
             onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm mx-4 shadow-modal">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-head font-bold text-lg">New Client</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-2xl cursor-pointer">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="e.g. Mary Wanjiku" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" placeholder="07XXXXXXXX" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">School</label>
                <input className="input" placeholder="e.g. Mombasa Primary" value={form.school}
                  onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-head font-semibold
                           text-gray-500 cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={!form.name.trim() || saving}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-head font-bold
                           cursor-pointer hover:bg-primary-dark disabled:bg-gray-200 disabled:text-gray-400">
                {saving ? 'Saving…' : 'Save Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
