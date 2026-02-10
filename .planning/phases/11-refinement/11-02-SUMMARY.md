# Phase 11 Plan 02: Grid/List Layout Toggle

**Status:** COMPLETE
**Completed:** 2026-02-10
**Duration:** ~1.5 minutes
**Tasks:** 2/2

> Persistent grid/list layout toggle on the track listing page with vertical grid cards showcasing cover art prominently

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d8fb50d | Layout preference store + TrackCardGrid component |
| 2 | 98b7f94 | Toggle UI + conditional grid/list rendering on home page |

## Changes by Task

### Task 1: Layout Preference Store and Grid Card Component

**Layout preference store** (`src/lib/stores/layoutPreference.svelte.ts`):
- Class-based Svelte 5 `$state` pattern matching `playerState.svelte.ts`
- `LayoutMode` type: `'list' | 'grid'`
- Constructor reads localStorage key `wallybrain-layout`, validates value
- `toggle()` flips mode and writes to localStorage (guarded by `browser`)
- `setMode(mode)` sets explicit mode and writes to localStorage
- Exported singleton `layoutPreference`

**Grid card component** (`src/lib/components/TrackCardGrid.svelte`):
- Vertical flex column layout: aspect-square cover art on top, metadata below
- Same props as TrackCard (track, allTracks, index) with same type shape
- Cover art: full-bleed image with `group-hover:scale-110` zoom transition, or gradient placeholder with music note icon
- Play/pause overlay: centered button, `opacity-0 group-hover:opacity-100`, semi-transparent dark backdrop
- EqIndicator: absolute positioned top-right pill on cover art area when `isPlaying`
- Currently-playing track: `ring-1 ring-accent/30` subtle accent ring
- Metadata: title (truncated), duration (font-mono tabular-nums), category (uppercase tracking-wider)

### Task 2: Layout Toggle UI and Conditional Grid/List Rendering

**Toggle button group** (`src/routes/+page.svelte`):
- Positioned between FilterBar and track listing, right-aligned
- Two buttons in `bg-surface-overlay` pill: list icon (3 lines) and grid icon (4 squares)
- Active state: `bg-surface-hover text-text-primary`; inactive: `text-text-muted hover:text-text-secondary`
- `aria-label` and `aria-pressed` attributes for accessibility

**Conditional rendering** (`src/routes/+page.svelte`):
- Grid mode: `grid grid-cols-2 sm:grid-cols-3 gap-3` with `TrackCardGrid` components
- List mode: existing `space-y-3` with staggered `in:fly` entrance and `TrackCard` components
- Empty state remains unchanged (no toggle shown when empty would be odd but toggle is always visible for consistency)

## Files Created/Modified

| File | Action | Provides |
|------|--------|----------|
| `src/lib/stores/layoutPreference.svelte.ts` | Created | Persistent grid/list mode store with localStorage |
| `src/lib/components/TrackCardGrid.svelte` | Created | Vertical card layout for grid view with cover art, play overlay, EqIndicator |
| `src/routes/+page.svelte` | Modified | Layout toggle UI + conditional grid/list rendering |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npm run build`: SUCCESS (no errors)
- `layoutPreference.svelte.ts` exports `layoutPreference` with `mode`, `toggle()`, `setMode()`: CONFIRMED
- `TrackCardGrid.svelte` renders vertical card with cover art, title, metadata: CONFIRMED
- `TrackCardGrid` has play button overlay and EqIndicator for playing state: CONFIRMED
- `+page.svelte` imports `layoutPreference` and `TrackCardGrid`: CONFIRMED
- Toggle button group with list/grid icons and aria attributes: CONFIRMED
- Conditional rendering switches between grid and list views: CONFIRMED
- List view retains staggered `in:fly` entrance: CONFIRMED
- Grid view uses responsive 2-col / 3-col grid: CONFIRMED

## Decisions

- Grid card uses `aspect-square` for cover art (consistent square thumbnails regardless of source image ratio)
- No staggered entrance on grid view (grid layout itself provides visual structure; stagger reserved for list)
- Toggle always visible even when no tracks (consistent UI placement)
- Used SVG line/rect icons inline rather than icon library (zero dependencies, tiny payload)

## Self-Check: PASSED
