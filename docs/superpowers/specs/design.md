# Design System Specification: Optimization Way

**Primary Palette:** Neutral Carbon & Cyber-Orange
**Contrast Strategy:** Matte Elevation Layering (Zero Blue/Navy undertones)

---

## 1. Color Space & Surface Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-obsidian` | `#0B0C0E` | App core background. True slate charcoal — replaces pure black to restore visibility and structural hierarchy. |
| `--color-frosted` | `#141619` | Cards, navigation panels, modals. Matte carbon that creates clear visible contrast on top of the charcoal background. |
| `--color-neon` | `#FF5500` | Primary dynamic accent. Vibrant cyber-orange for active navigation states, CTA triggers, loading rings, and glowing hover states. |
| `--color-emerald` | `#00C853` | Reserved exclusively for "100% Fully Optimized" success state on the radial gauge. Never used for decorative elements. |
| `--color-crimson` | `#FF1744` | Reserved for critical alerts, destructive actions, and error toast borders. |
| Structural borders | `rgba(255, 255, 255, 0.04)` | Ultra-thin neutral faint white strokes on every panel, card, and modal. Absolute ban on deep navy or dark blue borders. |
| Secondary text | `rgba(255, 255, 255, 0.25)` | Low-contrast silver for labels, descriptions, and secondary information. |
| Primary text | `rgba(255, 255, 255, 0.70)` | Crisp monochromatic white for hardware values and primary labels. |
| Muted text | `rgba(255, 255, 255, 0.15)` | Terminal timestamps, version numbers, tertiary info. |

### Prohibited Colors
- **No pure black (`#000000`)** — causes visual crushing in dark mode.
- **No navy or royal blue (`#0000XX` range)** — eliminates cold undertones.
- **No neon green except the singular `00C853` success state.**
- **No neon red except the singular `FF1744` alert state.**

---

## 2. Typography

| Property | Value |
|----------|-------|
| Primary font | `Inter`, system-ui, -apple-system, sans-serif |
| Monospace font | `JetBrains Mono`, `Fira Code`, monospace |
| Base size | 14px (body text) |
| Hardware values | `text-sm font-mono font-medium` |
| Labels | `text-[11px] uppercase tracking-widest` |
| Terminal / log text | `text-xs font-mono` |

---

## 3. Surface & Elevation

### Matte Elevation Layering
Every surface is defined exclusively by **luminance difference**, never by colored shadows or tinted overlays.

- **Layer 0 (background):** `#0B0C0E`
- **Layer 1 (cards, sidebar, modals):** `#141619` + `backdrop-blur-xl` + border `rgba(255,255,255,0.04)`
- **Layer 2 (hover states, active buttons):** Layer 1 + `rgba(255,85,0,0.08)` tint overlay
- **Layer 3 (dropdowns, popovers):** `#1A1C1E` + stronger border `rgba(255,255,255,0.06)`

### Border Rules
- All structural borders: `rgba(255, 255, 255, 0.04)` — consistent across the entire app.
- Active/selected state borders: `rgba(255, 85, 0, 0.3)` — cyber-orange with 30% opacity.
- Hover borders (non-interactive elements): `rgba(255, 255, 255, 0.06)` — barely perceptible lift.

---

## 4. Dashboard Interface Balance

### Center Circular Optimization Meter
- **Track circle:** `rgba(255, 255, 255, 0.04)` — matches the structural border token (not a separate track color).
- **Active path:** `#FF5500` cyber-orange with `drop-shadow(0 0 12px rgba(255,85,0,0.4))`.
- **100% state:** Active path switches to `#00C853` with `drop-shadow(0 0 12px rgba(0,200,83,0.5))`.
- **Center text:** "45%" in `text-white/80 font-mono font-bold` with label "OPTIMIZATION SCORE" in `text-neon/60 text-[10px] tracking-[0.25em]`.
- **Sizing:** 260px × 260px, stroke width 8px, 270° arc (rotated -135°).

