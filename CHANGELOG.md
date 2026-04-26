# Changelog

All notable changes to NixPanel are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned
- SSL certificate management (Let's Encrypt via Certbot)
- File manager
- MySQL/MariaDB database manager (per-account)
- WordPress one-click installer
- Backup / restore system
- Firewall rule editor (CSF/iptables)
- Multi-server support (Agency plan)
- NixClient pages: databases, FTP, subdomains, redirects, PHP version selector, stats

---

## [0.3.0-alpha] — 2026-04-25

### Added
- **DNS Management** — full CRUD via pdnsutil
  - `GET  /api/dns`             — list all PowerDNS zones
  - `GET  /api/dns/:domain`     — list records (A, AAAA, MX, TXT, CNAME, NS, SRV, CAA)
  - `POST /api/dns/:domain`     — add record (name, type, TTL, content)
  - `DELETE /api/dns/:domain`   — delete an RRset (name + type)
  - SOA records hidden; zone auto-rectified after each change
- **NixServer — Zone Manager page** (`domains`): lists all PowerDNS zones, click → DNS editor
- **NixServer — DNS Records page** (`dns`): record table with inline add/delete, zone switcher dropdown, colour-coded type badges
- **NixServer — Service Manager page** (`services`): dedicated page with refresh button and running/stopped summary pills
- **NixServer — Account actions**: Suspend / Unsuspend / Terminate buttons with confirmation modal
  - `POST /api/accounts/:username/suspend` / `unsuspend`
  - `DELETE /api/accounts/:username` — deprovisions vhost, FPM, DNS; removes system user; cascades DB records
- **Email account management**
  - `GET  /api/email/:username`  — list email accounts for a hosting account
  - `POST /api/email`            — create mailbox (Maildir provisioned under `~/mail/`)
  - `DELETE /api/email/id/:id`   — delete email account
- **NixClient — Email Accounts page** — create, list, delete mailboxes with quota display
- **NixClient — Domains page** — shows primary domain, document root, quota, bandwidth
- **NixClient — Change Password page** — verifies current password, hashes and updates both `users` and `accounts` tables
- **NixClient — AccountSidebar** now fetches real account data (domain, package, quota) from `GET /api/accounts/:username`
- **Password change API** — `POST /api/me/password` (verifies old password via Argon2id, updates `users` + `accounts`)
- **Single account lookup** — `GET /api/accounts/:username`

### Changed
- NixServer footer / login version bump: `v0.2.0-alpha` → `v0.3.0-alpha`
- NixClient footer / login version bump: `v0.2.0-alpha` → `v0.3.0-alpha`
- List Accounts: domain cell links to site, suspend/terminate replace placeholder Edit button

---

## [0.2.0-alpha] — 2026-04-25

### Added
- **Rust backend** — Cargo workspace with independently compiled + UPX-compressed section executables
  - `nixpanel-common` — shared `SectionRequest` / `SectionResponse` IPC types
  - `nixpanel-api` — main Axum HTTP server on port 4000
    - `POST /api/auth/login` — Argon2id password verification, HS256 JWT (8-hour expiry)
    - `GET  /api/dashboard`  — real account/domain/database/email counts + system stats
    - `GET  /api/services`   — live service status via systemctl
    - `POST /api/services/:name/:action` — start / stop / restart any managed service
    - `GET  /api/accounts`   — list hosting accounts from MariaDB
    - `POST /api/accounts`   — create account (system user, home dir, DB record)
    - Auto-runs DB schema migrations on first start
    - Seeds admin user from `/opt/nixpanel/.admin_user` + `.admin_pass` on first run
  - `nixpanel-services` — section binary; reads JSON from stdin, calls systemctl, writes JSON to stdout
    - Actions: `list`, `start`, `stop`, `restart`, `reload`
    - Reports PID and uptime per service
  - `nixpanel-sysinfo` — section binary; reads `/proc/meminfo`, `/proc/stat`, `/proc/loadavg`, `df`
    - Actions: `stats` (CPU, RAM, disk, load, hostname, IP, OS, kernel), `versions` (Apache, PHP, MariaDB)
- **Database schema** (`nixpanel-api/migrations/0001_initial.sql`)
  - Tables: `users`, `accounts`, `domains`, `dns_records`, `account_databases`,
    `email_accounts`, `ftp_accounts`, `ssl_certificates`, `backups`
- **Frontend API clients** (`nixserver/src/api.ts`, `nixclient/src/api.ts`)
  - JWT stored in `localStorage`, included in all requests as `Authorization: Bearer`
  - Auto-clears token and reloads on 401

### Changed
- **NixServer UI** — full redesign matching WHM visual style
  - Dark navy / orange-accent theme
  - Collapsible sidebar with grouped navigation sections
  - Dashboard: live stat bar, server info bar, service manager table, quick-action icon grid
  - List Accounts: real data table with search/filter
  - Create Account: full form wired to API (creates system user, DB record)
  - Login: real JWT auth; session persists across refresh via `localStorage`
- **NixClient UI** — full redesign matching cPanel visual style
  - Blue-accent theme
  - Feature icon grid grouped by category with live search
  - Account sidebar with usage bars
  - Login: real JWT auth
- **Installer** (`install.sh`)
  - Rust build step now copies all `nixpanel-*` section binaries to `/opt/nixpanel/bin/`
  - Installs UPX and compresses each binary after build
  - Admin credentials auto-generated with `openssl rand` (no TTY prompts)
  - Node.js 20 LTS installed as its own idempotent step (`nodejs.done`)
  - NixClient build uses absolute path to avoid wrong-directory check
  - npm output visible during build (removed `--silent`) for easier debugging
- **Vite configs** — added `/api` proxy to `localhost:4000` for local development
- **Minifier** — switched both UIs from `terser` (not installed) to `esbuild`

### Fixed
- Login inputs changed from `type="email"` to `type="text"` with "Username" label
- `sqlx::query!()` macros replaced with non-macro `query()` / `query_as()` / `query_scalar()`
  so the binary compiles without a live database connection
- Removed `axum_extra` import that was never added to `Cargo.toml`
- Git clone always removes stale `$SRC_DIR` before cloning (fixes "couldn't find remote ref master" on re-run)

---

## [0.1.0-alpha] — 2025-04-25

### Added
- **Installer** (`install.sh`) — fully automated Ubuntu 24.04 installer
  - Self-updating: always fetches the latest version from GitHub before running
  - Idempotent step tracking — re-runnable after failures without redoing completed steps
  - Installs Apache 2, PHP 8.2 + 8.3 (via ondrej/php PPA), MariaDB, PowerDNS,
    Exim 4, Dovecot, SpamAssassin, Fail2ban, Certbot
  - Configures Apache reverse proxy on ports 2083 (NixClient) and 2087 (NixServer)
  - Generates admin credentials automatically; displays them in the completion banner
  - License activation against `https://license.nixpanel.io`
- **NixServer** — WHM-style admin panel (React 18 + TypeScript + Tailwind + Vite, port 2087)
- **NixClient** — cPanel-style user panel (React 18 + TypeScript + Tailwind + Vite, port 2083)
- **Licensing** — license key validated against `https://license.nixpanel.io` during install
  - Plans: Free, Solo ($9.99/mo), Host ($29.99/mo), Agency ($79.99/mo)
- **Infrastructure** — `.gitattributes` enforcing LF line endings

---

[Unreleased]: https://github.com/NixReaper/nixpanel/compare/v0.3.0-alpha...HEAD
[0.3.0-alpha]: https://github.com/NixReaper/nixpanel/compare/v0.2.0-alpha...v0.3.0-alpha
[0.2.0-alpha]: https://github.com/NixReaper/nixpanel/compare/v0.1.0-alpha...v0.2.0-alpha
[0.1.0-alpha]: https://github.com/NixReaper/nixpanel/releases/tag/v0.1.0-alpha
