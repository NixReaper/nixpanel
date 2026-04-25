use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::{auth::Claims, error::AppError, state::AppState};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user:  UserInfo,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id:       i64,
    pub username: String,
    pub role:     String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    // Look up user
    let row = sqlx::query!(
        "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1",
        body.username
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    // Verify password
    let parsed = PasswordHash::new(&row.password_hash)
        .map_err(|_| AppError::Unauthorized)?;
    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed)
        .map_err(|_| AppError::Unauthorized)?;

    // Issue JWT
    let token = Claims::new(row.id, &row.username, &row.role, &state.config.jwt_secret)
        .map_err(|e| AppError::Internal(e))?;

    Ok(Json(LoginResponse {
        token,
        user: UserInfo {
            id:       row.id,
            username: row.username,
            role:     row.role,
        },
    }))
}
