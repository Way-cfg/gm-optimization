# Optimization Way Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows extreme system optimization utility (Tauri + Rust + React) with 6 modules: Junk Cleaner, Startup Manager, Registry Cleaner, Disk Analyzer, Process Manager, Settings Tweaker.

**Architecture:** Monolithic Rust backend with modular command files. React Router sidebar navigation. SQLite persistence. Windows API via `windows` crate. Always-run-as-admin.

**Prerequisites:** Rust toolchain (rustup.rs), Node.js 18+ (confirmed: v26.2.0), npm (confirmed: 11.13.0).

---

## File Structure

```
optimization-way/
├── src/
│   ├── components/
│   │   ├── Layout.tsx, Sidebar.tsx, Treemap.tsx, FileTable.tsx
│   ├── hooks/useTauriCommand.ts
│   ├── pages/
│   │   ├── JunkCleaner.tsx, StartupManager.tsx, RegistryCleaner.tsx
│   │   ├── DiskAnalyzer.tsx, ProcessManager.tsx, SettingsTweaker.tsx
│   ├── App.tsx, main.tsx, index.css
├── src-tauri/
│   ├── src/
│   │   ├── main.rs, db.rs, models.rs
│   │   └── commands/
│   │       ├── mod.rs, junk_cleaner.rs, startup_manager.rs
│   │       ├── registry_cleaner.rs, disk_analyzer.rs
│   │       ├── process_manager.rs, settings_tweaker.rs
│   ├── Cargo.toml, tauri.conf.json, build.rs
├── _backups/registry/
```

---

## Task 1: Install Prerequisites + Scaffold

**Files:** Project root directory

- [ ] **Step 1: Install Rust**
  `winget install Rust.Rustup` or https://rustup.rs. Verify: `rustc --version && cargo --version`

- [ ] **Step 2: Install Tauri CLI**
  `cargo install tauri-cli --version "^2"`

- [ ] **Step 3: Scaffold project**
  `npm create tauri-app@latest . -- --template react-ts --manager npm`

- [ ] **Step 4: Install deps**
  `npm install react-router-dom @tauri-apps/api`
  `npm install -D tailwindcss @tailwindcss/vite`

- [ ] **Step 5: Verify scaffold builds**
  `npx tauri dev` — window opens with default template

---

## Task 2: Backend Dependencies + Tauri Config

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Create: `src-tauri/optimization-way.exe.manifest`

- [ ] **Step 1: Write Cargo.toml** with deps: tauri 2, tauri-plugin-shell 2, serde (derive), serde_json, rusqlite (bundled), windows 0.58 (Win32_Foundation/Registry/Services/Threading/ProcessStatus/Storage_FileSystem/Security), sysinfo 0.31, walkdir 2, chrono (serde), tokio (full)

- [ ] **Step 2: Write tauri.conf.json** — Window 1200x800 (min 900x600), app identifier `com.optimizationway.app`, build commands for dev and prod, bundle NSIS

- [ ] **Step 3: Create admin manifest** `optimization-way.exe.manifest` with `requestedExecutionLevel level="requireAdministrator"`

---

## Task 3: Database + Models + Main Setup

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/db.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: models.rs** — serde structs: JunkScanResult, JunkCategoryResult, CleanResult, StartupEntry, RegistryIssue, RegistryScanResult, DriveInfo, TreemapNode, ProcessInfo, ServiceInfo, TweakInfo, TweakPreset, ScanProgress

- [ ] **Step 2: db.rs** — `struct Database { conn: Mutex<Connection> }`. `initialize_database()` creates app data dir, opens SQLite, runs CREATE TABLE IF NOT EXISTS for: scan_history, exclusion_list, startup_entries, registry_backups, tweak_settings, settings

- [ ] **Step 3: commands/mod.rs** — `pub mod junk_cleaner; pub mod startup_manager; pub mod registry_cleaner; pub mod disk_analyzer; pub mod process_manager; pub mod settings_tweaker;`

- [ ] **Step 4: main.rs** — `mod commands; mod db; mod models;` — `setup()` initializes DB, stores in managed state. `invoke_handler` placeholder for commands.

- [ ] **Step 5: Verify build** `cargo build` — expects compilation success

---

## Task 4: Frontend Layout + Dark Theme

