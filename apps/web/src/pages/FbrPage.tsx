import { useCallback, useEffect, useState } from 'react'
import { apiFetch, firstError } from '../lib/api'
import type {
  FbrRetryResponse,
  FbrStatusResponse,
  FbrSubmissionRecord,
  FbrSubmissionsResponse,
} from '../lib/types'
import { Notice, inputClass } from '../components/auth-ui'

const PROVINCES = [
  'Sindh',
  'Punjab',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit Baltistan',
  'Azad Jammu and Kashmir',
]

export function FbrPage() {
  const [status, setStatus] = useState<FbrStatusResponse | null>(null)
  const [submissions, setSubmissions] = useState<FbrSubmissionRecord[]>([])
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string }>()
  const [busy, setBusy] = useState(false)

  const [sandboxToken, setSandboxToken] = useState('')
  const [productionToken, setProductionToken] = useState('')
  const [province, setProvince] = useState('Sindh')
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')

  const load = useCallback(async () => {
    const [s, subs] = await Promise.all([
      apiFetch<FbrStatusResponse>('/api/fbr/status'),
      apiFetch<FbrSubmissionsResponse>('/api/fbr/submissions'),
    ])
    setStatus(s)
    setSubmissions(subs.submissions)
    setProvince(s.status?.province ?? 'Sindh')
    setEnvironment((s.status?.environment as 'sandbox' | 'production') ?? 'sandbox')
  }, [])

  useEffect(() => {
    load().catch((err) => setNotice({ kind: 'error', text: firstError(err) }))
  }, [load])

  const saveSettings = async () => {
    setBusy(true)
    setNotice(undefined)
    try {
      const res = await apiFetch<{ settings: FbrStatusResponse['status'] }>('/api/fbr/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          environment,
          sandboxToken,
          productionToken,
          province,
        }),
      })
      setSandboxToken('')
      setProductionToken('')
      setStatus((prev) => (prev ? { ...prev, status: res.settings } : prev))
      setNotice({ kind: 'success', text: 'FBR settings saved.' })
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  const runTest = async () => {
    setBusy(true)
    setNotice(undefined)
    try {
      const res = await apiFetch<{ ok: boolean; message: string; payload?: unknown }>('/api/fbr/test', {
        method: 'POST',
      })
      setNotice({ kind: res.ok ? 'success' : 'error', text: res.message })
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  const retry = async (invoiceId: string) => {
    setBusy(true)
    setNotice(undefined)
    try {
      const res = await apiFetch<FbrRetryResponse>(`/api/fbr/retry/${invoiceId}`, { method: 'POST' })
      setNotice({ kind: res.ok ? 'success' : 'error', text: res.message })
      await load()
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
      await load().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const retryAll = async () => {
    setBusy(true)
    setNotice(undefined)
    try {
      const res = await apiFetch<{ results: Array<{ ok: boolean; message: string }> }>('/api/fbr/retry-all', {
        method: 'POST',
      })
      const ok = res.results.filter((r) => r.ok).length
      const fail = res.results.length - ok
      setNotice({
        kind: fail === 0 ? 'success' : 'error',
        text: `Retried ${res.results.length} queued invoice${res.results.length === 1 ? '' : 's'} — ${ok} submitted, ${fail} failed.`,
      })
      await load()
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  const failed = submissions.filter((s) => s.status === 'failed' || s.status === 'pending')

  const badge = (kind: string) => {
    const map: Record<string, string> = {
      submitted:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    }
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[kind] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
        {kind}
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">FBR Digital Invoicing</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Report issued invoices to FBR's DI gateway. Invoice Bank posts to{' '}
            {status?.status?.environment === 'production' ? 'production' : 'sandbox'}.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            status?.status?.hasSandboxToken || status?.status?.hasProductionToken
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
          }`}
        >
          {status ? (status.status?.hasSandboxToken || status.status?.hasProductionToken ? 'Configured' : 'Not configured') : '…'}
        </span>
      </div>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Gateway credentials</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Environment</span>
              <div className="flex gap-2">
                {(['sandbox', 'production'] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      environment === env
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {env === 'sandbox' ? 'Sandbox (test)' : 'Production (live)'}
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Seller province</span>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputClass()}>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Sandbox bearer token{' '}
                <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {status?.status?.hasSandboxToken ? 'saved' : 'not saved'}
                </span>
              </span>
              <input
                type="password"
                value={sandboxToken}
                onChange={(e) => setSandboxToken(e.target.value)}
                placeholder="Paste a new token to replace the saved one (leave blank to keep)"
                className={inputClass()}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Production bearer token{' '}
                <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {status?.status?.hasProductionToken ? 'saved' : 'not saved'}
                </span>
              </span>
              <input
                type="password"
                value={productionToken}
                onChange={(e) => setProductionToken(e.target.value)}
                placeholder="Paste a new token to replace the saved one (leave blank to keep)"
                className={inputClass()}
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveSettings}
                disabled={busy}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save settings
              </button>
              <button
                onClick={runTest}
                disabled={busy}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Preview test payload
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Get your bearer token from the FBR DI portal (sandbox and production are two separate tokens). The seller
            NTN comes from your business profile; the province defaults to Sindh until you change it here.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Connection status</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Business" value={status?.business.name ?? '—'} />
            <Row label="FBR registration (NTN/CNIC)" value={status?.business.ntn ?? 'Not set'} ok={!!status?.business.hasNtn} />
            <Row
              label="Province"
              value={status?.status?.province ?? 'Not set'}
            />
            <Row
              label="Latest submission"
              value={
                status?.lastSubmission
                  ? `${status.lastSubmission.invoiceNumber} — ${status.lastSubmission.status}`
                  : 'None yet'
              }
            />
            <Row
              label="Queued for retry"
              value={status ? String(status.pendingCount ?? 0) : '—'}
              ok={(status?.pendingCount ?? 0) === 0}
            />
          </dl>
          {status?.lastSubmission?.fbrNumber && (
            <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              FBR reference: {status.lastSubmission.fbrNumber}
            </p>
          )}
          {status?.lastSubmission?.errorMessage && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {status.lastSubmission.errorMessage}
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Submissions</h2>
          {failed.length > 0 && (
            <button
              onClick={retryAll}
              disabled={busy}
              className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
            >
              Retry {failed.length} failed
            </button>
          )}
        </div>
        {submissions.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-slate-400 dark:text-slate-500">
            No submissions yet. Issuing an invoice attempts an automatic FBR report.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{s.invoiceNumber}</span>
                    {badge(s.status)}
                    <span className="text-xs text-slate-400">{s.environment}</span>
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleString('en-GB')} {s.fbrNumber ? `· FBR ${s.fbrNumber}` : ''}
                    {s.errorMessage ? `· ${s.errorMessage}` : ''}
                  </p>
                </div>
                {(s.status === 'failed' || s.status === 'pending') && (
                  <button
                    onClick={() => retry(s.invoiceId)}
                    disabled={busy}
                    className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Retry
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, ok = true }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`truncate font-medium ${ok ? 'text-slate-800 dark:text-slate-100' : 'text-amber-600 dark:text-amber-400'}`}>
        {value}
      </dd>
    </div>
  )
}