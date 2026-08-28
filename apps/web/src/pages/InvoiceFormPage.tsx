import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError, apiFetch, fieldError, firstError } from '../lib/api'
import { Field, Notice, inputClass } from '../components/auth-ui'
import { Modal } from '../components/Modal'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { fmtPaisa, paisaToRupees, taxPercent } from '../lib/format'
import type { Customer, InvoiceDetail, InvoiceInput, Product, ProductInput } from '../lib/types'

type Line = {
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  taxRateBp: number
}

const newLine = (): Line => ({ description: '', quantity: 1, unitPrice: 0, taxRateBp: 1800 })

export function InvoiceFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = id !== undefined && id !== 'new'

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<Record<string, string[]>>()
  const [scanning, setScanning] = useState(false)
  const [quickAdd, setQuickAdd] = useState<{ barcode: string } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [{ customers }, { products }] = await Promise.all([
          apiFetch<{ customers: Customer[] }>('/api/customers'),
          apiFetch<{ products: Product[] }>('/api/products'),
        ])
        setCustomers(customers)
        setProducts(products)
        if (editing) {
          const d = await apiFetch<InvoiceDetail>(`/api/invoices/${id}`)
          if (d.invoice.status !== 'draft') {
            setError('Issued invoices cannot be edited')
            return
          }
          setCustomerId(d.invoice.customerId)
          setDiscount(paisaToRupees(d.invoice.discountPaisa))
          setNotes(d.invoice.notes ?? '')
          setLines(
            d.items.map((it) => ({
              productId: it.productId ?? undefined,
              description: it.description,
              quantity: it.quantity,
              unitPrice: paisaToRupees(it.unitPricePaisa),
              taxRateBp: it.taxRateBp,
            })),
          )
        }
      } catch (err) {
        setError(firstError(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [editing, id])

  const totals = computePreview(lines, discount)

  const onProductChange = (index: number, productId: string) => {
    const p = products.find((pr) => pr.id === productId)
    setLines((ls) =>
      ls.map((l, i) =>
        i === index
          ? {
              productId,
              description: p?.name ?? ls[i].description,
              unitPrice: p ? paisaToRupees(p.pricePaisa) : ls[i].unitPrice,
              taxRateBp: p?.taxRateBp ?? ls[i].taxRateBp,
              quantity: ls[i].quantity,
            }
          : l,
      ),
    )
  }

  const setLine = (index: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const addLineFromProduct = (p: Product, qty = 1) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id)
      if (existing) {
        return ls.map((l) => (l === existing ? { ...l, quantity: l.quantity + qty } : l))
      }
      const blank = ls.findIndex((l) => l.description === '' && l.quantity === 1 && l.unitPrice === 0)
      const line = { productId: p.id, description: p.name, quantity: qty, unitPrice: paisaToRupees(p.pricePaisa), taxRateBp: p.taxRateBp }
      if (blank >= 0) {
        return ls.map((l, i) => (i === blank ? line : l))
      }
      return [...ls, line]
    })
  }

  const onScanned = async (code: string) => {
    setScanning(false)
    let product: Product | undefined = products.find((p) => p.barcode === code)
    if (!product) {
      try {
        const res = await apiFetch<{ product: Product }>(`/api/products/by-barcode/${encodeURIComponent(code)}`)
        product = res.product
      } catch {
        product = undefined
      }
    }
    if (product) {
      addLineFromProduct(product)
    } else {
      setQuickAdd({ barcode: code })
    }
  }

  const createQuickProduct = async (input: { name: string; price: number; taxRateBp: number }) => {
    if (!quickAdd) return
    setBusy(true)
    setError('')
    try {
      const body: ProductInput = {
        name: input.name,
        sku: quickAdd.barcode || input.name,
        barcode: quickAdd.barcode,
        unit: 'pcs',
        price: input.price,
        taxRateBp: input.taxRateBp,
      }
      const res = await apiFetch<{ product: Product }>('/api/products', { method: 'POST', body: JSON.stringify(body) })
      setProducts((ps) => [res.product, ...ps])
      addLineFromProduct(res.product)
      setQuickAdd(null)
    } catch (err) {
      if (err instanceof ApiError) setIssues(err.issues)
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setIssues(undefined)
    const body: InvoiceInput = {
      customerId,
      discount,
      notes: notes || undefined,
      items: lines.map((l) => ({
        productId: l.productId || undefined,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRateBp: l.taxRateBp,
      })),
    }
    try {
      const res = editing
        ? await apiFetch<{ invoice: { id: string } }>(`/api/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch<{ invoice: { id: string } }>('/api/invoices', { method: 'POST', body: JSON.stringify(body) })
      navigate(`/invoices/${res.invoice.id}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setIssues(err.issues)
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-8 py-8"><p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p></div>

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold dark:text-slate-100">{editing ? 'Edit draft invoice' : 'New invoice'}</h1>

      {error && (
        <div className="mt-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <form onSubmit={save} noValidate className="mt-6 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <Field label="Customer" error={fieldError(issues, 'customerId')}>
            <select className={inputClass(!!fieldError(issues, 'customerId'))} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          {customers.length === 0 && (
            <p className="text-xs text-amber-500">Add a customer first — none exist yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Items</h2>
          {fieldError(issues, 'items') && (
            <p className="mb-2 text-xs text-red-600">{fieldError(issues, 'items')}</p>
          )}
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-12 sm:col-span-5">
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Product</label>
                  <select
                    className={`${inputClass()} w-full`}
                    value={l.productId ?? ''}
                    onChange={(e) => onProductChange(i, e.target.value)}
                  >
                    <option value="">— custom —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({fmtPaisa(p.pricePaisa)})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 sm:col-span-5">
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Description</label>
                  <input className={inputClass()} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Qty</label>
                  <input className={inputClass()} type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Price</label>
                  <input className={inputClass()} type="number" step="0.01" min="0" value={Number.isFinite(l.unitPrice) ? l.unitPrice : ''} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })} />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Tax %</label>
                  <input className={inputClass()} type="number" step="0.01" min="0" max="100" value={taxPercent(l.taxRateBp)} onChange={(e) => setLine(i, { taxRateBp: Math.round(Number(e.target.value) * 100) })} />
                </div>
                <div className="col-span-2 flex items-end justify-end">
                  <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} title="Remove line" className="rounded-md p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, newLine()])}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              + Add item
            </button>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="rounded-md border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
            >
              Scan barcode…
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount (Rs.)">
              <input className={inputClass()} type="number" step="0.01" min="0" value={Number.isFinite(discount) ? discount : ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Notes">
              <input className={inputClass()} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          <div className="mt-4 ml-auto w-56 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Subtotal</span><span>{fmtPaisa(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Discount</span><span>- {fmtPaisa(totals.discount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Tax</span><span>{fmtPaisa(totals.tax)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold dark:border-slate-700">
              <span>Total</span><span>{fmtPaisa(totals.total)}</span>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}
          </button>
        </div>
      </form>

      {scanning && <BarcodeScanner onClose={() => setScanning(false)} onResult={(code) => void onScanned(code)} />}

      {quickAdd && (
        <Modal title={`Add product ${quickAdd.barcode || ''}`} onClose={() => setQuickAdd(null)}>
          <QuickAddForm busy={busy} onSubmit={(v) => void createQuickProduct(v)} onCancel={() => setQuickAdd(null)} />
        </Modal>
      )}
    </div>
  )
}

function QuickAddForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  onSubmit: (v: { name: string; price: number; taxRateBp: number }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [taxRateBp, setTaxRateBp] = useState(1800)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSubmit({ name: name.trim(), price, taxRateBp })
      }}
      className="space-y-4"
      noValidate
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        This barcode is not in your catalogue yet. Give the product a name and price to add it and put it on this invoice.
      </p>
      <div>
        <Field label="Name">
          <input autoFocus className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cola 500ml" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (Rs.)">
          <input className={inputClass()} type="number" step="0.01" min="0" value={Number.isFinite(price) ? price : ''} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Tax rate %">
          <input className={inputClass()} type="number" step="0.01" min="0" max="100" value={taxRateBp / 100} onChange={(e) => setTaxRateBp(Math.round(Number(e.target.value) * 100))} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button type="submit" disabled={busy || !name.trim()} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {busy ? 'Adding…' : 'Add & put on invoice'}
        </button>
      </div>
    </form>
  )
}

function computePreview(lines: Line[], discount: number) {
  const subtotal = lines.reduce((sum, l) => sum + Math.round(l.quantity * Math.round(l.unitPrice * 100)), 0)
  const discountPaisa = Math.round(discount * 100)
  const taxable = Math.max(0, subtotal - discountPaisa)
  const tax = lines.reduce((sum, l) => sum + Math.round((Math.round(l.quantity * Math.round(l.unitPrice * 100)) * l.taxRateBp) / 10000), 0)
  return { subtotal, discount: discountPaisa, taxable, tax, total: taxable + tax }
}