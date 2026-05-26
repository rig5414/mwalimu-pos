import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/** Works in Vite dev (/) and Electron production (./) */
const asset = (file) => `${import.meta.env.BASE_URL}${file}`

const ROLES = [
  { id: 'shopkeeper', label: 'Shopkeeper', icon: '🛒', desc: 'Sales & stock entry' },
  { id: 'admin',      label: 'Admin',       icon: '⚙️', desc: 'Full system access' },
]

export default function LoginPage() {
  const [role, setRole]         = useState('shopkeeper')
  const [username, setUsername] = useState('')
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuthStore()
  const navigate                = useNavigate()

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
    <div style={styles.root}>
      {/* Background image */}
      <div style={styles.bg} />

      {/* Dark overlay for contrast */}
      <div style={styles.overlay} />

      {/* Glass card */}
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoBox}>
            <img src={asset('icon.png')} alt="Mwalimu Uniforms" style={styles.logoImg} />
          </div>
          <h1 style={styles.appName}>Mwalimu Uniforms</h1>
          <p style={styles.appSub}>Point of Sale System</p>
        </div>

        {/* Role selector */}
        <div style={styles.roleGrid}>
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                ...styles.roleBtn,
                ...(role === r.id ? styles.roleBtnActive : styles.roleBtnIdle),
              }}
            >
              <span style={styles.roleIcon}>{r.icon}</span>
              <span style={styles.roleLabel}>{r.label}</span>
              <span style={styles.roleDesc}>{r.desc}</span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            ⚠ {error}
          </div>
        )}

        {/* Fields */}
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Username</label>
          <input
            className="login-glass-input"
            style={styles.input}
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div style={{ ...styles.fieldWrap, marginBottom: '1.5rem' }}>
          <label style={styles.label}>PIN</label>
          <input
            className="login-glass-input"
            style={styles.input}
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button
          style={{ ...styles.signInBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <span style={styles.spinner} /> Signing in…
            </>
          ) : (
            <>Sign In <span style={{ marginLeft: 6 }}>→</span></>
          )}
        </button>

        <p style={styles.footer}>Mwalimu POS · Secure login</p>
      </div>

      <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .__login-card {
          animation: loginFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        .__role-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.18);
        }
        .__sign-in-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(232,160,32,0.45);
        }
        .__sign-in-btn:active {
          transform: scale(0.97);
        }
        .__glass-input:focus {
          border-color: rgba(232,160,32,0.7) !important;
          background: rgba(255,255,255,0.18) !important;
          outline: none;
        }
      `}</style>
    </div>
  )
}

/* ─── Inline styles ────────────────────────────────────────────────────────── */
const styles = {
  root: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${asset('login_bg.png')})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: 'blur(1px) brightness(0.9)',
    transform: 'scale(1.04)',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(10,25,47,0.68) 0%, rgba(15,37,64,0.55) 100%)',
    zIndex: 1,
  },
  card: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '380px',
    padding: '2.5rem 2rem',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.10)',
    backdropFilter: 'blur(22px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
    animation: 'loginFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: '1.75rem',
  },
  logoBox: {
    width: '72px',
    height: '72px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 0.75rem',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  appName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.3px',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  appSub: {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.6)',
    marginTop: '0.3rem',
    letterSpacing: '0.5px',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  roleBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.85rem 0.5rem',
    borderRadius: '14px',
    border: '1.5px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(255,255,255,0.07)',
  },
  roleBtnActive: {
    border: '1.5px solid rgba(232,160,32,0.8)',
    background: 'rgba(232,160,32,0.15)',
    boxShadow: '0 4px 14px rgba(232,160,32,0.25)',
  },
  roleBtnIdle: {
    border: '1.5px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
  },
  roleIcon: {
    fontSize: '1.6rem',
    marginBottom: '0.3rem',
  },
  roleLabel: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  roleDesc: {
    fontSize: '0.68rem',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '0.15rem',
  },
  errorBox: {
    background: 'rgba(220,38,38,0.18)',
    border: '1px solid rgba(220,38,38,0.4)',
    color: '#fca5a5',
    borderRadius: '10px',
    padding: '0.6rem 0.9rem',
    fontSize: '0.82rem',
    marginBottom: '1rem',
  },
  fieldWrap: {
    marginBottom: '0.9rem',
  },
  label: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.4rem',
  },
  input: {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    border: '1.5px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.10)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', sans-serif",
  },
  signInBtn: {
    width: '100%',
    padding: '0.9rem',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #e8a020 0%, #f5b93a 100%)',
    color: '#1a2332',
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(232,160,32,0.3)',
    letterSpacing: '0.2px',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#1a2332',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginRight: '6px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.68rem',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '1.25rem',
    marginBottom: 0,
    letterSpacing: '0.4px',
  },
}
