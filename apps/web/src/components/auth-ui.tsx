import type { ReactNode } from 'react'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold dark:text-slate-100">Invoice Bank</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold dark:text-slate-100">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function inputClass(error?: boolean): string {
  return `w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
    error
      ? 'border-red-400 focus:border-red-500'
      : 'border-slate-300 focus:border-emerald-500 dark:border-slate-700 dark:focus:border-emerald-500'
  } bg-white dark:bg-slate-800 dark:text-slate-100`
}

export function SubmitButton({ children, busy, title }: { children: ReactNode; busy?: boolean; title?: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      title={title}
      className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? 'Working…' : children}
    </button>
  )
}

export function Notice({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const cls =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  return <p className={`mb-4 rounded-md border px-3 py-2 text-sm ${cls}`}>{children}</p>
}