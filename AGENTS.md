# Optimization Way — Project Context

## Overview
A Windows system optimization utility built with Tauri v2 (Rust backend + React/TypeScript frontend). Provides registry tweaks, system customization, junk cleaning, benchmarking, restore points, profile management, and an optimization wizard.

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS 4, Framer Motion 12, React Router 7, Lucide React icons
- **3D/Visual:** Three.js, @react-three/fiber, @react-three/drei, @react-three/rapier, OGL, GSAP, meshline, canvas-confetti
- **Backend:** Rust + Tauri v2, serde, rusqlite (SQLite), walkdir, chrono
- **Build:** tauri-build, NSIS/MSI installers
- **Tray:** System tray icon with menu (Show Window, Quick Tasks > Run Junk Cleaner, Quit)

## Routes & Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Hardware summary (CPU, GPU, RAM, drives) + Lanyard 3D scene + activity stream + quick action cards + Wizard CTA |
| `/wizard` | OptimizationWizard | 4-step guided wizard with profiles (Gaming, Work/Productivity, Low-End PC, Maximum Performance) |
| `/tweaks` | TweaksHub | Browse and apply 36 registry/PowerShell/service tweaks across categories with 3 presets |
| `/customize` | CustomizePrefs | 23 toggleable Windows customization settings (dark mode, taskbar, search, game mode, etc.) |
| `/junk-cleaner` | JunkCleaner | Scan and clean temporary files, caches, and system junk |
| `/benchmark` | Benchmark | Run disk, network, and CPU benchmarks with history |
| `/restore` | Restore | Create, list, and restore Windows System Restore points |
| `/profiles` | Profiles | Export and import optimization profiles as JSON |
| `/settings` | AppSettings | Scheduler management, profile import/export |
| `/about` | AboutSystem | Hardware specs (CPU, GPU, RAM, motherboard, storage, network) + app info |

### Internal Pages (not in sidebar)
These pages exist as routes but are NOT accessible from the dock sidebar. They are linked from within other pages:
- **Optimization Wizard** (`/wizard`) — accessible from Dashboard CTA card
- **Junk Cleaner** (`/junk-cleaner`) — accessible from Dashboard quick actions
- **Benchmark** (`/benchmark`) — accessible from Dashboard quick actions
- **Restore Points** (`/restore`) — accessible from Dashboard quick actions
- **Profiles** (`/profiles`) — accessible from Settings

## Navigation
DockSidebar component with elastic magnifying dock effect (macOS-style). Items:
- Dashboard, Tweaks Hub, Customize, Settings, About System

## Rust Backend (Tauri Commands)

### `commands/` modules:
| Module | Commands |
|---|---|
| `init` | `init_app` — hardware info on startup |
| `system_info` | `get_system_info` — detailed hardware specs |
| `tweaks` | `apply_registry_tweak`, `execute_powershell_tweak`, `execute_native_commands`, `configure_services` |
| `junk_cleaner` | `scan_junk`, `clean_junk` |
| `history` | `get_scan_history`, `clear_scan_history` |
| `exclusions` | `get_exclusions`, `add_exclusion`, `remove_exclusion` |
| `scheduler` | `get_schedules`, `create_schedule`, `delete_schedule`, `toggle_schedule` |
| `benchmark` | `run_disk_benchmark`, `run_network_benchmark`, `run_cpu_benchmark`, `run_all_benchmarks`, `get_benchmark_history`, `clear_benchmark_history` |
| `restore` | `create_restore_point`, `get_restore_points`, `restore_system` |
| `profiles` | `export_profile`, `import_profile` |

### Rust utilities:
- `util.rs` — `cmd()` helper that runs Windows processes with `CREATE_NO_WINDOW` flag
- `db.rs` — SQLite database initialization
- `headless.rs` — headless task runner (used by tray menu > Quick Tasks > Run Junk Cleaner)
- `models.rs` — shared structs: `JunkCategoryResult`, `JunkScanResult`, `CleanResult`, `ScanHistoryEntry`, `ExclusionEntry`, `SystemInfo`, `InfoEntry`, `BenchmarkResult`, `RestorePointInfo`, `Schedule`, `ProfileTweak`, `ProfileExport`, `ProfileImport`

## Data Layer

### `src/data/tweaks.ts` — 36 tweak definitions
Fields: `id`, `title`, `description`, `category`, `registry[]`, `services[]`, `enableScript[]`, `disableScript[]`, `commands[]`, `requiresConfirmation`, `requiresReboot`

3 presets: Simple Tweak, Balanced Tweak, Extreme Plus Tweak
Categories auto-derived from tweak data.

### `src/data/preferences.ts` — 23 toggle definitions
Fields: `id`, `title`, `description`, `defaultState`, `registry[]`, `enableScript[]`, `disableScript[]`, `requiresReboot`

Toggles: BSoD Detailed, Cross-Device Resume, Dark Mode, Transparency Effects, Task View, Taskbar Search, Taskbar Centered Icons, Battery Percentage, Sticky Keys, Start Menu Recommendations, Bing Search, Settings Home Page, S3 Sleep, S0 Sleep Network, Num Lock, Multiplane Overlay, Mouse Acceleration, New Outlook, Logon Verbose Mode, Logon Blur, Game Mode, Hidden Files, Long Paths, File Extensions

### `src/data/wizard.ts` — 4 profiles
Gaming, Work/Productivity, Low-End PC, Maximum Performance
Each references tweak IDs and preference IDs (no duplication of definitions).

## Styling
- Dark theme with frosted glass effects (`bg-frosted/80 backdrop-blur-xl`)
- Accent color: neon orange (`#FF5500`)
- Tailwind CSS v4 with custom theme tokens via `index.css`
- Components: `GlowCard`, `SplashScreen`, `Toast`, `Layout`, `DockSidebar`, `PageTransition`, `ProgressBar`, `Lanyard`, `Particles`, `GlobalSpotlight`

## Build & Run
```bash
npm run dev          # Vite dev server
npm run build        # tsc + vite build
npm run tauri dev    # Full Tauri dev mode
npm run tauri build  # Production build (MSI + NSIS in src-tauri/target/release/bundle/)
```

## Project Structure
```
/
├── src/
│   ├── data/            # Static definitions (tweaks, preferences, wizard profiles)
│   ├── pages/           # Route pages (10 pages)
│   ├── components/      # Shared UI components (10 components)
│   ├── types/           # TypeScript type declarations
│   ├── assets/          # Images (applogo.png)
│   ├── App.tsx          # Root: routing + splash screen
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind config + theme tokens
├── src-tauri/
│   ├── src/
│   │   ├── commands/    # Rust command modules (10 modules)
│   │   ├── lib.rs       # Tauri app setup, tray menu, command registration
│   │   ├── main.rs      # Entry point
│   │   ├── models.rs    # Shared structs
│   │   ├── db.rs        # SQLite init
│   │   ├── headless.rs  # Headless task runner
│   │   └── util.rs      # Process helpers
│   └── Cargo.toml       # Rust dependencies
├── package.json         # Node dependencies
└── vite.config.ts       # Vite config
```
