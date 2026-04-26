use axum::{extract::State, Json};
use serde::Deserialize;

use crate::{auth::Claims, error::AppError, state::AppState};

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password:     String,
}

/// Change the password of the currently logged-in user.
pub async fn change_password(
    claims: Claims,
    State(state): State<AppState>,
    Json(body): Json<ChangePasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, PasswordVerifier, SaltString},
        Argon2, PasswordHash,
    };

    if body.new_password.len() < 8 {
        return Err(AppError::BadRequest(
            "New password must be at least 8 characters".into(),
        ));
    }

    // Fetch current hash from users table
    let hash: Option<String> = sqlx::query_scalar(
        "SELECT password_hash FROM users WHERE id = ?",
    )
    .bind(claims.user_id)
    .fetch_optional(&state.db)
    .await?;

    let hash = hash.ok_or(AppError::NotFound)?;

    // Verify current password
    let parsed = PasswordHash::new(&hash)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("hash parse: {}", e)))?;

    Argon2::default()
        .verify_password(body.current_password.as_bytes(), &parsed)
        .map_err(|_| AppError::BadRequest("Current password is incorrect".into()))?;

    // Hash new password
    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(body.new_password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("argon2: {}", e)))?
        .to_string();

    // Update users table
    sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
        .bind(&new_hash)
        .bind(claims.user_id)
        .execute(&state.db)
        .await?;

    // Also update accounts table if there's a matching account (for panel login)
    sqlx::query(
        "UPDATE accounts SET password_hash = ? WHERE username = ?",
    )
    .bind(&new_hash)
    .bind(&claims.sub)
    .execute(&state.db)
    .await
    .ok(); // not an error if no matching account

    Ok(Json(serde_json::json!({ "ok": true })))
}
