# Plan 08-01 Summary: Design Tokens + Fonts + Public Page Migration

**Status:** COMPLETE
**Completed:** 2026-02-10

## What Was Done

### Task 1: Font Installation + Design Token System
- Installed `@fontsource-variable/space-grotesk` and `@fontsource/space-mono`
- Rewrote `src/app.css` with complete `@theme` block containing:
  - 3 font families (heading, mono, body)
  - 4 surface colors (base, raised, overlay, hover)
  - 4 text colors (primary, secondary, tertiary, muted)
  - 4 accent colors (accent, hover, muted, muted-hover)
  - 2 border colors (default, subtle)
  - 3 status colors (success, warning, error)
  - 3 waveform colors (idle, progress, cursor)
- Added `@layer base` with html defaults and heading typography
- Migrated scrollbar styles from zinc vars to semantic tokens

### Task 2: 6 Public-Facing File Migration
All hardcoded zinc/violet class references replaced with semantic tokens:

| File | Key Changes |
|------|------------|
| `+layout.svelte` | Added `font-heading` to site title, zinc-300 → text-secondary, hover:white → hover:text-primary |
| `+page.svelte` | h1 text-white → text-primary, zinc-500 → text-muted (WCAG fix), violet-400 → accent-muted |
| `+error.svelte` | zinc-300 → text-primary on h1, zinc-500 → text-muted, violet links → accent-muted |
| `TrackCard.svelte` | bg-zinc-900/50 → bg-surface-raised, violet buttons → bg-accent, added font-mono to duration |
| `FilterBar.svelte` | violet-600 pills → bg-accent, zinc-800 → bg-surface-overlay, zinc-500 → text-text-muted |
| `CoverArt.svelte` | bg-zinc-800 → bg-surface-overlay, text-zinc-600 → text-text-muted (WCAG fix: was 2.57:1!) |

## WCAG AA Fixes
- `text-zinc-500` (4.12:1 ratio) → `text-text-muted` (OKLCH L=0.60, ~5.0:1 ratio) — 6 instances
- `text-zinc-600` (2.57:1 ratio) → `text-text-muted` (~5.0:1 ratio) — 1 instance (CoverArt placeholder)

## Verification
- `npm run build`: SUCCESS (zero errors)
- zinc/violet grep across 6 files: ZERO matches
- `@theme` block confirmed in app.css
- Font definitions confirmed (Space Grotesk Variable)
- Typography classes applied (font-heading, font-mono tabular-nums)
- Pre-existing Drizzle type error in +page.server.ts (unrelated, not introduced by this plan)

## Files Modified
1. `package.json` — added 2 font dependencies
2. `src/app.css` — complete rewrite with @theme tokens
3. `src/routes/+layout.svelte` — semantic tokens + font-heading
4. `src/routes/+page.svelte` — semantic tokens + WCAG fix
5. `src/routes/+error.svelte` — semantic tokens
6. `src/lib/components/TrackCard.svelte` — semantic tokens + font-mono
7. `src/lib/components/FilterBar.svelte` — semantic tokens
8. `src/lib/components/CoverArt.svelte` — semantic tokens + WCAG fix
