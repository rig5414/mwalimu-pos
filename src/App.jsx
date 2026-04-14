import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import ShopkeeperLayout from './pages/shopkeeper/ShopkeeperLayout'
import POSPage from './pages/shopkeeper/POSPage'
import StockPageSK from './pages/shopkeeper/StockPage'
import ClientsPageSK from './pages/shopkeeper/ClientsPage'
import AdminLayout from './pages/admin/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import SalesPage from './pages/admin/SalesPage'
import StockPageAdmin from './pages/admin/StockPage'
import UsersPage from './pages/admin/UsersPage'

// Route guard
function Require({ role, children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Shopkeeper routes */}
      <Route path="/pos" element={
        <Require role="shopkeeper"><ShopkeeperLayout /></Require>
      }>
        <Route index element={<POSPage />} />
        <Route path="stock" element={<StockPageSK />} />
        <Route path="clients" element={<ClientsPageSK />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={
        <Require role="admin"><AdminLayout /></Require>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="stock" element={<StockPageAdmin />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
