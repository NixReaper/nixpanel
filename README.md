<div align="center">

<img src="https://raw.githubusercontent.com/NixReaper/nixpanel/main/assets/logo.png" alt="NixPanel" width="120" />

# NixPanel

**A fast, modern web hosting control panel for Linux servers.**  
Free and open alternative to cPanel/WHM — built in Rust.

[![Latest Release](https://img.shields.io/github/v/release/NixReaper/nixpanel?style=flat-square&color=00c2a0&label=release)](https://github.com/NixReaper/nixpanel/releases)
[![License](https://img.shields.io/badge/license-Proprietary-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Ubuntu%2024.04-E95420?style=flat-square&logo=ubuntu)](https://releases.ubuntu.com/24.04/)
[![Rust](https://img.shields.io/badge/backend-Rust-CE422B?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/NixReaper/nixpanel?style=flat-square)](https://github.com/NixReaper/nixpanel/stargazers)

[nixpanel.io](https://nixpanel.io) · [Documentation](https://nixpanel.io/docs) · [Pricing](https://nixpanel.io/#pricing) · [Changelog](CHANGELOG.md)

</div>

---

## Overview

NixPanel gives you everything cPanel/WHM does — without the legacy bloat or the $40/mo price tag.

| Panel | Port | Purpose |
|-------|------|---------|
| **NixServer** | `2087` | Server admin — accounts, DNS, mail, SSL, services |
| **NixClient** | `2083` | User panel — files, databases, email, domains |

---

## Requirements

| | |
|--|--|
| **OS** | Ubuntu 24.04 LTS (x86_64) |
| **RAM** | 2 GB minimum · 4 GB recommended |
| **Disk** | 20 GB minimum |
| **Access** | Root |

---

## Quick Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/NixReaper/nixpanel/main/install.sh)
```

> The installer is self-updating — it always fetches the latest version before running, so you never need to re-download it manually.

**Want to inspect before running?**

```bash
curl -fsSL https://raw.githubusercontent.com/NixReaper/nixpanel/main/install.sh -o install.sh
less install.sh
sudo bash install.sh
```

---

## What Gets Installed

| Component | Version | Role |
|-----------|---------|------|
| Apache 2 + PHP-FPM | 8.2 & 8.3 | Web server with multi-PHP support |
| MariaDB | 10.x | Database server (WordPress-compatible) |
| PowerDNS | Latest | DNS server |
| Exim 4 | Latest | Mail transfer agent |
| Dovecot | Latest | IMAP / POP3 server |
| SpamAssassin | Latest | Spam filtering |
| Fail2ban | Latest | Brute-force protection |
| Let's Encrypt | Certbot | Free SSL certificates |
| **NixPanel** | Latest | Control panel |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Panel backend | Rust · Axum · SQLx · Tokio |
| Database | MariaDB |
| Web server | Apache 2 (reverse proxy) |
| Auth | JWT · Argon2id |
| Frontend | React 18 · TypeScript · Tailwind CSS · Vite |

---

## Licensing

NixPanel uses a **central licensing server** at `license.nixpanel.io`. A license key is required during installation.

| Plan | Monthly | Annual | Servers |
|------|---------|--------|---------|
| Free | $0 | $0 | 1 |
| Solo | $9.99 | $95.90 | 1 |
| Host | $29.99 | $287.90 | 5 |
| Agency | $79.99 | $767.90 | Unlimited |

[Get a license → nixpanel.io](https://nixpanel.io/#pricing)

---

## Post-Install

| Task | Command |
|------|---------|
| Add SSL | `certbot --apache` |
| View logs | `journalctl -u nixpanel -f` |
| Restart panel | `systemctl restart nixpanel` |
| Update panel | `bash /opt/nixpanel/scripts/update.sh` |

Access your panels:

```
http://YOUR_IP:2087   ← NixServer (admin)
http://YOUR_IP:2083   ← NixClient (users)
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## License

NixPanel is **source-available** software. You may inspect and self-host under the terms of the [NixPanel License](LICENSE). Redistribution, resale, or offering NixPanel as a managed service is not permitted without a commercial agreement.

© 2025 NixPanel. All rights reserved.
