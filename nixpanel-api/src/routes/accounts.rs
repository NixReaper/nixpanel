use axum::{extract::State, Json};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::{auth::Claims, error::AppError, state::AppState};

#[derive(Serialize, sqlx::FromRow)]
pub struct Account {
    pub id:            i64,
    pub username:      String,
    pub domain:        String,
    pub email:         String,
    pub package_name:  String,
    pub disk_quota_mb: i32,  // INT column → i32
    pub bandwidth_mb:  i32,  // INT column → i32
    pub status:        String,
    pub created_at:    NaiveDateTime,
}

#[derive(Deserialize)]
pub struct CreateAccountRequest {
    pub username:      String,
    pub domain:        String,
    pub email:         String,
    pub password:      String,
    pub package_name:  Option<String>,
    pub disk_quota_mb: Option<i32>,
    pub bandwidth_mb:  Option<i32>,
}

pub async fn list_accounts(
    _claims: Claims,
    State(state): State<AppState>,
) -> Result<Json<Vec<Account>>, AppError> {
    let accounts = sqlx::query_as::<_, Account>(
        "SELECT id, username, domain, email, package_name, disk_quota_mb, bandwidth_mb, status, created_at
         FROM accounts ORDER BY created_at DESC",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(accounts))
}

pub async fn create_account(
    _claims: Claims,
    State(state): State<AppState>,
    Json(body): Json<CreateAccountRequest>,
) -> Result<Json<Account>, AppError> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    if body.username.is_empty() || body.domain.is_empty() {
        return Err(AppError::BadRequest("username and domain are required".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("argon2: {}", e)))?
        .to_string();

    // Create system user (best-effort)
    let _ = std::process::Command::new("useradd")
        .args(["-m", "-s", "/bin/bash", "-d",
               &format!("/home/{}", body.username),
               &body.username])
        .output();

    let _ = std::fs::create_dir_all(format!("/home/{}/public_html", body.username));

    let package_name  = body.package_name.unwrap_or_else(|| "Default".into());
    let disk_quota_mb: i32 = body.disk_quota_mb.unwrap_or(10240);
    let bandwidth_mb:  i32 = body.bandwidth_mb.unwrap_or(0);

    let insert_id: u64 = sqlx::query(
        "INSERT INTO accounts (username, domain, email, password_hash, package_name, disk_quota_mb, bandwidth_mb, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')",
    )
    .bind(&body.username)
    .bind(&body.domain)
    .bind(&body.email)
    .bind(&hash)
    .bind(&package_name)
    .bind(disk_quota_mb)
    .bind(bandwidth_mb)
    .execute(&state.db)
    .await?
    .last_insert_id();

    // Also create a NixClient panel user
    let _ = sqlx::query(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')
         ON DUPLICATE KEY UPDATE email = VALUES(email)",
    )
    .bind(&body.username)
    .bind(&body.email)
    .bind(&hash)
    .execute(&state.db)
    .await;

    let account = sqlx::query_as::<_, Account>(
        "SELECT id, username, domain, email, package_name, disk_quota_mb, bandwidth_mb, status, created_at
         FROM accounts WHERE id = ?",
    )
    .bind(insert_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(account))
}
