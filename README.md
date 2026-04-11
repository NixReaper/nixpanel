# NixPanel

A modern, open-source web hosting control panel for Linux servers — a free alternative to cPanel/WHM.

**NixServer** (port 2087) — Server admin panel for managing accounts, DNS, email, databases, SSL, and services.
**NixClient** (port 2083) — End-user panel for hosting account holders.

---

## Requirements

| Component | Version |
|-----------|---------|
| OS | Ubuntu 24.04 LTS |
| Architecture | x86_64 |
| RAM | 2 GB minimum, 4 GB recommended |
| Disk | 20 GB minimum |
| Root access | Required |

---

## Quick Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/NixReaper/nixpanel/main/install.sh)
```

Or download and inspect first:

```bash
curl -fsSL https://raw.githubusercontent.com/NixReaper/nixpanel/main/install.sh -o install.sh
less install.sh
bash install.sh
```

---

## What Gets Installed

| Component | Role |
|-----------|------|
| Apache 2 + PHP-FPM 8.2/8.3 | Web server |
| PowerDNS | DNS server |
| Exim4 | Mail transfer agent |
| Dovecot | IMAP / POP3 server |
| MariaDB | Database server |
| SpamAssassin | Spam filtering |
| Fail2ban | Brute force protection |
| Let's Encrypt (certbot) | Free SSL certificates |
| NixPanel | Control panel (ports 2083, 2087) |

---

## After Installation

| Panel | URL | Default credentials |
|-------|-----|---------------------|
| NixServer (admin) | `https://your-ip:2087` | Set during install |
| NixClient (user) | `https://your-ip:2083` | Per-account |

---

## Updating

```bash
bash /opt/nixpanel/scripts/update.sh
```

Or click **Upgrade Panel** in the NixServer sidebar.

---

## Stack

- **Backend** — Node.js (Fastify), SQLite (panel DB), Prisma ORM
- **Frontend** — React 18, Tailwind CSS, Vite
- **Auth** — JWT (access + refresh tokens), bcrypt

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

---

## License

NixPanel is source-available software. See [LICENSE](LICENSE) for details.
