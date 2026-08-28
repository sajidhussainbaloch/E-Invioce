import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiFetch, fieldError, firstError } from '../lib/api'
import { Field, Notice, inputClass } from '../components/auth-ui'
import { Modal } from '../components/Modal'
import type { Customer, CustomerInput } from '../lib/types'

const EMPTY: CustomerInput = { name: '' }

export function CustomersPage() {
  const [list, setList] = useState<Customer[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<{ editing?: Customer } | null>(null)
  const [form, setForm] = useState<CustomerInput>(EMPTY)
  const [issues, setIssues] = useState<Record<string, string[]>>()

  const load = useCallback(async (query = q) => {
    setLoading(true)
    try {
      const res = await apiFetch<{ customers: Customer[] }>(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      setList(res.customers)
      setError('')
    } catch (err) {
      setError(firstError(err))
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    void load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = () => {
    setForm(EMPTY)
    setIssues(undefined)
    setModal({})
  }
  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      ntn: c.ntn ?? undefined,
      phone: c.phone ?? undefined,
      email: c.email ?? undefined,
      address: c.address ?? undefined,
      notes: c.notes ?? undefined,
    })
    setIssues(undefined)
    setModal({ editing: c })
  }

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setIssues(undefined)
    try {
      if (modal?.editing) {
        await apiFetch<{ customer: Customer }>(`/api/customers/${modal.editing.id}`, { method: 'PATCH', body: JSON.stringify(form) })
      } else {
        await apiFetch<{ customer: Customer }>('/api/customers', { method: 'POST', body: JSON.stringify(form) })
      }
      setModal(null)
      await load(q)
    } catch (err) {
      if (err instanceof ApiError) setIssues(err.issues)
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c: Customer) => {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return
    setBusy(true)
    try {
      await apiFetch(`/api/customers/${c.id}`, { method: 'DELETE' })
      await load(q)
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">Customers</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">People and companies you invoice.</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Add customer
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          void load(e.target.value)
        }}
        placeholder="Search name, NTN, phone or email…"
        className={`${inputClass()} max-w-sm`}
      />

      {error && (
        <div className="mt-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <p className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 dark:text-slate-500">
            No customers yet{'\u00A0'}— add your first one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">NTN</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.ntn ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="rounded px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" disabled={busy}>
                      Edit
                    </button>
                    <button onClick={() => remove(c)} className="rounded px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" disabled={busy}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.editing ? `Edit ${modal.editing.name}` : 'Add customer'} onClose={() => setModal(null)}>
          <form onSubmit={save} noValidate>
            <Field label="Name" error={fieldError(issues, 'name')}>
              <input autoFocus className={inputClass(!!fieldError(issues, 'name'))} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NTN" error={fieldError(issues, 'ntn')}>
                <input className={inputClass(!!fieldError(issues, 'ntn'))} value={form.ntn ?? ''} onChange={(e) => setForm({ ...form, ntn: e.target.value })} placeholder="1234567-8" />
              </Field>
              <Field label="Phone">
                <input className={inputClass()} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Email" error={fieldError(issues, 'email')}>
              <input type="email" className={inputClass(!!fieldError(issues, 'email'))} value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Address">
              <input className={inputClass()} value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea className={inputClass()} rows={3} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <button type="submit" disabled={busy} className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Saving…' : modal.editing ? 'Save changes' : 'Add customer'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}