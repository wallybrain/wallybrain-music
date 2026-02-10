# Phase 10 Plan 01: Signature Identity Foundation

**Status:** COMPLETE
**Completed:** 2026-02-10
**Duration:** ~4 minutes
**Tasks:** 2/2

> Dominant color extraction pipeline, RGB-to-OKLCH conversion utilities, and animated EqIndicator component

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | def7f42 | Schema + extraction + pipeline integration + backfill |
| 2 | e874ce4 | Color utilities + EqIndicator + equalizer CSS |

## Changes by Task

### Task 1: Schema, Color Extraction, Pipeline Integration, Backfill

**Schema** (`src/lib/server/db/schema.ts`):
- Added `dominantColor: text('dominant_color')` column to tracks table after `artPath`
- Applied via `drizzle-kit push` (SQLite ALTER TABLE)

**Color extraction** (`src/lib/server/processors/artwork.ts`):
- Added `extractDominantColor(imagePath)` function using `sharp().stats()` dominant color
- Returns hex string (e.g., `#180808`) from 4096-bin histogram analysis

**Pipeline integration** (`src/lib/server/processors/processTrack.ts`):
- Imported `extractDominantColor` alongside existing `extractAndResizeArt`
- Calls extraction after successful art resize, stores result in DB update
- Null-safe: only sets `dominantColor` when extraction succeeds

**Backfill**:
- Ran one-time script to populate dominantColor for all existing tracks with cover art
- 1 track backfilled: `#180808`

### Task 2: Color Utilities, EqIndicator, Equalizer CSS

**Color utilities** (`src/lib/utils/colorUtils.ts`):
- `rgbHexToOklch(hex)` converts RGB hex to OKLCH `{ l, c, h }` using proper sRGB linearization and OKLab matrix transforms
- `formatOklch(oklch, alpha?)` formats to CSS `oklch()` notation with optional alpha
- Zero external dependencies (~35 lines)

**EqIndicator component** (`src/lib/components/EqIndicator.svelte`):
- Pure CSS animated equalizer: 3 bars scaling vertically with different timing
- Uses `bg-accent`, `origin-bottom`, and `animate-eq{1,2,3}` Tailwind classes
- No script block needed; accessible via `aria-label="Now playing"`

**Equalizer CSS** (`src/app.css`):
- Added `--animate-eq1/eq2/eq3` tokens to `@theme` block (1.2s, 1.4s, 1.0s durations)
- Added `@keyframes eq1/eq2/eq3` with varied `scaleY()` patterns for organic movement
- GPU-accelerated: uses `transform: scaleY()` instead of height for no layout thrashing

## Files Created/Modified

| File | Action | Provides |
|------|--------|----------|
| `src/lib/server/db/schema.ts` | Modified | dominantColor column on tracks table |
| `src/lib/server/processors/artwork.ts` | Modified | extractDominantColor function |
| `src/lib/server/processors/processTrack.ts` | Modified | Pipeline integration for dominantColor |
| `src/lib/utils/colorUtils.ts` | Created | rgbHexToOklch, formatOklch |
| `src/lib/components/EqIndicator.svelte` | Created | Animated equalizer bars component |
| `src/app.css` | Modified | Equalizer keyframes and animation tokens |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Database file permissions**
- **Found during:** Task 1, step 2 (drizzle-kit push)
- **Issue:** SQLite database files owned by root (uid 1000) instead of lwb3 (uid 1001), causing SQLITE_READONLY error
- **Fix:** Used `docker exec` to chown files to uid 1001
- **Files affected:** data/db/music.db, music.db-shm, music.db-wal

**2. [Rule 3 - Blocking] Backfill script path mapping**
- **Found during:** Task 1, step 5 (backfill)
- **Issue:** Database stores Docker-internal paths (`/data/art/...`) but backfill runs on host where files are at `./data/art/...`
- **Fix:** Added path mapping in backfill script: `/data/` -> `./data/`

## Verification

- `npm run build`: SUCCESS
- `npm run check`: 1 pre-existing error in `+page.server.ts` (category type mismatch, unrelated to this plan)
- Database `dominant_color` column populated: `#180808` for track with art
- All exports confirmed via grep
- All keyframes confirmed via grep

## Decisions

- Placed dominantColor column after artPath (logical grouping with art-related fields)
- Used sharp stats() dominant color (already installed, no new deps)
- EqIndicator is script-free (pure CSS animation via Tailwind @theme tokens)

## Self-Check: PASSED

All 7 files verified present. Both commit hashes (def7f42, e874ce4) confirmed in git log.
