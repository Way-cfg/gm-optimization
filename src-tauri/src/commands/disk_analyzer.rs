use crate::models::*;
use crate::util::cmd;
use std::path::Path;
use tauri::Emitter;
use walkdir::WalkDir;

fn get_type(ext: &str) -> String {
    match ext.to_lowercase().as_str() {
        "mp4"|"avi"|"mkv"|"mov"|"wmv"|"flv"|"webm" => "video",
        "exe"|"dll"|"msi"|"com"|"sys"|"drv" => "executable",
        "jpg"|"jpeg"|"png"|"gif"|"bmp"|"webp"|"svg"|"ico" => "image",
        "doc"|"docx"|"pdf"|"txt"|"xls"|"xlsx"|"ppt"|"pptx"|"md" => "document",
        "zip"|"rar"|"7z"|"tar"|"gz"|"bz2" => "archive",
        _ => "other",
    }.to_string()
}

fn get_volume_label(drive_letter: char) -> String {
    let output = cmd("cmd")
        .args(["/C", &format!("vol {}:", drive_letter)])
        .output()
        .ok();
    if let Some(o) = output {
        if o.status.success() {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let stdout = stdout.trim();
            // Parse "Volume in drive C is <label>" or "Volume Serial Number is..."
            for line in stdout.lines() {
                let l = line.trim();
                if let Some(label_start) = l.find(" is ") {
                    let after = &l[label_start + 4..];
                    if !after.contains("Serial Number") && !after.contains("FAT") && !after.contains("NTFS") {
                        let label = after.trim_end_matches('.').trim().to_string();
                        if !label.is_empty() && !label.contains("Volume") {
                            return label;
                        }
                    }
                }
            }
        }
    }
    String::new()
}

#[tauri::command]
pub async fn get_drives() -> Result<Vec<DriveInfo>, String> {
    let mut drives = Vec::new();
    for letter in 'A'..='Z' {
        let root = format!("{}:\\", letter);
        if Path::new(&root).exists() {
            if let Ok(meta) = std::fs::metadata(&root) {
                if meta.is_dir() {
                    let _total = match cmd("cmd")
                        .args(["/C", &format!("fsutil volume diskfree {}:", letter)])
                        .output()
                    {
                        Ok(o) if o.status.success() => {
                            let stdout = String::from_utf8_lossy(&o.stdout);
                            let mut total = 0u64;
                            let mut free = 0u64;
                            for line in stdout.lines() {
                                let l = line.trim();
                                if let Some(t) = l.strip_prefix("Total # of bytes") {
                                    if let Some(n) = t.split(':').nth(1) {
                                        total = n.trim().replace(',', "").parse().unwrap_or(0);
                                    }
                                } else if let Some(f) = l.strip_prefix("Total # of free bytes") {
                                    if let Some(n) = f.split(':').nth(1) {
                                        free = n.trim().replace(',', "").parse().unwrap_or(0);
                                    }
                                }
                            }
                            drives.push(DriveInfo {
                                name: root,
                                label: get_volume_label(letter),
                                total_space: total,
                                free_space: free,
                                file_system: String::new(),
                            });
                            continue;
                        }
                        _ => {}
                    };
                    // Fallback
                    drives.push(DriveInfo {
                        name: root,
                        label: get_volume_label(letter),
                        total_space: 0,
                        free_space: 0,
                        file_system: String::new(),
                    });
                }
            }
        }
    }
    Ok(drives)
}

#[tauri::command]
pub async fn scan_drive(app_handle: tauri::AppHandle, drive_path: String) -> Result<TreemapNode, String> {
    let root = std::path::Path::new(&drive_path);
    if !root.exists() { return Err(format!("Path not found: {}", drive_path)); }

    let mut node = TreemapNode {
        name: drive_path.clone(), path: drive_path.clone(),
        size: 0, file_type: "directory".into(), is_directory: true, children: Vec::new(),
    };

    if let Ok(entries) = std::fs::read_dir(root) {
        let all: Vec<_> = entries.flatten().collect();
        let total = all.len() as u64;
        for (i, entry) in all.into_iter().enumerate() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let _ = app_handle.emit("scan-progress", serde_json::json!({
                "current": i as u64, "total": total, "label": name
            }));
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    let mut size = 0u64;
                    let mut children = Vec::new();
                    for sub in WalkDir::new(&path).max_depth(1).into_iter().filter_map(|e| e.ok()).skip(1) {
                        if sub.file_type().is_file() {
                            if let Ok(sm) = sub.metadata() {
                                let ext = sub.path().extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
                                size += sm.len();
                                children.push(TreemapNode {
                                    name: sub.file_name().to_string_lossy().to_string(),
                                    path: sub.path().to_string_lossy().to_string(),
                                    size: sm.len(), file_type: get_type(&ext),
                                    is_directory: false, children: Vec::new(),
                                });
                            }
                        }
                    }
                    node.children.push(TreemapNode {
                        name, path: path.to_string_lossy().to_string(),
                        size, file_type: "directory".into(), is_directory: true, children,
                    });
                } else if meta.is_file() {
                    let ext = path.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
                    node.children.push(TreemapNode {
                        name, path: path.to_string_lossy().to_string(),
                        size: meta.len(), file_type: get_type(&ext),
                        is_directory: false, children: Vec::new(),
                    });
                }
            }
        }
    }
    let _ = app_handle.emit("scan-progress", serde_json::json!({
        "current": 1, "total": 1, "label": "Done"
    }));
    node.size = node.children.iter().map(|c| c.size).sum();
    Ok(node)
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() { return Err("Not found".into()); }
    if p.is_file() { std::fs::remove_file(p).map_err(|e| e.to_string())?; }
    else { std::fs::remove_dir_all(p).map_err(|e| e.to_string())?; }
    Ok(())
}
