import { useState, useEffect } from 'react'
import * as api from './api'
import type { AccountInfo, EmailAccount } from './api'

/* ── Types ───────────────────────────────────────────────────────────── */
type Page =
  | 'home' | 'domains' | 'subdomains' | 'redirects'
  | 'email' | 'emailAccounts' | 'webmail' | 'spamFilter'
  | 'databases' | 'mysql' | 'phpmyadmin'
  | 'files' | 'fileManager' | 'ftp' | 'backups'
  | 'security' | 'ssl' | 'passwords' | 'ssh'
  | 'software' | 'php' | 'wordpress'
  | 'stats' | 'logs'

/* ── Feature groups ──────────────────────────────────────────────────── */
type Feature = { id: Page; label: string; icon: string; desc: string }
type FeatureGroup = { label: string; color: string; features: Feature[] }

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'Domains', color: 'blue', features: [
      { id: 'domains',    label: 'Domains',    icon: '🌐', desc: 'Addon & parked domains' },
      { id: 'subdomains', label: 'Subdomains', icon: '🔗', desc: 'Create subdomains' },
      { id: 'redirects',  label: 'Redirects',  icon: '↪️', desc: '301 / 302 redirects' },
    ],
  },
  {
    label: 'Email', color: 'emerald', features: [
      { id: 'emailAccounts', label: 'Email Accounts', icon: '✉️', desc: 'Create & manage mailboxes' },
      { id: 'webmail',       label: 'Webmail',        icon: '📬', desc: 'Open Roundcube webmail' },
      { id: 'spamFilter',    label: 'Spam Filters',   icon: '🚫', desc: 'SpamAssassin rules' },
    ],
  },
  {
    label: 'Databases', color: 'purple', features: [
      { id: 'mysql',      label: 'MySQL Databases', icon: '🗄️', desc: 'Create & manage DBs' },
      { id: 'phpmyadmin', label: 'phpMyAdmin',      icon: '🖥️', desc: 'Database admin GUI' },
    ],
  },
  {
    label: 'Files', color: 'orange', features: [
      { id: 'fileManager', label: 'File Manager', icon: '📁', desc: 'Browse & edit files' },
      { id: 'ftp',         label: 'FTP Accounts', icon: '📡', desc: 'Manage FTP users' },
      { id: 'backups',     label: 'Backups',      icon: '💾', desc: 'Download & restore' },
    ],
  },
  {
    label: 'Security', color: 'red', features: [
      { id: 'ssl',       label: 'SSL / TLS', icon: '🔒', desc: "Let's Encrypt certs" },
      { id: 'passwords', label: 'Password',  icon: '🔑', desc: 'Change cPanel password' },
      { id: 'ssh',       label: 'SSH Keys',  icon: '🗝️', desc: 'Manage SSH key pairs' },
    ],
  },
  {
    label: 'Software', color: 'cyan', features: [
      { id: 'php',       label: 'PHP Version', icon: '🐘', desc: 'Select PHP 8.x' },
      { id: 'wordpress', label: 'WordPress',   icon: '🌀', desc: 'Auto-install WP' },
    ],
  },
  {
    label: 'Metrics', color: 'yellow', features: [
      { id: 'stats', label: 'Statistics', icon: '📊', desc: 'Bandwidth & visitors' },
      { id: 'logs',  label: 'Logs',       icon: '📜', desc: 'Error & access logs' },
    ],
  },
]

const COLOR_MAP: Record<string, { tile: string; icon: string }> = {
  blue:    { tile: 'hover:border-blue-500/40 hover:bg-blue-500/5',     icon: 'bg-blue-500/15 text-blue-400' },
  emerald: { tile: 'hover:border-emerald-500/40 hover:bg-emerald-500/5', icon: 'bg-emerald-500/15 text-emerald-400' },
  purple:  { tile: 'hover:border-purple-500/40 hover:bg-purple-500/5',  icon: 'bg-purple-500/15 text-purple-400' },
  orange:  { tile: 'hover:border-orange-500/40 hover:bg-orange-500/5',  icon: 'bg-orange-500/15 text-orange-400' },
  red:     { tile: 'hover:border-red-500/40 hover:bg-red-500/5',        icon: 'bg-red-500/15 text-red-400' },
  cyan:    { tile: 'hover:border-cyan-500/40 hover:bg-cyan-500/5',      icon: 'bg-cyan-500/15 text-cyan-400' },
  yellow:  { tile: 'hover:border-yellow-500/40 hover:bg-yellow-500/5',  icon: 'bg-yellow-500/15 text-yellow-400' },
}

