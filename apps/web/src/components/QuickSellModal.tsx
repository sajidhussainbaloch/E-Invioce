import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { apiFetch, firstError } from '../lib/api'
import { Field, inputClass } from './auth-ui'
import { Modal } from './Modal'
import { BarcodeScanner } from './BarcodeScanner'
import { fmtPaisa, paisaToRupees } from '../lib/format'
import type { Customer, InvoiceInput, Product, ProductInput } from '../lib/types'

type Line = {
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  taxRateBp: number
}

const newLine = (): Line => ({ description: '', quantity: 1, unitPrice: 0, taxRateBp: 1800 })

export function QuickSellModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [discount, setDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
      } catch (err) {
        setError(firstError(err))
      }
    })()
  }, [])

  const totals = computeTotals(lines, discount)

  const addLineFromProduct = (p: Product, qty = 1) => {
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id)
      if (existing) {
        return ls.map((l) => (l === existing ? { ...l, quantity: l.quantity + qty } : l))
      }
      const blank = ls.findIndex((l) => l.description === '' && l.quantity === 1 && l.unitPrice === 0)
      const line = { productId: p.id, description: p.name, quantity: qty, unitPrice: paisaToRupees(p.pricePaisa), taxRateBp: p.taxRateBp }
      if (blank >= 0) return ls.map((l, i) => (i === blank ? line : l))
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
    if (product) addLineFromProduct(product)
    else setQuickAdd({ barcode: code })
  }

  const createQuickProduct = async (input: { name: string; price: number; taxRateBp: number }) => {
    if (!quickAdd) return
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
      setError(firstError(err))
    }
  }

  const sell = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const body: InvoiceInput = {
      customerId,
      discount,
      items: lines.map((l) => ({
        productId: l.productId || undefined,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRateBp: l.taxRateBp,
      })),
    }
    try {
      const res = await apiFetch<{ invoice: { id: string } }>('/api/invoices', { method: 'POST', body: JSON.stringify(body) })
      await apiFetch(`/api/invoices/${res.invoice.id}/issue`, { method: 'POST' })
      navigate(`/invoices/${res.invoice.id}`, { replace: true })
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  const setLine = (index: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  return (
    <Modal title="Quick sell" onClose={onClose} wide>
      {error && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={sell} className="space-y-4" noValidate>
        <Field label="Customer">
          <select className={inputClass()} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Items</span>
            <button type="button" onClick={() => setScanning(true)} className="rounded-md border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
              Scan barcode
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-12 sm:col-span-4">
                  <select
                    className={`${inputClass()} w-full`}
                    value={l.productId ?? ''}
                    onChange={(e) => {
                      const p = products.find((pr) => pr.id === e.target.value)
                      setLine(i, p ? { productId: p.id, description: p.name, unitPrice: paisaToRupees(p.pricePaisa), taxRateBp: p.taxRateBp } : { productId: undefined, description: '' })
                    }}
                  >
                    <option value="">— custom —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({fmtPaisa(p.pricePaisa)})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <input className={`${inputClass()} w-full`} placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <input className={`${inputClass()} w-full`} type="number" min="1" value={l.quantity} onChange={(e) => setLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} title="Qty" />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <input className={`${inputClass()} w-full`} type="number" step="0.01" min="0" placeholder="0.00" value={Number.isFinite(l.unitPrice) ? l.unitPrice : ''} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })} title="Price" />
                </div>
                <div className="col-span-2 flex items-end justify-end">
                  <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} title="Remove line" className="rounded-md p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              + Add item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount (Rs.)">
            <input className={inputClass()} type="number" step="0.01" min="0" value={Number.isFinite(discount) ? discount : ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
          </Field>
          <div className="flex items-end justify-end text-sm text-slate-600 dark:text-slate-300">
            <div className="w-48 space-y-1">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Total incl. tax</span><span className="font-semibold">{fmtPaisa(totals.total)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !customerId || !lines.some((l) => l.description)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Selling…' : 'Issue invoice now'}
          </button>
        </div>
      </form>

      {scanning && <BarcodeScanner onClose={() => setScanning(false)} onResult={(code) => void onScanned(code)} />}

      {quickAdd && (
        <Modal title={`Add product ${quickAdd.barcode || ''}`} onClose={() => setQuickAdd(null)}>
          <QuickAddForm onSubmit={(v) => void createQuickProduct(v)} onCancel={() => setQuickAdd(null)} />
        </Modal>
      )}
    </Modal>
  )
}

function QuickAddForm({
  onSubmit,
  onCancel,
}: {
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
        This barcode isn't in your catalogue yet. Give it a name and price to add it and sell it now.
      </p>
      <Field label="Name">
        <input autoFocus className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cola 500ml" />
      </Field>
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
        <button type="submit" disabled={!name.trim()} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          Add & sell
        </button>
      </div>
    </form>
  )
}

function computeTotals(lines: Line[], discount: number) {
  const subtotal = lines.reduce((sum, l) => sum + Math.round(l.quantity * Math.round(l.unitPrice * 100)), 0)
  const discountPaisa = Math.round(discount * 100)
  const taxable = Math.max(0, subtotal - discountPaisa)
  const tax = lines.reduce((sum, l) => sum + Math.round((Math.round(l.quantity * Math.round(l.unitPrice * 100)) * l.taxRateBp) / 10000), 0)
  return { subtotal, discount: discountPaisa, taxable, tax, total: taxable + tax }
}