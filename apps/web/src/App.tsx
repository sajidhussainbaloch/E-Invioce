import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { BusinessSetupPage } from './pages/BusinessSetupPage'
import { DashboardPage } from './pages/DashboardPage'
import { InvoiceScannerPage } from './pages/InvoiceScannerPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'
import { SampleInvoicePage } from './pages/SampleInvoicePage'
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

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/business-setup',
    element: (
      <RequireAuth>
        <BusinessSetupPage />
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
      { path: 'invoices', element: <PlaceholderPage title="Invoices" hint="Invoices arrive in Phase 3, along with FBR submission." /> },
      { path: 'customers', element: <PlaceholderPage title="Customers" hint="Customer management arrives in Phase 3." /> },
      { path: 'products', element: <PlaceholderPage title="Products" hint="Product catalogue arrives in Phase 3." /> },
      { path: 'reports', element: <PlaceholderPage title="Reports" hint="Sales reports will be available after invoices exist." /> },
      { path: 'sample-invoice', element: <SampleInvoicePage /> },
      { path: 'scanner', element: <InvoiceScannerPage /> },
      { path: 'fbr', element: <PlaceholderPage title="FBR Integration" hint="DI API connectivity is planned for Phase 4: get a Bearer token, sandbox tests, then production filing." /> },
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