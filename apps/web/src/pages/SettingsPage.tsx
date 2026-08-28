import { useEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { toPng } from 'html-to-image'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiFetch, fieldError, firstError } from '../lib/api'
import type { Business, BusinessSettings } from '../lib/types'
import { Field, Notice, inputClass } from '../components/auth-ui'
import { IconDownload } from '../components/icons'

const SAMPLE_ITEMS = [
  { name: 'Laptop', qty: 2, price: 120000 },
  { name: 'Mouse', qty: 5, price: 2000 },
]

type Parties = {
  business: Business | null
  settings: BusinessSettings | null
}

function money(n: number): string {
  return `Rs. ${n >= 1000 ? n.toLocaleString('en-US') : n.toString()}`
}

export function SettingsPage() {
  const { refresh } = useAuth()
  const [p, setP] = useState<Parties>({ business: null, settings: null })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string }>()
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch<Parties>('/api/business')
      .then(setP)
      .catch((err) => setNotice({ kind: 'error', text: firstError(err) }))
  }, [])

  const patch = (fn: (prev: Parties) => Parties) => setP((prev) => (prev ? fn(prev) : prev))

  const saveBusiness = async (e: FormEvent<HTMLFormElement>) => {
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
      await refresh()
      setNotice({ kind: 'success', text: 'Business details saved.' })
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  const saveInvoiceSettings = async () => {
    setBusy(true)
    setNotice(undefined)
    try {
      const { settings } = await apiFetch<{ settings: BusinessSettings }>('/api/business/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          watermarkEnabled: p.settings?.watermarkEnabled,
          watermarkMode: p.settings?.watermarkMode,
          watermarkText: p.settings?.watermarkText,
          invoicePrefix: p.settings?.invoicePrefix,
          fbrEnvironment: p.settings?.fbrEnvironment,
        }),
      })
      patch((prev) => (prev ? { ...prev, settings } : prev))
      await refresh()
      setNotice({ kind: 'success', text: 'Invoice settings saved.' })
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
      patch((prev) => (prev ? { ...prev, business } : prev))
      await refresh()
      setNotice({ kind: 'success', text: 'Logo uploaded. It is used in the invoice header and as a logo watermark.' })
    } catch (err) {
      setNotice({ kind: 'error', text: firstError(err) })
    } finally {
      setBusy(false)
    }
  }

  const downloadPdf = async () => {
    setBusy(true)
    setNotice(undefined)
    try {
      if (p.settings) {
        await apiFetch<{ settings: BusinessSettings }>('/api/business/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            watermarkEnabled: p.settings.watermarkEnabled,
            watermarkMode: p.settings.watermarkMode,
            watermarkText: p.settings.watermarkText,
          }),
        })
      }
      const on = p.settings?.watermarkEnabled !== false
      const res = await fetch(`/api/sample/invoice.pdf${on ? '' : '?watermark=0'}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const blob = await res.blob()
      triggerDownload(blob, 'sample-invoice.pdf')
      setNotice({ kind: 'success', text: 'PDF generated from your saved invoice settings.' })
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'PDF download failed' })
    } finally {
      setBusy(false)
    }
  }

  const downloadPng = async () => {
    if (!previewRef.current) return
    setBusy(true)
    setNotice(undefined)
    try {
      const dataUrl = await toPng(previewRef.current, { pixelRatio: 2 })
      const blob = await (await fetch(dataUrl)).blob()
      triggerDownload(blob, 'sample-invoice.png')
    } catch {
      setNotice({ kind: 'error', text: 'PNG export failed' })
    } finally {
      setBusy(false)
    }
  }

  const biz = p.business
  const setts = p.settings
  const watermarkOn = setts?.watermarkEnabled === true
  const logoWatermark = watermarkOn && setts?.watermarkMode === 'logo'

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-6 text-2xl font-semibold dark:text-slate-100">Settings</h1>
      {notice && (
        <div className="mb-4">
          <Notice kind={notice.kind}>{notice.text}</Notice>
        </div>
      )}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold dark:text-slate-100">Business details</h2>
        {!biz ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : (
          <form onSubmit={saveBusiness} noValidate>
            <Field label="Business name">
              <input
                className={inputClass()}
                value={biz.name}
                onChange={(e) => patch((prev) => ({ ...prev, business: { ...prev.business!, name: e.target.value } }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NTN">
                <input
                  className={inputClass()}
                  value={biz.ntn ?? ''}
                  onChange={(e) => patch((prev) => ({ ...prev, business: { ...prev.business!, ntn: e.target.value } }))}
                />
              </Field>
              <Field label="Tax registration no.">
                <input
                  className={inputClass()}
                  value={biz.taxRegistration ?? ''}
                  onChange={(e) =>
                    patch((prev) => ({ ...prev, business: { ...prev.business!, taxRegistration: e.target.value } }))
                  }
                />
              </Field>
            </div>
            <Field label="Address">
              <input
                className={inputClass()}
                value={biz.address ?? ''}
                onChange={(e) => patch((prev) => ({ ...prev, business: { ...prev.business!, address: e.target.value } }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  className={inputClass()}
                  value={biz.phone ?? ''}
                  onChange={(e) => patch((prev) => ({ ...prev, business: { ...prev.business!, phone: e.target.value } }))}
                />
              </Field>
              <Field label="Business email">
                <input
                  type="email"
                  className={inputClass()}
                  value={biz.email ?? ''}
                  onChange={(e) => patch((prev) => ({ ...prev, business: { ...prev.business!, email: e.target.value } }))}
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

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold dark:text-slate-100">Business logo</h2>
        <div className="flex items-center gap-4">
          {biz?.logoPath ? (
            <img src={biz.logoPath} alt="Logo" className="h-16 w-16 rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
              No logo
            </div>
          )}
          <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
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
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Appears in the invoice header and can be used as a watermark image.
        </p>
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold dark:text-slate-100">Invoice settings</h2>
        {!setts ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Watermark on PDFs</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Overlay a draft notice or your logo on generated PDFs.</p>
              </div>
              <input
                type="checkbox"
                checked={watermarkOn}
                onChange={(e) => patch((prev) => ({ ...prev, settings: { ...prev.settings!, watermarkEnabled: e.target.checked } }))}
                className="h-5 w-5 accent-emerald-600"
              />
            </div>

            {watermarkOn && (
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Watermark style</p>
                <div className="mb-3 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="wmMode"
                      checked={setts.watermarkMode === 'text'}
                      onChange={() => patch((prev) => ({ ...prev, settings: { ...prev.settings!, watermarkMode: 'text' as const } }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Text
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name="wmMode"
                      checked={setts.watermarkMode === 'logo'}
                      onChange={() => patch((prev) => ({ ...prev, settings: { ...prev.settings!, watermarkMode: 'logo' as const } }))}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Logo{!biz?.logoPath && <span className="text-xs text-amber-500"> (upload a logo first)</span>}
                  </label>
                </div>

                {setts.watermarkMode === 'text' && (
                  <Field label="Watermark text">
                    <input
                      className={inputClass()}
                      maxLength={40}
                      value={setts.watermarkText}
                      onChange={(e) => patch((prev) => ({ ...prev, settings: { ...prev.settings!, watermarkText: e.target.value } }))}
                      placeholder="DRAFT"
                    />
                  </Field>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice prefix">
                <input
                  className={inputClass()}
                  value={setts.invoicePrefix}
                  onChange={(e) => patch((prev) => ({ ...prev, settings: { ...prev.settings!, invoicePrefix: e.target.value } }))}
                />
              </Field>
              <Field label="FBR environment">
                <select
                  className={inputClass()}
                  value={setts.fbrEnvironment}
                  onChange={(e) => patch((prev) => ({ ...prev, settings: { ...prev.settings!, fbrEnvironment: e.target.value } }))}
                >
                  <option value="sandbox">Sandbox (Integration)</option>
                  <option value="production">Production</option>
                </select>
              </Field>
            </div>

            <button
              onClick={saveInvoiceSettings}
              disabled={busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save invoice settings'}
            </button>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold dark:text-slate-100">Sample invoice preview</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Live preview of your invoice. PDF uses the settings above — it is saved first, then downloaded.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadPng}
              disabled={busy}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              PNG
            </button>
            <button
              onClick={downloadPdf}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <IconDownload className="h-4 w-4" />
              {busy ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>

        <InvoicePreview business={biz} settings={setts} watermarkOn={watermarkOn} logoWatermark={logoWatermark} ref={previewRef} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold dark:text-slate-100">Change password</h2>
        <ChangePassword />
      </section>
    </div>
  )
}

const InvoicePreview = ({
  business,
  settings,
  watermarkOn,
  logoWatermark,
  ref,
}: {
  business: Business | null
  settings: BusinessSettings | null
  watermarkOn: boolean
  logoWatermark: boolean
  ref: RefObject<HTMLDivElement | null>
}) => {
  const subtitle = [business?.address ?? '', business?.phone ? `Phone: ${business.phone}` : '', business?.ntn ? `NTN: ${business.ntn}` : '']
    .filter(Boolean)
    .join('\n')

  const subtotal = SAMPLE_ITEMS.reduce((sum, it) => sum + it.qty * it.price, 0)
  const discount = 10000
  const taxable = subtotal - discount
  const tax = taxable * 0.18
  const total = taxable + tax

  return (
    <div ref={ref} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-white">
      {watermarkOn && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          {logoWatermark ? (
            business?.logoPath ? (
              <img src={business.logoPath} alt="watermark" className="w-40 -rotate-[20deg] opacity-40" />
            ) : null
          ) : (
            <span className="-rotate-35 text-7xl font-black tracking-widest text-slate-200 opacity-70">
              {settings?.watermarkText?.trim() || 'DRAFT'}
            </span>
          )}
        </div>
      )}

      <div className="mb-6 flex items-start justify-between">
        <div className="flex gap-3">
          {business?.logoPath ? (
            <img src={business.logoPath} alt="" className="h-16 w-16 object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center border border-dashed border-slate-300 text-xs text-slate-400">
              Logo
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-slate-900">{business?.name ?? 'Business Name'}</p>
            <p className="whitespace-pre-line text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-semibold tracking-wide text-amber-500">Invoice Bank</span>
      </div>

      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500">Bill To</p>
          <p className="font-medium text-slate-900">ABC Traders</p>
          <p className="text-xs text-slate-500">NTN: 1234567-8</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">
            Invoice No: <span className="font-medium text-slate-800">{settings?.invoicePrefix || 'INV'}-000001</span>
          </p>
          <p className="text-xs text-slate-500">
            Date: <span className="font-medium text-slate-800">{new Date().toLocaleDateString('en-GB')}</span>
          </p>
        </div>
      </div>

      <table className="w-full text-sm text-slate-900">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
            <th className="pb-1.5 font-medium">Description</th>
            <th className="pb-1.5 text-right font-medium">Qty</th>
            <th className="pb-1.5 text-right font-medium">Unit Price</th>
            <th className="pb-1.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_ITEMS.map((it) => (
            <tr key={it.name} className="border-b border-slate-100">
              <td className="py-2">{it.name}</td>
              <td className="py-2 text-right">{it.qty}</td>
              <td className="py-2 text-right">{money(it.price)}</td>
              <td className="py-2 text-right">{money(it.qty * it.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64 space-y-1 text-sm text-slate-700">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Discount</span>
          <span>- {money(discount)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Taxable Amount</span>
          <span>{money(taxable)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Sales Tax (18%)</span>
          <span>{money(tax)}</span>
        </div>
        <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 font-semibold">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Sample invoice · FBR reference number and QR code will appear here after FBR integration.
      </p>
    </div>
  )
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string }>()
  const [issues, setIssues] = useState<Record<string, string[]>>()

  const submit = async (e: FormEvent<HTMLFormElement>) => {
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
      {notice && (
        <div className="mb-4">
          <Notice kind={notice.kind}>{notice.text}</Notice>
        </div>
      )}
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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}