import { useState, useEffect } from 'react'

const DUMMY_USERS = [
  { id:'u1', name:'Jane Muthoni', username:'shopkeeper', role:'shopkeeper', is_active:1, created_at:'2026-01-01' },
  { id:'u2', name:'Admin User',   username:'admin',      role:'admin',      is_active:1, created_at:'2026-01-01' },
]

export default function UsersPage() {
  const [users, setUsers]     = useState(DUMMY_USERS)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name:'', username:'', pin:'', role:'shopkeeper' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!window.api) return
    window.api.users.getAll().then(res => { if (res.ok) setUsers(res.data) })
  }, [])

  const handleSave = async () => {
    if (!form.name || !form.username || !form.pin) return
    setSaving(true)
    try {
      if (window.api) {
        const res = await window.api.users.create(form)
        if (res.ok) setUsers(prev => [...prev, { ...form, id: res.data.id, is_active: 1, created_at: new Date().toISOString() }])
      } else {
        setUsers(prev => [...prev, { ...form, id: Date.now().toString(), is_active: 1, created_at: new Date().toISOString() }])
      }
      setForm({ name:'', username:'', pin:'', role:'shopkeeper' })
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    const newActive = user.is_active ? 0 : 1
    if (window.api) await window.api.users.update({ id: user.id, name: user.name, is_active: newActive })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newActive } : u))
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-head font-bold text-xl text-gray-800">User Management</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-5 py-2.5 text-sm">+ Add User</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name','Username','Role','Status','Added','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                    ${u.role === 'admin' ? 'bg-accent-light text-accent' : 'bg-primary-light text-primary'}`}>
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-600">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-KE')}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)}
                    className={`text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg transition-colors
                                ${u.is_active
                                  ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                  : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(10,20,40,0.6)' }}
             onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm mx-4 shadow-modal">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-head font-bold text-lg">New User</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-2xl cursor-pointer">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="e.g. Jane Muthoni" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Username *</label>
                <input className="input" placeholder="e.g. jane_sk" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="label">PIN *</label>
                <input className="input" type="password" placeholder="4-digit PIN" value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="shopkeeper">Shopkeeper</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-head font-semibold text-gray-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.name || !form.username || !form.pin || saving}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-head font-bold cursor-pointer
                           hover:bg-primary-dark disabled:bg-gray-200 disabled:text-gray-400">
                {saving ? 'Saving…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
