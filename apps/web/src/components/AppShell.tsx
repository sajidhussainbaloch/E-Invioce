import { useCallback, useEffect, useState } from 'react'
import type { Theme } from '../lib/theme'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import {
  applyTheme,
  cycleTheme,
  storedTheme,
  saveTheme,
} from '../lib/theme'
import { CommandPalette } from './CommandPalette'
import {
  IconBolt,
  IconCustomers,
  IconDashboard,
  IconFbr,
  IconInvoices,
  IconLogOut,
  IconMoon,
  IconPanelLeft,
  IconProducts,
  IconReports,
  IconScanner,
  IconSearch,
  IconSettings,
  IconSun,
} from './icons'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard className="h-[18px] w-[18px]" /> },
  { to: '/quick-sell', label: 'Quick Sell', icon: <IconBolt className="h-[18px] w-[18px]" /> },
  { to: '/invoices', label: 'Invoices', icon: <IconInvoices className="h-[18px] w-[18px]" /> },
  { to: '/customers', label: 'Customers', icon: <IconCustomers className="h-[18px] w-[18px]" /> },
  { to: '/products', label: 'Products', icon: <IconProducts className="h-[18px] w-[18px]" /> },
  { to: '/reports', label: 'Reports', icon: <IconReports className="h-[18px] w-[18px]" /> },
  { to: '/fbr', label: 'FBR', icon: <IconFbr className="h-[18px] w-[18px]" /> },
  { to: '/scanner', label: 'Invoice Scanner', icon: <IconScanner className="h-[18px] w-[18px]" /> },
  { to: '/settings', label: 'Settings', icon: <IconSettings className="h-[18px] w-[18px]" /> },
]

export function AppShell() {
  const { user, business, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ib-sidebar') === '1')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(storedTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(storedTheme())
    mq?.addEventListener('change', onChange)
    return () => mq?.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    localStorage.setItem('ib-sidebar', collapsed ? '1' : '0')
  }, [collapsed])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const onCycleTheme = useCallback(() => {
    setTheme((t) => {
      const next = cycleTheme(t)
      saveTheme(next)
      return next
    })
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col self-start border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`flex items-center border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center px-0 py-4' : 'gap-2 px-4 py-4'}`}>
          {!collapsed && <span className="min-w-0 truncate text-lg font-semibold">Invoice Bank</span>}
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
              collapsed ? '' : 'ml-auto shrink-0'
            }`}
          >
            <IconPanelLeft className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-slate-200 p-2 dark:border-slate-800">
          {user && (
            <ProfileChip
              collapsed={collapsed}
              name={user.name}
              email={user.email}
              onLogout={handleLogout}
              onOpenSettings={() => navigate('/settings')}
            />
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-2">
            {business && <span className="truncate text-sm text-slate-500 dark:text-slate-400">{business.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <IconSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden rounded border border-slate-200 px-1 text-[10px] sm:inline dark:border-slate-700">Ctrl K</kbd>
            </button>
            <button
              onClick={onCycleTheme}
              title={`Theme: ${theme}`}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} theme={theme} onCycleTheme={onCycleTheme} />
    </div>
  )
}

function ProfileChip({
  name,
  email,
  collapsed,
  onLogout,
  onOpenSettings,
}: {
  name: string
  email: string
  collapsed: boolean
  onLogout: () => void
  onOpenSettings: () => void
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onOpenSettings}
          title={`${name} (${email}) — Settings`}
          className="flex items-center justify-center rounded-full p-0.5 hover:ring-2 hover:ring-emerald-500/40"
        >
          <Avatar name={name} />
        </button>
        <button
          onClick={onLogout}
          title="Log out"
          className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <IconLogOut className="h-4 w-4" />
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1.5">
      <button onClick={onOpenSettings} title="Settings" className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Avatar name={name} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-slate-400">{email}</span>
        </span>
      </button>
      <button
        onClick={onLogout}
        title="Log out"
        className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
      >
        <IconLogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('')
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
      {initials}
    </span>
  )
}