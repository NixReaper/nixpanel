//! nixpanel-services — service management section binary
//!
//! Protocol: read one SectionRequest JSON line from stdin,
//!           write one SectionResponse JSON line to stdout.
//!
//! Actions:
//!   list              → [ServiceInfo]
//!   start   {service} → {success, message}
//!   stop    {service} → {success, message}
//!   restart {service} → {success, message}

use nixpanel_common::{SectionRequest, SectionResponse, ServiceInfo};
use std::io::{self, BufRead};
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Canonical list of managed services (systemd unit → display name).
const SERVICES: &[(&str, &str)] = &[
    ("apache2",      "Apache HTTP Server"),
    ("mariadb",      "MariaDB"),
    ("pdns",         "PowerDNS"),
    ("exim4",        "Exim (SMTP)"),
    ("dovecot",      "Dovecot (IMAP)"),
    ("spamd",        "SpamAssassin"),
    ("fail2ban",     "Fail2ban"),
    ("proftpd",      "ProFTPD"),
    ("nixpanel",     "NixPanel API"),
];

fn systemctl(args: &[&str]) -> std::io::Result<std::process::Output> {
    Command::new("systemctl").args(args).output()
}

fn is_active(unit: &str) -> &'static str {
    match systemctl(&["is-active", "--quiet", unit]) {
        Ok(out) if out.status.success() => "running",
        _ => "stopped",
    }
}

fn main_pid(unit: &str) -> Option<u32> {
    let out = systemctl(&["show", unit, "--property=MainPID"]).ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let pid_str = text.trim().strip_prefix("MainPID=")?;
    pid_str.parse::<u32>().ok().filter(|&p| p != 0)
}

fn active_enter_timestamp(unit: &str) -> Option<u64> {
    let out = systemctl(&["show", unit, "--property=ActiveEnterTimestampMonotonic"]).ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let ts_str = text.trim().strip_prefix("ActiveEnterTimestampMonotonic=")?;
    ts_str.parse::<u64>().ok()
}

fn monotonic_now_usec() -> u64 {
    // /proc/uptime gives seconds since boot; multiply by 1_000_000 for µs
    std::fs::read_to_string("/proc/uptime")
        .ok()
        .and_then(|s| {
            s.split_whitespace()
                .next()
                .and_then(|n| n.parse::<f64>().ok())
        })
        .map(|secs| (secs * 1_000_000.0) as u64)
        .unwrap_or(0)
}

fn format_uptime(elapsed_sec: u64) -> String {
    let days  = elapsed_sec / 86400;
    let hours = (elapsed_sec % 86400) / 3600;
    let mins  = (elapsed_sec % 3600)  / 60;
    if days > 0 {
        format!("{}d {}h", days, hours)
    } else if hours > 0 {
        format!("{}h {}m", hours, mins)
    } else {
        format!("{}m", mins)
    }
}

fn service_info(unit: &str, display: &str) -> ServiceInfo {
    let status = is_active(unit);
    let pid    = if status == "running" { main_pid(unit) } else { None };
    let uptime = if status == "running" {
        active_enter_timestamp(unit).map(|start| {
            let now   = monotonic_now_usec();
            let secs  = if now > start { (now - start) / 1_000_000 } else { 0 };
            format_uptime(secs)
        })
    } else {
        None
    };
    ServiceInfo {
        name:    unit.to_string(),
        display: display.to_string(),
        status:  status.to_string(),
        pid,
        uptime,
    }
}

fn list_services() -> SectionResponse {
    let infos: Vec<ServiceInfo> = SERVICES
        .iter()
        .map(|(unit, display)| service_info(unit, display))
        .collect();
    SectionResponse::ok(infos)
}

fn control_service(unit: &str, action: &str) -> SectionResponse {
    // Validate service name
    if !SERVICES.iter().any(|(u, _)| *u == unit) {
        return SectionResponse::err(format!("Unknown service: {}", unit));
    }
    // Validate action
    let allowed = ["start", "stop", "restart", "reload"];
    if !allowed.contains(&action) {
        return SectionResponse::err(format!("Unknown action: {}", action));
    }

    match systemctl(&[action, unit]) {
        Ok(out) if out.status.success() => SectionResponse::ok(serde_json::json!({
            "message": format!("Service {} {}ed", unit, action)
        })),
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            SectionResponse::err(format!("systemctl {} {} failed: {}", action, unit, stderr.trim()))
        }
        Err(e) => SectionResponse::err(format!("Failed to run systemctl: {}", e)),
    }
}

fn main() {
    let stdin = io::stdin();
    let mut line = String::new();
    stdin.lock().read_line(&mut line).unwrap_or(0);

    let response = match serde_json::from_str::<SectionRequest>(line.trim()) {
        Err(e) => SectionResponse::err(format!("Invalid request JSON: {}", e)),
        Ok(req) => match req.action.as_str() {
            "list" => list_services(),
            "start" | "stop" | "restart" | "reload" => {
                let unit = req.params["service"]
                    .as_str()
                    .unwrap_or("");
                if unit.is_empty() {
                    SectionResponse::err("Missing 'service' param")
                } else {
                    control_service(unit, &req.action)
                }
            }
            other => SectionResponse::err(format!("Unknown action: {}", other)),
        },
    };

    println!("{}", serde_json::to_string(&response).unwrap());
}
