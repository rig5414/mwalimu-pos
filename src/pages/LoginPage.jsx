import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const ROLES = [
  { id: 'shopkeeper', label: 'Shopkeeper', icon: '🛒', desc: 'Sales & stock entry' },
  { id: 'admin',      label: 'Admin',       icon: '⚙️', desc: 'Full system access' },
]

export default function LoginPage() {
  const [role, setRole]       = useState('shopkeeper')
  const [username, setUsername] = useState('')
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login }             = useAuthStore()
  const navigate              = useNavigate()

  const handleLogin = async () => {
    if (!username || !pin) { setError('Please enter username and PIN'); return }
    setLoading(true)
    setError('')
    try {
      await login(username.trim().toLowerCase(), pin, role)
      navigate(role === 'admin' ? '/admin' : '/pos')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 100%)' }}>
      <div className="bg-white rounded-2xl shadow-modal p-10 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
            👔
          </div>
          <h1 className="font-head text-xl font-bold text-primary">Mwalimu Uniforms</h1>
          <p className="text-sm text-gray-400 mt-1">Point of Sale System</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {ROLES.map(r => (
            <button key={r.id} onClick={() => setRole(r.id)}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer
                ${role === r.id
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              <div className="text-2xl mb-1">{r.icon}</div>
              <div className="text-sm font-semibold">{r.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2.5 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Fields */}
        <div className="mb-4">
          <label className="label">Username</label>
          <input className="input" type="text" placeholder="Enter username"
            value={username} onChange={e => setUsername(e.target.value)}
            autoComplete="off" />
        </div>
        <div className="mb-6">
          <label className="label">PIN</label>
          <input className="input" type="password" placeholder="Enter PIN"
            value={pin} onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>

        <button className="btn-primary w-full text-lg py-3.5"
          onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-5">
          Demo: <strong>shopkeeper / 1234</strong> or <strong>admin / 9999</strong>
        </p>
      </div>
    </div>
  )
}
