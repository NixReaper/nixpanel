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
- **Licensing** — license key validated against `https://license.nixpanel.io` during install
  - Plans: Free, Solo ($9.99/mo), Host ($29.99/mo), Agency ($79.99/mo)
  - Server IP binding with grace period fallback
- **nixpanel.io** — customer portal at [nixpanel.io](https://nixpanel.io)
  - Stripe subscriptions with monthly and annual billing
  - Customer auth: register, login, email verification, password reset
  - License management and IP change requests

### Infrastructure
- `.gitattributes` enforcing LF line endings for `.sh`, `.rs`, `.toml`, `.sql`, `.md` files

---

[Unreleased]: https://github.com/NixReaper/nixpanel/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/NixReaper/nixpanel/releases/tag/v0.1.0-alpha
