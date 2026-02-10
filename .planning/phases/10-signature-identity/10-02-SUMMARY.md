# Phase 10 Plan 02: Signature Identity Frontend Wiring

**Status:** COMPLETE
**Completed:** 2026-02-10
**Duration:** ~3 minutes
**Tasks:** 2/2

> Ambient background tint and cover art glow on track detail pages, equalizer indicator on playing tracks, and staggered fly entrance animations on track listings

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3ffc78e | Ambient tint + cover art glow on track detail page |
| 2 | 6534298 | EqIndicator in TrackCard + staggered entrance animations |

## Changes by Task

### Task 1: Track Detail Ambient Tint, Cover Art Glow, and Server Data Wiring

**Server data** (`src/routes/track/[slug]/+page.server.ts`):
- Verified `.select()` (select-all) already includes `dominantColor` -- no changes needed

**Ambient background tint** (`src/routes/track/[slug]/+page.svelte`):
- Imported `rgbHexToOklch` from colorUtils
- Added `ambientStyle` derived computation: converts dominantColor hex to OKLCH, reduces lightness to 35% and chroma to 40%, outputs as `--track-tint` CSS custom property at 15% alpha
- Added `relative` positioning to outer container with `style={ambientStyle}`
- Added ambient tint overlay div: `absolute inset-0 -z-10` with radial-gradient mask fading from top to 70%
- CRITICAL: Overlay is a sibling with `-z-10`, not an ancestor of WaveformPlayer -- no drag-to-seek breakage

**Cover art glow** (`src/lib/components/CoverArt.svelte`):
- Added `dominantColor` as optional prop (default `null`)
- Added `glowStyle` derived: multi-layer box-shadow (40px at 40% alpha + 80px at 20% alpha + base shadow) only when `size === 'lg'` and `dominantColor` is set
- Applied `style={glowStyle}` to `<img>` element; inline box-shadow overrides Tailwind shadow when active
- Used hex+alpha suffix (`#rrggbbaa`) for box-shadow to avoid OKLCH browser edge cases

**CoverArt prop wiring** (`src/routes/track/[slug]/+page.svelte`):
- Passed `dominantColor={track.dominantColor}` to CoverArt in track detail page

### Task 2: Equalizer Indicator on Playing Tracks and Staggered Entrance Animations

**Track listing query** (`src/routes/+page.server.ts`):
- Added `dominantColor: tracks.dominantColor` to the explicit `.select({})` column list

**EqIndicator in TrackCard** (`src/lib/components/TrackCard.svelte`):
- Imported `EqIndicator` component
- Wrapped `isPlaying` state's pause button in flex container with `EqIndicator` alongside
- Added `dominantColor?: string | null` to track type definition for type safety

**Staggered entrance animation** (`src/routes/+page.svelte`):
- Imported `fly` from `svelte/transition` and `cubicOut` from `svelte/easing`
- Wrapped each TrackCard in `<div in:fly>` with: `y: 15` (subtle), `duration: 250` (fast), `delay: Math.min(i * 60, 600)` (capped stagger)
- Uses `in:` directive (entrance only) -- navigation away is instant

## Files Created/Modified

| File | Action | Provides |
|------|--------|----------|
| `src/routes/track/[slug]/+page.svelte` | Modified | Ambient tint overlay + ambientStyle derived + CoverArt dominantColor prop |
| `src/lib/components/CoverArt.svelte` | Modified | dominantColor prop + glowStyle box-shadow on lg images |
| `src/routes/+page.server.ts` | Modified | dominantColor in track listing query |
| `src/lib/components/TrackCard.svelte` | Modified | EqIndicator import/render + dominantColor type |
| `src/routes/+page.svelte` | Modified | fly import + staggered entrance animation wrapper |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npm run build`: SUCCESS
- `npm run check`: 1 pre-existing error (category type mismatch in +page.server.ts, unrelated)
- Ambient tint div is sibling with `-z-10`, not ancestor of WaveformPlayer: CONFIRMED
- CoverArt accepts `dominantColor` prop, applies glow only at `size === 'lg'`: CONFIRMED
- EqIndicator imported and conditionally rendered in TrackCard when `isPlaying`: CONFIRMED
- `in:fly` with stagger delay applied in track listing `{#each}` block: CONFIRMED
- `dominantColor` included in +page.server.ts track listing query: CONFIRMED

## Decisions

- Used hex+alpha suffix for box-shadow glow (avoids OKLCH rendering edge cases in box-shadow across browsers)
- Stagger animation capped at 600ms max delay (prevents long waits on large track lists)
- EqIndicator placed before pause button in flex row (visual hierarchy: indicator then action)
- Entrance-only animation (`in:fly` not `transition:fly`) for instant navigation away

## Self-Check: PASSED
