use axum::{extract::State, Json};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::{auth::Claims, error::AppError, state::AppState};

#[derive(Serialize, sqlx::FromRow)]
pub struct Account {
    pub id:              i64,
    pub username:        String,
    pub domain:          String,
    pub email:           String,
    pub package_name:    String,
    pub disk_quota_mb:   i64,
    pub bandwidth_mb:    i64,
    pub status:          String,
    pub created_at:      NaiveDateTime,
}

#[derive(Deserialize)]
pub struct CreateAccountRequest {
    pub username:      String,
    pub domain:        String,
    pub email:         String,
    pub password:      String,
    pub package_name:  Option<String>,
    pub disk_quota_mb: Option<i64>,
    pub bandwidth_mb:  Option<i64>,
}

pub async fn list_accounts(
    claims: Claims,
    State(state): State<AppState>,
) -> Result<Json<Vec<Account>>, AppError> {
    let accounts = sqlx::query_as!(
        Account,
        "SELECT id, username, domain, email, package_name, disk_quota_mb, bandwidth_mb, status, created_at
         FROM accounts ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(accounts))
}

pub async fn create_account(
    claims: Claims,
    State(state): State<AppState>,
    Json(body): Json<CreateAccountRequest>,
) -> Result<Json<Account>, AppError> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    // Validate
    if body.username.is_empty() || body.domain.is_empty() {
        return Err(AppError::BadRequest("username and domain are required".into()));
    }

    // Hash password
    let salt   = SaltString::generate(&mut OsRng);
    let hash   = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?
        .to_string();

    // Create system user (best-effort — panel may not be running as root in dev)
    let _ = std::process::Command::new("useradd")
        .args(&[
            "-m",
            "-s", "/bin/bash",
            "-d", &format!("/home/{}", body.username),
            &body.username,
        ])
        .output();

    // Create Apache vhost directory
    let vhost_dir = format!("/home/{}/public_html", body.username);
    let _ = std::fs::create_dir_all(&vhost_dir);

    let package_name  = body.package_name.unwrap_or_else(|| "Default".into());
    let disk_quota_mb = body.disk_quota_mb.unwrap_or(10240);
    let bandwidth_mb  = body.bandwidth_mb.unwrap_or(0);

    let id = sqlx::query!(
        "INSERT INTO accounts (username, domain, email, password_hash, package_name, disk_quota_mb, bandwidth_mb, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')",
        body.username, body.domain, body.email, hash,
        package_name, disk_quota_mb, bandwidth_mb
    )
    .execute(&state.db)
    .await?
    .last_insert_id() as i64;

    // Also create a panel user so they can log into NixClient
    let _ = sqlx::query!(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')
         ON DUPLICATE KEY UPDATE email = VALUES(email)",
        body.username, body.email, hash
    )
    .execute(&state.db)
    .await;

    let account = sqlx::query_as!(
        Account,
        "SELECT id, username, domain, email, package_name, disk_quota_mb, bandwidth_mb, status, created_at
         FROM accounts WHERE id = ?",
        id
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(account))
}