/* ── Usage bar ───────────────────────────────────────────────────────── */
function UsageBar({ label, used, total, unit, color }: { label: string; used: number; total: number; unit: string; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : color
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-gray-500">{used === 0 ? '0' : used} / {total === 0 ? '∞' : total + ' ' + unit}</span>
      </div>
      <div className="h-1.5 bg-[#2a3044] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${total === 0 ? 5 : pct}%` }} />
      </div>
    </div>
  )
}

/* ── Account sidebar ─────────────────────────────────────────────────── */
function AccountSidebar({ account, username, onNav }: {
  account: AccountInfo | null; username: string; onNav: (p: Page) => void
}) {
  const domain = account?.domain ?? username
  return (
    <aside className="w-64 flex-shrink-0 space-y-4">
      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-black mb-2">
            {domain.charAt(0).toUpperCase()}
          </div>
          <p className="text-white font-bold text-sm leading-tight">{domain}</p>
          <p className="text-blue-200 text-xs mt-0.5">{account?.package_name ?? 'Hosting'} Account</p>
        </div>
        <div className="px-4 py-3 space-y-3">
          <UsageBar label="Disk Space" used={0} total={account?.disk_quota_mb ?? 0} unit="MB" color="bg-blue-500" />
          <UsageBar label="Bandwidth"  used={0} total={account?.bandwidth_mb  ?? 0} unit="MB" color="bg-emerald-500" />
          <UsageBar label="Email"      used={0} total={0} unit="" color="bg-purple-500" />
          <UsageBar label="Databases"  used={0} total={0} unit="" color="bg-orange-500" />
        </div>
      </div>

      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Account Info</p>
        {[
          { label: 'Domain',     value: account?.domain       ?? '—' },
          { label: 'Username',   value: account?.username     ?? username },
          { label: 'Package',    value: account?.package_name ?? '—' },
          { label: 'Home Dir',   value: `/home/${account?.username ?? username}` },
          { label: 'Status',     value: account?.status       ?? '—' },
        ].map(r => (
          <div key={r.label} className="flex justify-between items-center text-xs py-1 border-b border-[#252b3d] last:border-0">
            <span className="text-gray-600">{r.label}</span>
            <span className="text-gray-300 font-medium truncate max-w-[120px]">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl overflow-hidden">
        <p className="px-4 py-2.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest border-b border-[#2a3044]">Quick Links</p>
        {[
          { label: '🌐  Visit Website',   action: () => account?.domain && window.open(`http://${account.domain}`, '_blank') },
          { label: '✉️  Email Accounts',  action: () => onNav('emailAccounts') },
          { label: '🔑  Change Password', action: () => onNav('passwords') },
        ].map(l => (
          <button key={l.label} onClick={l.action}
            className="w-full flex items-center px-4 py-2.5 text-xs text-gray-400 hover:bg-[#252b3d] hover:text-white transition-colors border-b border-[#252b3d] last:border-0 text-left">
            {l.label}
          </button>
        ))}
      </div>
    </aside>
  )
}

/* ── Home / feature grid ─────────────────────────────────────────────── */
function Home({ onNav }: { onNav: (p: Page) => void }) {
  const [search, setSearch] = useState('')
  const allFeatures = FEATURE_GROUPS.flatMap(g => g.features.map(f => ({ ...f, groupColor: g.color })))
  const filtered = search.trim()
    ? allFeatures.filter(f => f.label.toLowerCase().includes(search.toLowerCase()) || f.desc.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div className="space-y-6">
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search features…"
          className="w-full bg-[#1a1f2e] border border-[#2a3044] focus:border-blue-500/60 text-white rounded-xl pl-9 pr-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 text-xs">✕</button>
        )}
      </div>

      {filtered ? (
        <div>
          <p className="text-xs text-gray-600 mb-3">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(f => {
              const c = COLOR_MAP[f.groupColor]
              return (
                <button key={f.id} onClick={() => onNav(f.id)}
                  className={`flex flex-col items-center text-center p-4 bg-[#1a1f2e] border border-[#2a3044] rounded-xl transition-all group ${c.tile}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2.5 ${c.icon}`}>{f.icon}</div>
                  <span className="text-xs font-semibold text-gray-300 group-hover:text-white leading-tight">{f.label}</span>
                  <span className="text-[10px] text-gray-600 group-hover:text-gray-400 mt-0.5 leading-tight">{f.desc}</span>
                </button>
              )
            })}
          </div>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No features found for "{search}"</div>}
        </div>
      ) : (
        <div className="space-y-6">
          {FEATURE_GROUPS.map(group => {
            const c = COLOR_MAP[group.color]
            return (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{group.label}</h2>
                  <div className="flex-1 h-px bg-[#2a3044]" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {group.features.map(f => (
                    <button key={f.id} onClick={() => onNav(f.id)}
                      className={`flex flex-col items-center text-center p-4 bg-[#1a1f2e] border border-[#2a3044] rounded-xl transition-all group ${c.tile}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2.5 ${c.icon}`}>{f.icon}</div>
                      <span className="text-xs font-semibold text-gray-300 group-hover:text-white leading-tight">{f.label}</span>
                      <span className="text-[10px] text-gray-600 group-hover:text-gray-400 mt-1 leading-tight">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Domains page ─────────────────────────────────────────────────────── */
function Domains({ account }: { account: AccountInfo | null }) {
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <div className="text-gray-600 text-sm">Loading domain info…</div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-white">Domains</h1>
      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a3044] bg-[#0f1520]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Primary Domain</h3>
        </div>
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">{account.domain}</p>
            <p className="text-xs text-gray-500 mt-0.5">Main domain · {account.package_name} package</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
            <a href={`http://${account.domain}`} target="_blank" rel="noopener"
              className="px-3 py-1.5 bg-[#2a3044] hover:bg-blue-500/20 hover:text-blue-400 text-gray-400 text-xs rounded-lg transition-colors">
              Visit Site ↗
            </a>
          </div>
        </div>
        <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Document Root', value: `/home/${account.username}/public_html` },
            { label: 'Home Dir',      value: `/home/${account.username}` },
            { label: 'Disk Quota',    value: account.disk_quota_mb === 0 ? 'Unlimited' : `${account.disk_quota_mb} MB` },
            { label: 'Bandwidth',     value: account.bandwidth_mb  === 0 ? 'Unlimited' : `${account.bandwidth_mb} MB/mo` },
          ].map(i => (
            <div key={i.label} className="bg-[#0f1520] border border-[#2a3044] rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">{i.label}</p>
              <p className="text-xs text-gray-300 font-mono break-all">{i.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Addon Domains</h3>
          <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] rounded font-semibold">Coming Soon</div>
        </div>
        <p className="text-xs text-gray-600">Addon domain management will be available in the next release.</p>
      </div>
    </div>
  )
}

/* ── Email Accounts page ─────────────────────────────────────────────── */
function EmailAccounts({ account }: { account: AccountInfo | null }) {
  const [emails, setEmails]   = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg]         = useState('')
  const [form, setForm]       = useState({ username: '', password: '', quota_mb: 1024 })

  const username = account?.username ?? localStorage.getItem('nixclient_username') ?? ''
  const domain   = account?.domain   ?? ''

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const refresh = () => {
    if (!username) return
    setLoading(true)
    api.listMyEmailAccounts(username).then(setEmails).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [username])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password || !domain) {
      flash('Username, password, and domain are required')
      return
    }
    try {
      await api.createEmailAccount({ username: form.username, domain, password: form.password, quota_mb: form.quota_mb })
      flash(`Created ${form.username}@${domain}`)
      setShowAdd(false)
      setForm({ username: '', password: '', quota_mb: 1024 })
      refresh()
    } catch (e: any) {
      flash(`Error: ${e.message}`)
    }
  }

  const handleDelete = async (id: number, address: string) => {
    if (!confirm(`Delete ${address}? This cannot be undone.`)) return
    try {
      await api.deleteEmailAccount(id)
      flash(`Deleted ${address}`)
      refresh()
    } catch (e: any) {
      flash(`Error: ${e.message}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white">Email Accounts</h1>
          <p className="text-xs text-gray-500 mt-0.5">{domain ? `Manage mailboxes for ${domain}` : 'Loading…'}</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">{msg}</span>}
          <button onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors">
            + Create Account
          </button>
        </div>
      </div>

      {/* Create form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="bg-[#1a1f2e] border border-blue-500/30 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-blue-400">New Email Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Username</label>
              <div className="flex items-center gap-1">
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="info"
                  className="flex-1 bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60" />
                <span className="text-gray-500 text-sm">@{domain || '…'}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quota (MB)</label>
              <input type="number" value={form.quota_mb} onChange={e => setForm(f => ({ ...f, quota_mb: Number(e.target.value) }))}
                className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-colors">Create Account</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-[#2a3044] text-gray-400 hover:text-white text-sm rounded transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Email list */}
      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-600 text-sm">
            <span className="inline-block w-4 h-4 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mr-2" />Loading…
          </div>
        ) : emails.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">✉️</div>
            <p className="text-gray-500 text-sm">No email accounts yet.</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-blue-400 hover:underline text-sm">Create your first mailbox →</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a3044] bg-[#0f1520]">
                {['Address', 'Quota', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emails.map(em => (
                <tr key={em.id} className="border-b border-[#252b3d] hover:bg-[#252b3d]/50 transition-colors">
                  <td className="px-4 py-3 text-gray-300 font-medium">{em.address}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{em.quota_mb} MB</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(em.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(em.id, em.address)}
                      className="px-2 py-0.5 rounded text-[11px] bg-[#2a3044] hover:text-red-400 text-gray-400 transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ── Change Password page ────────────────────────────────────────────── */
function ChangePassword() {
  const [form, setForm]   = useState({ current: '', newPw: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPw !== form.confirm) { setError('New passwords do not match.'); return }
    if (form.newPw.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      await api.changePassword(form.current, form.newPw)
      setSuccess('Password changed successfully.')
      setForm({ current: '', newPw: '', confirm: '' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h1 className="text-lg font-black text-white">Change Password</h1>
        <p className="text-xs text-gray-500 mt-0.5">Update your NixClient account password</p>
      </div>
      {error   && <div className="px-4 py-3 bg-red-950/60 border border-red-800/50 rounded-lg text-red-400 text-sm">⚠️ {error}</div>}
      {success && <div className="px-4 py-3 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-emerald-400 text-sm">✓ {success}</div>}
      <form onSubmit={handleSubmit} className="bg-[#1a1f2e] border border-[#2a3044] rounded-lg divide-y divide-[#2a3044]">
        <div className="p-5 space-y-4">
          {[
            { label: 'Current Password', key: 'current' as const, placeholder: 'Enter current password' },
            { label: 'New Password',     key: 'newPw'   as const, placeholder: 'At least 8 characters' },
            { label: 'Confirm New Password', key: 'confirm' as const, placeholder: 'Repeat new password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">{f.label}</label>
              <input type="password" value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder} required
                className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/60" />
            </div>
          ))}
        </div>
        <div className="p-5">
          <button type="submit" disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded transition-colors flex items-center gap-2">
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Updating…' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Placeholder ──────────────────────────────────────────────────────── */
function Placeholder({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-72 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-600 text-sm max-w-sm">This module is under active development and will be available in an upcoming release.</p>
      <div className="mt-4 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400 font-semibold">Coming Soon</div>
    </div>
  )
}

const PAGE_META: Record<Page, { title: string; icon: string }> = {
  home:          { title: 'My Control Panel',  icon: '▦'  },
  domains:       { title: 'Domains',           icon: '🌐' },
  subdomains:    { title: 'Subdomains',        icon: '🔗' },
  redirects:     { title: 'Redirects',         icon: '↪️' },
  email:         { title: 'Email',             icon: '✉️' },
  emailAccounts: { title: 'Email Accounts',    icon: '✉️' },
  webmail:       { title: 'Webmail',           icon: '📬' },
  spamFilter:    { title: 'Spam Filters',      icon: '🚫' },
  databases:     { title: 'Databases',         icon: '🗄️' },
  mysql:         { title: 'MySQL Databases',   icon: '🗄️' },
  phpmyadmin:    { title: 'phpMyAdmin',        icon: '🖥️' },
  files:         { title: 'Files',             icon: '📁' },
  fileManager:   { title: 'File Manager',      icon: '📁' },
  ftp:           { title: 'FTP Accounts',      icon: '📡' },
  backups:       { title: 'Backups',           icon: '💾' },
  security:      { title: 'Security',          icon: '🔒' },
  ssl:           { title: 'SSL / TLS',         icon: '🔒' },
  passwords:     { title: 'Change Password',   icon: '🔑' },
  ssh:           { title: 'SSH Keys',          icon: '🗝️' },
  software:      { title: 'Software',          icon: '🐘' },
  php:           { title: 'PHP Version',       icon: '🐘' },
  wordpress:     { title: 'WordPress',         icon: '🌀' },
  stats:         { title: 'Statistics',        icon: '📊' },
  logs:          { title: 'Logs',              icon: '📜' },
}

/* ── Client panel shell ───────────────────────────────────────────────── */
function ClientPanel({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [page, setPage]         = useState<Page>('home')
  const [account, setAccount]   = useState<AccountInfo | null>(null)
  const meta = PAGE_META[page]

  // Fetch account info on mount
  useEffect(() => {
    api.getMyAccount(username).then(setAccount).catch(console.error)
  }, [username])

  function renderPage() {
    switch (page) {
      case 'home':          return <Home onNav={setPage} />
      case 'domains':       return <Domains account={account} />
      case 'emailAccounts': return <EmailAccounts account={account} />
      case 'email':         return <EmailAccounts account={account} />
      case 'passwords':     return <ChangePassword />
      default:              return <Placeholder title={meta.title} icon={meta.icon} />
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1520] text-white flex flex-col">
      {/* Top nav */}
      <header className="bg-[#1a1f2e] border-b border-[#2a3044] sticky top-0 z-40 flex-shrink-0">
        <div className="h-14 max-w-screen-2xl mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-black">N</div>
            <span className="text-base font-black text-white hidden sm:block">Nix<span className="text-blue-400">Client</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'home'          as Page, label: 'Home' },
              { id: 'emailAccounts' as Page, label: 'Email' },
              { id: 'mysql'         as Page, label: 'Databases' },
              { id: 'ssl'           as Page, label: 'Security' },
              { id: 'stats'         as Page, label: 'Stats' },
            ].map(l => (
              <button key={l.id} onClick={() => setPage(l.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === l.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#252b3d]'
                }`}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0f1520] border border-[#2a3044] rounded-lg">
              <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                {(account?.domain ?? username).charAt(0).toUpperCase()}
              </span>
              <span className="text-xs text-gray-300 font-medium max-w-[120px] truncate">{account?.domain ?? username}</span>
            </div>
            <button onClick={onLogout}
              className="px-3 py-1.5 rounded-lg border border-[#2a3044] text-gray-400 hover:border-gray-600 hover:text-white transition-colors text-xs font-medium">
              Sign out
            </button>
          </div>
        </div>

        {page !== 'home' && (
          <div className="border-t border-[#252b3d] px-6 py-1.5 flex items-center gap-1.5 text-[11px] text-gray-600 max-w-screen-2xl mx-auto">
            <button onClick={() => setPage('home')} className="hover:text-blue-400 transition-colors">Home</button>
            <span>/</span>
            <span className="text-gray-400">{meta.title}</span>
          </div>
        )}
      </header>

      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 flex gap-6">
        <AccountSidebar account={account} username={username} onNav={setPage} />
        <main className="flex-1 min-w-0">{renderPage()}</main>
      </div>

      <footer className="border-t border-[#2a3044] px-6 py-3 text-center text-[10px] text-gray-700">
        NixPanel Client v0.3.0-alpha · {account?.domain ?? username} · Powered by NixServer
      </footer>
    </div>
  )
}

/* ── Login ────────────────────────────────────────────────────────────── */
export default function App() {
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [loggedInAs, setLoggedInAs] = useState<string | null>(null)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (api.isLoggedIn()) {
      const stored = localStorage.getItem('nixclient_username')
      setLoggedInAs(stored ?? 'user')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError('Please enter your username and password.'); return }
    setLoading(true); setError('')
    try {
      const result = await api.login(username, password)
      if (result.user.role === 'admin') {
        api.clearToken()
        setError('Admin accounts must use NixServer (port 2087).')
        return
      }
      localStorage.setItem('nixclient_username', result.user.username)
      setLoggedInAs(result.user.username)
    } catch (err: any) {
      setError(err.message === 'Unauthorized' ? 'Invalid username or password.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.clearToken()
    localStorage.removeItem('nixclient_username')
    setLoggedInAs(null)
    setUsername(''); setPassword('')
  }

  if (loggedInAs) return <ClientPanel username={loggedInAs} onLogout={handleLogout} />

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1520] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-[#0f1520] to-[#0f1520]" />
      <div className="relative w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-900/50">N</div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white leading-none">Nix<span className="text-blue-400">Client</span></h1>
              <p className="text-xs text-gray-600 font-medium">Hosting Control Panel</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4">
            <h2 className="text-white font-bold text-base">Sign in to your account</h2>
            <p className="text-blue-200 text-xs mt-0.5">NixClient Hosting Control Panel</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-950/60 border border-red-800/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" placeholder="username"
                className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-700 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••"
                className="w-full bg-[#0f1520] border border-[#2a3044] text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-700 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2">
              {loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>) : 'Sign in'}
            </button>
          </form>

          <div className="border-t border-[#2a3044] px-6 py-3 bg-[#0f1520] text-[10px] text-gray-700 text-center">
            NixPanel Client v0.3.0-alpha · Manage your hosting account
          </div>
        </div>
      </div>
    </div>
  )
}
