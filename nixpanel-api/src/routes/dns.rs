use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::process::Command;

use crate::{auth::Claims, error::AppError, state::AppState};

/* ── Types ───────────────────────────────────────────────────────────── */

#[derive(Serialize, Clone)]
pub struct DnsRecord {
    pub name:    String,
    pub ttl:     u32,
    pub rtype:   String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct AddRecordRequest {
    pub name:    String,
    pub rtype:   String,
    pub ttl:     Option<u32>,
    pub content: String,
}

#[derive(Deserialize)]
pub struct DeleteRecordRequest {
    pub name:  String,
    pub rtype: String,
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

/// Parse `pdnsutil list-zone <domain>` tab-separated output
fn parse_zone(domain: &str, output: &str) -> Vec<DnsRecord> {
    let mut records = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
            continue;
        }
        // Columns: name\tttl\tIN\ttype\tcontent
        let cols: Vec<&str> = line.splitn(5, '\t').collect();
        if cols.len() < 5 {
            continue;
        }
        let raw_name = cols[0].trim().trim_end_matches('.');
        let ttl: u32  = cols[1].trim().parse().unwrap_or(3600);
        // cols[2] == "IN"
        let rtype   = cols[3].trim().to_uppercase();
        let content = cols[4].trim().to_string();

        if rtype == "SOA" {
            continue; // skip internal records
        }

        // Normalise name: FQDN → relative label (@=apex)
        let name = if raw_name == domain || raw_name.is_empty() {
            "@".to_string()
        } else {
            let suffix = format!(".{}", domain);
            if raw_name.ends_with(&suffix) {
                raw_name[..raw_name.len() - suffix.len()].to_string()
            } else {
                raw_name.to_string()
            }
        };

        records.push(DnsRecord { name, ttl, rtype, content });
    }
    records
}

fn pdnsutil(args: &[&str]) -> Result<String, String> {
    let out = Command::new("pdnsutil")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run pdnsutil: {}", e))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/* ── Handlers ────────────────────────────────────────────────────────── */

/// List all DNS zones managed by PowerDNS
pub async fn list_zones(
    _claims: Claims,
    State(_state): State<AppState>,
) -> Result<Json<Vec<String>>, AppError> {
    let out = Command::new("pdnsutil")
        .args(["list-all-zones"])
        .output()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("pdnsutil: {}", e)))?;

    let zones: Vec<String> = String::from_utf8_lossy(&out.stdout)
        .lines()
        .map(|l| l.trim().trim_end_matches('.').to_string())
        .filter(|l| !l.is_empty())
        .collect();

    Ok(Json(zones))
}

/// List all records in a DNS zone
pub async fn list_zone_records(
    _claims: Claims,
    State(_state): State<AppState>,
    Path(domain): Path<String>,
) -> Result<Json<Vec<DnsRecord>>, AppError> {
    let out = Command::new("pdnsutil")
        .args(["list-zone", &domain])
        .output()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("pdnsutil: {}", e)))?;

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    Ok(Json(parse_zone(&domain, &stdout)))
}

/// Add a DNS record to a zone
pub async fn add_record(
    _claims: Claims,
    State(_state): State<AppState>,
    Path(domain): Path<String>,
    Json(body): Json<AddRecordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if body.name.is_empty() || body.rtype.is_empty() || body.content.is_empty() {
        return Err(AppError::BadRequest(
            "name, rtype, and content are required".into(),
        ));
    }

    let ttl = body.ttl.unwrap_or(3600).to_string();
    pdnsutil(&["add-record", &domain, &body.name, &body.rtype, &ttl, &body.content])
        .map_err(|e| AppError::BadRequest(format!("DNS error: {}", e)))?;

    let _ = pdnsutil(&["rectify-zone", &domain]);

    Ok(Json(serde_json::json!({ "ok": true })))
}

/// Delete an RRset (all records of a type at a name) from a zone
pub async fn delete_record(
    _claims: Claims,
    State(_state): State<AppState>,
    Path(domain): Path<String>,
    Json(body): Json<DeleteRecordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if body.name.is_empty() || body.rtype.is_empty() {
        return Err(AppError::BadRequest("name and rtype are required".into()));
    }

    pdnsutil(&["delete-rrset", &domain, &body.name, &body.rtype])
        .map_err(|e| AppError::BadRequest(format!("DNS error: {}", e)))?;

    let _ = pdnsutil(&["rectify-zone", &domain]);

    Ok(Json(serde_json::json!({ "ok": true })))
}
