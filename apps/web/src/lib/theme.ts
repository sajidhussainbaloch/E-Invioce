export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ib-theme'

export function storedTheme(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

export function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

export function cycleTheme(current: Theme): Theme {
  return current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}

export function themeLabel(theme: Theme): string {
  return theme[0].toUpperCase() + theme.slice(1)
}