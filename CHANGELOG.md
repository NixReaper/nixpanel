# Changelog

All notable changes to NixPanel are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned
- NixServer (WHM) — full Rust backend
- NixClient (cPanel) — full Rust backend
- DNS zone editor
- Email account management
- SSL certificate management via Let's Encrypt
- File manager
- MySQL/MariaDB database manager
- WordPress one-click installer
- Backup / restore system
- Multi-server support (Agency plan)

---

## [0.1.0-alpha] — 2025-04-25

### Added
- **Installer** (`install.sh`) — fully automated Ubuntu 24.04 installer
  - Self-updating: always fetches the latest version from GitHub before running
  - Idempotent step tracking — re-runnable after failures without redoing completed steps
  - Installs Apache 2, PHP 8.2 + 8.3 (via ondrej/php PPA), MariaDB, PowerDNS, Exim 4, Dovecot, SpamAssassin, Fail2ban, Certbot
  - Configures Apache reverse proxy on ports 2083 (NixClient) and 2087 (NixServer)
  - Prompts for admin credentials, hostname, and license key during install
  - License activation against `https://license.nixpanel.io` with grace period fallback
- **Licensing server** (`nixpanel-licensing`) — central SaaS licensing
  - Rust · Axum · SQLx · MariaDB
  - RSA-4096 signed JWT license tokens
  - Server IP binding with conflict detection
  - Plans: Free, Solo ($9.99/mo), Host ($29.99/mo), Agency ($79.99/mo)
  - Admin API with Argon2id authentication
  - Validation logging and grace period enforcement
  - Repo: [NixReaper/nixpanel-licensing](https://github.com/NixReaper/nixpanel-licensing)
- **Website API** (`nixpanel-website-api`) — nixpanel.io customer portal backend
  - Rust · Axum · SQLx · MariaDB
  - Stripe subscriptions (checkout sessions, billing portal, webhooks)
  - Customer auth: register, login, email verification, password reset (Argon2id)
  - License management: view active license, IP change requests
  - SMTP transactional email via Lettre
  - Repo: [NixReaper/nixpanel-website](https://github.com/NixReaper/nixpanel-website)
- **Website frontend** — nixpanel.io marketing & customer portal
  - React 18 · TypeScript · Tailwind CSS · Vite
  - Pages: Home, Pricing (monthly/annual toggle), Login, Register, Dashboard, Email Verify, Password Reset

### Infrastructure
- `.gitattributes` enforcing LF line endings for `.sh`, `.rs`, `.toml`, `.sql`, `.md` files

---

[Unreleased]: https://github.com/NixReaper/nixpanel/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/NixReaper/nixpanel/releases/tag/v0.1.0-alpha
