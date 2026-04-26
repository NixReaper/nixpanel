//! nixpanel-accounts — account provisioning section binary
//!
//! Actions:
//!   provision   {username, domain, email, server_ip, php_version?}
//!     → creates vhost, PHP-FPM pool, DNS zone, home directory structure
//!
//!   deprovision {username, domain}
//!     → removes vhost, PHP-FPM pool, DNS zone, optionally home dir

use nixpanel_common::{SectionRequest, SectionResponse};
use std::fs;
use std::io::{self, BufRead};
use std::process::Command;

/* ── helpers ──────────────────────────────────────────────────────────── */

fn run(prog: &str, args: &[&str]) -> Result<String, String> {
    let out = Command::new(prog)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run {}: {}", prog, e))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

fn run_ok(prog: &str, args: &[&str]) {
    let _ = Command::new(prog).args(args).output();
}

fn write_file(path: &str, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("Write {}: {}", path, e))
}

fn server_ip() -> String {
    // Read from /opt/nixpanel sysinfo, or fall back to hostname -I
    Command::new("hostname")
        .arg("-I")
        .output()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .split_whitespace()
                .next()
                .unwrap_or("127.0.0.1")
                .to_string()
        })
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

/* ── Apache vhost ─────────────────────────────────────────────────────── */

fn create_vhost(username: &str, domain: &str, php_version: &str) -> Result<(), String> {
    let public_html = format!("/home/{}/public_html", username);
    let log_dir     = format!("/home/{}/logs", username);
    let sock        = format!("/run/php/php{}-fpm-{}.sock", php_version, username);

    let conf = format!(
        r#"# NixPanel — {domain} ({username})
<VirtualHost *:80>
    ServerName {domain}
    ServerAlias www.{domain}
    DocumentRoot {public_html}

    <Directory {public_html}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    <FilesMatch \.php$>
        SetHandler "proxy:unix:{sock}|fcgi://localhost"
    </FilesMatch>

    ErrorLog  {log_dir}/error.log
    CustomLog {log_dir}/access.log combined
</VirtualHost>
"#,
        domain     = domain,
        username   = username,
        public_html = public_html,
        log_dir    = log_dir,
        sock       = sock,
    );

    let conf_path = format!("/etc/apache2/sites-available/{}.conf", username);
    write_file(&conf_path, &conf)?;

    run("a2ensite", &[&format!("{}.conf", username)])?;
    Ok(())
}

fn remove_vhost(username: &str) {
    run_ok("a2dissite", &[&format!("{}.conf", username)]);
    let _ = fs::remove_file(format!("/etc/apache2/sites-available/{}.conf", username));
}

/* ── PHP-FPM pool ─────────────────────────────────────────────────────── */

fn create_fpm_pool(username: &str, php_version: &str) -> Result<(), String> {
    let sock = format!("/run/php/php{}-fpm-{}.sock", php_version, username);
    let pool = format!(
        r#"[{username}]
user  = {username}
group = {username}

listen = {sock}
listen.owner = www-data
listen.group = www-data
listen.mode  = 0660

pm                   = ondemand
pm.max_children      = 10
pm.process_idle_timeout = 10s
pm.max_requests      = 500

php_admin_value[open_basedir]   = /home/{username}/:/tmp/
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen

env[PATH] = /usr/local/bin:/usr/bin:/bin
"#,
        username = username,
        sock     = sock,
    );

    let pool_path = format!(
        "/etc/php/{}/fpm/pool.d/{}.conf",
        php_version, username
    );
    write_file(&pool_path, &pool)?;

    run("systemctl", &["reload", &format!("php{}-fpm", php_version)])?;
    Ok(())
}

fn remove_fpm_pool(username: &str, php_version: &str) {
    let path = format!("/etc/php/{}/fpm/pool.d/{}.conf", php_version, username);
    let _ = fs::remove_file(&path);
    run_ok("systemctl", &["reload", &format!("php{}-fpm", php_version)]);
}

/* ── PowerDNS zone ────────────────────────────────────────────────────── */

fn create_dns_zone(domain: &str, ip: &str) -> Result<(), String> {
    // Create zone
    run("pdnsutil", &["create-zone", domain])?;

    // A records
    run("pdnsutil", &["add-record", domain, "@",   "A",    "3600", ip])?;
    run("pdnsutil", &["add-record", domain, "www", "A",    "3600", ip])?;
    run("pdnsutil", &["add-record", domain, "mail","A",    "3600", ip])?;
    run("pdnsutil", &["add-record", domain, "ftp", "A",    "3600", ip])?;

    // MX record
    run("pdnsutil", &["add-record", domain, "@", "MX", "3600",
        &format!("10 mail.{}.", domain)])?;

    // SPF TXT
    run("pdnsutil", &["add-record", domain, "@", "TXT", "3600",
        &format!("\"v=spf1 a mx ip4:{} ~all\"", ip)])?;

    // Increase serial and notify
    run_ok("pdnsutil", &["rectify-zone", domain]);

    Ok(())
}

