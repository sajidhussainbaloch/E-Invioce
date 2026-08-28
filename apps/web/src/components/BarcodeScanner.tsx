import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from './Modal'
import { Notice, inputClass } from './auth-ui'

type Props = {
  onResult: (code: string) => void
  onClose: () => void
}

const WASM_URL = '/vendor/zxing/zxing_reader.wasm'

let scannerModule: typeof import('@taluks/html5-qrcode') | null = null

export async function loadScanner() {
  if (!scannerModule) {
    const mod = await import('@taluks/html5-qrcode')
    mod.configureZxingWasm({ loadMode: mod.ZxingWasmLoadMode.CUSTOM, wasmUrl: WASM_URL })
    scannerModule = mod
  }
  return scannerModule!
}

export function BarcodeScanner({ onResult, onClose }: Props) {
  const regionRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [manual, setManual] = useState('')
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const aliveRef = useRef(true)
  const stoppedRef = useRef(false)

  const cleanup = async () => {
    stoppedRef.current = true
    const s = scannerRef.current
    scannerRef.current = null
    if (s) {
      try {
        await s.stop()
        s.clear()
      } catch {
        // camera may already be released
      }
    }
  }

  const stopScanner = async () => {
    const s = scannerRef.current
    scannerRef.current = null
    if (s) {
      try {
        await s.stop()
        s.clear()
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    aliveRef.current = true
    stoppedRef.current = false

    const startStream = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await loadScanner()
        if (!aliveRef.current || !regionRef.current) return
        const scanner = new Html5Qrcode(regionRef.current.id, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        })
        scannerRef.current = scanner
        const success = (text: string) => {
          if (aliveRef.current && !stoppedRef.current) {
            void cleanup().finally(() => onResultRef.current(text.trim()))
          }
        }
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 160 } },
          success,
          () => {
            // no code in this frame — keep scanning
          },
        )
        if (aliveRef.current) {
          setStarting(false)
          setTimeout(() => {
            if (aliveRef.current && !stoppedRef.current) setStarting(false)
          }, 0)
        }
      } catch (err) {
        if (aliveRef.current) {
          setStarting(false)
          setError(err instanceof Error ? err.message : 'Could not start the camera')
        }
      }
    }
    void startStream()

    return () => {
      aliveRef.current = false
      void stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFile = async (file: File) => {
    setError('')
    await stopScanner()
    try {
      const { Html5Qrcode } = await loadScanner()
      const region = regionRef.current
      if (!region) return
      const scanner = new Html5Qrcode(region.id, { verbose: false })
      const text = await scanner.scanFileV2(file)
      scanner.clear()
      onResult(text.decodedText.trim())
    } catch {
      setError('No barcode recognised in that image. Try a sharper photo of the barcode.')
    }
  }

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    const v = manual.trim()
    if (v) onResult(v)
  }

  return (
    <Modal title="Scan barcode" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        Point the camera at a barcode. Scanning works fully in your browser — nothing is uploaded.
      </p>
      <div className="grid grid-cols-12 items-stretch gap-3">
        <div className="col-span-12 sm:col-span-8">
          <div
            id="ib-barcode-reader"
            ref={regionRef}
            className="relative overflow-hidden rounded-lg border border-slate-200 bg-black dark:border-slate-700"
            style={{ minHeight: 160 }}
          />
          {starting && !error && (
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Starting camera…</p>
          )}
          {error && (
            <div className="mt-2">
              <Notice kind="error">{error}</Notice>
            </div>
          )}
        </div>
        <div className="col-span-12 flex flex-col gap-2 sm:col-span-4">
          <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Or scan from image
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
                e.target.value = ''
              }}
            />
          </label>
          <form onSubmit={submitManual} className="flex flex-col gap-2">
            <input
              className={`${inputClass()} w-full`}
              placeholder="Or type the code…"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button type="submit" className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Use code
            </button>
          </form>
        </div>
      </div>
    </Modal>
  )
}