import { useState } from 'react'
import { Notice } from '../components/auth-ui'

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
    setState({ status: 'scanning', progress: 0, label: 'Loading OCR engine…' })
    try {
      const Tesseract = await import('tesseract.js')
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
      setError(
        err instanceof Error
          ? err.message
          : 'OCR failed — the language model download may have failed. Check your connection and try again.',
      )
      setState({ status: 'idle' })
    }
  }

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl('')
    setError('')
    setState({ status: 'idle' })
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold dark:text-slate-100">Invoice Scanner</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        OCR runs locally in your browser via Tesseract.js. The first scan downloads the <code>eng</code> language model
        (a few MB) from the Tesseract CDN and caches it — it is never uploaded anywhere.
      </p>

      {state.status !== 'scanning' && (
        <div className="mt-6 flex flex-wrap gap-3">
          <label className="flex-1 cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/30">
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
            <span className="font-medium text-slate-700 dark:text-slate-200">Choose an invoice image</span>
            <span className="mt-1 block text-sm text-slate-400 dark:text-slate-500">PNG, JPG, WebP — tap here to browse</span>
          </label>
          <label className="flex-1 cursor-pointer rounded-xl border-2 border-solid border-emerald-300 bg-white p-8 text-center transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:hover:bg-emerald-900/30">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void scan(file)
                e.target.value = ''
              }}
            />
            <span className="font-medium text-emerald-700 dark:text-emerald-300">Take a photo</span>
            <span className="mt-1 block text-sm text-slate-400 dark:text-slate-500">Opens the camera on this device</span>
          </label>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Notice kind="error">
            {error}
            {state.status === 'idle' && imageUrl && (
              <button onClick={reset} className="ml-2 underline">Try again</button>
            )}
          </Notice>
        </div>
      )}

      {state.status === 'scanning' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{state.label}</span>
            <span className="font-medium">{Math.round(state.progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${state.progress * 100}%` }} />
          </div>
        </div>
      )}

      {(state.status === 'done') && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            {imageUrl && <img src={imageUrl} alt="Invoice" className="w-full rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900" />}
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
              Extracted text · confidence {Math.round(state.confidence)}%
            </p>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {state.text || '(no text detected)'}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(state.text).catch(() => {})
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Copy to clipboard
              </button>
              <button
                onClick={reset}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Scan another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}