**Files:**
- Create: `src/index.css`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/hooks/useTauriCommand.ts`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Modify: `vite.config.ts`

- [ ] **Step 1: Vite config** — add `tailwindcss()` from `@tailwindcss/vite` to plugins

- [ ] **Step 2: index.css** — Tailwind import `@import "tailwindcss"`. CSS variables for dark theme: --bg-primary (#0f0f0f), --bg-secondary (#1a1a1a), --bg-tertiary (#252525), --bg-card (#1e1e1e), --text-primary (#e0e0e0), --text-secondary (#a0a0a0), --text-muted (#666666), --accent (#4f8cff), --danger (#f44336), --success (#4caf50), --border (#333333). Body reset, scrollbar styles.

- [ ] **Step 3: main.tsx** — React 18 createRoot, BrowserRouter wrapper, imports App + index.css

- [ ] **Step 4: Sidebar.tsx** — Fixed left nav (w-60). App title header. 6 NavLink items with icons: Junk Cleaner, Startup Manager, Registry Cleaner, Disk Analyzer, Process Manager, Settings Tweaker. Active state: accent color + right border. Version footer.

- [ ] **Step 5: Layout.tsx** — Flex container: Sidebar + `<main className="ml-60 flex-1 p-6"><Outlet /></main>`

- [ ] **Step 6: App.tsx** — Routes with Layout wrapper. Default redirect / -> /junk-cleaner. 6 route paths with placeholder components.

- [ ] **Step 7: useTauriCommand.ts** — Generic hook wrapping `invoke()` with data/loading/error states. Returns `{data, loading, error, execute}`.

- [ ] **Step 8: Verify** `npm run build` — expects success

---

## Task 5: Junk Cleaner Module

**Files:**
- Create: `src-tauri/src/commands/junk_cleaner.rs`
- Create: `src/pages/JunkCleaner.tsx`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rust backend**
  - `#[tauri::command] scan_junk(request: JunkScanRequest) -> Result<JunkScanResult>`
    - Walks: Windows Temp, User Temp, Prefetch, Windows Logs, App Caches (Spotify, Discord, Shader Caches), Windows Update files
    - Custom paths from request parameter
    - Returns size per category with sample file paths
  - `#[tauri::command] clean_junk(selected_categories: Vec<String>) -> Result<CleanResult>`
    - Deletes files from selected categories
    - Returns items_removed, space_freed, errors

- [ ] **Step 2: React frontend** — Scan textarea for custom paths. Scan button. Category cards with checkboxes + file count + size. Clean button. Result summary with freed space.

- [ ] **Step 3: Register** `commands::junk_cleaner::scan_junk`, `commands::junk_cleaner::clean_junk` in invoke_handler. Import JunkCleaner in App.tsx route.

---

## Task 6: Startup Manager Module

**Files:**
- Create: `src-tauri/src/commands/startup_manager.rs`
- Create: `src/pages/StartupManager.tsx`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rust backend**
  - `get_startup_entries() -> Vec<StartupEntry>` — reads HKCU/HKLM Run/RunOnce via `RegOpenKeyExW/RegEnumValueW`, reads Startup folders, merges with DB-saved settings
  - `toggle_startup_entry(name, enabled) -> ()` — saves to startup_entries table
  - `delete_startup_entry(name) -> ()` — deletes via `RegDeleteValueW` + folder file removal
  - `set_startup_delay(name, delay_seconds) -> ()` — saves to DB
  - `add_startup_entry(name, command, source) -> ()` — creates in HKCU Run via `RegSetValueExW` or Startup folder

- [ ] **Step 2: React frontend** — Table: Name, Source, Command, Enabled (ON/OFF toggle), Delay (inline editable number), Delete. Add Entry modal with name/command/location fields.

---

## Task 7: Registry Cleaner Module

**Files:**
- Create: `src-tauri/src/commands/registry_cleaner.rs`
- Create: `src/pages/RegistryCleaner.tsx`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rust backend**
  - `scan_registry() -> RegistryScanResult` — enumerates uninstall keys (HKLM), file associations (HKCU\Software\Classes), empty keys. Categorizes: safe (empty keys, invalid paths), moderate (orphaned associations, obsolete entries), risky (deep system components)
  - `clean_registry(app_handle, db, issues) -> CleanResult` — auto-exports `.reg` backup via PowerShell `reg export HKLM` to `_backups/registry/`. Deletes keys via `RegDeleteTreeW`/`RegDeleteValueW`. Logs to registry_backups table.

- [ ] **Step 2: React frontend** — Risk filter toggles (Safe/Moderate/Risky). Per-item checkboxes. Table columns: Key Path, Value, Description. Scan button. Clean button. Backup confirmation.

---

## Task 8: Disk Analyzer Module

**Files:**
- Create: `src-tauri/src/commands/disk_analyzer.rs`
- Create: `src/components/Treemap.tsx`
- Create: `src/components/FileTable.tsx`
- Create: `src/pages/DiskAnalyzer.tsx`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rust backend**
  - `get_drives() -> Vec<DriveInfo>` — enumerates via `GetLogicalDrives`, gets space via `GetDiskFreeSpaceExW`, label via `GetVolumeInformationW`
  - `scan_drive(drive_path) -> TreemapNode` — walks directory tree with walkdir, returns nested tree. Color-coded by file type extension.
  - `delete_file(path) -> ()` — removes file/directory

- [ ] **Step 2: Treemap.tsx** — Canvas component. Squarified treemap algorithm. Rectangles proportional to size. Colors by file type. Click selects, double-click navigates into dir. Resize listener.

- [ ] **Step 3: FileTable.tsx** — Sortable table. Double-click navigates. Delete button. Linked to treemap selection.

