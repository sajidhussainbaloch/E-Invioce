import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { BusinessSetupPage } from './pages/BusinessSetupPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { FbrPage } from './pages/FbrPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoiceFormPage } from './pages/InvoiceFormPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { InvoiceScannerPage } from './pages/InvoiceScannerPage'
import { LoginPage } from './pages/LoginPage'
import { ProductsPage } from './pages/ProductsPage'
import { QuickSellPage } from './pages/QuickSellPage'
import { RegisterPage } from './pages/RegisterPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-400">
      {children}
    </div>
  )
}

function RequireAuth({ children, business = false }: { children: ReactNode; business?: boolean }) {
  const { user, hasBusiness, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreen>Checking session…</FullScreen>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (business && !hasBusiness) return <Navigate to="/business-setup" replace />
  return <>{children}</>
}

function RequireNoBusiness({ children }: { children: ReactNode }) {
  const { user, hasBusiness, loading } = useAuth()

  if (loading) return <FullScreen>Checking session…</FullScreen>
  if (!user) return <Navigate to="/login" replace />
  if (hasBusiness) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/business-setup',
    element: (
      <RequireAuth>
        <RequireNoBusiness>
          <BusinessSetupPage />
        </RequireNoBusiness>
      </RequireAuth>
    ),
  },
  {
    element: (
      <RequireAuth business>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'quick-sell', element: <QuickSellPage /> },
      { path: 'invoices/new', element: <InvoiceFormPage /> },
      { path: 'invoices/:id/edit', element: <InvoiceFormPage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'scanner', element: <InvoiceScannerPage /> },
      { path: 'fbr', element: <FbrPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App