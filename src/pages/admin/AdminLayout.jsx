import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useClock } from '../../hooks/useClock'
import { posTheme } from '../../styles/posTheme'

const NAV = [
  { to: '/admin', end: true, icon: '📊', label: 'Dashboard' },
  { to: '/admin/sales', icon: '💰', label: 'Sales' },
  { to: '/admin/stock', icon: '📦', label: 'Stock' },
  { to: '/admin/products', icon: '🏷️', label: 'Products' },
  { to: '/admin/categories', icon: '📂', label: 'Categories' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const time = useClock()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="admin-shell h-full flex">
      <aside className="admin-sidebar">
        <div className="px-4 py-5">
          <div className="font-head font-bold text-white text-lg leading-tight">
            Mwalimu <span style={{ color: posTheme.gold }}>Uniforms</span>
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] mt-1" style={{ color: posTheme.textMuted }}>
            Admin Console
          </p>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto pos-dark-scroll">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <div
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 mb-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: posTheme.gold, color: posTheme.goldDark }}
            >
              {user?.name?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
              <div className="text-xs" style={{ color: posTheme.textMuted }}>
                Administrator
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 rounded-lg text-sm font-medium pos-btn-ghost"
          >
            ← Logout
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="flex-1" />
          <span className="text-sm font-mono mr-4 tabular-nums" style={{ color: posTheme.textMuted }}>
            {time}
          </span>
          <span
            className="admin-badge admin-badge-info hidden sm:inline-flex"
            style={{ animation: 'adminStatPulse 3s ease-in-out infinite' }}
          >
            ● Live
          </span>
        </header>

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
