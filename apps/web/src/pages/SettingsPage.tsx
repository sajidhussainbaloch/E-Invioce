import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiFetch, fieldError, firstError } from '../lib/api'
import type { Business, BusinessSettings } from '../lib/types'
import { Field, Notice, inputClass } from '../components/auth-ui'

type Parties = {
  business: Business | null
  settings: BusinessSettings | null
}

export function SettingsPage() {
  const { refresh } = useAuth()
  const [p, setP] = useState<Parties>({ business: null, settings: null })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string }>()

  useEffect(() => {
    apiFetch<Parties>('/api/business')
      .then(setP)
      .catch((err) => setNotice({ kind: 'error', text: firstError(err) }))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setNotice(undefined)
    try {
      await apiFetch<{ business: Business }>('/api/business', {
        method: 'PATCH',
        body: JSON.stringify({
          name: p.business?.name,
          ntn: p.business?.ntn ?? undefined,
          taxRegistration: p.business?.taxRegistration ?? undefined,
          address: p.business?.address ?? undefined,
          phone: p.business?.phone ?? undefined,
          email: p.business?.email ?? undefined,
        }),
      })
      setNotice({ kind: 'success', text: 'Business details saved.' })
      await refresh()
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = async () => {
    setBusy(true)
    setNotice(undefined)
    try {
      const { settings } = await apiFetch<{ settings: BusinessSettings }>('/api/business/settings', {
        method: 'PATCH',
        body: JSON.stringify(p.settings),
      })
      setP((prev) => (prev ? { ...prev, settings } : prev))
      setNotice({ kind: 'success', text: 'Settings saved.' })
      await refresh()
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  const uploadLogo = async (file: File) => {
    setBusy(true)
    setNotice(undefined)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const { business } = await apiFetch<{ business: Business }>('/api/business/logo', { method: 'POST', body: fd })
      setP((prev) => (prev ? { ...prev, business } : prev))
      setNotice({ kind: 'success', text: 'Logo updated.' })
      await refresh()
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Business details</h2>
        {!p.business ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <form onSubmit={save} noValidate>
            <Field label="Business name">
              <input
                className={inputClass()}
                value={p.business.name}
                onChange={(e) => setP((prev) => (prev ? { ...prev, business: { ...prev.business!, name: e.target.value } } : prev))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NTN">
                <input
                  className={inputClass()}
                  value={p.business.ntn ?? ''}
                  onChange={(e) => setP((prev) => (prev ? { ...prev, business: { ...prev.business!, ntn: e.target.value } } : prev))}
                />
              </Field>
              <Field label="Tax registration no.">
                <input
                  className={inputClass()}
                  value={p.business.taxRegistration ?? ''}
                  onChange={(e) => setP((prev) => (prev ? { ...prev, business: { ...prev.business!, taxRegistration: e.target.value } } : prev))}
                />
              </Field>
            </div>
            <Field label="Address">
              <input
                className={inputClass()}
                value={p.business.address ?? ''}
                onChange={(e) => setP((prev) => (prev ? { ...prev, business: { ...prev.business!, address: e.target.value } } : prev))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  className={inputClass()}
                  value={p.business.phone ?? ''}
                  onChange={(e) => setP((prev) => (prev ? { ...prev, business: { ...prev.business!, phone: e.target.value } } : prev))}
                />
              </Field>
              <Field label="Business email">
                <input
                  type="email"
                  className={inputClass()}
                  value={p.business.email ?? ''}
                  onChange={(e) => setP((prev) => (prev ? { ...prev, business: { ...prev.business!, email: e.target.value } } : prev))}
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save details'}
            </button>
          </form>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Invoice settings</h2>
        {!p.settings ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-slate-700">Watermark on PDFs</span>
                <span className="text-xs text-slate-400">Adds a DRAFT overlay to generated PDFs.</span>
              </span>
              <input
                type="checkbox"
                checked={p.settings.watermarkEnabled}
                onChange={(e) =>
                  setP((prev) => (prev ? { ...prev, settings: { ...prev.settings!, watermarkEnabled: e.target.checked } } : prev))
                }
                className="h-5 w-5 accent-emerald-600"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice prefix">
                <input
                  className={inputClass()}
                  value={p.settings.invoicePrefix}
                  onChange={(e) =>
                    setP((prev) => (prev ? { ...prev, settings: { ...prev.settings!, invoicePrefix: e.target.value } } : prev))
                  }
                />
              </Field>
              <Field label="FBR environment">
                <select
                  className={inputClass()}
                  value={p.settings.fbrEnvironment}
                  onChange={(e) =>
                    setP((prev) => (prev ? { ...prev, settings: { ...prev.settings!, fbrEnvironment: e.target.value } } : prev))
                  }
                >
                  <option value="sandbox">Sandbox (Integration)</option>
                  <option value="production">Production</option>
                </select>
              </Field>
            </div>
            <button
              onClick={saveSettings}
              disabled={busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save invoice settings'}
            </button>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Business logo</h2>
        <div className="flex items-center gap-4">
          {p.business?.logoPath ? (
            <img src={p.business.logoPath} alt="Logo" className="h-16 w-16 rounded-lg border border-slate-200 object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
              No logo
            </div>
          )}
          <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Upload logo (PNG, JPEG or WebP, up to 2 MB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  await uploadLogo(file)
                  e.target.value = ''
                }
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Change password</h2>
        <ChangePassword />
      </section>
    </div>
  )
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string }>()
  const [issues, setIssues] = useState<Record<string, string[]>>()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setNotice(undefined)
    setIssues(undefined)
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setNotice({ kind: 'success', text: 'Password changed. You are still signed in.' })
    } catch (err) {
      if (err instanceof ApiError) setIssues(err.issues)
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current password" error={fieldError(issues, 'currentPassword')}>
          <input
            type="password"
            autoComplete="current-password"
            className={inputClass(!!fieldError(issues, 'currentPassword'))}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="New password" error={fieldError(issues, 'newPassword')}>
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass(!!fieldError(issues, 'newPassword'))}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}