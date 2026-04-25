use axum::{extract::State, Json};
use serde::Serialize;

use crate::{auth::Claims, error::AppError, section, state::AppState};

#[derive(Serialize)]
pub struct DashboardStats {
    pub accounts:       i64,
    pub domains:        i64,
    pub databases:      i64,
    pub email_accounts: i64,
}

#[derive(Serialize)]
pub struct DashboardResponse {
    pub stats:    DashboardStats,
    pub sysinfo:  serde_json::Value,
    pub versions: serde_json::Value,
}

pub async fn get_dashboard(
    _claims: Claims,
    State(state): State<AppState>,
) -> Result<Json<DashboardResponse>, AppError> {
    // Use non-macro query() — tables may not exist at compile time
    let accounts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM accounts")
        .fetch_one(&state.db).await.unwrap_or(0);
    let domains: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM domains")
        .fetch_one(&state.db).await.unwrap_or(0);
    let databases: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM account_databases")
        .fetch_one(&state.db).await.unwrap_or(0);
    let email_accounts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM email_accounts")
        .fetch_one(&state.db).await.unwrap_or(0);

    let bin_dir = &state.config.bin_dir;

    let sysinfo = section::call(bin_dir, "nixpanel-sysinfo", "stats", serde_json::Value::Null)
        .unwrap_or_else(|_| nixpanel_common::SectionResponse::err("sysinfo unavailable"));

    let versions = section::call(bin_dir, "nixpanel-sysinfo", "versions", serde_json::Value::Null)
        .unwrap_or_else(|_| nixpanel_common::SectionResponse::err("versions unavailable"));

    Ok(Json(DashboardResponse {
        stats: DashboardStats { accounts, domains, databases, email_accounts },
        sysinfo:  sysinfo.data.unwrap_or(serde_json::Value::Null),
        versions: versions.data.unwrap_or(serde_json::Value::Null),
    }))
}
