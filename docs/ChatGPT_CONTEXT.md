# Optimization Way — Full Project Context for ChatGPT

## Overview

**Optimization Way** is a Windows desktop system optimization utility. It's a Tauri 2 app (Rust backend + React 19 frontend with Tailwind CSS 4). It provides deep Windows optimization through native API calls, registry tweaks, PowerShell scripts, and system utilities.

**Current version:** 0.1.0
**Target platform:** Windows x64 (must run as Administrator for most features)
**Tech stack:** Tauri 2, Rust, TypeScript, React 19, Tailwind CSS 4, SQLite, Framer Motion, GSAP, Three.js (React Three Fiber)

---

## 1. Architecture

### Frontend (TypeScript/React)
- **Vite 7** build tool, dev server on port 1420
- **React 19** with react-router-dom v7
- **Tailwind CSS 4** with `@tailwindcss/vite` plugin
- Custom design tokens: `obsidian` (#0B0C0E bg), `frosted` (#141619 cards), `neon` (#FF5500 accent), `emerald` (#00C853 success), `crimson` (#FF1744 error)
- Fonts: Inter (sans-serif), JetBrains Mono (monospace) via Google Fonts

### Backend (Rust)
- **Tauri 2** with tray-icon and custom-protocol features
- **SQLite** via rusqlite (bundled) — stored in app data directory, WAL mode
- **sysinfo** crate for process/system monitoring
- **walkdir** for file system traversal
- **tokio** async runtime
- Headless mode (`--silent` flag) for scheduled tasks
- **Release builds run as Administrator** (UAC elevation via `requireAdministrator` in manifest)

### Build Configuration
- `src-tauri/build.rs` — sets `requireAdministrator` for release builds only
- NSIS installer, installMode: currentUser
- Window: 1200x800, min 900x600, centered, resizable
- App ID: `com.optimization-way.optimizer`

---

## 2. Frontend Structure

### Entry & App Shell
- `src/main.tsx` — mounts `<App />` inside `<BrowserRouter>` + `<React.StrictMode>`
- `src/App.tsx` — root component:
  - Calls `invoke<InitResult>("init_app")` on mount to gather basic system data (CPU, GPU, RAM, drives)
  - Shows `<SplashScreen>` while loading
  - After ready: `<Layout>` with React Router `<Routes>`
  - Wraps everything in `<ToastProvider>`

### Active Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Home with system overview gauge, 3D lanyard, spec cards, activity stream |
| `/tweaks` | TweaksHub | 36 registry/PowerShell tweaks with presets |
| `/customize` | CustomizePrefs | 22 live-toggle Windows preferences |
| `/settings` | AppSettings | Theme, backup profiles, task scheduler |
| `/about` | AboutSystem | Hardware info display |

### Unused Pages (imported but not routed)
The following pages exist but are NOT currently connected to routes:
- `Profiles.tsx` — export/import JSON profiles of all tweak settings
- `Restore.tsx` — create/view/restore Windows System Restore points
- `Benchmark.tsx` — disk/network/CPU benchmarks with confetti animation
- `SystemInfo.tsx` — detailed system info in 2-column grid
- `ProcessManager.tsx` — process list + service manager with kill/start/stop
- `DiskAnalyzer.tsx` — drive usage visualization, file tree with sizes
- `JunkCleaner.tsx` — junk file scan and cleanup with categories
- `StartupManager.tsx` — startup program management

### Components

#### Layout & Navigation
- **`Layout.tsx`** — main layout: `GlobalSpotlight` + `DockSidebar` + animated `<main>` area with `<Outlet />`
- **`DockSidebar.tsx`** — macOS-style animated dock sidebar with magnification effect. Icons expand via framer-motion spring when cursor approaches (replaces traditional fixed sidebar). Nav: Dashboard, Tweaks Hub, Customize, Settings, About System. Active item glows neon-orange.
- **`Sidebar.tsx`** — original fixed 200px sidebar (no longer used, kept for reference)

#### Visual Effects
- **`GlobalSpotlight.tsx`** — fixed radial gradient spotlight that follows mouse cursor across the whole page. GSAP animation. Imperative DOM element on `document.body`.
- **`Particles.tsx`** — GPU-accelerated particle system using `ogl` (WebGL). Custom GLSL shaders. 250 particles floating in 3D with sinusoidal movement. Mouse-responsive + auto-rotation. Used by SplashScreen.
- **`GlowCard.tsx`** — reusable card with tilt (3D mouse-follow rotation), magnetism, hover particles (GSAP), click ripple. CSS custom properties for radial gradient border glow.
- **`MagicBento.tsx`** — bento-grid layout of 6 capability showcase cards with per-card particle effects, tilt/magnetism, border glow, click ripple. Responsive grid via dynamic `<style>` injection.
- **`PageTransition.tsx`** — fade + slide-up animation wrapper for page content

#### 3D
- **`Lanyard.tsx`** — interactive 3D lanyard with dangling card using React Three Fiber + @react-three/rapier physics. Lanyard rope rendered via `meshline` with striped procedural texture. Card has app logo texture on both sides + metal ring at top. 4 physics segments + spherical joint. Draggable. Positioned in Dashboard top-right corner.
- **`SplashScreen.tsx`** — full-screen loading overlay with `<Particles>` background, animated SVG ring spinner, app logo, bouncing dots, "Loading System Data" / "Ready" text. Fade-out exit animation.

#### UI Utilities
- **`Toast.tsx`** — context/provider toast system. Types: success (emerald), error (crimson), info (white). Auto-dismiss 3500ms. Top-right corner. `useToast()` hook.
- **`ProgressBar.tsx`** — percentage bar and `RingSpinner` animated SVG component
- **`ConfirmDialog.tsx`** — modal confirmation with framer-motion animation, backdrop blur, cancel/confirm buttons

### CSS (`src/index.css`)
- 5 custom theme colors (obsidian, frosted, neon, emerald, crimson)
- 7 keyframe animations: `pulse-ring`, `spin-slow`, `dash`, `glow-pulse`, `neon-glow`, `terminal-blink`, `slide-in`
- `.card-glow` class — mouse-following radial gradient border glow via CSS custom properties (`--glow-x`, `--glow-y`, `--glow-intensity`, `--glow-radius`)
- `.global-spotlight` class — fixed position radial gradient that follows mouse
- Thin (4px) custom scrollbar
- Terminal cursor effect (blinking `▊` character)

---

## 3. Pages In Detail

### Dashboard (`/`)
- **Optimization Arc** — SVG circular gauge (270-degree arc) showing optimization percentage. Neon-orange normally, emerald when 100%.
- **Lanyard 3D** — interactive 3D card in top-right corner
- **Spec Cards** — 2x2 grid: CPU, GPU, RAM, Drives with GlowCard effects
- **Activity Stream** — terminal-style live log from `get_scan_history` command
- Staggered entry animations via framer-motion variants

### TweaksHub (`/tweaks`)
- 36 tweak definitions across two categories:
  - **Essential (19):** Activity History, Consumer Features, Telemetry, PowerShell Telemetry, Temp Files, Start Menu Layout, Restore Point, Store Search, End Task, Debloat Apps, Widgets, Explorer Discovery, Disk Cleanup, WPBT, Hibernation, Location Tracking, RDP Warnings, BitLocker
  - **Advanced (17):** Adobe Block, Background Apps, Brave Debloat, Home/Gallery, FSO, IPv6, IPv4 Preferred, Edge Debloat, Edge Remove, OneDrive Remove, Razer Block, Xbox Removal, Windows AI, Visual Effects, Teredo, Notifications, Storage Sense, Right-Click Menu
- Each tweak specifies: registry entries, PowerShell scripts, native commands, service configs, reboot/confirmation flags
- 3 presets: Simple (7 items), Balanced (16 items), Extreme Plus (17 items)
- UI: preset cards at top, categorized checklist with per-tweak apply spinners, "Run Engine" button
- Backend commands: `apply_registry_tweak`, `execute_powershell_tweak`, `execute_native_commands`, `configure_services`

### CustomizePrefs (`/customize`)
- 22 live-toggle preferences that apply instantly:
  BSoD Verbose, Dark Mode, Task View, Search Icon, Taskbar Alignment, Battery Percentage, Sticky Keys, Start Menu Recs, Bing Search, Settings Home, S3 Sleep, Standby Fix, Num Lock, Multiplane Overlay, Mouse Acceleration, Outlook New Version, Verbose Logon, Login Blur, Game Mode, Hidden Files, Long Paths, File Extensions
- iOS-style toggle switches with spinning indicator during application
- Registry entries applied immediately; reverts on error

### AppSettings (`/settings`)
- **Appearance:** Dark/Light theme toggle (Dark pre-selected)
- **Backup & Profiles:** Export/Import profile as JSON
- **Task Scheduler:** List/manage/enable/disable scheduled tasks from DB
- Backend commands: `get_schedules`, `export_profile`, `import_profile`, `toggle_schedule`

### AboutSystem (`/about`)
- System hardware in 6 sections: Processor, Graphics, Memory, Storage, Motherboard, Network
- App info card: name, version (0.1.0), platform (Windows x64), framework (Tauri 2 + React 19), license (MIT)
- Backend command: `get_system_info`

---

## 4. Backend Structure

### Database (`db.rs`)
SQLite WAL mode, 8 tables:

| Table | Columns | Purpose |
|-------|---------|---------|
| `scan_history` | id, scan_type, timestamp, details, total_size, items_found | Junk scan and benchmark results |
| `exclusion_list` | id, path, added_at | Paths excluded from junk scans |
| `startup_entries` | id, name, command, source, enabled, delay, created_at | Startup program settings |
| `registry_backups` | id, tweak_name, path, name, old_value, value_type, created_at | Registry backup history |
| `tweak_settings` | id, tweak_name, enabled, category, created_at | Tweak state persistence |
| `schedules` | id, name, module, schedule_type, time, day, enabled, created_at | Scheduled task definitions |
| `settings` | key, value | Key-value settings store |
| `benchmark_results` | id, benchmark_type, score, unit, timestamp | Benchmark history |

### Command Modules

All commands are registered in `lib.rs` via `generate_handler![]`.

| Module | File | Commands |
|--------|------|----------|
| Init | `commands/init.rs` | `init_app()` — basic system info (CPU, GPU, RAM, drives) |
| Tweaks | `commands/tweaks.rs` | `apply_registry_tweak`, `execute_powershell_tweak`, `configure_services`, `execute_native_commands` |
| Junk Cleaner | `commands/junk_cleaner.rs` | `scan_junk`, `clean_junk` — emits `scan-progress` events |
| Startup | `commands/startup_manager.rs` | `get_startup_entries`, `toggle_startup_entry`, `delete_startup_entry`, `set_startup_delay`, `add_startup_entry` |
| Disk | `commands/disk_analyzer.rs` | `get_drives`, `scan_drive`, `delete_file` — emits `scan-progress` events |
| Process | `commands/process_manager.rs` | `get_processes`, `kill_process`, `get_services`, `change_service_startup`, `control_service` |
| System Info | `commands/system_info.rs` | `get_system_info` — PowerShell-based hardware enumeration |
| Benchmark | `commands/benchmark.rs` | `run_disk_benchmark`, `run_network_benchmark`, `run_cpu_benchmark`, `run_all_benchmarks`, `get_benchmark_history`, `clear_benchmark_history` |
| Restore | `commands/restore.rs` | `create_restore_point`, `get_restore_points`, `restore_system` |
| Profiles | `commands/profiles.rs` | `export_profile`, `import_profile` |
| History | `commands/history.rs` | `get_scan_history`, `clear_scan_history`, `save_scan_result` |
| Exclusions | `commands/exclusions.rs` | `get_exclusions`, `add_exclusion`, `remove_exclusion` |
| Scheduler | `commands/scheduler.rs` | `get_schedules`, `create_schedule`, `delete_schedule`, `toggle_schedule` — uses `schtasks.exe` with `OptimizationWay-` prefix |

### Headless Mode
- `headless.rs` — `run_task(task)` runs without GUI for scheduled tasks
- Currently supports `"junk_cleaner"` task: cleans temp files, prefetch, Windows Update caches, app caches (Spotify, Discord, ShaderCache)

### Utility
- `util.rs` — `cmd(program)` creates `Command` with `CREATE_NO_WINDOW` flag to suppress console windows
- `models.rs` — all shared data structures with serde serialization

---

## 5. Data Flow

1. **App start:** `App.tsx` calls `invoke("init_app")` → `init.rs` returns `InitResult` with CPU, GPU, RAM, drives
2. **Tweaks:** `TweaksHub.tsx` sends registry/PowerShell commands → `tweaks.rs` executes via `reg.exe` / `powershell.exe` (silent)
3. **Junk Cleaning:** `JunkCleaner.tsx` calls `scan_junk` → `junk_cleaner.rs` walks directories → emits `scan-progress` events → UI updates progress bar
4. **Preferences:** `CustomizePrefs.tsx` toggles → `tweaks.rs` applies registry changes immediately
5. **Process/Services:** `ProcessManager.tsx` reads → `process_manager.rs` uses `sysinfo` + `sc.exe` + `taskkill.exe`
6. **Scheduling:** `schtasks.exe` creates Windows Scheduled Tasks that launch the app with `--silent --task=<module>` flags
7. **Profiles:** JSON export/import of all tweak settings via `profiles.rs`

---

## 6. Current Visual Design

### Color Palette
- Background: `#030508` (page), `#0B0C0E` (obsidian, panels), `#141619` (frosted, cards)
- Primary accent: `#FF5500` (neon orange) — used for active states, buttons, glow effects
- Success: `#00C853` (emerald) — only for 100% completion states
- Error: `#FF1744` (crimson) — only for errors/destructive actions
- Text: white at varying opacities (70%, 35%, 12%)

### UI Patterns
- Glassmorphism: `bg-frosted/80 backdrop-blur-xl` for panels
- Matte layering: 4 layers based on luminance differences (no drop shadows)
- Neon glow: `box-shadow` with neon-orange for active/hover states
- Card glow: mouse-following radial gradient border via CSS custom properties
- Global spotlight: large radial gradient following cursor

### Animation
- Framer Motion: page transitions, dock sidebar magnification, confirm dialogs
- GSAP: GlowCard hover particles, GlobalSpotlight, card ripple effects
- CSS: pulse-ring spinner, glow-pulse, terminal blink

### 3D
- Lanyard: React Three Fiber + Rapier physics (4-segment rope + card, draggable)
- Particles: OGL WebGL shader particles (250 particles, sinusoidal movement, mouse-responsive)

---

## 7. Build & Run

```bash
# Frontend dev
npm run dev

# Full build (frontend + Tauri)
npm run tauri build

# TypeScript check
npx tsc --noEmit
```

Note: For the build to succeed, you need:
- Node.js, Rust toolchain
- Visual Studio Build Tools (for MSVC linker)
- On release build: requires admin privileges due to UAC manifest

---

## 8. Project Files (non-code)

- `branding_assets/appicon.ico` — app icon (used in Tauri bundle)
- `branding_assets/applogo.png` — logo (sidebar, splash, lanyard texture)
- `icon.svg` — custom SVG icon with gear + lightning bolt + "OW"
- `scripts/gen-card-glb.cjs` — generates minimal GLB for 3D card
- `scripts/generate-icons.mjs` — generates multi-size icons + .ico file
- `docs/superpowers/specs/design.md` — design system specification
- `docs/superpowers/specs/2026-06-01-optimization-way-design.md` — architecture spec
- `docs/superpowers/plans/2026-06-01-optimization-way-implementation.md` — implementation plan

---

## 9. Key Naming

- Tauri commands are snake_case in Rust, camelCase in TypeScript invoke calls
- All commands are async and return `Result<T, String>`
- Streaming events use `app_handle.emit()` with event names like `scan-progress`
- The app is referred to as "Optimization Way" (not "OptimizationWay" except in internal IDs)
