import { useCallback, useEffect, useState } from 'react'
import { apiFetch, firstError } from '../lib/api'
import { Notice, inputClass } from '../components/auth-ui'
import { fmtPaisa } from '../lib/format'
import type { ReportsSalesResponse } from '../lib/types'
import { IconDownload } from '../components/icons'

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function ReportsPage() {
  const [from, setFrom] = useState(isoDaysAgo(30))
  const [to, setTo] = useState(isoDaysAgo(0))
  const [data, setData] = useState<ReportsSalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (f) params.set('from', f)
      if (t) params.set('to', t)
      const res = await apiFetch<ReportsSalesResponse>(`/api/reports/sales${params.toString() ? `?${params}` : ''}`)
      setData(res)
    } catch (err) {
      setError(firstError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(from, to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportCsv = () => {
    const rows = data?.rows ?? []
    const header = ['Invoice', 'Date', 'Customer', 'Total (Rs)', 'Tax (Rs)', 'FBR status', 'FBR number']
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [csvCell(r.number), csvCell(r.issueDate?.slice(0, 10)), csvCell(r.customerName), r.totalPaisa / 100, r.taxPaisa / 100, csvCell(r.fbrStatus), csvCell(r.fbrNumber)].join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-bank-report-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">Sales reports</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Issued invoices for a date range.</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data || data.rows.length === 0}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconDownload className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              void load(e.target.value, to)
            }}
            className={inputClass()}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              void load(from, e.target.value)
            }}
            className={inputClass()}
          />
        </label>
        {(data?.rows.length ?? 0) > 0 && (
          <button
            onClick={() => {
              setFrom(isoDaysAgo(7))
              setTo(isoDaysAgo(0))
              void load(isoDaysAgo(7), isoDaysAgo(0))
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Last 7 days
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      {!data || loading ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Invoices', value: data.summary.count.toLocaleString() },
              { label: 'Revenue (incl. tax)', value: fmtPaisa(data.summary.revenuePaisa) },
              { label: 'Sales tax', value: fmtPaisa(data.summary.taxPaisa) },
              { label: 'Discounts', value: fmtPaisa(data.summary.discountPaisa) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold dark:text-slate-100">{s.value}</p>
              </div>
            ))}
          </div>

          {data.byItem.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <h2 className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Top items</h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...data.byItem]
                  .sort((a, b) => b.amountPaisa - a.amountPaisa)
                  .slice(0, 10)
                  .map((it) => (
                    <li key={it.description} className="flex items-center justify-between px-6 py-3 text-sm">
                      <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{it.description}</span>
                      <span className="flex items-center gap-6">
                        <span className="text-slate-500 dark:text-slate-400">{it.quantity} pcs</span>
                        <span className="font-medium">{fmtPaisa(it.amountPaisa)}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <h2 className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Invoices ({data.rows.length})</h2>
            {data.rows.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-slate-400 dark:text-slate-500">No issued invoices in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase text-slate-400 dark:border-slate-800">
                      <th className="px-6 py-2 font-medium">Invoice</th>
                      <th className="px-6 py-2 font-medium">Date</th>
                      <th className="px-6 py-2 font-medium">Customer</th>
                      <th className="px-6 py-2 font-medium text-right">Tax</th>
                      <th className="px-6 py-2 font-medium text-right">Total</th>
                      <th className="px-6 py-2 font-medium">FBR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.rows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-2.5 font-medium text-emerald-600 dark:text-emerald-400">{r.number ?? '—'}</td>
                        <td className="px-6 py-2.5 text-slate-500 dark:text-slate-400">{r.issueDate?.slice(0, 10)}</td>
                        <td className="px-6 py-2.5 text-slate-700 dark:text-slate-300">{r.customerName}</td>
                        <td className="px-6 py-2.5 text-right">{fmtPaisa(r.taxPaisa)}</td>
                        <td className="px-6 py-2.5 text-right font-semibold">{fmtPaisa(r.totalPaisa)}</td>
                        <td className="px-6 py-2.5">
                          {r.fbrStatus === 'submitted' && r.fbrNumber ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                              {r.fbrNumber}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {r.fbrStatus ?? '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}