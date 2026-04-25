# Security Policy

## Supported Versions

Only the latest release of NixPanel receives security fixes.

| Version | Supported |
|---------|-----------|
| Latest stable | ✅ |
| Older releases | ❌ |

We strongly recommend always running the latest version. The installer is self-updating and will always pull the current release.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### Option 1 — GitHub Private Vulnerability Reporting (preferred)

Use GitHub's built-in private reporting:  
[Report a vulnerability](https://github.com/NixReaper/nixpanel/security/advisories/new)

This keeps the report confidential until a fix is released.

### Option 2 — Email

Send details to **security@nixpanel.io**

Include:
- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Any proof-of-concept code (if available)

We will acknowledge your report within **48 hours** and aim to release a fix within **14 days** for critical issues.

## Scope

Issues we consider in-scope:

- Remote code execution
- Privilege escalation
- Authentication bypass
- SQL injection
- Sensitive data exposure (credentials, license keys, private keys)
- Cross-site scripting (XSS) in the control panel UI
- Server-side request forgery (SSRF)

Out of scope:

- Vulnerabilities in software NixPanel installs but does not control (Apache, MariaDB, PHP, etc.) — report those to the respective upstream projects
- Issues requiring physical access to the server
- Social engineering attacks

## Security Best Practices

After installing NixPanel:

1. **Run certbot immediately** — never leave the panel on plain HTTP in production
   ```bash
   certbot --apache
   ```
2. **Restrict panel ports** — firewall ports 2083 and 2087 to trusted IPs only
3. **Keep the system updated** — `apt upgrade` regularly
4. **Use strong admin passwords** — the panel enforces Argon2id hashing
5. **Monitor logs** — `journalctl -u nixpanel -f` and `/var/log/nixpanel/`

## Disclosure Policy

We follow **coordinated disclosure**. We ask that you:

- Give us reasonable time to fix the issue before public disclosure
- Not access or modify other users' data during testing
- Not perform denial-of-service testing

We will credit researchers in release notes unless you prefer to remain anonymous.
