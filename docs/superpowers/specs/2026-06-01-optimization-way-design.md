# Optimization Way — Design Document

**Date:** 2026-06-01
**Project:** Optimization Way — Windows Extreme System Utility

---

## Overview

A Windows desktop system optimization utility built with Tauri (Rust backend) + React/Tailwind CSS frontend. Comparable to Honey.gg and Chris Titus Tech's Tool — aggressively deep optimization of Windows systems through native API calls and Windows API hooks.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Desktop Framework | Tauri 2.x |
| Backend Language | Rust |
| Frontend Language | TypeScript |
| Frontend Framework | React 18+ |
| Styling | Tailwind CSS |
| Database | SQLite via `rusqlite` |
| Native APIs | `windows` crate, `sysinfo`, `walkdir` |
| Fallback | Inline PowerShell via `powershell_script` |

---

## Architecture

### Approach: Monolithic Rust Backend

Single Tauri app with modular command files under `src-tauri/src/commands/`. All system operations use native Rust `windows` crate calls for maximum performance. PowerShell fallback only where native APIs are overly restrictive.

**State Management:** SQLite connection managed via Tauri's `AppHandle` managed state layer, accessible across all command modules.

---

## Project Structure

```
optimization-way/
├── src/                               # React + Tailwind frontend
│   ├── components/
│   │   ├── Layout.tsx                 # Sidebar + content area shell
│   │   ├── Sidebar.tsx                # Navigation with module icons
│   │   ├── junk-cleaner/
│   │   │   ├── JunkCleaner.tsx        # Main module view
│   │   │   ├── CategoryList.tsx       # Checkboxes per junk type
│   │   │   ├── ScanResults.tsx        # Files found + total size
│   │   │   └── CleanButton.tsx
│   │   ├── startup-manager/
│   │   │   ├── StartupManager.tsx
│   │   │   ├── StartupTable.tsx       # Sortable, searchable
│   │   │   ├── EntryActions.tsx       # Enable/disable/edit/delete
│   │   │   └── AddEntryForm.tsx       # Modal form
│   │   ├── registry-cleaner/
│   │   │   ├── RegistryCleaner.tsx
│   │   │   ├── RiskCategoryCards.tsx  # Safe/Moderate/Risky cards
│   │   │   ├── ResultTable.tsx
│   │   │   └── BackupsIndicator.tsx
│   │   ├── disk-analyzer/
│   │   │   ├── DiskAnalyzer.tsx
│   │   │   ├── DriveSelector.tsx
│   │   │   ├── Treemap.tsx            # Interactive treemap (SVG/Canvas)
│   │   │   └── FileTable.tsx          # Sortable, linked to treemap
│   │   ├── process-manager/
│   │   │   ├── ProcessManager.tsx
│   │   │   ├── FilterBar.tsx          # MS vs 3rd-party toggle
│   │   │   ├── ProcessTable.tsx       # Live CPU/Mem
│   │   │   └── ServicePanel.tsx       # Startup type controls
│   │   └── settings-tweaker/
│   │       ├── SettingsTweaker.tsx
│   │       ├── PresetCards.tsx        # Gaming/Privacy/Storage presets
│   │       └── ToggleGroups.tsx       # Performance/Privacy/System
│   ├── hooks/
│   │   ├── useTauriCommand.ts         # Generic invoke wrapper
│   │   ├── useProcessPolling.ts       # Live process data
│   │   └── useScanProgress.ts         # Streaming scan events
│   ├── utils/
│   │   ├── format.ts                  # File size, duration formatting
│   │   └── constants.ts               # Colors, categories, presets
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                      # Tailwind + dark theme
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                    # Tauri entry, app builder, command registration
│   │   ├── commands/
│   │   │   ├── mod.rs                 # Re-exports all command modules
│   │   │   ├── junk_cleaner.rs        # Temp files, caches, prefetch, logs, updates
│   │   │   ├── startup_manager.rs     # Registry/Startup folder/Task Scheduler CRUD
│   │   │   ├── registry_cleaner.rs    # Deep registry scan + risk categorization
│   │   │   ├── disk_analyzer.rs       # Multi-threaded drive scanning + streaming
│   │   │   ├── process_manager.rs     # Process kill, service control, live stats
│   │   │   └── settings_tweaker.rs    # Power plan, registry tweaks, telemetry
│   │   ├── db.rs                      # SQLite init, schema migrations, connection management
│   │   └── models.rs                  # Shared structs, enums, serde derives
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── _backups/
│   └── registry/                      # Auto-exported .reg backup files
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── postcss.config.js
```

