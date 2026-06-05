use crate::db;
use chrono::Local;
use walkdir::WalkDir;

fn junk_clean_headless() -> String {
    let temp = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".into());
    let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".into());
    let localappdata = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".into());

    let locations = vec![
        format!("{}\\Temp", windir),
        temp.clone(),
        format!("{}\\Prefetch", windir),
        format!("{}\\SoftwareDistribution\\Download", windir),
        format!("{}\\WinSxS\\Backup", windir),
    ];

    let mut removed = 0u64;
    let mut freed = 0u64;

    for loc in &locations {
        let p = std::path::Path::new(loc);
        if !p.exists() { continue; }
        for entry in WalkDir::new(p).max_depth(3).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                if let Ok(meta) = entry.metadata() {
                    freed += meta.len();
                }
                let _ = std::fs::remove_file(entry.path());
                removed += 1;
            }
        }
    }

    // Shader cache
    let shader_cache = format!("{}\\Microsoft\\Windows\\ShaderCache", localappdata);
    let p = std::path::Path::new(&shader_cache);
    if p.exists() {
        let _ = std::fs::remove_dir_all(p);
    }

    let summary = format!("Headless junk clean: {} items, {} MB freed", removed, freed / (1024 * 1024));
    summary
}

pub fn run_task(task: &str) {
    let db = match db::initialize_database_headless() {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Headless: failed to init DB: {}", e);
            return;
        }
    };

    let (result_json, module, item_count, total_size) = match task {
        "junk_cleaner" => {
            let msg = junk_clean_headless();
            (msg, "junk_cleaner", 0i64, 0i64)
        }
        other => {
            eprintln!("Headless: unknown task: {}", other);
            return;
        }
    };

    // Save to scan history
    let _ = db.conn.lock().map(|conn| {
        conn.execute(
            "INSERT INTO scan_history (module, scanned_at, total_size, item_count, result_json) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![module, Local::now().to_rfc3339(), total_size, item_count, result_json],
        )
    });
}
