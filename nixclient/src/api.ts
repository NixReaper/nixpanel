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

/* ── Auth ────────────────────────────────────────────────────────────── */
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

/* ── Account info ────────────────────────────────────────────────────── */
export interface AccountInfo {
  id: number
  username: string
  domain: string
  email: string
  package_name: string
  disk_quota_mb: number
  bandwidth_mb: number
  status: string
  created_at: string
}
export async function getMyAccount(username: string): Promise<AccountInfo | null> {
  try {
    return await apiFetch<AccountInfo>(`/accounts/${username}`)
  } catch {
    return null
  }
}

/* ── Email accounts ──────────────────────────────────────────────────── */
export interface EmailAccount {
  id: number
  account_id: number
  address: string
  quota_mb: number
  created_at: string
}
export async function listMyEmailAccounts(username: string): Promise<EmailAccount[]> {
  return apiFetch(`/email/${username}`)
}
export async function createEmailAccount(data: {
  username: string
  domain: string
  password: string
  quota_mb?: number
}): Promise<EmailAccount> {
  return apiFetch('/email', { method: 'POST', body: JSON.stringify(data) })
}
export async function deleteEmailAccount(id: number): Promise<void> {
  await apiFetch(`/email/id/${id}`, { method: 'DELETE' })
}

/* ── Password change ─────────────────────────────────────────────────── */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiFetch('/me/password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
}
