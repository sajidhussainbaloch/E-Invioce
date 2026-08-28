import { Component, StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-sm dark:border-red-800 dark:bg-slate-900">
            <h1 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h1>
            <p className="mb-4 text-slate-500 dark:text-slate-400">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
