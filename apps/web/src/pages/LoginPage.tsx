import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { firstError } from '../lib/api'
import { AuthLayout, Field, Notice, SubmitButton, inputClass } from '../components/auth-ui'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Manage invoices, customers and FBR submissions">
      <form onSubmit={submit} noValidate>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            className={inputClass()}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            className={inputClass()}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/register" className="font-medium text-emerald-600 hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  )
}