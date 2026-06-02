# System Architecture

## Overview

Optimization Way is a Windows desktop application built on Tauri v2, which provides a Rust backend coupled with a web-based frontend. The application bridges React's component model with native Windows system APIs to deliver system optimization capabilities.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   Frontend (React 19)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Router  │ │  Pages   │ │Components│ │  Data      │  │
│  │ (React   │ │ (10)     │ │ (10)     │ │ Definitions│  │
│  │ Router 7)│ │          │ │          │ │ (tweaks,   │  │
│  │          │ │          │ │          │ │ prefs)     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬─────┘  │
│       └────────────┴────────────┴───────────────┘        │
│                         │                                 │
│               invoke() / Tauri IPC                        │
│                         │                                 │
├─────────────────────────┴────────────────────────────────┤
│                    Backend (Rust)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Commands │ │ Models   │ │    DB    │ │  Utilities │  │
│  │ (10 mods)│ │ (structs)│ │ (SQLite) │ │ (process,  │  │
│  │          │ │          │ │          │ │  headless) │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│                         │                                 │
│              reg.exe / powershell / sc.exe                 │
│                         │                                 │
└─────────────────────────┴────────────────────────────────┘
                          │
                   Windows System APIs
```

## Frontend Architecture

### Routing

The application uses React Router v7 with a `<Layout>` wrapper that provides the DockSidebar navigation. Routes are defined in `src/App.tsx`:

- **Sidebar routes** (visible in dock): Dashboard `/`, Tweaks Hub `/tweaks`, Customize `/customize`, Settings `/settings`, About System `/about`
- **Internal routes** (linked from within pages): Optimization Wizard `/wizard`, Junk Cleaner `/junk-cleaner`, Benchmark `/benchmark`, Restore Points `/restore`, Profiles `/profiles`

### Component Structure

Shared UI components reside in `src/components/`:
- `DockSidebar` — macOS-style elastic magnifying dock with spring animations
- `GlowCard` — Reusable glassmorphic card with tilt, magnetism, and glow effects
- `Toast` — Context-based notification system (success/error/info)
- `SplashScreen` — Animated loading screen with particle background
- `Lanyard` — Interactive 3D lanyard using React Three Fiber and Rapier physics
- `Particles` — GPU-accelerated WebGL particle system
- `GlobalSpotlight` — Cursor-following radial gradient overlay

### Data Layer

Static definitions in `src/data/`:
- `tweaks.ts` — 36 tweak definitions with registry keys, PowerShell scripts, service configurations, and 3 presets
- `preferences.ts` — 23 toggleable Windows settings with registry entries
- `wizard.ts` — 4 optimization profiles referencing tweak and preference IDs
- `types.ts` — Shared TypeScript interfaces

## Backend Architecture

### Command Modules

Each module in `src-tauri/src/commands/` handles a specific domain:

| Module | Responsibility | Key Commands |
|---|---|---|
| `init` | System startup data | `init_app` — CPU, GPU, RAM, drives |
| `tweaks` | Registry and system configuration | `apply_registry_tweak`, `execute_powershell_tweak`, `execute_native_commands`, `configure_services` |
| `junk_cleaner` | File system cleanup | `scan_junk`, `clean_junk` with progress events |
| `benchmark` | Performance testing | Disk, network, CPU benchmarks with history |
| `restore` | System protection | Create, list, and restore System Restore points |
| `profiles` | Configuration portability | Export and import optimization profiles as JSON |
| `scheduler` | Task automation | CRUD operations on scheduled tasks |
| `history` | Activity logging | Scan history with retrieval and clearing |
| `exclusions` | Path ignore list | Add, remove, list excluded paths |
| `system_info` | Hardware enumeration | Detailed hardware specs via WMI |

### Database

SQLite database with WAL mode, initialized in `db.rs`. Tables:

- `scan_history` — records of cleanup and benchmark operations
- `exclusion_list` — paths excluded from junk scans
- `schedules` — automated task definitions
- `benchmark_results` — performance benchmark history

### Headless Mode

The application supports a `--silent` CLI flag for running scheduled tasks without a GUI. This is used by Windows Task Scheduler entries created through the scheduler module. The headless runner initializes the database, executes the task, and records results.

### Process Execution

All system commands (registry edits, PowerShell scripts, native executables) execute through the `util::cmd()` helper, which creates Windows processes with the `CREATE_NO_WINDOW` flag to suppress console windows.

## Communication Flow

1. **User action** → React component calls `invoke("command_name", { params })`
2. **Tauri IPC** → Serializes parameters and sends to Rust backend
3. **Command execution** → Rust command runs system operations (registry, PowerShell, file I/O)
4. **Result** → Serialized response returns to frontend
5. **UI update** → React component updates state and re-renders

For long-running operations (junk scanning, benchmarks), the backend emits progress events via `app_handle.emit()` which the frontend listens to with `listen()`.

## Styling System

- Dark theme with CSS custom properties defined in `index.css`
- Accent color: `#FF5500` (neon orange), success: `#00C853` (emerald)
- Glassmorphism via `backdrop-blur-xl` on frosted backgrounds
- Card glow effect using mouse-following CSS custom properties
- Tailwind CSS 4 with `@tailwindcss/vite` plugin for utility-first styling
