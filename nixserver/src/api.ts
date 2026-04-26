/* NixServer API client — all calls go to /api/ (proxied to Rust backend) */

const BASE = '/api'

/* ── Auth token ──────────────────────────────────────────────────────── */
export function getToken(): string | null {
  return localStorage.getItem('nixpanel_token')
}
export function setToken(t: string) {
  localStorage.setItem('nixpanel_token', t)
}
export function clearToken() {
  localStorage.removeItem('nixpanel_token')
}
export function isLoggedIn(): boolean {
  return !!getToken()
}

/* ── Core fetch wrapper ──────────────────────────────────────────────── */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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

/* ── Dashboard ───────────────────────────────────────────────────────── */
export interface DashboardStats {
  accounts: number
  domains: number
  databases: number
  email_accounts: number
}
export interface SysInfo {
  hostname: string
  ip: string
  os: string
  kernel: string
  uptime_sec: number
  cpu_pct: number
  ram_used_mb: number
  ram_total_mb: number
  disk_used_gb: number
  disk_total_gb: number
  load_avg: [number, number, number]
}
export interface Versions {
  apache: string
  php: string
  mariadb: string
  nixpanel: string
}
export interface DashboardData {
  stats: DashboardStats
  sysinfo: SysInfo | null
  versions: Versions | null
}
export async function getDashboard(): Promise<DashboardData> {
  return apiFetch('/dashboard')
}

/* ── Services ────────────────────────────────────────────────────────── */
export interface ServiceInfo {
  name: string
  display: string
  status: 'running' | 'stopped' | 'warning'
  pid: number | null
  uptime: string | null
}
export async function getServices(): Promise<ServiceInfo[]> {
  return apiFetch('/services')
}
export async function serviceAction(
  name: string,
  action: 'start' | 'stop' | 'restart'
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/services/${name}/${action}`, { method: 'POST' })
}

/* ── Accounts ────────────────────────────────────────────────────────── */
export interface Account {
  id: number
  username: string
  domain: string
  email: string
  package_name: string
  disk_quota_mb: number
  bandwidth_mb: number
  status: 'active' | 'suspended' | 'terminated'
  created_at: string
}
export async function getAccounts(): Promise<Account[]> {
  return apiFetch('/accounts')
}
export async function getAccount(username: string): Promise<Account> {
  return apiFetch(`/accounts/${username}`)
}
export async function createAccount(data: {
  username: string
  domain: string
  email: string
  password: string
  package_name?: string
  disk_quota_mb?: number
  bandwidth_mb?: number
}): Promise<Account> {
  return apiFetch('/accounts', { method: 'POST', body: JSON.stringify(data) })
}
export async function suspendAccount(username: string): Promise<void> {
  await apiFetch(`/accounts/${username}/suspend`, { method: 'POST' })
}
export async function unsuspendAccount(username: string): Promise<void> {
  await apiFetch(`/accounts/${username}/unsuspend`, { method: 'POST' })
}
export async function terminateAccount(username: string): Promise<void> {
  await apiFetch(`/accounts/${username}`, { method: 'DELETE' })
}

/* ── Databases ───────────────────────────────────────────────────────── */
export interface Database {
  id: number
  account_id: number
  db_name: string
  db_user: string
  created_at: string
  account_username?: string  // present in admin list view
}
export async function listAllDatabases(): Promise<Database[]> {
  return apiFetch('/databases')
}
export async function listAccountDatabases(username: string): Promise<Database[]> {
  return apiFetch(`/databases/${username}`)
}
export async function createDatabase(data: {
  username: string
  db_suffix: string
  db_user_suffix?: string
  db_password: string
}): Promise<Database> {
  return apiFetch('/databases', { method: 'POST', body: JSON.stringify(data) })
}
export async function deleteDatabase(dbName: string): Promise<void> {
  await apiFetch(`/databases/name/${encodeURIComponent(dbName)}`, { method: 'DELETE' })
}

/* ── DNS ─────────────────────────────────────────────────────────────── */
export interface DnsRecord {
  name: string
  ttl: number
  rtype: string
  content: string
}
export async function listZones(): Promise<string[]> {
  return apiFetch('/dns')
}
export async function listZoneRecords(domain: string): Promise<DnsRecord[]> {
  return apiFetch(`/dns/${domain}`)
}
export async function addDnsRecord(
  domain: string,
  record: { name: string; rtype: string; ttl?: number; content: string }
): Promise<void> {
  await apiFetch(`/dns/${domain}`, { method: 'POST', body: JSON.stringify(record) })
}
export async function deleteDnsRecord(
  domain: string,
  name: string,
  rtype: string
): Promise<void> {
  await apiFetch(`/dns/${domain}`, {
    method: 'DELETE',
    body: JSON.stringify({ name, rtype }),
  })
}

/* ── Email accounts ──────────────────────────────────────────────────── */
export interface EmailAccount {
  id: number
  account_id: number
  address: string
  quota_mb: number
  created_at: string
}
export async function listEmailAccounts(username: string): Promise<EmailAccount[]> {
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
