import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useAuth } from '../auth/AuthContext'

const SAMPLE_ITEMS = [
  { name: 'Laptop', qty: 2, price: 120000 },
  { name: 'Mouse', qty: 5, price: 2000 },
]

export function SampleInvoicePage() {
  const { business } = useAuth()
  const [watermark, setWatermark] = useState(true)
  const [busy, setBusy] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  const subtotal = SAMPLE_ITEMS.reduce((sum, it) => sum + it.qty * it.price, 0)
  const discount = 10000
  const taxable = subtotal - discount
  const tax = taxable * 0.18
  const total = taxable + tax
  const money = (n: number) => `Rs. ${n.toLocaleString('en-US')}`

  const downloadPdf = async () => {
    setBusy('pdf')
    try {
      const res = await fetch(`/api/sample/invoice.pdf${watermark ? '' : '?watermark=0'}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const blob = await res.blob()
      triggerDownload(blob, 'sample-invoice.pdf')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF download failed')
    } finally {
      setBusy('')
    }
  }

  const downloadPng = async () => {
    if (!previewRef.current) return
    setBusy('png')
    try {
      const dataUrl = await toPng(previewRef.current, { pixelRatio: 2 })
      const blob = await (await fetch(dataUrl)).blob()
      triggerDownload(blob, 'sample-invoice.png')
    } catch {
      alert('PNG export failed')
    } finally {
      setBusy('')
    }
  }

  const biz = business
  const bizLines = [biz?.address ?? '', biz?.phone ? `Phone: ${biz.phone}` : '', biz?.ntn ? `NTN: ${biz.ntn}` : '']
    .filter(Boolean)
    .join('\n')

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sample Invoice</h1>
          <p className="mt-1 text-sm text-slate-500">Shows how your business appears on a real invoice.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            DRAFT watermark
          </label>
          <button
            onClick={downloadPdf}
            disabled={!!busy}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy === 'pdf' ? 'Generating…' : 'Download PDF'}
          </button>
          <button
            onClick={downloadPng}
            disabled={!!busy}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy === 'png' ? 'Rendering…' : 'Download PNG'}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-8 shadow-sm" ref={previewRef}>
        {watermark && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="-rotate-[35deg] text-7xl font-black tracking-widest text-slate-200 opacity-70">
              DRAFT
            </span>
          </div>
        )}

        <div className="mb-6 flex items-start justify-between">
          <div className="flex gap-3">
            {biz?.logoPath ? (
              <img src={biz.logoPath} alt="" className="h-16 w-16 object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border border-dashed border-slate-300 text-xs text-slate-400">
                Logo
              </div>
            )}
            <div>
              <p className="text-lg font-semibold">{biz?.name ?? 'Business Name'}</p>
              <p className="whitespace-pre-line text-xs text-slate-500">{bizLines}</p>
            </div>
          </div>
          <span className="text-xs font-semibold tracking-wide text-amber-500">Invoice Bank</span>
        </div>

        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500">Bill To</p>
            <p className="font-medium">ABC Traders</p>
            <p className="text-xs text-slate-500">NTN: 1234567-8</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">
              Invoice No: <span className="font-medium text-slate-800">INV-000001</span>
            </p>
            <p className="text-xs text-slate-500">
              Date: <span className="font-medium text-slate-800">{new Date().toLocaleDateString('en-GB')}</span>
            </p>
          </div>
        </div>

        <table className="w-full text-sm">
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

        <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
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
          Sample invoice · Invoice Bank demo — FBR reference number and QR code will appear here after FBR integration.
        </p>
      </div>
    </div>
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