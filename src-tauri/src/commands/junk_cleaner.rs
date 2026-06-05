use crate::db::Database;
use crate::models::*;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Emitter, State};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JunkScanRequest {
    pub custom_paths: Vec<String>,
}

fn get_junk_locations() -> Vec<(String, String, Vec<PathBuf>)> {
    let temp = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".into());
    let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".into());
    let localappdata = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".into());

    vec![
        ("windows_temp".into(), "Windows Temp".into(), vec![PathBuf::from(&format!("{}\\Temp", windir))]),
        ("user_temp".into(), "User Temp".into(), vec![PathBuf::from(&temp)]),
        ("prefetch".into(), "Prefetch".into(), vec![PathBuf::from(&format!("{}\\Prefetch", windir))]),
        ("windows_logs".into(), "Windows Logs".into(), vec![
            PathBuf::from(&format!("{}\\Logs", windir)),
            PathBuf::from(&format!("{}\\System32\\winevt\\Logs", windir)),
        ]),
        ("app_caches".into(), "Application Caches".into(), vec![
            PathBuf::from(&format!("{}\\Microsoft\\Windows\\ShaderCache", localappdata)),
        ]),
        ("windows_update".into(), "Windows Update Files".into(), vec![
            PathBuf::from(&format!("{}\\SoftwareDistribution\\Download", windir)),
            PathBuf::from(&format!("{}\\WinSxS\\Backup", windir)),
        ]),
    ]
}

fn is_excluded(path_str: &str, exclusions: &[String]) -> bool {
    exclusions.iter().any(|e| {
        path_str == e.as_str()
            || path_str.starts_with(&format!("{}\\", e))
    })
}

fn scan_path_size(path: &std::path::Path, exclusions: &[String]) -> (u64, u64, Vec<String>) {
    if !path.exists() { return (0, 0, vec![]); }
    let mut size = 0u64;
    let mut count = 0u64;
    let mut files = Vec::new();
    for entry in WalkDir::new(path).max_depth(3).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path_str = entry.path().to_string_lossy();
            if is_excluded(&path_str, exclusions) {
                continue;
            }
            if let Ok(meta) = entry.metadata() {
                size += meta.len();
                count += 1;
                if files.len() < 100 {
                    files.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }
    (size, count, files)
}

#[tauri::command]
pub async fn scan_junk(app_handle: tauri::AppHandle, request: JunkScanRequest, db: State<'_, Database>) -> Result<JunkScanResult, String> {
    // Load exclusions from DB
    let exclusions: Vec<String> = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT path FROM exclusion_list")
            .map_err(|e| e.to_string())?;
        let rows: Vec<String> = stmt.query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rows
    };

    let mut categories = Vec::new();
    let mut total_size = 0u64;
    let mut total_files = 0u64;

    // Count total files for progress
    let total_estimate: u64 = get_junk_locations().iter().flat_map(|(_, _, paths)| paths).filter(|p| p.exists()).count() as u64
        + request.custom_paths.iter().filter(|p| std::path::Path::new(p).exists()).count() as u64;
    let mut processed = 0u64;

    for (id, name, paths) in get_junk_locations() {
        let _ = app_handle.emit("scan-progress", serde_json::json!({
            "current": processed, "total": total_estimate, "label": name
        }));
        let mut cat_size = 0u64;
        let mut cat_files = 0u64;
        let mut all_files = Vec::new();
        for p in &paths {
            let (s, c, f) = scan_path_size(p, &exclusions);
            cat_size += s; cat_files += c; all_files.extend(f);
            processed += 1;
        }
        total_size += cat_size; total_files += cat_files;
        categories.push(JunkCategoryResult {
            category_id: id, category_name: name,
            file_count: cat_files, total_size: cat_size, files: all_files,
        });
    }

    for custom in &request.custom_paths {
        let p = PathBuf::from(custom);
        if p.exists() {
            let _ = app_handle.emit("scan-progress", serde_json::json!({
                "current": processed, "total": total_estimate, "label": format!("Custom: {}", custom)
            }));
            let (s, c, f) = scan_path_size(&p, &exclusions);
            total_size += s; total_files += c;
            categories.push(JunkCategoryResult {
                category_id: format!("custom_{}", categories.len()),
                category_name: format!("Custom: {}", custom),
                file_count: c, total_size: s, files: f,
            });
            processed += 1;
        }
    }

    let _ = app_handle.emit("scan-progress", serde_json::json!({
        "current": total_estimate, "total": total_estimate, "label": "Done"
    }));

    let result = JunkScanResult { categories, total_size, total_files };
    if let Ok(json) = serde_json::to_string(&result) {
        let _ = super::history::save_scan_result(
            &db, "junk_cleaner", total_size as i64, total_files as i64, &json,
        );
    }

    Ok(result)
}

#[tauri::command]
pub async fn clean_junk(app_handle: tauri::AppHandle, selected_categories: Vec<String>) -> Result<CleanResult, String> {
    let mut removed = 0u64;
    let mut freed = 0u64;
    let mut errors = Vec::new();

    let mut paths: Vec<PathBuf> = Vec::new();
    for (id, _, locs) in get_junk_locations() {
        if selected_categories.contains(&id) {
            for p in locs { if p.exists() { paths.push(p); } }
        }
    }

    let total = paths.len() as u64;
    for (i, path) in paths.iter().enumerate() {
        let _ = app_handle.emit("scan-progress", serde_json::json!({
            "current": i as u64, "total": total,
            "label": format!("Cleaning: {}", path.display())
        }));
        if path.is_file() {
            if let Ok(meta) = path.metadata() { freed += meta.len(); }
            match std::fs::remove_file(path) {
                Ok(_) => removed += 1,
                Err(e) => errors.push(format!("Failed {}: {}", path.display(), e)),
            }
        } else if path.is_dir() {
            let mut dir_freed = 0u64;
            let mut dir_removed = 0u64;
            for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    if let Ok(meta) = entry.metadata() { dir_freed += meta.len(); }
                    dir_removed += 1;
                }
            }
            match std::fs::remove_dir_all(path) {
                Ok(_) => { freed += dir_freed; removed += dir_removed; }
                Err(e) => errors.push(format!("Failed {}: {}", path.display(), e)),
            }
        }
    }
    let _ = app_handle.emit("scan-progress", serde_json::json!({
        "current": 1, "total": 1, "label": "Done"
    }));

    Ok(CleanResult { items_removed: removed, space_freed: freed, errors })
}
