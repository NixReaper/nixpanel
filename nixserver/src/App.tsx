import { useState } from 'react'

/* ── Types ──────────────────────────────────────────────────────────────── */
type Page =
  | 'dashboard' | 'accounts' | 'createAccount' | 'listAccounts'
  | 'domains' | 'dns' | 'databases' | 'email'
  | 'ssl' | 'backups' | 'firewall'
  | 'apache' | 'php' | 'services'
  | 'settings' | 'logs' | 'packages'

/* ── Sidebar nav definition ─────────────────────────────────────────────── */
type NavGroup = { label: string; items: { id: Page; label: string; icon: string }[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard',    label: 'Dashboard',        icon: '▦' },
    ],
  },
  {
    label: 'Account Management',
    items: [
      { id: 'listAccounts', label: 'List Accounts',    icon: '📋' },
      { id: 'createAccount',label: 'Create Account',   icon: '➕' },
      { id: 'packages',     label: 'Feature Packages', icon: '📦' },
    ],
  },
  {
    label: 'Domains & DNS',
    items: [
      { id: 'domains',      label: 'Zone Manager',     icon: '🌐' },
      { id: 'dns',          label: 'DNS Records',      icon: '🔗' },
    ],
  },
  {
    label: 'Databases',
    items: [
      { id: 'databases',    label: 'MySQL / MariaDB',  icon: '🗄️' },
    ],
  },
  {
    label: 'Email',
    items: [
      { id: 'email',        label: 'Email Routing',    icon: '✉️' },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'ssl',          label: 'SSL / TLS',        icon: '🔒' },
      { id: 'firewall',     label: 'Firewall (CSF)',   icon: '🛡️' },
    ],
  },
  {
    label: 'Server',
    items: [
      { id: 'apache',       label: 'Apache Config',    icon: '⚙️' },
      { id: 'php',          label: 'PHP Manager',      icon: '🐘' },
      { id: 'services',     label: 'Service Manager',  icon: '🔧' },
      { id: 'backups',      label: 'Backup Manager',   icon: '💾' },
      { id: 'logs',         label: 'System Logs',      icon: '📜' },
      { id: 'settings',     label: 'Server Config',    icon: '🔩' },
    ],
  },
]

/* ── Sidebar ────────────────────────────────────────────────────────────── */
function Sidebar({
  current, onNav, onLogout, collapsed, onToggle,
}: {
  current: Page; onNav: (p: Page) => void; onLogout: () => void
  collapsed: boolean; onToggle: () => void
}) {
  return (
    <aside
      className={`flex-shrink-0 bg-[#1a1f2e] border-r border-[#2a3044] flex flex-col min-h-screen transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Logo row */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-[#2a3044]">
        {!collapsed && (
          <span className="text-base font-black tracking-tight text-white">
            Nix<span className="text-orange-400">Server</span>
            <span className="ml-1.5 text-[9px] font-bold bg-orange-500 text-white rounded px-1 py-0.5 uppercase tracking-wide align-middle">WHM</span>
          </span>
        )}
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-white p-1 rounded transition-colors ml-auto"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="px-3 pt-3 pb-1 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                {group.label}
              </p>
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

      {/* User / logout */}
      <div className="border-t border-[#2a3044] p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">admin</p>
              <p className="text-[10px] text-gray-500">root</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          title="Sign out"
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-500 hover:bg-[#252b3d] hover:text-red-400 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span>⏻</span>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}

/* ── Stat bar (top of dashboard) ────────────────────────────────────────── */
function StatBar() {
  const stats = [
    { label: 'Hosting Accounts', value: '0',              unit: '',     color: 'text-orange-400' },
    { label: 'Domains',          value: '0',              unit: '',     color: 'text-blue-400' },
    { label: 'Databases',        value: '0',              unit: '',     color: 'text-purple-400' },
    { label: 'Email Accounts',   value: '0',              unit: '',     color: 'text-cyan-400' },
    { label: 'Disk Used',        value: '—',              unit: '',     color: 'text-emerald-400' },
    { label: 'RAM Used',         value: '—',              unit: '',     color: 'text-yellow-400' },
  ]
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-0 border border-[#2a3044] rounded-lg overflow-hidden">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`bg-[#1a1f2e] px-4 py-3 ${i < stats.length - 1 ? 'border-r border-[#2a3044]' : ''}`}
        >
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
          <p className={`text-xl font-black mt-0.5 ${s.color}`}>{s.value}<span className="text-xs font-normal text-gray-500 ml-1">{s.unit}</span></p>
        </div>
      ))}
    </div>
  )
}

