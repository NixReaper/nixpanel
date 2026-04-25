//! nixpanel-sysinfo — system information section binary
//!
//! Actions:
//!   stats  → {hostname, ip, os, kernel, uptime_sec, cpu_pct, ram_used_mb,
//!              ram_total_mb, disk_used_gb, disk_total_gb, load_avg}
//!   versions → {apache, php, mariadb, nixpanel}

use nixpanel_common::{SectionRequest, SectionResponse};
use std::fs;
use std::io::{self, BufRead};
use std::net::UdpSocket;
use std::process::Command;

/* ── helpers ──────────────────────────────────────────────────────────── */

fn cmd(prog: &str, args: &[&str]) -> String {
    Command::new(prog)
        .args(args)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

fn read_file(path: &str) -> String {
    fs::read_to_string(path).unwrap_or_default()
}

/* ── hostname / IP ────────────────────────────────────────────────────── */

fn get_hostname() -> String {
    fs::read_to_string("/etc/hostname")
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn get_ip() -> String {
    // Quick UDP trick — no actual packet sent
    UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|_| "0.0.0.0".into())
}

/* ── OS / kernel ──────────────────────────────────────────────────────── */

fn get_os() -> String {
    let content = read_file("/etc/os-release");
    for line in content.lines() {
        if let Some(val) = line.strip_prefix("PRETTY_NAME=") {
            return val.trim_matches('"').to_string();
        }
    }
    "Unknown".into()
}

fn get_kernel() -> String {
    cmd("uname", &["-r"])
}

/* ── uptime ───────────────────────────────────────────────────────────── */

fn get_uptime_sec() -> u64 {
    read_file("/proc/uptime")
        .split_whitespace()
        .next()
        .and_then(|s| s.parse::<f64>().ok())
        .map(|s| s as u64)
        .unwrap_or(0)
}

/* ── CPU ──────────────────────────────────────────────────────────────── */

/// Reads /proc/stat twice (100ms apart) to compute a 1-sample CPU %.
fn get_cpu_pct() -> f32 {
    fn read_stat() -> Option<(u64, u64)> {
        let content = fs::read_to_string("/proc/stat").ok()?;
        let line = content.lines().find(|l| l.starts_with("cpu "))?;
        let nums: Vec<u64> = line
            .split_whitespace()
            .skip(1)
            .filter_map(|n| n.parse().ok())
            .collect();
        if nums.len() < 4 {
            return None;
        }
        let idle  = nums[3];
        let total: u64 = nums.iter().sum();
        Some((idle, total))
    }

    let s1 = read_stat().unwrap_or((0, 1));
    std::thread::sleep(std::time::Duration::from_millis(100));
    let s2 = read_stat().unwrap_or((0, 1));

    let d_total = s2.1.saturating_sub(s1.1);
    let d_idle  = s2.0.saturating_sub(s1.0);
    if d_total == 0 {
        return 0.0;
    }
    ((d_total - d_idle) as f32 / d_total as f32 * 100.0 * 10.0).round() / 10.0
}

/* ── RAM ──────────────────────────────────────────────────────────────── */

fn get_ram() -> (u64, u64) {
    // Returns (used_mb, total_mb)
    let content = read_file("/proc/meminfo");
    let mut total_kb: u64 = 0;
    let mut available_kb: u64 = 0;

    for line in content.lines() {
        let mut parts = line.split_whitespace();
        match parts.next() {
            Some("MemTotal:")     => { total_kb     = parts.next().and_then(|n| n.parse().ok()).unwrap_or(0); }
            Some("MemAvailable:") => { available_kb = parts.next().and_then(|n| n.parse().ok()).unwrap_or(0); }
            _ => {}
        }
    }
    let used_mb  = (total_kb.saturating_sub(available_kb)) / 1024;
    let total_mb = total_kb / 1024;
    (used_mb, total_mb)
}

/* ── Disk ─────────────────────────────────────────────────────────────── */

fn get_disk() -> (u64, u64) {
    // Returns (used_gb, total_gb) for /
    use std::os::unix::fs::MetadataExt;
    let stat = nix_statvfs("/");
    stat.unwrap_or((0, 0))
}

fn nix_statvfs(path: &str) -> Option<(u64, u64)> {
    // Use df as a fallback — parse "df -B1 /"
    let out = Command::new("df")
        .args(&["-B1", path])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text.lines().nth(1)?; // skip header
    let mut parts = line.split_whitespace();
    let _fs    = parts.next()?;
    let total  = parts.next()?.parse::<u64>().ok()?;
    let used   = parts.next()?.parse::<u64>().ok()?;
    Some((used / 1_073_741_824, total / 1_073_741_824))
}

/* ── Load average ─────────────────────────────────────────────────────── */

fn get_load_avg() -> [f32; 3] {
    let content = read_file("/proc/loadavg");
    let mut parts = content.split_whitespace();
    let l1 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
    let l5 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
    let l15= parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
    [l1, l5, l15]
}

/* ── Software versions ────────────────────────────────────────────────── */

fn apache_version() -> String {
    let out = cmd("apache2", &["-v"]);
    // "Server version: Apache/2.4.58 (Ubuntu)"
    out.lines()
        .find(|l| l.starts_with("Server version:"))
        .and_then(|l| l.split('/').nth(1))
        .and_then(|s| s.split_whitespace().next())
        .unwrap_or("—")
        .to_string()
}

fn php_version() -> String {
    cmd("php8.3", &["--version"])
        .lines()
        .next()
        .and_then(|l| l.split_whitespace().nth(1))
        .unwrap_or("—")
        .to_string()
}

fn mariadb_version() -> String {
    let out = cmd("mariadb", &["--version"]);
    // "mariadb  Ver 15.1 Distrib 10.11.x-MariaDB ..."
    out.split_whitespace()
        .enumerate()
        .find(|(_, w)| w.contains("MariaDB") || w.contains("Distrib"))
        .map(|(i, _)| {
            out.split_whitespace()
                .nth(i.saturating_sub(1))
                .unwrap_or("—")
                .trim_end_matches(',')
                .to_string()
        })
        .unwrap_or_else(|| "—".to_string())
}

/* ── Actions ──────────────────────────────────────────────────────────── */

fn action_stats() -> SectionResponse {
    let (ram_used, ram_total) = get_ram();
    let (disk_used, disk_total) = get_disk();
    SectionResponse::ok(serde_json::json!({
        "hostname":    get_hostname(),
        "ip":          get_ip(),
        "os":          get_os(),
        "kernel":      get_kernel(),
        "uptime_sec":  get_uptime_sec(),
        "cpu_pct":     get_cpu_pct(),
        "ram_used_mb":  ram_used,
        "ram_total_mb": ram_total,
        "disk_used_gb":  disk_used,
        "disk_total_gb": disk_total,
        "load_avg":    get_load_avg(),
    }))
}

fn action_versions() -> SectionResponse {
    SectionResponse::ok(serde_json::json!({
        "apache":   apache_version(),
        "php":      php_version(),
        "mariadb":  mariadb_version(),
        "nixpanel": env!("CARGO_PKG_VERSION"),
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
            "stats"    => action_stats(),
            "versions" => action_versions(),
            other      => SectionResponse::err(format!("Unknown action: {}", other)),
        },
    };

    println!("{}", serde_json::to_string(&response).unwrap());
}
