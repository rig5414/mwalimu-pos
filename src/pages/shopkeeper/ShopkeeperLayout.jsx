import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useClock } from '../../hooks/useClock'
import { posTheme } from '../../styles/posTheme'

export default function ShopkeeperLayout() {
  const { user, logout } = useAuthStore()
  const itemCount = useCartStore((s) => s.items.reduce((a, i) => a + i.qty, 0))
  const time = useClock()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer
     ${isActive ? 'border-[#e8a020] text-white' : 'border-transparent text-white/55 hover:text-white/90'}`

  return (
    <div className="h-full flex flex-col" style={{ background: posTheme.bg }}>
      <header
        className="flex items-center px-5 h-14 flex-shrink-0"
        style={{
          background: posTheme.panelBg,
          borderBottom: `1px solid ${posTheme.panelBorder}`,
          backdropFilter: posTheme.blur,
          WebkitBackdropFilter: posTheme.blur,
        }}
      >
        <div className="font-head font-bold text-white text-lg">
          Mwalimu <span style={{ color: posTheme.gold }}>Uniforms</span>
        </div>

        <nav className="flex ml-6 -mb-0 h-full">
          <NavLink to="/pos" end className={navClass}>
            🛒 New Sale
            {itemCount > 0 && (
              <span
                className="text-xs font-bold rounded-full px-1.5 min-w-[20px] text-center"
                style={{ background: posTheme.gold, color: posTheme.goldDark }}
              >
                {itemCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/pos/stock" className={navClass}>
            📦 Stock
          </NavLink>
          <NavLink to="/pos/clients" className={navClass}>
            👤 Clients
          </NavLink>
        </nav>

        <div className="flex-1" />

        <span className="text-sm font-mono mr-4" style={{ color: posTheme.textMuted }}>
          {time}
        </span>

        <div
          className="flex items-center gap-2.5 rounded-full px-3.5 py-1.5 mr-3"
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: `1px solid ${posTheme.panelBorder}`,
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: posTheme.gold, color: posTheme.goldDark }}
          >
            {user?.name?.[0] || 'S'}
          </div>
          <div>
            <div className="text-white text-xs font-semibold leading-tight">{user?.name}</div>
            <div className="text-xs leading-tight" style={{ color: posTheme.textMuted }}>
              Shopkeeper
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium cursor-pointer px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: posTheme.textSecondary,
            background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${posTheme.panelBorder}`,
          }}
        >
          ← Logout
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
