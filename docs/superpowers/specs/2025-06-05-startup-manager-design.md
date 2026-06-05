# Startup Manager — Design Spec

## Overview
A Startup Manager page that lets users view and control which programs run at Windows startup. Scans 4 standard startup locations, displays them in a sortable table, and allows one-click enable/disable.

## Sources Scanned

| Source | Scope | Toggle Method |
|---|---|---|
| `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` | Current user | Rename value: `Discord` ↔ `_disabled_Discord` |
| `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` | All users | Same rename approach |
| `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` | Current user | Move .lnk to `Startup\Disabled\` subfolder |
| `%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Startup` | All users | Move .lnk to common `Disabled` subfolder |

Toggle is always non-destructive — original command/value is preserved under a renamed key or moved file, making re-enabling instant.

## Backend

### New file: `src-tauri/src/commands/startup.rs`

### Data structures (added to `models.rs`)
```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct StartupItem {
    pub id: String,        // "registry|HKCU\\...\\Run|ValueName" or "folder|path\\to\\shortcut.lnk"
    pub name: String,      // Display name (value name or filename without extension)
    pub command: String,   // Full command line or target path
    pub location: String,  // Human-readable source: "HKCU\\Run", "Startup Folder (User)", etc.
    pub enabled: bool,     // Whether the item currently runs at startup
}
```

**`id` format**: Two-part format encoding source type and original location:
- Registry items: `registry|<full registry key path>|<value name>`
  - e.g. `registry|HKCU\Software\Microsoft\Windows\CurrentVersion\Run|Discord`
- Folder items: `folder|<absolute file path>`
  - e.g. `folder|C:\Users\Way\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\Steam.lnk`

No `publisher` field — extracting digital signatures or file metadata from arbitrary executables is unreliable and adds complexity. The table shows Name, Command, Location, and Toggle (4 columns).

### Commands

**`get_startup_items`** → `Vec<StartupItem>`
- Uses PowerShell `Get-CimInstance Win32_StartupCommand` to enumerate all items from registry + startup folders
- Returns structured JSON parsed into `Vec<StartupItem>`
- Each item gets a unique `id` encoding its source (registry key path + value name, or file path)

**`toggle_startup_item(id: String, enabled: bool)`** → `Result<(), String>`
- Parse `id` format: `registry|...` vs `folder|...` to determine source type
- **Registry items**: Rename the registry value name (data stays intact):
  - Disable: rename `Discord` → `_disabled_Discord` in the same key
  - Enable: rename `_disabled_Discord` → `Discord` in the same key
  - Uses `cmd("reg")` with `rename` or PowerShell `Rename-ItemProperty`
  - (If `reg rename` is unavailable on some Windows versions, fallback to PowerShell)
- **Folder items**: Move `.lnk` file to/from a `Disabled` subfolder:
  - Disable: rename `shortcut.lnk` to `Disabled\shortcut.lnk` in the same startup folder
  - Enable: move back from `Disabled\shortcut.lnk` to `shortcut.lnk`
  - Uses `std::fs::rename`

### Module registration
- Add `mod startup;` to `src-tauri/src/commands/mod.rs`
- Register both commands in `src-tauri/src/lib.rs` `generate_handler![]`

## Frontend

### New file: `src/pages/StartupManager.tsx`

### Route
- Path: `/startup`
- Add `Route path="startup" element={<StartupManager />}` in `App.tsx` (inside the `<Layout>` route group)

### Navigation
- Add to `DockSidebar.tsx` `navItems` array:
  ```ts
  { path: "/startup", label: "Startup", icon: Play }
  ```
  (uses the `Play` lucide icon — represents "play at startup")

### UI Layout
```
+--------------------------------------------------+
|  Startup Manager                                  |
|  Manage which programs launch at Windows startup  |
+--------------------------------------------------+
|  [Search...                            ] [Disable All] |
+--------------------------------------------------+
|  Name      | Command            | Location    | Toggle |
|  Discord   | C:\...\Discord.exe | HKCU\Run    | [ON]   |
|  Steam     | C:\...\Steam.exe   | HKLM\Run    | [ON]   |
|  OldApp    | C:\...\old.exe     | Startup     | [OFF]  |
+--------------------------------------------------+
```

### States
- **Loading**: 4-6 skeleton rows with pulsing animation matching the app's frosted glass style
- **Empty**: "No startup programs found" message with muted styling
- **Error**: Toast error on scan failure (existing `useToast` pattern)
- **Normal**: Table with items, rows fade in with stagger animation (`container`/`child` Framer Motion pattern)

### Components used
- `GlowCard` — wraps the table section
- `useToast` — for success/error feedback on toggles
- `Play` icon from lucide-react (for nav — represents "runs at startup")
- `Search` icon for the filter bar
- Toggle buttons styled like existing `Enabled`/`Disabled` pattern from AppSettings scheduler

### Toggle behavior
- Optimistic UI: toggle flips immediately in state
- Backend call: `invoke("toggle_startup_item", { id, enabled })`
- On success: no change needed (already flipped)
- On failure: revert toggle + toast error
- Disabled rows shown with reduced opacity (`opacity-40`)

## Dependencies
- No new npm dependencies
- No new Rust crates needed (uses existing `cmd()` utility, `serde`, `std::fs`)
- Uses PowerShell (already available on all supported Windows versions)

## Security Considerations
- Toggle operations only affect current user context (HKCU, user startup folder)
- HKLM / common startup folder items require admin — command will fail gracefully, user sees toast
- No deletion of data — only renames/moves within same registry hive or folder tree
- Search/filter is client-side only, no data exfiltration risk

## Future Possibilities (out of scope for now)
- Drag-and-drop to add new startup entries
- Right-click → "Open file location"
- Startup impact measurement (lightweight/heavy)
- Show file description / digital signature from PE metadata
