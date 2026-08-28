import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiFetch, fieldError, firstError } from '../lib/api'
import { Field, Notice, inputClass } from '../components/auth-ui'
import { Modal } from '../components/Modal'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { fmtPaisa, paisaToRupees, taxPercent } from '../lib/format'
import type { Product, ProductInput } from '../lib/types'

const EMPTY: ProductInput = { name: '', sku: '', barcode: undefined, unit: 'pcs', price: 0, taxRateBp: 1800 }

export function ProductsPage() {
  const [list, setList] = useState<Product[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<{ editing?: Product } | null>(null)
  const [form, setForm] = useState<ProductInput>(EMPTY)
  const [issues, setIssues] = useState<Record<string, string[]>>()
  const [scanning, setScanning] = useState(false)
  const [scanTarget, setScanTarget] = useState<'search' | 'form'>('search')

  const load = useCallback(async (query = q) => {
    setLoading(true)
    try {
      const res = await apiFetch<{ products: Product[] }>(`/api/products${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      setList(res.products)
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

  const openAdd = (barcode?: string) => {
    setForm({ ...EMPTY, barcode: barcode ?? undefined })
    setIssues(undefined)
    setModal({})
  }
  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? undefined,
      unit: p.unit,
      price: paisaToRupees(p.pricePaisa),
      hsCode: p.hsCode ?? undefined,
      taxRateBp: p.taxRateBp,
    })
    setIssues(undefined)
    setModal({ editing: p })
  }

  const onScanned = async (code: string) => {
    setScanning(false)
    if (scanTarget === 'search') {
      setQ(code)
      void load(code)
      try {
        const res = await apiFetch<{ product: Product }>(`/api/products/by-barcode/${encodeURIComponent(code)}`)
        openEdit(res.product)
      } catch {
        openAdd(code)
      }
      return
    }
    setForm((f) => ({ ...f, barcode: code || undefined }))
  }

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setIssues(undefined)
    try {
      if (modal?.editing) {
        await apiFetch<{ product: Product }>(`/api/products/${modal.editing.id}`, { method: 'PATCH', body: JSON.stringify(form) })
      } else {
        await apiFetch<{ product: Product }>('/api/products', { method: 'POST', body: JSON.stringify(form) })
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

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete product "${p.name}"?`)) return
    setBusy(true)
    try {
      await apiFetch(`/api/products/${p.id}`, { method: 'DELETE' })
      await load(q)
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  const setNum = (field: 'price' | 'taxRateBp', v: string) => {
    const n = Number(v)
    setForm((f) => ({ ...f, [field]: Number.isFinite(n) ? n : 0 }))
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold dark:text-slate-100">Products</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Things you sell — SKU, barcode, unit, tax and HS code ready for FBR.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setScanTarget('search'); setScanning(true) }}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
          >
            Scan barcode
          </button>
          <button onClick={() => openAdd()} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            + Add product
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            void load(e.target.value)
          }}
          placeholder="Search name, SKU, barcode or HS code…"
          className={`${inputClass()} max-w-sm`}
        />
      </div>

      {error && (
        <div className="mt-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <p className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 dark:text-slate-500">No products yet — add your first one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Barcode</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Tax</th>
                <th className="px-4 py-3 font-medium">HS code</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.sku}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{p.barcode ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.unit}</td>
                  <td className="px-4 py-3 font-medium">{fmtPaisa(p.pricePaisa)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{taxPercent(p.taxRateBp)}%</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.hsCode ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="rounded px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" disabled={busy}>
                      Edit
                    </button>
                    <button onClick={() => remove(p)} className="rounded px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" disabled={busy}>
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
        <Modal title={modal.editing ? `Edit ${modal.editing.name}` : 'Add product'} onClose={() => setModal(null)}>
          <form onSubmit={save} noValidate>
            <Field label="Name" error={fieldError(issues, 'name')}>
              <input autoFocus className={inputClass(!!fieldError(issues, 'name'))} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="SKU" error={fieldError(issues, 'sku')}>
                <input className={inputClass(!!fieldError(issues, 'sku'))} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </Field>
              <Field label="Barcode" error={fieldError(issues, 'barcode')}>
                <input
                  className={inputClass(!!fieldError(issues, 'barcode'))}
                  value={form.barcode ?? ''}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Code 128 / EAN / UPC"
                />
              </Field>
              <Field label="Unit">
                <input className={inputClass()} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="HS code">
                <input className={inputClass()} value={form.hsCode ?? ''} onChange={(e) => setForm({ ...form, hsCode: e.target.value })} placeholder="8471.30" />
              </Field>
              <div className="flex items-end pb-0.5">
                <button
                  type="button"
                  onClick={() => { setScanTarget('form'); setScanning(true) }}
                  className="w-full rounded-md border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                >
                  Scan barcode…
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (Rs.)" error={fieldError(issues, 'price')}>
                <input className={inputClass(!!fieldError(issues, 'price'))} type="number" step="0.01" min="0" value={Number.isFinite(form.price) ? form.price : ''} onChange={(e) => setNum('price', e.target.value)} />
              </Field>
              <Field label="Tax rate %" error={fieldError(issues, 'taxRateBp')}>
                <input
                  className={inputClass(!!fieldError(issues, 'taxRateBp'))}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={(form.taxRateBp ?? 1800) / 100}
                  onChange={(e) => setForm((f) => ({ ...f, taxRateBp: Math.max(0, Math.min(10000, Math.round(Number(e.target.value) * 100))) }))}
                />
              </Field>
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Saving…' : modal.editing ? 'Save changes' : 'Add product'}
            </button>
          </form>
        </Modal>
      )}

      {scanning && <BarcodeScanner onClose={() => setScanning(false)} onResult={(code) => void onScanned(code)} />}
    </div>
  )
}