---

## Frontend Architecture

### Routing

React Router with sidebar-driven navigation:

| Route | Module |
|-------|--------|
| `/junk-cleaner` | Junk Cleaner |
| `/startup-manager` | Startup Manager |
| `/registry-cleaner` | Registry Cleaner |
| `/disk-analyzer` | Disk Space Analyzer |
| `/process-manager` | Process & Service Manager |
| `/settings-tweaker` | Windows Settings Tweaker |

### Theme

- **Dark mode only** with a professional, modern system-tool aesthetic
- Tailwind dark theme as default, no light mode toggle

### State Management

- React Context + `useReducer` per module (no Redux)
- `useTauriCommand` hook wraps `@tauri-apps/api` `invoke()` with loading/error states
- `useProcessPolling` hook for live process data (2s interval via Tauri events)
- `useScanProgress` hook for streaming scan results via Tauri events

---

## Database Schema (SQLite)

```sql
CREATE TABLE scan_history (
    id INTEGER PRIMARY KEY,
    module TEXT NOT NULL,
    scanned_at TEXT NOT NULL,
    total_size INTEGER,
    item_count INTEGER,
    result_json TEXT
);

CREATE TABLE exclusion_list (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    added_at TEXT NOT NULL
);

CREATE TABLE startup_entries (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    command TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    delay_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE registry_backups (
    id INTEGER PRIMARY KEY,
    file_path TEXT NOT NULL,
    key_count INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE tweak_settings (
    id INTEGER PRIMARY KEY,
    tweak_key TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 0,
    requires_reboot INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## Module Specifications

### 1. Junk Cleaner

**Scanned locations:**
- Windows Temp (`%WINDIR%\Temp`)
- User Temp (`%TEMP%`)
- Prefetch (`%WINDIR%\Prefetch`)
- Recycle Bin
- Windows Log files (`.log`, `.evtx` in `%WINDIR%\Logs`, `%WINDIR%\System32\winevt\Logs`)
- Application Caches: Spotify, Discord, Shader Caches
- Windows Update cleanup (`DISM`-style old update files)

**Behavior:**
- Scan via `walkdir` on known paths, aggregate sizes per category
- Results streamed progressively via Tauri events
- Categories displayed with individual toggles
- Clean deletes files directly, returns freed space summary

### 2. Startup Manager

**Scanned startup locations:**
- Registry: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Registry: `HKLM\Software\Microsoft\Windows\CurrentVersion\Run`
- Registry: `HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce`
- Registry: `HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce`
- Startup folders: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
- Common Startup: `%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
- Task Scheduler (user-facing tasks with logon triggers)

**CRUD Operations:**
- **Read:** Query all locations, cache to SQLite
- **Toggle:** Enable/disable without deletion
- **Update:** Modify arguments, add custom delay (seconds)
- **Delete:** Permanently remove from source location
- **Create:** Add new entry to HKCU Run or Startup folder

**Startup Delay feature:**
- User sets delay per entry (0-300 seconds)
- Rust creates delayed launch via scheduled task or helper binary

### 3. Registry Cleaner

**Scan scope:**
- Orphaned/unused file associations
- Invalid uninstall paths
- Missing shared DLL references
- Obsolete software entries
- Empty/dead keys

**Risk Categorization:**
| Risk Level | Examples |
|------------|----------|
| Safe | Empty keys, invalid paths, uninstall remnants |
| Moderate | Unused file associations, obsolete software entries |
| Risky | Deep system components, shared DLL paths |

**Safety:**
- Automatic `.reg` backup export to `_backups/registry/` BEFORE any modification
- Backup logged to `registry_backups` table
- Users select/deselect whole risk categories with one click
- Items displayed with full path, current value, risk level

