use axum::{
    extract::{Path, State},
    Json,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};

use crate::{auth::Claims, error::AppError, state::AppState};

/* ── Types ───────────────────────────────────────────────────────────── */

#[derive(Serialize, sqlx::FromRow)]
pub struct Database {
    pub id:         i64,
    pub account_id: i64,
    pub db_name:    String,
    pub db_user:    String,
    pub created_at: NaiveDateTime,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct DatabaseWithAccount {
    pub id:               i64,
    pub account_id:       i64,
    pub db_name:          String,
    pub db_user:          String,
    pub created_at:       NaiveDateTime,
    pub account_username: String,
}

#[derive(Deserialize)]
pub struct CreateDatabaseRequest {
    /// Hosting account username (admin supplies this; NixClient uses JWT sub)
    pub username:        String,
    /// Short suffix — final DB name will be `username_db_suffix`
    pub db_suffix:       String,
    /// Short suffix — final DB user will be `username_user_suffix` (defaults to db_suffix)
    pub db_user_suffix:  Option<String>,
    pub db_password:     String,
}

/* ── MySQL helpers ───────────────────────────────────────────────────── */

/// Escape a string value safe for use inside a single-quoted MySQL literal.
fn escape_mysql(s: &str) -> String {
    s.replace('\\', "\\\\")
     .replace('\'', "\\'")
     .replace('\0', "\\0")
     .replace('\n', "\\n")
     .replace('\r', "\\r")
}

/// Execute one or more SQL statements via `mysql -u root` (unix socket auth).
fn mysql_exec(sql: &str) -> Result<String, String> {
    let mut child = Command::new("mysql")
        .args(["-u", "root"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("mysql spawn: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(sql.as_bytes()).ok();
    }

    let out = child.wait_with_output().map_err(|e| format!("mysql wait: {}", e))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// Validate an identifier: only alphanumeric + underscore, non-empty.
fn valid_ident(s: &str) -> bool {
    !s.is_empty() && s.chars().all(|c| c.is_alphanumeric() || c == '_')
}

/* ── Handlers ────────────────────────────────────────────────────────── */

/// List all databases across all accounts (admin / NixServer).
pub async fn list_all_databases(
    _claims: Claims,
    State(state): State<AppState>,
) -> Result<Json<Vec<DatabaseWithAccount>>, AppError> {
    let rows = sqlx::query_as::<_, DatabaseWithAccount>(
        "SELECT ad.id, ad.account_id, ad.db_name, ad.db_user, ad.created_at,
                a.username AS account_username
         FROM account_databases ad
         JOIN accounts a ON a.id = ad.account_id
         ORDER BY ad.created_at DESC",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

/// List databases for a specific hosting account (NixClient).
pub async fn list_account_databases(
    _claims: Claims,
    State(state): State<AppState>,
    Path(account_username): Path<String>,
) -> Result<Json<Vec<Database>>, AppError> {
    let rows = sqlx::query_as::<_, Database>(
        "SELECT ad.id, ad.account_id, ad.db_name, ad.db_user, ad.created_at
         FROM account_databases ad
         JOIN accounts a ON a.id = ad.account_id
         WHERE a.username = ?
         ORDER BY ad.created_at DESC",
    )
    .bind(&account_username)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

/// Create a MariaDB database + user, then record in nixpanel DB.
pub async fn create_database(
    _claims: Claims,
    State(state): State<AppState>,
    Json(body): Json<CreateDatabaseRequest>,
) -> Result<Json<Database>, AppError> {
    // Validate inputs
    if body.username.is_empty() || body.db_suffix.is_empty() || body.db_password.is_empty() {
        return Err(AppError::BadRequest(
            "username, db_suffix, and db_password are required".into(),
        ));
    }
    if !valid_ident(&body.db_suffix) {
        return Err(AppError::BadRequest(
            "db_suffix must be alphanumeric with underscores only".into(),
        ));
    }
    let user_suffix = body.db_user_suffix.as_deref().unwrap_or(&body.db_suffix);
    if !valid_ident(user_suffix) {
        return Err(AppError::BadRequest(
            "db_user_suffix must be alphanumeric with underscores only".into(),
        ));
    }
    if body.db_password.len() < 6 {
        return Err(AppError::BadRequest("Password must be at least 6 characters".into()));
    }

    // Build cPanel-style namespaced names
    let db_name = format!("{}_{}", body.username, body.db_suffix);
    let db_user = format!("{}_{}", body.username, user_suffix);

    // MySQL identifier length limits
    if db_name.len() > 64 {
        return Err(AppError::BadRequest("Database name too long (max 64 chars)".into()));
    }
    if db_user.len() > 32 {
        return Err(AppError::BadRequest("Database username too long (max 32 chars)".into()));
    }

    // Get account_id
    let account_id: Option<i64> = sqlx::query_scalar(
        "SELECT id FROM accounts WHERE username = ?",
    )
    .bind(&body.username)
    .fetch_optional(&state.db)
    .await?;

    let account_id = account_id.ok_or_else(|| {
        AppError::BadRequest(format!("Account '{}' not found", body.username))
    })?;

    // Check DB doesn't already exist in our tracking table
    let exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM account_databases WHERE db_name = ?",
    )
    .bind(&db_name)
    .fetch_one(&state.db)
    .await?;

    if exists > 0 {
        return Err(AppError::BadRequest(format!(
            "Database '{}' already exists",
            db_name
        )));
    }

    // Create database + user in MariaDB
    let pw = escape_mysql(&body.db_password);
    let sql = format!(
        "CREATE DATABASE IF NOT EXISTS `{db_name}` \
            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n\
         CREATE USER IF NOT EXISTS '{db_user}'@'localhost' IDENTIFIED BY '{pw}';\n\
         GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{db_user}'@'localhost';\n\
         FLUSH PRIVILEGES;\n",
        db_name = db_name,
        db_user = db_user,
        pw = pw,
    );

    mysql_exec(&sql).map_err(|e| AppError::BadRequest(format!("MariaDB: {}", e)))?;

    // Record in nixpanel tracking table
    let insert_id: u64 = sqlx::query(
        "INSERT INTO account_databases (account_id, db_name, db_user) VALUES (?, ?, ?)",
    )
    .bind(account_id)
    .bind(&db_name)
    .bind(&db_user)
    .execute(&state.db)
    .await?
    .last_insert_id();

    let db = sqlx::query_as::<_, Database>(
        "SELECT id, account_id, db_name, db_user, created_at
         FROM account_databases WHERE id = ?",
    )
    .bind(insert_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(db))
}

/// Drop a MariaDB database and its dedicated user.
pub async fn delete_database(
    _claims: Claims,
    State(state): State<AppState>,
    Path(db_name): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Fetch tracking record
    let row: Option<(i64, String)> = sqlx::query_as(
        "SELECT id, db_user FROM account_databases WHERE db_name = ?",
    )
    .bind(&db_name)
    .fetch_optional(&state.db)
    .await?;

    let (db_id, db_user) = row.ok_or(AppError::NotFound)?;

    // Safety: only allow dropping databases that follow the user_name pattern
    if !db_name.contains('_') {
        return Err(AppError::BadRequest(
            "Will not drop databases without account prefix".into(),
        ));
    }

    // Drop database and user from MariaDB
    let sql = format!(
        "DROP DATABASE IF EXISTS `{db_name}`;\n\
         DROP USER IF EXISTS '{db_user}'@'localhost';\n\
         FLUSH PRIVILEGES;\n",
        db_name = db_name,
        db_user = db_user,
    );

    mysql_exec(&sql).map_err(|e| AppError::BadRequest(format!("MariaDB: {}", e)))?;

    // Remove tracking record
    sqlx::query("DELETE FROM account_databases WHERE id = ?")
        .bind(db_id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "ok": true, "deleted": db_name })))
}
