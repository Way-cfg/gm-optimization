use serde::{Deserialize, Serialize};
use crate::util::cmd;

#[derive(Debug, Serialize, Deserialize)]
pub struct RegistryEntry {
    pub path: String,
    pub name: String,
    pub value: String,
    pub type_: String,
}

#[tauri::command]
pub async fn apply_registry_tweak(entries: Vec<RegistryEntry>, enabled: bool) -> Result<String, String> {
    let mut results = Vec::new();

    for entry in &entries {
        if enabled {
            let type_flag = match entry.type_.to_lowercase().as_str() {
                "dword" => "REG_DWORD",
                "string" | "sz" => "REG_SZ",
                "expand" => "REG_EXPAND_SZ",
                "multi" => "REG_MULTI_SZ",
                "qword" => "REG_QWORD",
                "binary" => "REG_BINARY",
                _ => "REG_DWORD",
            };

            let output = cmd("reg")
                .args(["add", &entry.path, "/v", &entry.name, "/t", type_flag, "/d", &entry.value, "/f"])
                .output()
                .map_err(|e| format!("Failed to execute reg.exe: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                results.push(format!("Failed to add {}: {}", entry.name, stderr.trim()));
            } else {
                results.push(format!("Set {} = {}", entry.name, entry.value));
            }
        } else {
            let output = cmd("reg")
                .args(["delete", &entry.path, "/v", &entry.name, "/f"])
                .output()
                .map_err(|e| format!("Failed to execute reg.exe: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                results.push(format!("Failed to delete {}: {}", entry.name, stderr.trim()));
            } else {
                results.push(format!("Deleted {}", entry.name));
            }
        }
    }

    Ok(results.join("\n"))
}
