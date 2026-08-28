export class ApiError extends Error {
  status: number
  issues?: Record<string, string[]>

  constructor(message: string, status: number, issues?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}

type ErrorShape = { message?: string; issues?: Record<string, string[]> }

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      credentials: 'include',
      headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError('Cannot reach the Invoice Bank server', 0)
  }

  if (!response.ok) {
    let shape: ErrorShape = {}
    try {
      shape = (await response.json()) as ErrorShape
    } catch {
      // non-JSON error body
    }
    throw new ApiError(shape.message ?? response.statusText, response.status, shape.issues)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function fieldError(issues: Record<string, string[]> | undefined, field: string): string {
  const list = issues?.[field]
  return list?.[0] ?? ''
}

export function firstError(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}