/* ── Service status table ───────────────────────────────────────────────── */
type SvcStatus = 'running' | 'stopped' | 'warning'
function ServiceTable() {
  const services: { name: string; status: SvcStatus; pid?: string; uptime?: string }[] = [
    { name: 'Apache HTTP Server', status: 'running', pid: '1234', uptime: '2d 4h' },
    { name: 'MariaDB',            status: 'running', pid: '1238', uptime: '2d 4h' },
    { name: 'PowerDNS',          status: 'running', pid: '1242', uptime: '2d 4h' },
    { name: 'Exim (SMTP)',        status: 'running', pid: '1251', uptime: '2d 4h' },
    { name: 'Dovecot (IMAP)',     status: 'running', pid: '1265', uptime: '2d 4h' },
    { name: 'SpamAssassin',       status: 'running', pid: '1280', uptime: '2d 4h' },
    { name: 'Fail2ban',           status: 'running', pid: '1291', uptime: '2d 4h' },
    { name: 'ProFTPD',            status: 'stopped' },
  ]
  const badge: Record<SvcStatus, string> = {
    running: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    stopped: 'bg-red-500/20 text-red-400 border border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a3044] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Service Manager</h3>
        <span className="text-xs text-gray-500">7 / 8 running</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a3044]">
            <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Service</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">PID</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Uptime</th>
            <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map(svc => (
            <tr key={svc.name} className="border-b border-[#252b3d] hover:bg-[#252b3d]/50 transition-colors">
              <td className="px-4 py-2.5 text-gray-300 font-medium">{svc.name}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${badge[svc.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${svc.status === 'running' ? 'bg-emerald-400' : svc.status === 'stopped' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                  {svc.status.charAt(0).toUpperCase() + svc.status.slice(1)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">{svc.pid || '—'}</td>
              <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">{svc.uptime || '—'}</td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1.5">
                  <button className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-400 transition-colors">Start</button>
                  <button className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-colors">Stop</button>
                  <button className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:bg-orange-500/20 hover:text-orange-400 text-gray-400 transition-colors">Restart</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Quick action tiles (cPanel icon-grid style) ────────────────────────── */
function QuickActions({ onNav }: { onNav: (p: Page) => void }) {
  const actions: { label: string; icon: string; page: Page; desc: string }[] = [
    { label: 'Create Account',  icon: '👤', page: 'createAccount', desc: 'Add hosting account' },
    { label: 'Zone Manager',    icon: '🌐', page: 'domains',       desc: 'Manage DNS zones' },
    { label: 'New Database',    icon: '🗄️', page: 'databases',     desc: 'Create MariaDB DB' },
    { label: 'Issue SSL',       icon: '🔒', page: 'ssl',           desc: "Let's Encrypt cert" },
    { label: 'Run Backup',      icon: '💾', page: 'backups',       desc: 'Full server backup' },
    { label: 'PHP Manager',     icon: '🐘', page: 'php',           desc: 'Switch PHP version' },
    { label: 'Firewall',        icon: '🛡️', page: 'firewall',      desc: 'Edit CSF rules' },
    { label: 'System Logs',     icon: '📜', page: 'logs',          desc: 'Apache, error logs' },
  ]
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a3044]">
        <h3 className="text-sm font-bold text-white">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
        {actions.map((a, i) => (
          <button
            key={a.label}
            onClick={() => onNav(a.page)}
            className={`flex flex-col items-center text-center p-4 hover:bg-orange-500/10 hover:border-orange-500/20 transition-all group
              ${i % 4 !== 3 ? 'border-r border-[#2a3044]' : ''}
              ${i < actions.length - 4 ? 'border-b border-[#2a3044]' : ''}
            `}
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

/* ── Server info bar ────────────────────────────────────────────────────── */
function ServerInfoBar() {
  const info = [
    { label: 'Hostname',  value: 'server.example.com' },
    { label: 'OS',        value: 'Ubuntu 24.04 LTS' },
    { label: 'Kernel',    value: '6.8.0-51-generic' },
    { label: 'PHP',       value: '8.3 / 8.2' },
    { label: 'MariaDB',   value: '10.11' },
    { label: 'Apache',    value: '2.4' },
    { label: 'NixPanel',  value: 'v0.1.0' },
  ]
  return (
    <div className="bg-[#0f1520] border border-[#2a3044] rounded-lg px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
      {info.map(i => (
        <div key={i.label} className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{i.label}:</span>
          <span className="text-xs text-gray-300 font-medium">{i.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Dashboard page ─────────────────────────────────────────────────────── */
function Dashboard({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white">Server Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">Welcome back, admin — NixServer WHM</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          All systems operational
        </span>
      </div>

      <StatBar />
      <ServerInfoBar />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ServiceTable />
        <QuickActions onNav={onNav} />
      </div>
    </div>
  )
}

/* ── Account list page ──────────────────────────────────────────────────── */
function ListAccounts() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-white">Hosting Accounts</h1>
        <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded transition-colors">
          + Create Account
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg p-3 flex gap-3">
        <input
          type="text"
          placeholder="Search accounts, domains, usernames…"
          className="flex-1 bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
        />
        <select className="bg-[#0f1520] border border-[#2a3044] text-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
          <option>All Packages</option>
        </select>
        <select className="bg-[#0f1520] border border-[#2a3044] text-gray-300 rounded px-3 py-2 text-sm focus:outline-none">
          <option>All Status</option>
          <option>Active</option>
          <option>Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a3044] bg-[#0f1520]">
              {['Username', 'Domain', 'Package', 'Disk', 'BW', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center">
                <div className="text-3xl mb-3">👤</div>
                <p className="text-gray-500 text-sm">No accounts yet. <button className="text-orange-400 hover:underline">Create your first account →</button></p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Create account form ────────────────────────────────────────────────── */
function CreateAccount() {
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-lg font-black text-white">Create Hosting Account</h1>

      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg divide-y divide-[#2a3044]">
        {/* Domain */}
        <div className="p-5 space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Domain Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Domain Name</label>
              <input type="text" placeholder="example.com" className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="p-5 space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Account Credentials</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Username</label>
              <input type="text" placeholder="username" className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Password</label>
              <input type="password" placeholder="••••••••" className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address</label>
              <input type="email" placeholder="user@example.com" className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
            </div>
          </div>
        </div>

        {/* Package & limits */}
        <div className="p-5 space-y-4">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Resource Limits</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Package</label>
              <select className="w-full bg-[#0f1520] border border-[#2a3044] text-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500/60">
                <option>Default</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Disk Quota (MB)</label>
              <input type="number" placeholder="10240" className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bandwidth (MB/mo)</label>
              <input type="number" placeholder="Unlimited" className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Max Databases</label>
              <input type="number" placeholder="Unlimited" className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/60" />
            </div>
          </div>
        </div>

        <div className="p-5 flex gap-3">
          <button className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded transition-colors">
            Create Account
          </button>
          <button className="px-5 py-2 bg-[#0f1520] border border-[#2a3044] hover:border-gray-500 text-gray-400 hover:text-white text-sm font-medium rounded transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Generic placeholder for unbuilt modules ────────────────────────────── */
function Placeholder({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-72 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-600 text-sm max-w-sm">
        This module is under active development and will be available in an upcoming release.
      </p>
      <div className="mt-4 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-400 font-semibold">
        Coming Soon
      </div>
    </div>
  )
}

/* ── Page icon map ──────────────────────────────────────────────────────── */
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
  firewall:      { title: 'Firewall (CSF)',      icon: '🛡️' },
  apache:        { title: 'Apache Config',      icon: '⚙️' },
  php:           { title: 'PHP Manager',        icon: '🐘' },
  services:      { title: 'Service Manager',    icon: '🔧' },
  settings:      { title: 'Server Config',      icon: '🔩' },
  logs:          { title: 'System Logs',        icon: '📜' },
}

/* ── Admin panel shell ──────────────────────────────────────────────────── */
function AdminPanel() {
  const [page, setPage] = useState<Page>('dashboard')
  const [loggedIn, setLoggedIn] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  if (!loggedIn) return null

  const meta = PAGE_META[page]

  function renderPage() {
    switch (page) {
      case 'dashboard':     return <Dashboard onNav={setPage} />
      case 'listAccounts':  return <ListAccounts />
      case 'createAccount': return <CreateAccount />
      default:              return <Placeholder title={meta.title} icon={meta.icon} />
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0f1520] text-white">
      <Sidebar
        current={page}
        onNav={setPage}
        onLogout={() => setLoggedIn(false)}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-[#2a3044] bg-[#1a1f2e] flex items-center px-6 justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-600 text-sm">{meta.icon}</span>
            <h2 className="font-semibold text-gray-200 text-sm truncate">{meta.title}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Server info pills */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs bg-[#0f1520] border border-[#2a3044] text-gray-500 px-2 py-1 rounded">
                Ubuntu 24.04
              </span>
              <span className="text-xs bg-[#0f1520] border border-[#2a3044] text-gray-500 px-2 py-1 rounded">
                Apache 2.4
              </span>
              <span className="text-xs bg-[#0f1520] border border-[#2a3044] text-gray-500 px-2 py-1 rounded">
                PHP 8.3
              </span>
            </div>

            {/* Alerts */}
            <button className="relative text-gray-500 hover:text-white p-1.5 transition-colors">
              🔔
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#2a3044]">
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">A</div>
              <span className="text-sm font-semibold text-gray-300 hidden sm:block">admin</span>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        {page !== 'dashboard' && (
          <div className="px-6 py-2 border-b border-[#2a3044] bg-[#0f1520] flex items-center gap-1.5 text-xs text-gray-600">
            <button onClick={() => setPage('dashboard')} className="hover:text-orange-400 transition-colors">Dashboard</button>
            <span>/</span>
            <span className="text-gray-400">{meta.title}</span>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderPage()}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#2a3044] px-6 py-2 flex items-center justify-between text-[10px] text-gray-700">
          <span>NixPanel WHM v0.1.0 · Ubuntu 24.04 LTS</span>
          <span>© 2025 NixPanel</span>
        </footer>
      </div>
    </div>
  )
}

/* ── Login page ─────────────────────────────────────────────────────────── */
export default function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Username and password are required.')
      return
    }
    setLoading(true)
    setError('')
    setTimeout(() => {
      setLoading(false)
      setIsLoggedIn(true)
    }, 600)
  }

  if (isLoggedIn) return <AdminPanel />

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
              { icon: '🌐', title: 'Full DNS Control',    desc: 'PowerDNS-backed zone management' },
              { icon: '🔒', title: 'Auto SSL/TLS',        desc: "Let's Encrypt for all domains" },
              { icon: '🛡️', title: 'Built-in Firewall',   desc: 'CSF/Fail2ban integration' },
              { icon: '💾', title: 'Automated Backups',   desc: 'Scheduled full & incremental' },
              { icon: '🐘', title: 'Multi-PHP Support',   desc: 'PHP 8.0 – 8.3 per account' },
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

        <p className="text-[10px] text-gray-700">NixPanel WHM v0.1.0 · Secured by Fail2ban</p>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-black text-white">Nix<span className="text-orange-400">Server</span></span>
            <p className="text-xs text-gray-600 mt-1">WHM Control Panel</p>
          </div>

          <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl shadow-2xl overflow-hidden">
            {/* Card header */}
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
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="admin"
                  className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-700 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-700 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-bold text-sm transition-all shadow-lg shadow-orange-900/40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  'Sign in to WHM'
                )}
              </button>
            </form>

            <div className="border-t border-[#2a3044] px-6 py-3 bg-[#0f1520] flex items-center justify-between text-[10px] text-gray-700">
              <span>Secured by Fail2ban</span>
              <span>NixPanel v0.1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
