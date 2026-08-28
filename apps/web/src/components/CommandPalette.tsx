import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import type { Theme } from '../lib/theme'
import { themeLabel } from '../lib/theme'
import {
  IconCommand,
  IconCustomers,
  IconDashboard,
  IconDownload,
  IconFbr,
  IconInvoices,
  IconLogOut,
  IconMoon,
  IconProducts,
  IconReports,
  IconScanner,
  IconSettings,
} from './icons'

type PaletteItem = {
  id: string
  label: string
  hint?: string
  keywords: string
  icon: ReactNode
  run: () => void
}

export function CommandPalette({
  open,
  onClose,
  theme,
  onCycleTheme,
}: {
  open: boolean
  onClose: () => void
  theme: Theme
  onCycleTheme: () => void
}) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  const items = useMemo<PaletteItem[]>(
    () => [
      { id: 'dashboard', label: 'Dashboard', hint: 'Go to page', keywords: 'home stats overview', icon: <IconDashboard className="h-4 w-4" />, run: () => go('/dashboard') },
      { id: 'invoices', label: 'Invoices', hint: 'Go to page', keywords: 'bills sales', icon: <IconInvoices className="h-4 w-4" />, run: () => go('/invoices') },
      { id: 'customers', label: 'Customers', hint: 'Go to page', keywords: 'clients buyers', icon: <IconCustomers className="h-4 w-4" />, run: () => go('/customers') },
      { id: 'products', label: 'Products', hint: 'Go to page', keywords: 'items stock catalogue', icon: <IconProducts className="h-4 w-4" />, run: () => go('/products') },
      { id: 'reports', label: 'Reports', hint: 'Go to page', keywords: 'sales charts', icon: <IconReports className="h-4 w-4" />, run: () => go('/reports') },
      { id: 'fbr', label: 'FBR', hint: 'Go to page', keywords: 'tax government integration', icon: <IconFbr className="h-4 w-4" />, run: () => go('/fbr') },
      { id: 'scanner', label: 'Invoice Scanner', hint: 'Go to page', keywords: 'ocr scan image', icon: <IconScanner className="h-4 w-4" />, run: () => go('/scanner') },
      { id: 'settings', label: 'Settings', hint: 'Go to page', keywords: 'business logo watermark prefix password theme', icon: <IconSettings className="h-4 w-4" />, run: () => go('/settings') },
      { id: 'new-invoice', label: 'New invoice', hint: 'Create', keywords: 'create new draft billing', icon: <IconInvoices className="h-4 w-4" />, run: () => go('/invoices/new') },
      { id: 'add-customer', label: 'Add customer', hint: 'Create', keywords: 'new client', icon: <IconCustomers className="h-4 w-4" />, run: () => go('/customers') },
      { id: 'add-product', label: 'Add product', hint: 'Create', keywords: 'new item sku', icon: <IconProducts className="h-4 w-4" />, run: () => go('/products') },
      {
        id: 'pdf',
        label: 'Download sample invoice PDF',
        hint: 'From saved settings',
        keywords: 'download sample invoice pdf',
        icon: <IconDownload className="h-4 w-4" />,
        run: () => {
          onClose()
          window.open('/api/sample/invoice.pdf', '_blank')
        },
      },
      {
        id: 'theme',
        label: `Switch theme (${themeLabel(theme)})`,
        hint: 'Light / Dark / System',
        keywords: 'theme dark light mode appearance',
        icon: <IconMoon className="h-4 w-4" />,
        run: () => {
          onCycleTheme()
          setQuery('')
        },
      },
      {
        id: 'logout',
        label: 'Log out',
        hint: 'End session',
        keywords: 'logout sign out exit',
        icon: <IconLogOut className="h-4 w-4" />,
        run: async () => {
          onClose()
          await logout()
          navigate('/login', { replace: true })
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => `${it.label} ${it.keywords}`.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[index]?.run()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <IconCommand className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            placeholder="Search pages and actions…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700">Esc</kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</li>
          )}
          {filtered.map((it, i) => (
            <li key={it.id}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={it.run}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                  i === index ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="text-slate-400">{it.icon}</span>
                <span className="flex-1">{it.label}</span>
                {it.hint && <span className="text-xs text-slate-400">{it.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}