### 4. Disk Space Analyzer

**Scanning:**
- Multi-drive support (all connected drives)
- Multi-threaded directory traversal (`walkdir` in parallel)
- Stream file/folder sizes progressively via Tauri events
- Folders only (file-level detail on drill-down)

**Visualization:**
- **Treemap:** Interactive SVG/Canvas-based treemap
  - Larger files/folders = larger blocks
  - Color-coded by type:
    - Videos → Red
    - Executables → Blue
    - Images → Green
    - Documents → Yellow
    - Archives → Purple
    - Other → Gray
- **File Table:** Sortable columns (name, size, type, modified date), drill-down by double-clicking rows

**Interaction:**
- Click treemap block → highlights corresponding table row
- Double-click treemap block → navigate into folder
- Right-click / inline action → delete file directly

### 5. Process & Service Manager

**Process List:**
- Real-time, sortable table
- Columns: Name, PID, CPU %, Memory MB, Status
- Live polling via Rust (2s interval), streamed to frontend
- Force-kill via `TerminateProcess` (windows crate)

**Service Controls:**
- List all Windows services
- Start / Stop / Change startup type (Automatic, Manual, Disabled, Automatic Delayed)
- API: `OpenSCManager`, `ChangeServiceConfig`, `StartService`, `ControlService`

**Filter:**
- Microsoft vs Third-party toggle
- Rust checks digital signature / `System32` location to classify

### 6. Windows Settings Tweaker

**Three Master Presets:**

**Gaming & Low Latency Mode:**
- Ultimate Performance power plan
- CPU scheduling optimization (registry: `Win32PrioritySeparation`, `PriorityControl`)
- GPU scheduling latency tweaks (registry: `HAGS` settings, `GPU Priority`)
- Disable network throttling (registry: `DisableThrottling`, `TCPNoDelay`)
- Strip visual animations (System Properties → Performance Options)

**Privacy Hardening:**
- Disable Windows Telemetry (registry + services)
- Disable diagnostic data logging
- Disable Cortana background execution
- Privacy settings cascade (location, camera, microphone, advertising ID)

**Max Storage Saver:**
- Disable Hibernation (`powercfg /h off`)
- Optimize search indexing behaviors (reduce index locations)

**Individual Toggles:**
- Listed below presets, categorized: Performance, Privacy, System
- Each toggle shows current state (synced from actual system)
- Clicking a preset auto-adjusts corresponding toggles
- Manually toggling individual switches overrides preset selection
- Changes applied immediately via Rust backend
- Tweaks requiring reboot display a small restart indicator icon
- All states persisted in `tweak_settings` table

---

## Data Flow

### Tauri Command Pattern

```
React Component
  → useTauriCommand hook
    → invoke('command_name', { args })
      → Rust #[tauri::command] fn
        → windows API / PowerShell
        → returns Result<T, String>
      → JSON serialization (serde)
    → hook returns { data, loading, error }
  → Component re-renders
```

### Streaming (Scans, Process Data)

```
Rust background thread
  → app_handle.emit("event-name", payload)
    → React listens with listen() from @tauri-apps/api/event
      → Updates component state progressively
```

### Elevation

- Tauri manifest requests `requireAdministrator` execution level
- UAC prompt on launch
- Single admin instance — no per-action elevation

---

## Error Handling

- All Rust commands return `Result<T, String>`
- Frontend displays errors in a toast/notification system
- Network/junction errors during disk scan are logged and skipped
- Registry operations validate key existence before modification
- Process kills catch access-denied errors gracefully

---

## Edge Cases & Safeguards

- **Self-deletion prevention:** Disk analyzer and junk cleaner exclude current app directory
- **Process protection:** System-critical processes (csrss.exe, wininit, etc.) blocked from kill UI
- **Registry safety:** Risky category items require explicit user confirmation per-item
- **Disk full:** Registry backups check available disk space before writing
- **Power loss:** Registry operations are logged; `.reg` backups serve as recovery
- **Permission denied:** Commands return clear error messages suggesting admin rights
