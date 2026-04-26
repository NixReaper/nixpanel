use axum::{
    extract::{Path, State},
    Json,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::{auth::Claims, error::AppError, state::AppState};

/* ── Types ───────────────────────────────────────────────────────────── */

#[derive(Serialize, sqlx::FromRow)]
pub struct EmailAccount {
    pub id:         i64,
    pub account_id: i64,
    pub address:    String,
    pub quota_mb:   i32,
    pub created_at: NaiveDateTime,
}

#[derive(Deserialize)]
pub struct CreateEmailRequest {
    pub username:  String,   // local part (before @)
    pub domain:    String,   // domain
    pub password:  String,
    pub quota_mb:  Option<i32>,
}

/* ── Handlers ────────────────────────────────────────────────────────── */

/// List all email accounts for a hosting account (by account username).
/// Admin can pass any username; a regular user's JWT sub is used automatically.
pub async fn list_email_accounts(
    _claims: Claims,
    State(state): State<AppState>,
    Path(account_username): Path<String>,
) -> Result<Json<Vec<EmailAccount>>, AppError> {
    let emails = sqlx::query_as::<_, EmailAccount>(
        "SELECT ea.id, ea.account_id, ea.address, ea.quota_mb, ea.created_at
         FROM email_accounts ea
         JOIN accounts a ON a.id = ea.account_id
         WHERE a.username = ?
         ORDER BY ea.created_at DESC",
    )
    .bind(&account_username)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(emails))
}

/// Create a new email account under a domain.
pub async fn create_email_account(
    _claims: Claims,
    State(state): State<AppState>,
    Json(body): Json<CreateEmailRequest>,
) -> Result<Json<EmailAccount>, AppError> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    if body.username.is_empty() || body.domain.is_empty() || body.password.is_empty() {
        return Err(AppError::BadRequest(
            "username, domain, and password are required".into(),
        ));
    }

    // Validate local part (no @, spaces, etc.)
    if body.username.contains('@') || body.username.contains(' ') {
        return Err(AppError::BadRequest("Invalid email username".into()));
    }

    let address = format!("{}@{}", body.username, body.domain);

    // Look up account by domain
    let row: Option<(i64, String)> = sqlx::query_as(
        "SELECT id, username FROM accounts WHERE domain = ?",
    )
    .bind(&body.domain)
    .fetch_optional(&state.db)
    .await?;

    let (account_id, acct_username) = row.ok_or_else(|| {
        AppError::BadRequest(format!("No account for domain {}", body.domain))
    })?;

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("argon2: {}", e)))?
        .to_string();

    let quota_mb: i32 = body.quota_mb.unwrap_or(1024);

    let insert_id: u64 = sqlx::query(
        "INSERT INTO email_accounts (account_id, address, password_hash, quota_mb)
         VALUES (?, ?, ?, ?)",
    )
    .bind(account_id)
    .bind(&address)
    .bind(&hash)
    .bind(quota_mb)
    .execute(&state.db)
    .await?
    .last_insert_id();

    // Provision Maildir structure under the account's home directory
    let mail_root = format!("/home/{}/mail/{}", acct_username, body.username);
    for sub in ["new", "cur", "tmp"] {
        let _ = std::fs::create_dir_all(format!("{}/{}", mail_root, sub));
    }
    let _ = std::process::Command::new("chown")
        .args([
            "-R",
            &format!("{}:{}", acct_username, acct_username),
            &mail_root,
        ])
        .output();

    let email = sqlx::query_as::<_, EmailAccount>(
        "SELECT id, account_id, address, quota_mb, created_at
         FROM email_accounts WHERE id = ?",
    )
    .bind(insert_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(email))
}

/// Delete an email account by ID.
pub async fn delete_email_account(
    _claims: Claims,
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query("DELETE FROM email_accounts WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}
