# NixPanel Changelog

All notable changes to NixPanel are documented here.
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.5.0] — 2026-04-11

### Bug Fixes
- Clean install on every update — `node_modules` and lock file are always regenerated fresh on the server platform, eliminating rollup native binary mismatches between Windows dev machines and Linux servers.
- `update.sh` no longer blocked by local `package-lock.json` changes.
- `.gitignore` corrected for `nixserver/` and `nixclient/` dist paths.

---

## [0.4.8] — 2026-04-11

### Bug Fixes
- Login page now fetches version from `/api/health` dynamically instead of showing a hardcoded stale version number.
- Login page subtitle changed from "Web Host Manager" to "Admin Panel".

---

## [0.4.6] — 2026-04-11

### Changes
- Removed all WHM® trademark references throughout the panel. All instances replaced with "NixServer".

---

## [0.4.5] — 2026-04-11

### New Features
- **Day/Night mode toggle** — sun/moon flip switch in the dashboard info bar. Preference persisted across sessions.

### Bug Fixes
- Sidebar version refresh now clears stale value immediately and cache-busts the API response.
- `uptime` added to exec allowlist — fixes Hostname/OS showing `…` on the dashboard.
- Version fetch auto-retries every 5 s after failure (handles post-upgrade service restart window).

---

## [0.4.4] — 2026-04-11

### New Features
- **Server info bar** — cPanel-style strip at the top of the dashboard showing Username, Hostname, OS, NixPanel Version, live Load Averages, and Server Monitoring alert count.

---

## [0.4.3] — 2026-04-11

### New Features
- **Version display in sidebar** — shows installed version with up-to-date / update-available indicator.
- **One-click panel upgrade** — upgrade button in the sidebar footer runs `update.sh` in the background. Panel restarts automatically.
- **Check for updates** — refresh icon re-fetches version on demand.

---

## [0.4.2] — 2026-04-11

### New Features
- **NixServer sidebar redesigned** — full collapsible category sidebar with 29 categories and ~210 menu items. Live search, auto-expand active category, sidebar toggle.

---

## [0.4.1] — 2026-04-11

### Bug Fixes (Installer)
- SpamAssassin: Ubuntu 24.04 service name is `spamd`, not `spamassassin`.
- PowerDNS: `systemd-resolved` stub listener disabled before package install to free port 53.
- Git clone into pre-existing directory handled correctly.
- Apache 403 fixed — post-build `chmod 755/644` on all dist assets.
- Apache 500 fixed — `mod_proxy_http` and `mod_proxy_wstunnel` now enabled.

---

## [0.4.0] — 2026-04-11

### New Features
- Shell Access Manager — enable/disable SSH shell access per hosting account.
- Apache Log Viewer — view access/error logs per account.
- WebServer page rewritten to Apache-only stack.

---

## [0.3.x] — 2026-04-10

### Architecture
- Full service stack: Apache2 + PHP-FPM, PowerDNS, Exim4, Dovecot, MariaDB, SQLite (panel DB).
- Complete MariaDB management, email routing, certbot SSL, Fail2ban.

---

## [0.2.0]

- Initial development release. Renamed to NixServer / NixClient.
