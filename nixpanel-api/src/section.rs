//! Helpers for calling section binaries via stdin/stdout JSON.

use nixpanel_common::{SectionRequest, SectionResponse};
use std::io::Write;
use std::process::{Command, Stdio};

/// Call a section binary and return its parsed response.
/// `bin_dir` is e.g. "/opt/nixpanel/bin".
pub fn call(bin_dir: &str, binary: &str, action: &str, params: serde_json::Value)
    -> anyhow::Result<SectionResponse>
{
    let bin_path = format!("{}/{}", bin_dir, binary);
    let req = SectionRequest { action: action.to_string(), params };
    let req_json = serde_json::to_string(&req)?;

    let mut child = Command::new(&bin_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| anyhow::anyhow!("Failed to start {}: {}", bin_path, e))?;

    if let Some(stdin) = child.stdin.take() {
        let mut stdin = stdin;
        stdin.write_all(req_json.as_bytes())?;
        stdin.write_all(b"\n")?;
    }

    let output = child.wait_with_output()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let resp: SectionResponse = serde_json::from_str(text.trim())
        .map_err(|e| anyhow::anyhow!("Bad response from {}: {} (raw: {})", binary, e, text.trim()))?;

    Ok(resp)
}
