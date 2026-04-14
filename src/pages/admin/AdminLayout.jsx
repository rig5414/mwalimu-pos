import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useClock } from '../../hooks/useClock'

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const time             = useClock()
  const navigate         = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer
     ${isActive ? 'text-white border-accent' : 'text-white/60 border-transparent hover:text-white'}`

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center px-5 h-14 flex-shrink-0" style={{ background: '#1a3a5c' }}>
        <div className="font-head font-bold text-white text-lg">
          Mwalimu <span style={{ color: '#e8a020' }}>Uniforms</span>
          <span className="text-white/40 text-xs font-normal ml-2">Admin</span>
        </div>

        <nav className="flex ml-6 h-full">
          <NavLink to="/admin" end className={navClass}>📊 Dashboard</NavLink>
          <NavLink to="/admin/sales"  className={navClass}>💰 Sales</NavLink>
          <NavLink to="/admin/stock"  className={navClass}>📦 Stock</NavLink>
          <NavLink to="/admin/users"  className={navClass}>👥 Users</NavLink>
        </nav>

        <div className="flex-1" />
        <span className="text-white/60 text-sm font-mono mr-4">{time}</span>

        <div className="flex items-center gap-2.5 bg-white/10 rounded-full px-3.5 py-1.5 mr-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
               style={{ background: '#e8a020', color: '#1a3a5c' }}>
            {user?.name?.[0] || 'A'}
          </div>
          <div>
            <div className="text-white text-xs font-semibold leading-tight">{user?.name}</div>
            <div className="text-white/50 text-xs leading-tight">Administrator</div>
          </div>
        </div>

        <button onClick={handleLogout}
          className="text-white/70 hover:text-white text-sm font-medium cursor-pointer
                     bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
          ← Logout
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
