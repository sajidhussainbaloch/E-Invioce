import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { apiFetch, firstError } from '../lib/api'
import { Notice } from '../components/auth-ui'
import { fmtPaisa, taxPercent } from '../lib/format'
import { downloadFile } from '../lib/download'
import type { InvoiceDetail } from '../lib/types'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<InvoiceDetail>(`/api/invoices/${id}`))
      setError('')
    } catch (err) {
      setError(firstError(err))
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const issue = async () => {
    setBusy(true)
    setError('')
    try {
      await apiFetch(`/api/invoices/${id}/issue`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!data || !window.confirm(`Delete this draft invoice?`)) return
    setBusy(true)
    try {
      await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' })
      navigate('/invoices')
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  const downloadPdf = async () => {
    setError('')
    try {
      await downloadFile(`/api/invoices/${id}/pdf`)
    } catch (err) {
      setError(firstError(err))
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        {error ? <Notice kind="error">{error}</Notice> : <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>}
      </div>
    )
  }

  const { invoice, customer, items } = data
  const draft = invoice.status === 'draft'

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">{invoice.number ?? 'Unnumbered draft'}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {customer?.name ?? 'Customer'} ·{' '}
            {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB') : `Saved ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            draft
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
          }`}
        >
          {draft ? 'Draft' : 'Issued'}
        </span>
      </div>

      {error && (
        <div className="mb-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Unit price</th>
              <th className="px-4 py-3 text-right font-medium">Tax</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{it.description}</td>
                <td className="px-4 py-3 text-right">{it.quantity}</td>
                <td className="px-4 py-3 text-right">{fmtPaisa(it.unitPricePaisa)}</td>
                <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{taxPercent(it.taxRateBp)}%</td>
                <td className="px-4 py-3 text-right font-medium">{fmtPaisa(it.amountPaisa)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-56 space-y-1 p-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Subtotal</span><span>{fmtPaisa(invoice.subtotalPaisa)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Discount</span><span>- {fmtPaisa(invoice.discountPaisa)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Taxable</span><span>{fmtPaisa(invoice.taxablePaisa)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Tax</span><span>{fmtPaisa(invoice.taxPaisa)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold dark:border-slate-700">
            <span>Total</span><span>{fmtPaisa(invoice.totalPaisa)}</span>
          </div>
        </div>

        {invoice.notes && <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">{invoice.notes}</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {draft ? (
          <>
            <Link to={`/invoices/${invoice.id}/edit`} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Edit draft
            </Link>
            <button onClick={issue} disabled={busy} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Issuing…' : 'Issue invoice'}
            </button>
            <button onClick={remove} disabled={busy} className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-900/30">
              Delete draft
            </button>
          </>
        ) : (
          <button onClick={downloadPdf} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Download PDF
          </button>
        )}
      </div>
    </div>
  )
}