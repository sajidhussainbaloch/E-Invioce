import { useState } from 'react'
import Tesseract from 'tesseract.js'

type ScanState =
  | { status: 'idle' }
  | { status: 'scanning'; progress: number; label: string }
  | { status: 'done'; text: string; confidence: number }

export function InvoiceScannerPage() {
  const [imageUrl, setImageUrl] = useState('')
  const [state, setState] = useState<ScanState>({ status: 'idle' })
  const [error, setError] = useState('')

  const scan = async (file: File) => {
    setError('')
    setImageUrl(URL.createObjectURL(file))
    setState({ status: 'scanning', progress: 0, label: 'Starting…' })
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setState((prev) =>
              prev.status === 'scanning' ? { status: 'scanning', progress: m.progress, label: 'Reading text…' } : prev,
            )
          }
        },
      })
      setState({ status: 'done', text: result.data.text.trim(), confidence: result.data.confidence })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed')
      setState({ status: 'idle' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold">Invoice Scanner</h1>
      <p className="mt-1 text-sm text-slate-500">
        OCR runs locally in your browser via Tesseract.js. The first scan downloads the <code>eng</code> language model
        (a few MB) from the Tesseract CDN.
      </p>

      <label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void scan(file)
            e.target.value = ''
          }}
        />
        <span className="font-medium text-slate-700">{state.status === 'scanning' ? 'Scanning…' : 'Choose an invoice image'}</span>
        <span className="mt-1 block text-sm text-slate-400">PNG, JPG, WebP — drag onto this box or tap to browse</span>
      </label>

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {state.status === 'scanning' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600">{state.label}</span>
            <span className="font-medium">{Math.round(state.progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${state.progress * 100}%` }} />
          </div>
        </div>
      )}

      {(state.status === 'done') && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            {imageUrl && <img src={imageUrl} alt="Invoice" className="w-full rounded-xl border border-slate-200 bg-white p-2" />}
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-500">
              Extracted text · confidence {Math.round(state.confidence)}%
            </p>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              {state.text || '(no text detected)'}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(state.text).catch(() => {})
              }}
              className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Copy to clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}