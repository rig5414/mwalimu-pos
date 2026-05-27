import { useState, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'
import { useAuthStore } from '../../store/authStore'

const BLANK_CREATE = { name:'', username:'', pin:'', confirmPin:'', role:'shopkeeper' }
const BLANK_EDIT   = { name:'', username:'', role:'shopkeeper', pin:'', confirmPin:'' }

export default function UsersPage() {
  const [users, setUsers]         = useState([])
  const [showAdd, setShowAdd]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [createForm, setCreateForm] = useState(BLANK_CREATE)
  const [editForm, setEditForm]   = useState(BLANK_EDIT)
  const [saving, setSaving]       = useState(false)
  const toast = useToast()
  const currentUser = useAuthStore((s) => s.user)

  const isCurrentUser = (user) => currentUser?.id === user.id

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
    setEditForm({ name: user.name, username: user.username, role: user.role, pin: '', confirmPin: '' })
  }

  const handleEdit = async () => {
    const { name, username, role, pin, confirmPin } = editForm
    if (!name.trim() || !username.trim()) {
      toast.error('Name and username are required')
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
        username: username.trim(),
        role,
        is_active: editTarget.is_active,
        ...(pin ? { pin } : {}),
      }
      if (window.api) {
        const res = await window.api.users.update(payload)
        if (!res.ok) throw new Error(res.error)
      }
      setUsers(prev => prev.map(u =>
        u.id === editTarget.id ? { ...u, name: name.trim(), username: username.trim(), role } : u
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
    if (isCurrentUser(user) && user.is_active) {
      toast.error('You cannot deactivate your own account')
      return
    }
    const newActive = user.is_active ? 0 : 1
    try {
      if (window.api) {
        const res = await window.api.users.update({
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          is_active: newActive,
          actingUserId: currentUser?.id,
        })
        if (!res.ok) throw new Error(res.error)
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newActive } : u))
      toast.info(`${user.name} ${newActive ? 'activated' : 'deactivated'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update user status')
    }
  }

  const softDeleteUser = async (user) => {
    if (isCurrentUser(user)) {
      toast.error('You cannot delete your own account')
      return
    }
    try {
      if (window.api?.users?.delete) {
        const res = await window.api.users.delete({ id: user.id, actingUserId: currentUser?.id })
        if (!res.ok) throw new Error(res.error)
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: 0, deleted_at: new Date().toISOString() } : u
        )
      )
      toast.warning(`${user.name} moved to deleted users`)
    } catch (err) {
      toast.error(err.message || 'Failed to delete user')
    }
  }

  const restoreUser = async (user) => {
    try {
      if (window.api?.users?.restore) {
        const res = await window.api.users.restore(user.id)
        if (!res.ok) throw new Error(res.error)
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: 1, deleted_at: null } : u
        )
      )
      toast.success(`${user.name} restored`)
    } catch (err) {
      toast.error(err.message || 'Failed to restore user')
    }
  }

  const removeFromUi = async (user) => {
    try {
      if (window.api?.users?.removeFromUi) {
        const res = await window.api.users.removeFromUi(user.id)
        if (!res.ok) throw new Error(res.error)
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      toast.info(`${user.name} removed completely from the system`)
    } catch (err) {
      toast.error(err.message || 'Failed to remove user')
    }
  }

  const visibleUsers = users.filter((u) => !u.deleted_at)
  const deletedUsers = users.filter((u) => !!u.deleted_at)

  return (
    <div className="admin-page pos-dark-scroll">
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
            {visibleUsers.map(u => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                    ${u.role === 'admin' ? 'bg-accent-light text-accent' : 'bg-primary-light text-primary'}`}>
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800">{u.name}</span>
                    {isCurrentUser(u) && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-light text-accent">
                        You
                      </span>
                    )}
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
                    {!isCurrentUser(u) && (
                      <button
                        onClick={() => toggleActive(u)}
                        className={`text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg transition-colors
                                    ${u.is_active
                                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                      : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {!isCurrentUser(u) && (
                      <button
                        onClick={() => setConfirmAction({ type: 'delete', user: u })}
                        className="text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg transition-colors
                                   text-red-500 bg-red-500/15 hover:bg-red-500/25"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No active/inactive users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-head font-bold text-base text-gray-800">Deleted Users</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Restore users or remove them completely from the system.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Username', 'Role', 'Deleted', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deletedUsers.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-800">{u.name}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {u.deleted_at ? new Date(u.deleted_at).toLocaleString('en-KE') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmAction({ type: 'restore', user: u })}
                      className="text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg transition-colors
                                 text-green-500 bg-green-500/15 hover:bg-green-500/25"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'remove', user: u })}
                      className="text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-lg transition-colors
                                 text-red-500 bg-red-500/15 hover:bg-red-500/25"
                    >
                      Remove Completely
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {deletedUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  No deleted users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create User Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pos-overlay"
             onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="pos-glass-modal rounded-2xl p-7 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-head font-bold text-lg text-white">New User</h3>
              <button onClick={() => setShowAdd(false)} className="text-white/60 hover:text-white text-2xl cursor-pointer">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="pos-glass-label">Full Name *</label>
                <input className="pos-glass-input" placeholder="e.g. Jane Muthoni" value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="pos-glass-label">Username *</label>
                <input className="pos-glass-input" placeholder="e.g. jane_sk" value={createForm.username}
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="pos-glass-label">PIN *</label>
                <input className="pos-glass-input" type="password" placeholder="4-digit PIN" value={createForm.pin}
                  onChange={e => setCreateForm(f => ({ ...f, pin: e.target.value }))} />
              </div>
              <div>
                <label className="pos-glass-label">Confirm PIN *</label>
                <input className="pos-glass-input" type="password" placeholder="Repeat PIN" value={createForm.confirmPin}
                  onChange={e => setCreateForm(f => ({ ...f, confirmPin: e.target.value }))} />
              </div>
              <div>
                <label className="pos-glass-label">Role *</label>
                <select className="pos-glass-select" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="shopkeeper">Shopkeeper</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setCreateForm(BLANK_CREATE) }}
                className="flex-1 py-3 rounded-xl pos-btn-ghost font-head font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-[2] py-3 rounded-xl pos-btn-gold font-head font-bold cursor-pointer">
                {saving ? 'Saving…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / PIN Reset Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pos-overlay"
             onClick={e => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="pos-glass-modal rounded-2xl p-7 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-head font-bold text-lg text-white">Edit User</h3>
              <button onClick={() => setEditTarget(null)} className="text-white/60 hover:text-white text-2xl cursor-pointer">×</button>
            </div>
            <p className="text-xs text-white/55 mb-5 font-mono">@{editTarget.username} · {editTarget.role}</p>

            <div className="space-y-4">
              <div>
                <label className="pos-glass-label">Full Name *</label>
                <input className="pos-glass-input" placeholder="Full name" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="pos-glass-label">Username *</label>
                <input className="pos-glass-input" placeholder="Username for login" value={editForm.username}
                  onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="pos-glass-label">Role *</label>
                <select className="pos-glass-select" value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="shopkeeper">Shopkeeper</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-white/55 uppercase tracking-wide mb-3">
                  🔑 Reset PIN (leave blank to keep current)
                </p>
                <div>
                  <label className="pos-glass-label">New PIN</label>
                  <input className="pos-glass-input" type="password" placeholder="New 4-digit PIN" value={editForm.pin}
                    onChange={e => setEditForm(f => ({ ...f, pin: e.target.value }))} />
                </div>
                <div className="mt-3">
                  <label className="pos-glass-label">Confirm New PIN</label>
                  <input className="pos-glass-input" type="password" placeholder="Repeat new PIN" value={editForm.confirmPin}
                    onChange={e => setEditForm(f => ({ ...f, confirmPin: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditTarget(null)}
                className="flex-1 py-3 rounded-xl pos-btn-ghost font-head font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={handleEdit} disabled={saving}
                className="flex-[2] py-3 rounded-xl pos-btn-gold font-head font-bold cursor-pointer">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Confirmation Modal ── */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pos-overlay"
          onClick={(e) => e.target === e.currentTarget && setConfirmAction(null)}
        >
          <div className="pos-glass-modal rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-head font-bold text-lg text-white mb-2">
              {confirmAction.type === 'delete' && 'Delete user?'}
              {confirmAction.type === 'restore' && 'Restore user?'}
              {confirmAction.type === 'remove' && 'Remove from UI?'}
            </h3>
            <p className="text-sm text-white/65 mb-6">
              {confirmAction.type === 'delete' &&
                `This will delete ${confirmAction.user.name} and move them to Deleted Users.`}
              {confirmAction.type === 'restore' &&
                `This will restore ${confirmAction.user.name} back to active users.`}
              {confirmAction.type === 'remove' &&
                `This removes ${confirmAction.user.name} entirely from the system. Are you sure you want to continue?`}
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl pos-btn-ghost" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button
                className={`flex-[2] py-3 rounded-xl font-head font-bold cursor-pointer ${
                  confirmAction.type === 'restore'
                    ? 'pos-btn-gold'
                    : 'text-white bg-red-500/35 border border-red-400/60 hover:bg-red-500/45'
                }`}
                onClick={async () => {
                  const { type, user } = confirmAction
                  setConfirmAction(null)
                  if (type === 'delete') await softDeleteUser(user)
                  if (type === 'restore') await restoreUser(user)
                  if (type === 'remove') await removeFromUi(user)
                }}
              >
                {confirmAction.type === 'delete' && 'Delete'}
                {confirmAction.type === 'restore' && 'Restore'}
                {confirmAction.type === 'remove' && 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
