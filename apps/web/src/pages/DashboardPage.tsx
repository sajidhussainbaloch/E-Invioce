import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { apiFetch, firstError } from '../lib/api'
import { fmtPaisa } from '../lib/format'
import { QuickSellModal } from '../components/QuickSellModal'
import type { DashboardResponse } from '../lib/types'
import { IconInvoices, IconScanner, IconSettings } from '../components/icons'

export function DashboardPage() {
  const { business } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')
  const [quickSell, setQuickSell] = useState(false)

  useEffect(() => {
    apiFetch<DashboardResponse>('/api/dashboard')
      .then(setData)
      .catch((err) => setError(firstError(err)))
  }, [])

  const stats = data
    ? [
        { label: 'Invoices', value: data.invoices.toLocaleString() },
        { label: 'Customers', value: data.customers.toLocaleString() },
        { label: 'Products', value: data.products.toLocaleString() },
        { label: 'Sales today', value: `Rs. ${data.salesToday.toLocaleString()}` },
      ]
    : null

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{business?.name ?? 'Loading business…'}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            data?.fbrConnected
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
          }`}
        >
          FBR: {data ? (data.fbrConnected ? 'Connected' : 'Not connected yet') : '…'}
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(stats ?? [
          { label: '…', value: '—' },
          { label: '…', value: '—' },
          { label: '…', value: '—' },
          { label: '…', value: '—' },
        ]).map((s, i) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold dark:text-slate-100">{data ? s.value : '…'}</p>
            {!data && <p className="text-xs text-slate-300 dark:text-slate-600">loading {i}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => setQuickSell(true)}
            className="flex items-start gap-3 rounded-lg border border-emerald-500 p-4 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
          >
            <span>
              <span className="block font-medium text-emerald-700 dark:text-emerald-400">Quick sell</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">Scan items and issue an invoice in one step</span>
            </span>
          </button>
          <Quick to="/settings" icon={<IconSettings className="h-5 w-5" />} title="Invoice settings & preview" desc="Watermark, logo, prefix and a live invoice preview" />
          <Quick to="/scanner" icon={<IconScanner className="h-5 w-5" />} title="Scan an invoice" desc="OCR a document into text" />
          <Quick to="/invoices" icon={<IconInvoices className="h-5 w-5" />} title="Invoices" desc="Create and manage invoices" />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent invoices</h2>
          <Link to="/invoices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
            View all →
          </Link>
        </div>
        {!data ? (
          <p className="px-6 pb-4 text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : data.recentInvoices.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-slate-400 dark:text-slate-500">No invoices yet — create one from Quick actions.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentInvoices.map((inv) => (
              <li key={inv.id}>
                <Link to={`/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{inv.number ?? 'DRAFT'}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{inv.customerName}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        inv.status === 'issued'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}
                    >
                      {inv.status === 'issued' ? 'Issued' : 'Draft'}
                    </span>
                    <span className="font-semibold">{fmtPaisa(inv.totalPaisa)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    {quickSell && <QuickSellModal onClose={() => setQuickSell(false)} />}
    </div>
  )
}

function Quick({ to, title, desc, icon }: { to: string; title: string; desc: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/30"
    >
      <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">{icon}</span>
      <span>
        <span className="block font-medium text-slate-800 dark:text-slate-100">{title}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{desc}</span>
      </span>
    </Link>
  )
}