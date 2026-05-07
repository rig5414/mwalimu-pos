import { useState, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'

const DUMMY_USERS = [
  { id:'u1', name:'Jane Muthoni', username:'shopkeeper', role:'shopkeeper', is_active:1, created_at:'2026-01-01' },
  { id:'u2', name:'Admin User',   username:'admin',      role:'admin',      is_active:1, created_at:'2026-01-01' },
]

const BLANK_CREATE = { name:'', username:'', pin:'', confirmPin:'', role:'shopkeeper' }
const BLANK_EDIT   = { name:'', pin:'', confirmPin:'' }

export default function UsersPage() {
  const [users, setUsers]         = useState(DUMMY_USERS)
  const [showAdd, setShowAdd]     = useState(false)
  const [editTarget, setEditTarget] = useState(null) // user object being edited
  const [createForm, setCreateForm] = useState(BLANK_CREATE)
  const [editForm, setEditForm]   = useState(BLANK_EDIT)
  const [saving, setSaving]       = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!window.api) return
    window.api.users.getAll().then(res => {
      if (res.ok) setUsers(res.data)
      else toast.error('Failed to load users')
    })
  }, [])

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const { name, username, pin, confirmPin, role } = createForm
    if (!name.trim() || !username.trim() || !pin) {
      toast.error('All fields are required')
      return
    }
    if (pin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }
    setSaving(true)
    try {
      if (window.api) {
        const res = await window.api.users.create({ name: name.trim(), username: username.trim(), pin, role })
        if (!res.ok) throw new Error(res.error)
        setUsers(prev => [...prev, {
          ...createForm,
          id: res.data.id,
          is_active: 1,
          created_at: new Date().toISOString(),
        }])
      } else {
        setUsers(prev => [...prev, {
          ...createForm,
          id: Date.now().toString(),
          is_active: 1,
          created_at: new Date().toISOString(),
        }])
      }
      toast.success(`User "${name.trim()}" created successfully`)
      setCreateForm(BLANK_CREATE)
      setShowAdd(false)
    } catch (err) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit / PIN Reset ────────────────────────────────────────────────────────
  const openEdit = (user) => {
    setEditTarget(user)
    setEditForm({ name: user.name, pin: '', confirmPin: '' })
  }

  const handleEdit = async () => {
    const { name, pin, confirmPin } = editForm
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (pin && pin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }
    if (pin && pin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }
    setSaving(true)
    try {
      const payload = {
        id: editTarget.id,
        name: name.trim(),
        is_active: editTarget.is_active,
        ...(pin ? { pin } : {}),
      }
      if (window.api) {
        const res = await window.api.users.update(payload)
        if (!res.ok) throw new Error(res.error)
      }
      setUsers(prev => prev.map(u =>
        u.id === editTarget.id ? { ...u, name: name.trim() } : u
      ))
      toast.success(`User "${name.trim()}" updated${pin ? ' (PIN changed)' : ''}`)
      setEditTarget(null)
    } catch (err) {
      toast.error(err.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  // ── Activate / Deactivate ──────────────────────────────────────────────────
  const toggleActive = async (user) => {
    const newActive = user.is_active ? 0 : 1
    try {
      if (window.api) {
        const res = await window.api.users.update({ id: user.id, name: user.name, is_active: newActive })
        if (!res.ok) throw new Error(res.error)
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newActive } : u))
      toast.info(`${user.name} ${newActive ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update user status')
    }
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg transition-colors
                                 text-blue-600 bg-blue-50 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg transition-colors
                                  ${u.is_active
                                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                    : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create User Modal ── */}
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
                <input className="input" placeholder="e.g. Jane Muthoni" value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Username *</label>
                <input className="input" placeholder="e.g. jane_sk" value={createForm.username}
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="label">PIN *</label>
                <input className="input" type="password" placeholder="4-digit PIN" value={createForm.pin}
                  onChange={e => setCreateForm(f => ({ ...f, pin: e.target.value }))} />
              </div>
              <div>
                <label className="label">Confirm PIN *</label>
                <input className="input" type="password" placeholder="Repeat PIN" value={createForm.confirmPin}
                  onChange={e => setCreateForm(f => ({ ...f, confirmPin: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="shopkeeper">Shopkeeper</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setCreateForm(BLANK_CREATE) }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-head font-semibold text-gray-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-head font-bold cursor-pointer
                           hover:bg-primary-dark disabled:bg-gray-200 disabled:text-gray-400">
                {saving ? 'Saving…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / PIN Reset Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(10,20,40,0.6)' }}
             onClick={e => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm mx-4 shadow-modal">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-head font-bold text-lg">Edit User</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 text-2xl cursor-pointer">×</button>
            </div>
            <p className="text-xs text-gray-400 mb-5 font-mono">@{editTarget.username} · {editTarget.role}</p>

            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Full name" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  🔑 Reset PIN (leave blank to keep current)
                </p>
                <div>
                  <label className="label">New PIN</label>
                  <input className="input" type="password" placeholder="New 4-digit PIN" value={editForm.pin}
                    onChange={e => setEditForm(f => ({ ...f, pin: e.target.value }))} />
                </div>
                <div className="mt-3">
                  <label className="label">Confirm New PIN</label>
                  <input className="input" type="password" placeholder="Repeat new PIN" value={editForm.confirmPin}
                    onChange={e => setEditForm(f => ({ ...f, confirmPin: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditTarget(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-head font-semibold text-gray-500 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleEdit} disabled={saving}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-head font-bold cursor-pointer
                           hover:bg-primary-dark disabled:bg-gray-200 disabled:text-gray-400">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
