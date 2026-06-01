use crate::db::Database;
use crate::models::StartupEntry;
use crate::util::cmd;
use std::collections::HashMap;
use tauri::{State};

fn read_run_keys() -> Vec<StartupEntry> {
    let mut entries = Vec::new();
    let locations = [
        (r"HKLM\Software\Microsoft\Windows\CurrentVersion\Run", "HKLM Run"),
        (r"HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce", "HKLM RunOnce"),
        (r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run", "HKCU Run"),
        (r"HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce", "HKCU RunOnce"),
    ];

    for (key, source) in &locations {
        if let Ok(output) = cmd("reg")
            .args(["query", key, "/s"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let line = line.trim();
                    if line.contains("REG_SZ") || line.contains("REG_EXPAND_SZ") {
                        let parts: Vec<&str> = line.splitn(4, "    ").collect();
                        if parts.len() >= 3 {
                            let name = parts[0].trim().to_string();
                            let cmd = parts[2..].join("    ").replace("REG_SZ", "").replace("REG_EXPAND_SZ", "").trim().to_string();
                            if !name.is_empty() && !cmd.is_empty() && !name.contains("\\") {
                                entries.push(StartupEntry {
                                    id: None, name, command: cmd,
                                    source: source.to_string(), enabled: true, delay_seconds: 0,
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    entries
}

fn read_startup_folder() -> Vec<StartupEntry> {
    let mut entries = Vec::new();
    for var in ["APPDATA", "PROGRAMDATA"] {
        if let Ok(base) = std::env::var(var) {
            let path = std::path::Path::new(&base).join(r"Microsoft\Windows\Start Menu\Programs\Startup");
            if path.exists() {
                if let Ok(reader) = std::fs::read_dir(&path) {
                    for entry in reader.flatten() {
                        let p = entry.path();
                        if p.is_file() {
                            let name = p.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
                            entries.push(StartupEntry {
                                id: None, name, command: p.to_string_lossy().to_string(),
                                source: "Startup Folder".into(), enabled: true, delay_seconds: 0,
                            });
                        }
                    }
                }
            }
        }
    }
    entries
}

#[tauri::command]
pub async fn get_startup_entries(db: State<'_, Database>) -> Result<Vec<StartupEntry>, String> {
    let mut entries = read_run_keys();
    entries.extend(read_startup_folder());

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT name, enabled, delay_seconds FROM startup_entries")
        .map_err(|e| e.to_string())?;
    let saved: HashMap<String, (bool, u32)> = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, bool>(1)?, row.get::<_, u32>(2)?))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).map(|(a, b, c)| (a, (b, c))).collect();

    for entry in &mut entries {
        if let Some(&(enabled, delay)) = saved.get(&entry.name) {
            entry.enabled = enabled;
            entry.delay_seconds = delay;
        }
    }
    Ok(entries)
}

#[tauri::command]
pub async fn toggle_startup_entry(db: State<'_, Database>, name: String, enabled: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO startup_entries (name, source, command, enabled, delay_seconds) VALUES (?1, 'manual', 'manual', ?2, 0) ON CONFLICT(name) DO UPDATE SET enabled = ?2",
        rusqlite::params![name, enabled],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_startup_entry(name: String) -> Result<(), String> {
    for key in &[
        r"HKLM\Software\Microsoft\Windows\CurrentVersion\Run",
        r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
    ] {
        let _ = cmd("reg")
            .args(["delete", key, "/v", &name, "/f"])
            .output();
    }
    Ok(())
}

#[tauri::command]
pub async fn set_startup_delay(db: State<'_, Database>, name: String, delay_seconds: u32) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO startup_entries (name, source, command, enabled, delay_seconds) VALUES (?1, 'manual', 'manual', 1, ?2) ON CONFLICT(name) DO UPDATE SET delay_seconds = ?2",
        rusqlite::params![name, delay_seconds],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_startup_entry(name: String, command: String, source: String) -> Result<(), String> {
    match source.as_str() {
        "HKCU" | "HKCU Run" => {
            let _ = cmd("reg")
                .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run", "/v", &name, "/t", "REG_SZ", "/d", &command, "/f"])
                .output();
        }
        "HKLM" | "HKLM Run" => {
            let _ = cmd("reg")
                .args(["add", r"HKLM\Software\Microsoft\Windows\CurrentVersion\Run", "/v", &name, "/t", "REG_SZ", "/d", &command, "/f"])
                .output();
        }
        _ => {
            if let Ok(appdata) = std::env::var("APPDATA") {
                let p = std::path::Path::new(&appdata)
                    .join(r"Microsoft\Windows\Start Menu\Programs\Startup")
                    .join(format!("{}.url", name));
                std::fs::write(&p, format!("[InternetShortcut]\nURL=file:///{}\n", command.replace('\\', "/")))
                    .map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}
