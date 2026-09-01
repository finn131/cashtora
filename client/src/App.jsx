import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import StockPage from './pages/StockPage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import Layout from './components/Layout.jsx';

function Protected() {
  const { token, loading } = useAuth();
  if (loading) return <div className="center-page">Memuat...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/pos" element={<SalesPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
