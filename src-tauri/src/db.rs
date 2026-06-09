use rusqlite::{Connection, Result};
use std::path::Path;
use std::sync::Mutex;
use tauri::Manager;

pub struct Database {
    pub conn: Mutex<Connection>,
}

fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY, module TEXT NOT NULL,
            scanned_at TEXT NOT NULL, total_size INTEGER,
            item_count INTEGER, result_json TEXT
        );
        CREATE TABLE IF NOT EXISTS exclusion_list (
            id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE,
            added_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS registry_backups (
            id INTEGER PRIMARY KEY, file_path TEXT NOT NULL,
            key_count INTEGER, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tweak_settings (
            id INTEGER PRIMARY KEY, tweak_key TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 0,
            requires_reboot INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
            module TEXT NOT NULL, schedule_type TEXT NOT NULL,
            time TEXT, day TEXT, enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS benchmark_results (
            id INTEGER PRIMARY KEY, benchmark_type TEXT NOT NULL,
            score REAL NOT NULL, unit TEXT NOT NULL,
            profile_name TEXT, created_at TEXT NOT NULL
        );",
    )?;
    Ok(())
}

fn get_db_path(app_dir: &Path) -> std::path::PathBuf {
    app_dir.join("gm_optimization.db")
}

pub fn initialize_database(app_handle: &tauri::AppHandle) -> Result<Database> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    let db_path = get_db_path(&app_dir);
    let conn = Connection::open(db_path)?;
    create_tables(&conn)?;
    Ok(Database {
        conn: Mutex::new(conn),
    })
}

pub fn initialize_database_headless() -> Result<Database> {
    let app_dir = std::env::var("APPDATA")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from(r"C:\ProgramData"))
        .join("com.gm-optimization.optimizer");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    let db_path = get_db_path(&app_dir);
    let conn = Connection::open(db_path)?;
    create_tables(&conn)?;
    Ok(Database {
        conn: Mutex::new(conn),
    })
}


