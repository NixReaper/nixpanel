use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::state::AppState;

/* ── JWT claims ──────────────────────────────────────────────────────── */

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub:     String, // username
    pub user_id: i64,
    pub role:    String, // "admin" | "user"
    pub exp:     i64,
    pub iat:     i64,
}

impl Claims {
    pub fn new(user_id: i64, username: &str, role: &str, secret: &str) -> anyhow::Result<String> {
        let now = Utc::now();
        let claims = Claims {
            sub:     username.to_string(),
            user_id,
            role:    role.to_string(),
            exp:     (now + Duration::hours(8)).timestamp(),
            iat:     now.timestamp(),
        };
        Ok(encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )?)
    }

    pub fn verify(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        Ok(decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        )?
        .claims)
    }
}

/* ── Extractor — pulls Claims from Authorization: Bearer <token> ─────── */

#[async_trait]
impl FromRequestParts<AppState> for Claims {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .ok_or(AppError::Unauthorized)?;

        Claims::verify(auth, &state.config.jwt_secret).map_err(|_| AppError::Unauthorized)
    }
}
