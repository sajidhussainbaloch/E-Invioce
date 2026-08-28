import type { ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            title="Close"
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}