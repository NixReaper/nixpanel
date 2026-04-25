import { useState, useEffect, useCallback } from 'react'
import * as api from './api'
import type { DashboardData, ServiceInfo, Account } from './api'

/* ── Types ──────────────────────────────────────────────────────────────── */
type Page =
  | 'dashboard' | 'accounts' | 'createAccount' | 'listAccounts'
  | 'domains' | 'dns' | 'databases' | 'email'
  | 'ssl' | 'backups' | 'firewall'
  | 'apache' | 'php' | 'services'
  | 'settings' | 'logs' | 'packages'

/* ── Nav ─────────────────────────────────────────────────────────────────── */
type NavGroup = { label: string; items: { id: Page; label: string; icon: string }[] }

const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview',          items: [{ id: 'dashboard',    label: 'Dashboard',        icon: '▦' }] },
  { label: 'Account Management',items: [
    { id: 'listAccounts', label: 'List Accounts',    icon: '📋' },
    { id: 'createAccount',label: 'Create Account',   icon: '➕' },
    { id: 'packages',     label: 'Feature Packages', icon: '📦' },
  ]},
  { label: 'Domains & DNS',     items: [
    { id: 'domains', label: 'Zone Manager', icon: '🌐' },
    { id: 'dns',     label: 'DNS Records',  icon: '🔗' },
  ]},
  { label: 'Databases',         items: [{ id: 'databases', label: 'MySQL / MariaDB',    icon: '🗄️' }] },
  { label: 'Email',             items: [{ id: 'email',     label: 'Email Routing',      icon: '✉️' }] },
  { label: 'Security',          items: [
    { id: 'ssl',      label: 'SSL / TLS',      icon: '🔒' },
    { id: 'firewall', label: 'Firewall (CSF)', icon: '🛡️' },
  ]},
  { label: 'Server',            items: [
    { id: 'apache',   label: 'Apache Config',   icon: '⚙️' },
    { id: 'php',      label: 'PHP Manager',     icon: '🐘' },
    { id: 'services', label: 'Service Manager', icon: '🔧' },
    { id: 'backups',  label: 'Backup Manager',  icon: '💾' },
    { id: 'logs',     label: 'System Logs',     icon: '📜' },
    { id: 'settings', label: 'Server Config',   icon: '🔩' },
  ]},
]

