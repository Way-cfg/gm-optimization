use crate::models::StartupItem;
use crate::util::cmd;
use std::fs;

fn scan_registry(path: &str, label: &str) -> Vec<StartupItem> {
    let mut items = Vec::new();
    let script = format!(
        r#"$items = @(); try {{
            $p = Get-ItemProperty "{}" -ErrorAction Stop;
            $p.PSObject.Properties | Where-Object {{ $_.Name -notlike "PS*" }} | ForEach-Object {{
                $name = $_.Name;
                $val = $_.Value;
                $disabled = $name.StartsWith("_disabled_");
                if ($disabled) {{ $name = $name.Substring(10) }};
                $items += @{{
                    id = "registry|{}|$name";
                    name = $name;
                    command = "$val";
                    location = "{}";
                    enabled = !$disabled
                }}
            }}
        }} catch {{}}; $items | ConvertTo-Json"#,
        path, path, label
    );

    let output = cmd("powershell")
        .args(["-NoProfile", "-Command", &script])
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !stdout.is_empty() && stdout != "[]" && stdout != "\n" {
                if let Ok(parsed) = serde_json::from_str::<Vec<StartupItem>>(&stdout) {
                    items = parsed;
                }
            }
        }
    }

    items
}

fn scan_folder(path: &str, label: &str) -> Vec<StartupItem> {
    let mut items = Vec::new();
    let disabled_path = format!("{}\\Disabled", path);

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().is_some_and(|e| e == "lnk" || e == "url") {
                let filename = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                let name = p.file_stem().unwrap_or_default().to_string_lossy().to_string();
                items.push(StartupItem {
                    id: format!("folder|{}|{}", path, filename),
                    name,
                    command: p.to_string_lossy().to_string(),
                    location: label.to_string(),
                    enabled: true,
                });
            }
        }
    }

    if let Ok(entries) = fs::read_dir(&disabled_path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().is_some_and(|e| e == "lnk" || e == "url") {
                let name = p.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let clean = name.strip_prefix("_disabled_").unwrap_or(&name).to_string();
                let ext = p.extension().unwrap_or_default().to_string_lossy();
                let original_filename = format!("{}.{}", clean, ext);
                items.push(StartupItem {
                    id: format!("folder|{}|{}", path, original_filename),
                    name: clean,
                    command: p.to_string_lossy().to_string(),
                    location: label.to_string(),
                    enabled: false,
                });
            }
        }
    }

    items
}

#[tauri::command]
pub async fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    let mut items = Vec::new();

    items.extend(scan_registry(
        "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKCU\\Run",
    ));
    items.extend(scan_registry(
        "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKLM\\Run",
    ));

    let user_startup = format!(
        "{}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup",
        std::env::var("APPDATA").unwrap_or_default()
    );
    let common_startup = format!(
        "{}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup",
        std::env::var("PROGRAMDATA").unwrap_or_default()
    );

    items.extend(scan_folder(&user_startup, "Startup Folder (User)"));
    if user_startup != common_startup {
        items.extend(scan_folder(&common_startup, "Startup Folder (Common)"));
    }

    items.sort_by_key(|a| a.name.to_lowercase());
    Ok(items)
}

#[tauri::command]
pub async fn toggle_startup_item(id: String, enabled: bool) -> Result<(), String> {
    let parts: Vec<&str> = id.splitn(3, '|').collect();
    if parts.len() < 3 {
        return Err("Invalid item id format".into());
    }

    let source_type = parts[0];
    let path = parts[1];

    match source_type {
        "registry" => {
            let value_name = parts[2];
            let script = if enabled {
                format!(
                    r#"try {{
                        $val = (Get-ItemProperty "{}" -ErrorAction Stop)."_disabled_{}";
                        Remove-ItemProperty "{}" -Name "_disabled_{}" -ErrorAction Stop;
                        Set-ItemProperty "{}" -Name "{}" -Value $val -ErrorAction Stop;
                        Write-Output "ok"
                    }} catch {{ Write-Error $_.Exception.Message }}"#,
                    path, value_name, path, value_name, path, value_name
                )
            } else {
                format!(
                    r#"try {{
                        $val = (Get-ItemProperty "{}" -ErrorAction Stop)."{}";
                        Remove-ItemProperty "{}" -Name "{}" -ErrorAction Stop;
                        Set-ItemProperty "{}" -Name "_disabled_{}" -Value $val -ErrorAction Stop;
                        Write-Output "ok"
                    }} catch {{ Write-Error $_.Exception.Message }}"#,
                    path, value_name, path, value_name, path, value_name
                )
            };

            let output = cmd("powershell")
                .args(["-NoProfile", "-Command", &script])
                .output()
                .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Registry toggle failed: {}", stderr.trim()));
            }
        }
        "folder" => {
            let filename = parts[2];
            let source = format!("{}\\{}", path, filename);
            let disabled_dir = format!("{}\\Disabled", path);
            let disabled_target = format!("{}\\Disabled\\{}", path, filename);

            if enabled {
                fs::rename(&disabled_target, &source)
                    .map_err(|e| format!("Failed to enable startup item: {}", e))?;
            } else {
                let _ = fs::create_dir_all(&disabled_dir);
                fs::rename(&source, &disabled_target)
                    .map_err(|e| format!("Failed to disable startup item: {}", e))?;
            }
        }
        _ => return Err(format!("Unknown source type: {}", source_type)),
    }

    Ok(())
}
