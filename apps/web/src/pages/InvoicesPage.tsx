import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { apiFetch, firstError } from '../lib/api'
import { Notice, inputClass } from '../components/auth-ui'
import { QuickSellModal } from '../components/QuickSellModal'
import { fmtPaisa } from '../lib/format'
import type { InvoiceListItem } from '../lib/types'

export function InvoicesPage() {
  const navigate = useNavigate()
  const [list, setList] = useState<InvoiceListItem[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quickSell, setQuickSell] = useState(false)

  const load = useCallback(async (query = q, filter = status) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (filter) params.set('status', filter)
      const res = await apiFetch<{ invoices: InvoiceListItem[] }>(`/api/invoices${params.toString() ? `?${params}` : ''}`)
      setList(res.invoices)
      setError('')
    } catch (err) {
      setError(firstError(err))
    } finally {
      setLoading(false)
    }
  }, [q, status])

  useEffect(() => {
    void load('', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create drafts, issue them, and download PDFs.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setQuickSell(true)} className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
            Quick sell
          </button>
          <button onClick={() => navigate('/invoices/new')} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            + New invoice
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            void load(e.target.value, status)
          }}
          placeholder="Search customer or invoice number…"
          className={`${inputClass()} max-w-sm`}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); void load(q, e.target.value) }} className={`${inputClass()} w-40`}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <p className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 dark:text-slate-500">No invoices found — create your first one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => (
                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">{inv.number ?? 'DRAFT'}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{inv.customerName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {(inv.issueDate ?? inv.createdAt) ? new Date(inv.issueDate ?? inv.createdAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        inv.status === 'issued'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}
                    >
                      {inv.status === 'issued' ? 'Issued' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmtPaisa(inv.totalPaisa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 text-sm text-slate-400 dark:text-slate-500">
        <Link to="/invoices/new" className="text-emerald-600 hover:underline dark:text-emerald-400">Create a new invoice →</Link>
      </div>

      {quickSell && <QuickSellModal onClose={() => setQuickSell(false)} />}
    </div>
  )
}