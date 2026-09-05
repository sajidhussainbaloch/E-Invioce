import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiFetch, fieldError, firstError } from '../lib/api'
import { AuthLayout, Field, Notice, SubmitButton, inputClass } from '../components/auth-ui'

export function BusinessSetupPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [taxpayerType, setTaxpayerType] = useState<'individual' | 'company'>('individual')
  const [ntn, setNtn] = useState('')
  const [salesTaxRegistered, setSalesTaxRegistered] = useState(false)
  const [strn, setStrn] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<Record<string, string[]>>()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIssues(undefined)
    setBusy(true)
    try {
      await apiFetch('/api/business', {
        method: 'POST',
        body: JSON.stringify({
          name,
          taxpayerType,
          ntn: ntn || undefined,
          salesTaxRegistered,
          taxRegistration: strn || undefined,
          address: address || undefined,
          phone: phone || undefined,
          email: email || undefined,
        }),
      })
      await refresh()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setIssues(err.issues)
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Set up your business" subtitle="This information appears on your invoices">
      <form onSubmit={submit} noValidate>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Business name" error={fieldError(issues, 'name')}>
          <input
            className={inputClass(!!fieldError(issues, 'name'))}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ABC Traders"
            required
          />
        </Field>
        <Field label="Taxpayer type">
          <div className="flex gap-2">
            {(
              [
                { value: 'individual', label: 'Individual' },
                { value: 'company', label: 'Company / AOP' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTaxpayerType(opt.value)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  taxpayerType === opt.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="FBR Registration / NTN">
          <input
            className={inputClass()}
            value={ntn}
            onChange={(e) => setNtn(e.target.value)}
            placeholder={taxpayerType === 'individual' ? '13-digit CNIC (e.g. 35202-1234567-8)' : 'Applicable FBR NTN (e.g. 1234567-8)'}
          />
        </Field>
        {taxpayerType === 'individual' && (
          <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
            For an individual, FBR uses your 13-digit CNIC as the registration number. This is not used to connect you
            to FBR — digital invoicing runs through FBR's integration process.
          </p>
        )}
        <Field label="Sales Tax Registered">
          <div className="flex gap-2">
            {(
              [
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ] as const
            ).map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setSalesTaxRegistered(opt.value)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  salesTaxRegistered === opt.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
        {salesTaxRegistered && (
          <Field label="STRN">
            <input
              className={inputClass()}
              value={strn}
              onChange={(e) => setStrn(e.target.value)}
              placeholder="Sales Tax Registration Number (e.g. 1800000000000)"
            />
          </Field>
        )}
        <Field label="Address" error={fieldError(issues, 'address')}>
          <input
            className={inputClass()}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" error={fieldError(issues, 'phone')}>
            <input
              className={inputClass()}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Business email" error={fieldError(issues, 'email')}>
            <input
              type="email"
              className={inputClass()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        <SubmitButton busy={busy}>Save business</SubmitButton>
      </form>
    </AuthLayout>
  )
}