- [ ] **Step 4: DiskAnalyzer.tsx** — Drive dropdown. Scan button. Split view: treemap (left 2/3) + table (right 1/3). Back-to-root button.

---

## Task 9: Process & Service Manager Module

**Files:**
- Create: `src-tauri/src/commands/process_manager.rs`
- Create: `src/pages/ProcessManager.tsx`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rust backend**
  - `get_processes() -> Vec<ProcessInfo>` — uses `sysinfo::System::new_all()`, CPU/Memory. Marks MS system processes. Sorts by CPU desc, 500 limit.
  - `kill_process(pid) -> ()` — `OpenProcess(PROCESS_TERMINATE)` + `TerminateProcess`
  - `get_services() -> Vec<ServiceInfo>` — `OpenSCManagerW` + `EnumServicesStatusExW`. Startup type via `QueryServiceConfigW`.
  - `change_service_startup(service_name, startup_type) -> ()` — `ChangeServiceConfigW`. Supports Automatic/Manual/Disabled.
  - `control_service(service_name, action) -> ()` — `StartServiceW` / `ControlService(SERVICE_CONTROL_STOP)`

- [ ] **Step 2: React frontend** — Tab switcher (Processes/Services). Processes: live table (2s polling via setInterval), Kill button with confirm. Services: status badge, startup type dropdown, Start/Stop buttons. Microsoft/3rd-party filter toggle.

---

## Task 10: Settings Tweaker Module

**Files:**
- Create: `src-tauri/src/commands/settings_tweaker.rs`
- Create: `src/pages/SettingsTweaker.tsx`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rust backend**
  - `get_all_tweaks(db) -> Vec<TweakInfo>` — returns 11 tweaks:
    - Performance (5): Ultimate Performance Power Plan (powercfg /setactive), CPU Scheduling (Win32PrioritySeparation reg DWORD), GPU Scheduling (HAGS reg), Disable Network Throttling (reg), Disable Animations (VisualFXSetting reg)
    - Privacy (4): Disable Telemetry (reg + sc stop DiagTrack), Disable Diagnostic Logging (reg), Disable Cortana (reg), Privacy Cascade (multiple reg)
    - System (2): Disable Hibernation (powercfg /h off), Optimize Indexing (reg)
  - `get_presets() -> Vec<TweakPreset>` — Gaming (performance 5), Privacy (privacy 4), Storage (system 2)
  - `apply_tweak(db, tweak_key, enabled) -> ()` — saves to DB + applies via registry/powercfg/sc

- [ ] **Step 2: React frontend** — 3 preset cards (name, description, apply button). Categorized toggle switches below. Preset click auto-toggles matching switches. Restart indicator badge on reboot-required tweaks. Immediate apply on toggle change.

---

## Task 11: Build, Verify & Polish

- [ ] **Step 1: Full Rust build** `cargo build` — resolve any windows crate compilation issues
- [ ] **Step 2: Full frontend build** `npm run build` — resolve TypeScript errors
- [ ] **Step 3: Integration test** `npx tauri dev` — test all 6 modules
- [ ] **Step 4: Edge cases** — no admin rights (graceful error), empty results, permission denied on individual files
- [ ] **Step 5: Verify** _backups/registry/ dir created on registry clean. SQLite DB created in app data dir.

---

## Key Windows API Patterns

### Registry Read
```rust
let mut handle = HKEY::default();
RegOpenKeyExW(hkey, w!(sub_key), 0, KEY_READ, &mut handle)?;
RegEnumValueW(handle, index, &mut name_buf, &mut name_len, None, Some(&mut value_type), Some(&mut data), Some(&mut data_len))?;
RegQueryValueExW(handle, &wide_name, None, Some(&mut value_type), Some(&mut data), Some(&mut data_len))?;
RegCloseKey(handle)?;
```

### Registry Write/Delete
```rust
RegOpenKeyExW(hkey, w!(sub_key), 0, KEY_SET_VALUE, &mut handle)?;
RegSetValueExW(handle, &wide_name, 0, REG_DWORD, Some(&data))?;
RegDeleteValueW(handle, &wide_name)?;
RegDeleteTreeW(handle, None)?;
```

### Service Control
```rust
let mgr = OpenSCManagerW(None, None, SC_MANAGER_ENUMERATE_SERVICE)?;
let service = OpenServiceW(mgr, &wide_name, SERVICE_QUERY_CONFIG)?;
EnumServicesStatusExW(mgr, SC_ENUM_PROCESS_INFO, SERVICE_WIN32, ...)?;
ChangeServiceConfigW(service, SERVICE_NO_CHANGE, SERVICE_DISABLED, ...)?;
StartServiceW(service, None)?;
ControlService(service, SERVICE_CONTROL_STOP, &mut status)?;
CloseServiceHandle(handle)?;
```

### Process
```rust
let handle = OpenProcess(PROCESS_TERMINATE, false, pid)?;
TerminateProcess(handle, 1)?;
CloseHandle(handle)?;
```