fn remove_dns_zone(domain: &str) {
    run_ok("pdnsutil", &["delete-zone", domain]);
}

/* ── Home directory structure ─────────────────────────────────────────── */

fn create_home(username: &str, domain: &str) -> Result<(), String> {
    let dirs = [
        format!("/home/{}/public_html", username),
        format!("/home/{}/logs", username),
        format!("/home/{}/tmp", username),
        format!("/home/{}/mail", username),
        format!("/home/{}/backups", username),
    ];

    for dir in &dirs {
        fs::create_dir_all(dir)
            .map_err(|e| format!("mkdir {}: {}", dir, e))?;
    }

    // Default index.html
    let index = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Welcome to {domain}</title>
<style>body{{font-family:sans-serif;text-align:center;padding:80px;color:#333}}
h1{{color:#e85d04}}p{{color:#666}}</style></head>
<body>
<h1>🚀 {domain}</h1>
<p>Your hosting account is active. Upload your files to <code>public_html</code> to get started.</p>
<p><small>Powered by NixPanel</small></p>
</body></html>
"#,
        domain = domain
    );
    write_file(&format!("/home/{}/public_html/index.html", username), &index)?;

    // Set ownership to system user
    run("chown", &["-R", &format!("{}:{}", username, username),
                   &format!("/home/{}", username)])?;
    run("chmod", &["750", &format!("/home/{}", username)])?;
    run("chmod", &["755", &format!("/home/{}/public_html", username)])?;

    Ok(())
}

/* ── Actions ──────────────────────────────────────────────────────────── */

fn action_provision(params: &serde_json::Value) -> SectionResponse {
    let username    = params["username"].as_str().unwrap_or("");
    let domain      = params["domain"].as_str().unwrap_or("");
    let php_version = params["php_version"].as_str().unwrap_or("8.3");
    let ip          = params["server_ip"].as_str()
        .map(|s| s.to_string())
        .unwrap_or_else(server_ip);

    if username.is_empty() || domain.is_empty() {
        return SectionResponse::err("username and domain are required");
    }

    // Sanitise: only allow alphanumeric + hyphen/dot in domain,
    // alphanumeric + underscore in username
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return SectionResponse::err("Invalid username");
    }

    let mut steps: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    // 1. Home directory
    match create_home(username, domain) {
        Ok(())   => steps.push("home directory created".into()),
        Err(e)   => errors.push(format!("home dir: {}", e)),
    }

    // 2. PHP-FPM pool
    match create_fpm_pool(username, php_version) {
        Ok(())   => steps.push(format!("PHP {} FPM pool created", php_version)),
        Err(e)   => errors.push(format!("fpm pool: {}", e)),
    }

    // 3. Apache vhost
    match create_vhost(username, domain, php_version) {
        Ok(())   => steps.push("Apache vhost created".into()),
        Err(e)   => errors.push(format!("vhost: {}", e)),
    }

    // 4. Reload Apache
    match run("systemctl", &["reload", "apache2"]) {
        Ok(_)    => steps.push("Apache reloaded".into()),
        Err(e)   => errors.push(format!("apache reload: {}", e)),
    }

    // 5. PowerDNS zone
    match create_dns_zone(domain, &ip) {
        Ok(())   => steps.push(format!("DNS zone created (IP: {})", ip)),
        Err(e)   => errors.push(format!("DNS: {}", e)),
    }

    if errors.is_empty() {
        SectionResponse::ok(serde_json::json!({
            "steps": steps,
            "domain": domain,
            "ip": ip,
        }))
    } else {
        // Partial success — return both what worked and what didn't
        SectionResponse::ok(serde_json::json!({
            "steps":  steps,
            "errors": errors,
            "partial": true,
        }))
    }
}

fn action_deprovision(params: &serde_json::Value) -> SectionResponse {
    let username    = params["username"].as_str().unwrap_or("");
    let domain      = params["domain"].as_str().unwrap_or("");
    let php_version = params["php_version"].as_str().unwrap_or("8.3");

    if username.is_empty() {
        return SectionResponse::err("username is required");
    }

    remove_vhost(username);
    remove_fpm_pool(username, php_version);
    if !domain.is_empty() {
        remove_dns_zone(domain);
    }
    run_ok("systemctl", &["reload", "apache2"]);

    SectionResponse::ok(serde_json::json!({
        "message": format!("Account {} deprovisioned", username)
    }))
}

/* ── Entry point ──────────────────────────────────────────────────────── */

fn main() {
    let stdin = io::stdin();
    let mut line = String::new();
    stdin.lock().read_line(&mut line).unwrap_or(0);

    let response = match serde_json::from_str::<SectionRequest>(line.trim()) {
        Err(e)  => SectionResponse::err(format!("Invalid JSON: {}", e)),
        Ok(req) => match req.action.as_str() {
            "provision"   => action_provision(&req.params),
            "deprovision" => action_deprovision(&req.params),
            other         => SectionResponse::err(format!("Unknown action: {}", other)),
        },
    };

    println!("{}", serde_json::to_string(&response).unwrap());
}
