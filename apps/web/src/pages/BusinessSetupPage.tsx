import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { ApiError, apiFetch, fieldError, firstError } from '../lib/api'
import { AuthLayout, Field, Notice, SubmitButton, inputClass } from '../components/auth-ui'

export function BusinessSetupPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [ntn, setNtn] = useState('')
  const [taxRegistration, setTaxRegistration] = useState('')
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
          ntn: ntn || undefined,
          taxRegistration: taxRegistration || undefined,
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
    <AuthLayout title="Set up your business" subtitle="This information appears on invoices and FBR filings">
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="NTN" error={fieldError(issues, 'ntn')}>
            <input
              className={inputClass()}
              value={ntn}
              onChange={(e) => setNtn(e.target.value)}
              placeholder="1234567-8"
            />
          </Field>
          <Field label="Tax registration no." error={fieldError(issues, 'taxRegistration')}>
            <input
              className={inputClass()}
              value={taxRegistration}
              onChange={(e) => setTaxRegistration(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
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