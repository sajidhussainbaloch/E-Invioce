import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { fieldError, firstError } from '../lib/api'
import { ApiError } from '../lib/api'
import { AuthLayout, Field, Notice, SubmitButton, inputClass } from '../components/auth-ui'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<Record<string, string[]>>()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIssues(undefined)
    setBusy(true)
    try {
      await register({ name, email, password })
      navigate('/business-setup', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setIssues(err.issues)
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Free, on your own server">
      <form onSubmit={submit} noValidate>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Full name" error={fieldError(issues, 'name')}>
          <input
            className={inputClass(!!fieldError(issues, 'name'))}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Email" error={fieldError(issues, 'email')}>
          <input
            type="email"
            autoComplete="email"
            className={inputClass(!!fieldError(issues, 'email'))}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" error={fieldError(issues, 'password')}>
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass(!!fieldError(issues, 'password'))}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <p className="-mt-1 mb-3 text-xs text-slate-400">Minimum 8 characters.</p>
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-emerald-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}