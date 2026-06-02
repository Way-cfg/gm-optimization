# Optimization Way

A Windows system optimization utility with deep registry and service configuration capabilities. Built with Tauri v2 for a native desktop experience with a modern React frontend.

## Features

- **Tweaks Hub** — 36 predefined system tweaks across Essential and Advanced categories, organized into three presets (Simple, Balanced, Extreme+). Each tweak can apply registry modifications, PowerShell scripts, native commands, and Windows service configurations.
- **Customize Preferences** — 23 live-toggle Windows settings that apply immediately, covering appearance, taskbar, input, power, privacy, and file explorer.
- **Optimization Wizard** — Guided 4-step profile-based optimization with Gaming, Work/Productivity, Low-End PC, and Maximum Performance profiles.
- **Junk Cleaner** — Scan and clean temporary files, caches, and system junk with category breakdown and progress tracking.
- **Benchmark** — Run disk, network, and CPU benchmarks with historical result tracking.
- **Restore Points** — Create, list, and restore Windows System Restore points.
- **Profile Management** — Export and import optimization profiles as JSON for backup or sharing across machines.
- **Task Scheduler** — Schedule automated junk cleaning and maintenance tasks via Windows Task Scheduler.
- **Dashboard** — Hardware summary (CPU, GPU, RAM, drives), optimization score arc, activity log, and quick-access cards.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| UI/Animation | Framer Motion 12, GSAP 3, Lucide React |
| 3D | Three.js, React Three Fiber, Rapier Physics |
| Backend | Rust, Tauri v2 |
| Database | SQLite via rusqlite (bundled) |
| Storage | walkdir for file system traversal |
| Build | tauri-build, NSIS/MSI installers |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust toolchain](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) (for MSVC linker)

### Development

```bash
# Install frontend dependencies
npm install

# Run Vite development server
npm run dev

# Run full Tauri development mode (frontend + backend)
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Produces MSI and NSIS installers in `src-tauri/target/release/bundle/`.

### TypeScript Check

```bash
npx tsc --noEmit
```

## Project Structure

```
src/                  # Frontend (TypeScript/React)
├── data/             # Static definitions (tweaks, preferences, wizard profiles)
├── pages/            # Route pages (10 pages)
├── components/       # Shared UI components (10 components)
├── types/            # TypeScript type declarations
├── assets/           # Images and branding
└── App.tsx           # Root component with routing and splash screen

src-tauri/            # Backend (Rust)
└── src/
    ├── commands/     # Tauri command modules (10 modules)
    ├── lib.rs        # App setup, tray menu, command registration
    ├── models.rs     # Shared data structures
    ├── db.rs         # SQLite database initialization
    ├── headless.rs   # Headless task runner for scheduled operations
    └── util.rs       # Process execution utilities
```

## Architecture

Optimization Way uses a split-frontend architecture with Tauri v2 as the bridge:

1. **Frontend** (React) handles all UI rendering and user interaction via standard web technologies
2. **Backend** (Rust) executes system-level operations — registry edits, PowerShell scripts, service management, file system access
3. **Communication** occurs through Tauri's `invoke` mechanism, where the frontend calls registered Rust commands and receives serialized responses

The backend commands are organized by domain (tweaks, junk cleaning, benchmarking, restore points, etc.), each in its own module under `commands/`. System data flows through shared serializable structs defined in `models.rs`.

## License

MIT