/* ── Sidebar ────────────────────────────────────────────────────────────── */
function Sidebar({ current, onNav, onLogout, collapsed, onToggle, username }: {
  current: Page; onNav: (p: Page) => void; onLogout: () => void
  collapsed: boolean; onToggle: () => void; username: string
}) {
  return (
    <aside className={`flex-shrink-0 bg-[#1a1f2e] border-r border-[#2a3044] flex flex-col min-h-screen transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      <div className="h-14 flex items-center justify-between px-3 border-b border-[#2a3044]">
        {!collapsed && (
          <span className="text-base font-black tracking-tight text-white">
            Nix<span className="text-orange-400">Server</span>
            <span className="ml-1.5 text-[9px] font-bold bg-orange-500 text-white rounded px-1 py-0.5 uppercase tracking-wide align-middle">WHM</span>
          </span>
        )}
        <button onClick={onToggle} className="text-gray-500 hover:text-white p-1 rounded transition-colors ml-auto" title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="px-3 pt-3 pb-1 text-[9px] font-bold text-gray-600 uppercase tracking-widest">{group.label}</p>
            )}
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-all ${
                  current === item.id
                    ? 'bg-orange-500/20 text-orange-400 border-r-2 border-orange-400'
                    : 'text-gray-400 hover:bg-[#252b3d] hover:text-white'
                }`}
              >
                <span className="text-sm w-4 text-center flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#2a3044] p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{username}</p>
              <p className="text-[10px] text-gray-500">root</p>
            </div>
          </div>
        )}
        <button onClick={onLogout} title="Sign out"
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-500 hover:bg-[#252b3d] hover:text-red-400 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <span>⏻</span>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}

/* ── Stat bar ────────────────────────────────────────────────────────────── */
function StatBar({ data }: { data: DashboardData | null }) {
  const s = data?.stats
  const si = data?.sysinfo

  const ramPct = si && si.ram_total_mb > 0
    ? Math.round((si.ram_used_mb / si.ram_total_mb) * 100)
    : null
  const diskPct = si && si.disk_total_gb > 0
    ? Math.round((si.disk_used_gb / si.disk_total_gb) * 100)
    : null

  function barColor(pct: number) {
    return pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
  }

  const stats = [
    { label: 'Hosting Accounts', value: s?.accounts   ?? '—', unit: '', color: 'text-orange-400',  bar: null },
    { label: 'Domains',          value: s?.domains     ?? '—', unit: '', color: 'text-blue-400',    bar: null },
    { label: 'Databases',        value: s?.databases   ?? '—', unit: '', color: 'text-purple-400',  bar: null },
    { label: 'Email Accounts',   value: s?.email_accounts ?? '—', unit: '', color: 'text-cyan-400', bar: null },
    { label: 'Disk Used',        value: si ? `${si.disk_used_gb}` : '—', unit: 'GB', color: diskPct && diskPct > 80 ? 'text-red-400' : 'text-emerald-400', bar: diskPct },
    { label: 'RAM Used',         value: si ? `${Math.round(si.ram_used_mb / 1024 * 10) / 10}` : '—', unit: 'GB', color: ramPct && ramPct > 80 ? 'text-red-400' : 'text-yellow-400', bar: ramPct },
  ]

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-0 border border-[#2a3044] rounded-lg overflow-hidden">
      {stats.map((s, i) => (
        <div key={s.label} className={`bg-[#1a1f2e] px-4 py-3 ${i < stats.length - 1 ? 'border-r border-[#2a3044]' : ''}`}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
          <p className={`text-xl font-black mt-0.5 ${s.color}`}>
            {s.value}<span className="text-xs font-normal text-gray-500 ml-1">{s.unit}</span>
          </p>
          {s.bar !== null && (
            <div className="mt-1.5 h-1 bg-[#2a3044] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor(s.bar)}`} style={{ width: `${s.bar}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Service table ───────────────────────────────────────────────────────── */
function ServiceTable({ services, loading, onAction }: {
  services: ServiceInfo[]
  loading: boolean
  onAction: (name: string, action: 'start' | 'stop' | 'restart') => void
}) {
  const badge: Record<string, string> = {
    running: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    stopped: 'bg-red-500/20 text-red-400 border border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }
  const running = services.filter(s => s.status === 'running').length

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a3044] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Service Manager</h3>
        {loading
          ? <span className="text-xs text-gray-600">Loading…</span>
          : <span className="text-xs text-gray-500">{running} / {services.length} running</span>
        }
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a3044]">
            {['Service', 'Status', 'PID', 'Uptime', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden-last-two md:table-cell first:table-cell">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin mr-2" />
                Loading services…
              </td>
            </tr>
          ) : services.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">No service data available</td>
            </tr>
          ) : services.map(svc => (
            <tr key={svc.name} className="border-b border-[#252b3d] hover:bg-[#252b3d]/50 transition-colors">
              <td className="px-4 py-2.5 text-gray-300 font-medium">{svc.display}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${badge[svc.status] ?? badge.warning}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${svc.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {svc.status.charAt(0).toUpperCase() + svc.status.slice(1)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">{svc.pid ?? '—'}</td>
              <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">{svc.uptime ?? '—'}</td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <button onClick={() => onAction(svc.name, 'start')} className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-400 transition-colors">Start</button>
                  <button onClick={() => onAction(svc.name, 'stop')} className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-colors">Stop</button>
                  <button onClick={() => onAction(svc.name, 'restart')} className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:bg-orange-500/20 hover:text-orange-400 text-gray-400 transition-colors">Restart</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Quick action grid ───────────────────────────────────────────────────── */
function QuickActions({ onNav }: { onNav: (p: Page) => void }) {
  const actions = [
    { label: 'Create Account', icon: '👤', page: 'createAccount' as Page, desc: 'Add hosting account' },
    { label: 'Zone Manager',   icon: '🌐', page: 'domains'       as Page, desc: 'Manage DNS zones' },
    { label: 'New Database',   icon: '🗄️', page: 'databases'     as Page, desc: 'Create MariaDB DB' },
    { label: 'Issue SSL',      icon: '🔒', page: 'ssl'           as Page, desc: "Let's Encrypt cert" },
    { label: 'Run Backup',     icon: '💾', page: 'backups'       as Page, desc: 'Full server backup' },
    { label: 'PHP Manager',    icon: '🐘', page: 'php'           as Page, desc: 'Switch PHP version' },
    { label: 'Firewall',       icon: '🛡️', page: 'firewall'      as Page, desc: 'Edit CSF rules' },
    { label: 'System Logs',    icon: '📜', page: 'logs'          as Page, desc: 'Apache, error logs' },
  ]
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a3044]">
        <h3 className="text-sm font-bold text-white">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
        {actions.map((a, i) => (
          <button key={a.label} onClick={() => onNav(a.page)}
            className={`flex flex-col items-center text-center p-4 hover:bg-orange-500/10 transition-all group ${i % 4 !== 3 ? 'border-r border-[#2a3044]' : ''} ${i < actions.length - 4 ? 'border-b border-[#2a3044]' : ''}`}
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{a.icon}</span>
            <span className="text-xs font-semibold text-gray-300 group-hover:text-white leading-tight">{a.label}</span>
            <span className="text-[10px] text-gray-600 group-hover:text-gray-400 mt-0.5 leading-tight">{a.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Server info bar ─────────────────────────────────────────────────────── */
function ServerInfoBar({ data }: { data: DashboardData | null }) {
  const si = data?.sysinfo
  const v  = data?.versions
  const info = [
    { label: 'Hostname', value: si?.hostname ?? '—' },
    { label: 'OS',       value: si?.os       ?? '—' },
    { label: 'Kernel',   value: si?.kernel   ?? '—' },
    { label: 'PHP',      value: v?.php       ?? '—' },
    { label: 'MariaDB',  value: v?.mariadb   ?? '—' },
    { label: 'Apache',   value: v?.apache    ?? '—' },
    { label: 'NixPanel', value: v?.nixpanel  ?? '—' },
  ]
  return (
    <div className="bg-[#0f1520] border border-[#2a3044] rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
      {info.map(i => (
        <div key={i.label} className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{i.label}:</span>
          <span className="text-xs text-gray-300 font-medium">{i.value}</span>
        </div>
      ))}
      {si && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Load:</span>
          <span className="text-xs text-gray-300 font-medium">{si.load_avg[0].toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

/* ── Dashboard page ──────────────────────────────────────────────────────── */
function Dashboard({ onNav }: { onNav: (p: Page) => void }) {
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [svcLoading, setSvcLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    api.getDashboard().then(setDashData).catch(console.error)
  }, [])

  useEffect(() => {
    api.getServices().then(s => { setServices(s); setSvcLoading(false) }).catch(() => setSvcLoading(false))
  }, [])

  const handleServiceAction = useCallback(async (name: string, action: 'start' | 'stop' | 'restart') => {
    setActionMsg(`${action}ing ${name}…`)
    try {
      await api.serviceAction(name, action)
      // Refresh services
      const updated = await api.getServices()
      setServices(updated)
      setActionMsg(`${name} ${action}ed`)
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`)
    }
    setTimeout(() => setActionMsg(''), 3000)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white">Server Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {dashData?.sysinfo
              ? `${dashData.sysinfo.hostname} · ${dashData.sysinfo.ip}`
              : 'Welcome back, admin — NixServer WHM'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {actionMsg && (
            <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full">
              {actionMsg}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </span>
        </div>
      </div>

      <StatBar data={dashData} />
      <ServerInfoBar data={dashData} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ServiceTable services={services} loading={svcLoading} onAction={handleServiceAction} />
        <QuickActions onNav={onNav} />
      </div>
    </div>
  )
}

/* ── List accounts ───────────────────────────────────────────────────────── */
function ListAccounts({ onNav }: { onNav: (p: Page) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getAccounts()
      .then(setAccounts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter(a =>
    a.username.includes(search) || a.domain.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-white">Hosting Accounts</h1>
        <button onClick={() => onNav('createAccount')} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded transition-colors">
          + Create Account
        </button>
      </div>

      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg p-3 flex gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search accounts, domains…"
          className="flex-1 bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
        />
        <select className="bg-[#0f1520] border border-[#2a3044] text-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
          <option>All Status</option><option>Active</option><option>Suspended</option>
        </select>
      </div>

      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a3044] bg-[#0f1520]">
              {['Username', 'Domain', 'Package', 'Disk Quota', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-gray-700 border-t-orange-500 rounded-full animate-spin mr-2" />Loading…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center">
                <div className="text-3xl mb-3">👤</div>
                <p className="text-gray-500 text-sm">
                  {search ? 'No accounts match your search.' : <>No accounts yet. <button onClick={() => onNav('createAccount')} className="text-orange-400 hover:underline">Create your first account →</button></>}
                </p>
              </td></tr>
            ) : filtered.map(acc => (
              <tr key={acc.id} className="border-b border-[#252b3d] hover:bg-[#252b3d]/50 transition-colors">
                <td className="px-4 py-2.5 text-gray-300 font-medium">{acc.username}</td>
                <td className="px-4 py-2.5 text-gray-400">{acc.domain}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{acc.package_name}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{acc.disk_quota_mb === 0 ? '∞' : `${acc.disk_quota_mb} MB`}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                    acc.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{new Date(acc.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <button className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:text-orange-400 text-gray-400 transition-colors">Edit</button>
                    <button className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:text-red-400 text-gray-400 transition-colors">Suspend</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Create account form ─────────────────────────────────────────────────── */
function CreateAccount({ onNav }: { onNav: (p: Page) => void }) {
  const [form, setForm] = useState({
    username: '', domain: '', email: '', password: '',
    package_name: 'Default', disk_quota_mb: 10240, bandwidth_mb: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      const acc = await api.createAccount({
        ...form,
        disk_quota_mb: Number(form.disk_quota_mb),
        bandwidth_mb:  Number(form.bandwidth_mb),
      })
      setSuccess(`Account "${acc.username}" created for ${acc.domain}`)
      setTimeout(() => onNav('listAccounts'), 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, name, type = 'text', placeholder = '' }: { label: string; name: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5">{label}</label>
      <input type={type} value={String((form as any)[name])} onChange={e => set(name, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60"
      />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-lg font-black text-white">Create Hosting Account</h1>

      {error   && <div className="px-4 py-3 bg-red-950/60 border border-red-800/50 rounded-lg text-red-400 text-sm">⚠️ {error}</div>}
      {success && <div className="px-4 py-3 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-emerald-400 text-sm">✓ {success}</div>}

      <form onSubmit={handleSubmit} className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg divide-y divide-[#2a3044]">
        <div className="p-5 space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Domain Information</h2>
          <Field label="Domain Name" name="domain" placeholder="example.com" />
        </div>

        <div className="p-5 space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Account Credentials</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username"       name="username" placeholder="username" />
            <Field label="Password"       name="password" type="password" placeholder="••••••••" />
            <div className="col-span-2">
              <Field label="Email Address" name="email" type="email" placeholder="user@example.com" />
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Resource Limits</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Package</label>
              <select value={form.package_name} onChange={e => set('package_name', e.target.value)}
                className="w-full bg-[#0f1520] border border-[#2a3044] text-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500/60">
                <option>Default</option>
                <option>Starter</option>
                <option>Professional</option>
                <option>Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Disk Quota (MB)</label>
              <input type="number" value={form.disk_quota_mb} onChange={e => set('disk_quota_mb', e.target.value)}
                className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bandwidth (MB/mo, 0=∞)</label>
              <input type="number" value={form.bandwidth_mb} onChange={e => set('bandwidth_mb', e.target.value)}
                className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500/60"
              />
            </div>
          </div>
        </div>

        <div className="p-5 flex gap-3">
          <button type="submit" disabled={loading}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-bold rounded transition-colors flex items-center gap-2">
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Creating…' : 'Create Account'}
          </button>
          <button type="button" onClick={() => onNav('listAccounts')}
            className="px-5 py-2 bg-[#0f1520] border border-[#2a3044] hover:border-gray-500 text-gray-400 hover:text-white text-sm rounded transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Placeholder ─────────────────────────────────────────────────────────── */
function Placeholder({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-72 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-600 text-sm max-w-sm">This module is under active development and will be available in an upcoming release.</p>
      <div className="mt-4 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-400 font-semibold">Coming Soon</div>
    </div>
  )
}

const PAGE_META: Record<Page, { title: string; icon: string }> = {
  dashboard:     { title: 'Server Dashboard',   icon: '▦'  },
  accounts:      { title: 'Accounts',           icon: '👤' },
  listAccounts:  { title: 'List Accounts',      icon: '📋' },
  createAccount: { title: 'Create Account',     icon: '➕' },
  packages:      { title: 'Feature Packages',   icon: '📦' },
  domains:       { title: 'Zone Manager',       icon: '🌐' },
  dns:           { title: 'DNS Records',        icon: '🔗' },
  databases:     { title: 'MySQL / MariaDB',    icon: '🗄️' },
  email:         { title: 'Email Routing',      icon: '✉️' },
  ssl:           { title: 'SSL / TLS Manager',  icon: '🔒' },
  backups:       { title: 'Backup Manager',     icon: '💾' },
  firewall:      { title: 'Firewall (CSF)',     icon: '🛡️' },
  apache:        { title: 'Apache Config',      icon: '⚙️' },
  php:           { title: 'PHP Manager',        icon: '🐘' },
  services:      { title: 'Service Manager',    icon: '🔧' },
  settings:      { title: 'Server Config',      icon: '🔩' },
  logs:          { title: 'System Logs',        icon: '📜' },
}

/* ── Admin panel shell ───────────────────────────────────────────────────── */
function AdminPanel({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [page, setPage] = useState<Page>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const meta = PAGE_META[page]

  function renderPage() {
    switch (page) {
      case 'dashboard':     return <Dashboard onNav={setPage} />
      case 'listAccounts':  return <ListAccounts onNav={setPage} />
      case 'createAccount': return <CreateAccount onNav={setPage} />
      default:              return <Placeholder title={meta.title} icon={meta.icon} />
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0f1520] text-white">
      <Sidebar current={page} onNav={setPage} onLogout={onLogout} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} username={username} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#2a3044] bg-[#1a1f2e] flex items-center px-6 justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-600 text-sm">{meta.icon}</span>
            <h2 className="font-semibold text-gray-200 text-sm truncate">{meta.title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs bg-[#0f1520] border border-[#2a3044] text-gray-500 px-2 py-1 rounded">Ubuntu 24.04</span>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-[#2a3044]">
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">{username.charAt(0).toUpperCase()}</div>
              <span className="text-sm font-semibold text-gray-300 hidden sm:block">{username}</span>
            </div>
          </div>
        </header>

        {page !== 'dashboard' && (
          <div className="px-6 py-2 border-b border-[#2a3044] bg-[#0f1520] flex items-center gap-1.5 text-xs text-gray-600">
            <button onClick={() => setPage('dashboard')} className="hover:text-orange-400 transition-colors">Dashboard</button>
            <span>/</span>
            <span className="text-gray-400">{meta.title}</span>
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto">{renderPage()}</main>

        <footer className="border-t border-[#2a3044] px-6 py-2 flex items-center justify-between text-[10px] text-gray-700">
          <span>NixPanel WHM v0.2.0-alpha · Ubuntu 24.04 LTS</span>
          <span>© 2025 NixPanel</span>
        </footer>
      </div>
    </div>
  )
}

/* ── Login ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [loggedInAs, setLoggedInAs] = useState<string | null>(null)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  // Restore session from localStorage
  useEffect(() => {
    if (api.isLoggedIn()) {
      const stored = localStorage.getItem('nixpanel_username')
      setLoggedInAs(stored ?? 'admin')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const result = await api.login(username, password)
      localStorage.setItem('nixpanel_username', result.user.username)
      setLoggedInAs(result.user.username)
    } catch (err: any) {
      setError(err.message === 'Unauthorized' ? 'Invalid username or password.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.clearToken()
    localStorage.removeItem('nixpanel_username')
    setLoggedInAs(null)
    setUsername(''); setPassword('')
  }

  if (loggedInAs) return <AdminPanel username={loggedInAs} onLogout={handleLogout} />

  return (
    <div className="min-h-screen flex bg-[#0f1520]">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-80 bg-[#1a1f2e] border-r border-[#2a3044] p-10">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-orange-900/40">N</div>
            <div>
              <span className="text-xl font-black text-white">Nix<span className="text-orange-400">Server</span></span>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">WHM Control Panel</div>
            </div>
          </div>
          <div className="space-y-5">
            {[
              { icon: '🌐', title: 'Full DNS Control',   desc: 'PowerDNS-backed zone management' },
              { icon: '🔒', title: 'Auto SSL/TLS',       desc: "Let's Encrypt for all domains" },
              { icon: '🛡️', title: 'Built-in Firewall',  desc: 'CSF/Fail2ban integration' },
              { icon: '💾', title: 'Automated Backups',  desc: 'Scheduled full & incremental' },
              { icon: '🐘', title: 'Multi-PHP Support',  desc: 'PHP 8.0 – 8.3 per account' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{f.title}</p>
                  <p className="text-xs text-gray-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-gray-700">NixPanel WHM v0.2.0-alpha · Secured by Fail2ban</p>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-black text-white">Nix<span className="text-orange-400">Server</span></span>
            <p className="text-xs text-gray-600 mt-1">WHM Control Panel</p>
          </div>

          <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-orange-500 px-6 py-4">
              <h1 className="text-white font-bold text-base">Administrator Login</h1>
              <p className="text-orange-200 text-xs mt-0.5">NixServer WHM · Root Access</p>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-950/60 border border-red-800/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" placeholder="admin"
                  className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-700 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••••••"
                  className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-700 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-bold text-sm transition-all shadow-lg shadow-orange-900/40 flex items-center justify-center gap-2">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating…</>
                ) : 'Sign in to WHM'}
              </button>
            </form>

            <div className="border-t border-[#2a3044] px-6 py-3 bg-[#0f1520] flex items-center justify-between text-[10px] text-gray-700">
              <span>Secured by Fail2ban</span>
              <span>NixPanel v0.2.0-alpha</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
