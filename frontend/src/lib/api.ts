const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: { id: string; email: string; name: string; role: 'analyst' | 'admin' } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  )
}

export async function fetchSites(params: Record<string, string | number | boolean>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v))
  }
  return request<{
    sites: unknown[]
    total: number
    filtered: number
    page: number
    pages: number
    score_stats: { composite_mean: number; composite_p75: number; technical_mean: number; commercial_mean: number }
  }>(`/api/sites?${qs.toString()}`)
}

export async function fetchSiteDetail(id: string, params: Record<string, string | number | boolean> = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  return request<unknown>(`/api/sites/${id}?${qs.toString()}`)
}

export function getCsvExportUrl(params: Record<string, string | number | boolean>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  return `${API_BASE}/api/sites/export/csv?${qs.toString()}`
}
