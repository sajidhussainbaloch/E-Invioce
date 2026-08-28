import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { apiFetch, firstError } from '../lib/api'
import type { DashboardResponse } from '../lib/types'

export function DashboardPage() {
  const { business } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')

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
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">{business?.name ?? 'Loading business…'}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            data?.fbrConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          FBR: {data ? (data.fbrConnected ? 'Connected' : 'Not connected yet') : '…'}
        </span>
      </div>

      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(stats ?? [{ label: '…', value: '—' }, { label: '…', value: '—' }, { label: '…', value: '—' }, { label: '…', value: '—' }]).map(
          (s, i) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{data ? s.value : '…'}</p>
              {!data && <p className="text-xs text-slate-300">loading {i}</p>}
            </div>
          ),
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Quick to="/sample-invoice" title="Sample invoice" desc="Preview PDF + PNG with watermark" />
          <Quick to="/scanner" title="Scan an invoice" desc="OCR a document into text" />
          <Quick to="/settings" title="Settings" desc="Business details, logo, invoice prefix" />
        </div>
      </div>
    </div>
  )
}

function Quick({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-slate-200 p-4 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
    >
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  )
}