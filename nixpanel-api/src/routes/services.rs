use axum::{
    extract::{Path, State},
    Json,
};

use crate::{auth::Claims, error::AppError, section, state::AppState};

pub async fn list_services(
    _claims: Claims,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let resp = section::call(
        &state.config.bin_dir,
        "nixpanel-services",
        "list",
        serde_json::Value::Null,
    )
    .map_err(|e| AppError::Internal(e))?;

    Ok(Json(resp.data.unwrap_or(serde_json::json!([]))))
}

pub async fn service_action(
    _claims: Claims,
    State(state): State<AppState>,
    Path((name, action)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, AppError> {
    let allowed = ["start", "stop", "restart", "reload"];
    if !allowed.contains(&action.as_str()) {
        return Err(AppError::BadRequest(format!("Unknown action: {}", action)));
    }

    let resp = section::call(
        &state.config.bin_dir,
        "nixpanel-services",
        &action,
        serde_json::json!({ "service": name }),
    )
    .map_err(|e| AppError::Internal(e))?;

    if resp.success {
        Ok(Json(serde_json::json!({ "success": true, "message": resp.data })))
    } else {
        Err(AppError::BadRequest(
            resp.error.unwrap_or_else(|| "Action failed".into()),
        ))
    }
}