### Hardware Metric Panels (CPU, GPU, RAM, Drives)
- **Panel background:** `#141619` with `bg-white/[0.03]` overlay + border `rgba(255,255,255,0.05)`.
- **Layout:** 2×2 grid on `md+`, single column on mobile. `gap-2`.
- **Icon container:** `36px × 36px`, `rounded-lg`, `bg-white/[0.04]`.
- **Label:** `text-[11px] text-white/25 uppercase tracking-widest`.
- **Value:** `text-sm font-mono font-medium text-white/70 truncate`.
- **No sub-text, no secondary metrics.** Each panel shows exactly one label and one value.

### Activity Stream (Optimization Log)
- **Panel background:** `bg-white/[0.02]` with border `rgba(255,255,255,0.05)`.
- **Header:** "OPTIMIZATION LOG" label + "LIVE" badge, separated by flex `ml-auto`.
- **Entries:** `text-xs font-mono`, timestamp in `text-white/15`, description in `text-white/35`.
- **Bottom:** `awaiting next task` with blinking `▊` cursor via `terminal-cursor` CSS class.
- **Max height:** 140px with overflow-y scroll hidden behind the panel.

---

## 5. Interactive Component Tokens

| Component | Default | Hover | Active (selected) |
|-----------|---------|-------|-------------------|
| Sidebar nav link | `text-white/35` | `text-white/60 bg-white/[0.02]` | `text-neon bg-neon/[0.1]` |
| Preset card (Tweaks Hub) | `bg-white/[0.02] border-white/[0.05]` | `bg-white/[0.04]` | `bg-neon/[0.08] border-neon/30` |
| Checkbox (Tweaks Hub) | `border-white/[0.12]` | `border-white/25` | `bg-neon/[0.15] border-neon/40` |
| Primary CTA button | `bg-neon/[0.12] border-neon/30 text-neon` | `bg-neon/[0.18]` | — |
| Secondary button | `bg-white/[0.03] border-white/[0.05] text-white/50` | `bg-neon/[0.08] border-neon/20 text-neon` | — |
| Toggle (enabled) | `bg-neon/[0.12] text-neon` | — | — |
| Toggle (disabled) | `bg-white/[0.03] text-white/20` | — | — |

---

## 6. Animation & Effects

| Effect | Duration | Easing | Token |
|--------|----------|--------|-------|
| Page entry stagger | 0.35s per child, 0.07s stagger | `easeOut` | Framer Motion variants |
| Arc gauge fill | 1.5s | `easeOut` | Framer Motion `animate` |
| Neon glow pulse | 2.5s infinite | `easeInOut` | `neon-glow` keyframes |
| Splash screen exit | 0.5s | `easeInOut` | Framer Motion `exit` |
| Toast auto-dismiss | 3.5s | — | `setTimeout` |
| Sidebar item transition | 0.2s | — | Tailwind `transition-all duration-200` |
| Terminal cursor blink | 1s step-end infinite | — | `terminal-blink` keyframes |

---

## 7. Glassmorphism Guidelines

All frosted panels use:
- Background: `--color-frosted` (`#141619`) with `/80` opacity
- Backdrop blur: `backdrop-blur-xl` (24px blur radius)
- Border: `rgba(255, 255, 255, 0.04)`
- No tinted shadows, no colored backdrops

This produces a crisp matte frosted appearance without blue/purple undertones or excessive translucency.

---

## 8. Splash / Loading Screen

- **Background:** `--color-obsidian` (`#0B0C0E`)
- **Loading ring:** `#FF5500` neon orange, 80px, stroke 3px, with `drop-shadow(0 0 8px rgba(255,85,0,0.5))`.
- **Track:** `rgba(255,85,0,0.08)` — faint orange tint on the track to hint at the accent color.
- **Text:** "Optimization Way" in `text-white/80`, subtitle in `text-white/20 uppercase`.
- **Dots:** 3 x 6px circles at `#FF5500`, bouncing opacity `[0.2, 0.8, 0.2]`.
