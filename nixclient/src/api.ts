/* NixClient API client — all calls go to /api/ (proxied to Rust backend) */

const BASE = '/api'

export function getToken(): string | null {
  return localStorage.getItem('nixclient_token')
}
export function setToken(t: string) {
  localStorage.setItem('nixclient_token', t)
}
export function clearToken() {
  localStorage.removeItem('nixclient_token')
}
export function isLoggedIn(): boolean {
  return !!getToken()
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 401) {
    clearToken()
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export interface LoginResult {
  token: string
  user: { id: number; username: string; role: string }
}
export async function login(username: string, password: string): Promise<LoginResult> {
  const result = await apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(result.token)
  return result
}

export interface AccountInfo {
  username: string
  domain: string
  email: string
  package_name: string
  disk_quota_mb: number
  bandwidth_mb: number
  status: string
}
export async function getMyAccount(): Promise<AccountInfo | null> {
  try {
    // Returns the first account matching the logged-in user's username
    const accounts = await apiFetch<AccountInfo[]>('/accounts')
    return accounts[0] ?? null
  } catch {
    return null
  }
}
