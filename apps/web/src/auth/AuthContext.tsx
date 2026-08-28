import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiFetch, ApiError } from '../lib/api'
import type { Business, BusinessSettings, MeResponse, User } from '../lib/types'

export type RegisterInput = { name: string; email: string; password: string }
export type LoginInput = { email: string; password: string }

type AuthContextValue = {
  user: User | null
  business: (Business & { settings: BusinessSettings | null }) | null
  hasBusiness: boolean
  loading: boolean
  register: (input: RegisterInput) => Promise<User>
  login: (input: LoginInput) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [business, setBusiness] = useState<(Business & { settings: BusinessSettings | null }) | null>(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((data: MeResponse) => {
    setUser(data.user)
    setBusiness(data.business)
  }, [])

  const refresh = useCallback(async () => {
    const data = await apiFetch<MeResponse>('/api/auth/me')
    apply(data)
  }, [apply])

  useEffect(() => {
    let cancelled = false
    apiFetch<MeResponse>('/api/auth/me')
      .then((data) => {
        if (!cancelled) apply(data)
      })
      .catch((err: unknown) => {
        if (!cancelled && !(err instanceof ApiError && err.status === 401)) {
          console.error('Session check failed', err)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apply])

  const register = useCallback(async (input: RegisterInput) => {
    const data = await apiFetch<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setUser(data.user)
    setBusiness(null)
    return data.user
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const data = await apiFetch<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setUser(data.user)
    setBusiness(null)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setBusiness(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      business,
      hasBusiness: business != null,
      loading,
      register,
      login,
      logout,
      refresh,
    }),
    [user, business, loading, register, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}