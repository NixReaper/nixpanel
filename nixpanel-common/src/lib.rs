use serde::{Deserialize, Serialize};

/// Every section binary reads one of these from stdin.
#[derive(Debug, Serialize, Deserialize)]
pub struct SectionRequest {
    pub action: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

/// Every section binary writes one of these to stdout.
#[derive(Debug, Serialize, Deserialize)]
pub struct SectionResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl SectionResponse {
    pub fn ok<T: Serialize>(data: T) -> Self {
        Self {
            success: true,
            data: Some(serde_json::to_value(data).unwrap_or(serde_json::Value::Null)),
            error: None,
        }
    }

    pub fn err(msg: impl ToString) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.to_string()),
        }
    }
}

/// Shared service descriptor used by both sysinfo and services sections.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceInfo {
    pub name: String,
    pub display: String,
    pub status: String, // "running" | "stopped" | "warning"
    pub pid: Option<u32>,
    pub uptime: Option<String>,
}
