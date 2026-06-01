use crate::db::Database;
use crate::models::*;
use crate::util::cmd;
use chrono::Local;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

fn reg_key_exists(key: &str) -> bool {
    cmd("reg")
        .args(["query", key])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn enum_subkeys(base: &str, path: &str) -> Vec<String> {
    let mut keys = Vec::new();
    let output = match cmd("reg")
        .args(["query", &format!("{}\\{}", base, path)])
        .output() {
            Ok(o) => o,
            Err(_) => return keys,
        };
    if !output.status.success() {
        return keys;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let prefix = format!("{}\\{}", base, path);
    for line in stdout.lines() {
        let l = line.trim();
        if l.starts_with(&prefix) && l.len() > prefix.len() {
            let remainder = l[prefix.len()+1..].trim();
            if !remainder.is_empty() && !remainder.contains('\\') {
                keys.push(remainder.to_string());
            }
        }
    }
    keys
}

fn read_reg_value(base: &str, path: &str, value: &str) -> Option<String> {
    let full = format!("{}\\{}", base, path);
    let output = cmd("reg")
        .args(["query", &full, "/v", value])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let l = line.trim();
        if l.contains("REG_") && l.starts_with(value) || l.contains(&format!("    {}    ", value)) {
            let parts: Vec<&str> = l.splitn(4, "    ").collect();
            if parts.len() >= 3 {
                return Some(parts[2..].join("    ").trim().to_string());
            }
        }
    }
    None
}

#[tauri::command]
pub async fn scan_registry(db: State<'_, Database>) -> Result<RegistryScanResult, String> {
    let mut safe = Vec::new();
    let mut moderate = Vec::new();
    let risky = Vec::new();

    // Check orphaned uninstall entries
    for path in &[
        r"Software\Microsoft\Windows\CurrentVersion\Uninstall",
        r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    ] {
        for entry in enum_subkeys("HKLM", path) {
            let full = format!("{}\\{}", path, entry);
            let display = read_reg_value("HKLM", &full, "DisplayName");
            let install = read_reg_value("HKLM", &full, "InstallLocation");
            if let Some(loc) = install {
                let loc_trimmed = loc.trim_end_matches('\0');
                if !loc_trimmed.is_empty() && !std::path::Path::new(loc_trimmed).exists() {
                    moderate.push(RegistryIssue {
                        id: format!("orphan_{}", entry),
                        key_path: format!("HKLM\\{}", full),
                        value_name: "InstallLocation".into(),
                        current_value: loc,
                        risk_level: "moderate".into(),
                        description: format!("Orphaned: {}", display.clone().unwrap_or_default()),
                    });
                }
            }
            if display.is_none() {
                safe.push(RegistryIssue {
                    id: format!("empty_{}", entry),
                    key_path: format!("HKLM\\{}", full),
                    value_name: "(Default)".into(),
                    current_value: String::new(),
                    risk_level: "safe".into(),
                    description: format!("Empty key: {}", entry),
                });
            }
        }
    }

    // Check orphaned file associations
    for entry in enum_subkeys("HKCU", r"Software\Classes") {
        if entry.starts_with('.') {
            if let Some(prog_id) = read_reg_value("HKCU", &format!(r"Software\Classes\{}", entry), "@") {
                let pid = prog_id.trim_end_matches('\0');
                if !pid.is_empty() {
                    let p = format!(r"HKCU\Software\Classes\{}", pid);
                    let plm = format!(r"HKLM\Software\Classes\{}", pid);
                    if !reg_key_exists(&p) && !reg_key_exists(&plm) {
                        moderate.push(RegistryIssue {
                            id: format!("orphan_ext_{}", entry),
                            key_path: format!(r"HKCU\Software\Classes\{}", entry),
                            value_name: "@".into(),
                            current_value: pid.to_string(),
                            risk_level: "moderate".into(),
                            description: format!("Orphaned extension: {}", entry),
                        });
                    }
                }
            }
        }
    }

    let result = RegistryScanResult { safe, moderate, risky };
    if let Ok(json) = serde_json::to_string(&result) {
        let total_issues = (result.safe.len() + result.moderate.len() + result.risky.len()) as i64;
        let _ = super::history::save_scan_result(
            &db, "registry_cleaner", 0, total_issues, &json,
        );
    }

    Ok(result)
}

fn export_backup(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let backup_dir = app_dir.join("_backups").join("registry");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    let ts = Local::now().format("%Y%m%d_%H%M%S");
    let path = backup_dir.join(format!("registry_backup_{}.reg", ts));
    let _ = cmd("cmd")
        .args(["/C", &format!("reg export \"HKLM\" \"{}\" /y", path.to_string_lossy())])
        .output();
    Ok(path)
}

#[tauri::command]
pub async fn clean_registry(
    app_handle: AppHandle, db: State<'_, Database>, issues: Vec<RegistryIssue>,
) -> Result<CleanResult, String> {
    let backup = export_backup(&app_handle)?;
    let mut removed = 0u64;
    let mut errors = Vec::new();

    for issue in &issues {
        let path = &issue.key_path;
        let full_key = if issue.value_name.is_empty() || issue.value_name == "(Default)" || issue.value_name == "@" {
            format!("reg delete \"{}\" /f", path)
        } else {
            format!("reg delete \"{}\" /v \"{}\" /f", path, issue.value_name)
        };
        let result = cmd("cmd")
            .args(["/C", &full_key])
            .output();
        match result {
            Ok(o) if o.status.success() => removed += 1,
            Ok(o) => {
                let stderr = String::from_utf8_lossy(&o.stderr);
                errors.push(format!("Failed {}\\{}: {}", issue.key_path, issue.value_name, stderr.trim()));
            }
            Err(e) => errors.push(format!("Failed {}\\{}: {}", issue.key_path, issue.value_name, e)),
        }
    }

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO registry_backups (file_path, key_count, created_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![backup.to_string_lossy().to_string(), issues.len() as u32, Local::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;

    Ok(CleanResult { items_removed: removed, space_freed: 0, errors })
}
