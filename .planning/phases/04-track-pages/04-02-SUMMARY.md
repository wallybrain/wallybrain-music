---
phase: 04-track-pages
plan: 02
subsystem: track-pages
tags: [detail-page, slug-routing, dark-theme, responsive-layout, global-styles, svelte-head]
dependency_graph:
  requires: [cover-art-component, waveform-player-component, formatTime-utility, drizzle-orm, track-card-component]
  provides: [track-detail-page, slug-based-permalinks, global-dark-theme, layout-nav-header, phase7-ready-flex-layout]
  affects: [05-01-PLAN, 06-02-PLAN, 07-01-PLAN]
tech_stack:
  added: []
  patterns: [slug-based-routing, css-base-layer-theming, derived-runes, flex-column-layout]
key_files:
  created:
    - src/routes/track/[slug]/+page.server.ts
    - src/routes/track/[slug]/+page.svelte
  modified:
    - src/app.css
    - src/routes/+layout.svelte
    - src/routes/+page.svelte
    - src/routes/+error.svelte
decisions:
  - id: css-base-layer-dark
    decision: "Global dark theme via CSS base layer on html element instead of per-page bg-zinc-950 classes"
    reason: "Eliminates repeated dark background classes on every page; all pages inherit dark theme automatically"
  - id: layout-flex-column
    decision: "Layout uses min-h-screen flex-col with flex-1 main, ready for Phase 7 persistent player bar"
    reason: "Phase 7 bottom bar can be added as sibling after main without disrupting existing layout"
  - id: derived-rune-track
    decision: "Track detail page uses $derived(data.track) instead of const destructure"
    reason: "Avoids Svelte 5 warning about capturing initial value of reactive prop; ensures reactivity if data changes"
metrics:
  duration: 6m
  completed: 2026-02-08
---

# Phase 4 Plan 2: Track Detail Page, Slug Permalinks, and Dark Theme Summary

Slug-based track detail page at /music/track/{slug} with cover art, waveform player, category badge, and metadata; global dark theme via CSS base layer eliminating per-page background repetition; layout nav header with wallybrain brand link and flex-column structure for future Phase 7 persistent player.

## What Was Built

### Task 1: Track detail page with slug-based routing (9f4b6b7)
- **Server load function** (src/routes/track/[slug]/+page.server.ts): Queries track by slug using `eq(tracks.slug, params.slug)`, returns full track row for detail page. Throws 404 for non-existent tracks or tracks with status other than 'ready'.
- **Detail page component** (src/routes/track/[slug]/+page.svelte): Svelte 5 with `$derived` rune for reactive track data. Imports WaveformPlayer, CoverArt, formatTime, and base path. Features:
  - `<svelte:head>` with per-page title ("{title} - wallybrain") and meta description
  - Back link to listing page with left arrow
  - Header section: cover art (stacks on mobile, side-by-side on md+), title as h1, category badge (uppercase, zinc-800 background), duration via formatTime, play count
  - WaveformPlayer section with track duration
  - Description section (conditionally rendered with whitespace-pre-wrap)
  - Footer with formatted creation date

### Task 2: Dark theme global styles and responsive layout polish (440c021)
- **app.css** updated: CSS base layer sets `html` background-color to zinc-950, text color to zinc-200, and smooth scrolling. Custom webkit scrollbar styling (8px width, zinc-900 track, zinc-700 thumb with hover state).
- **+layout.svelte** updated: Wraps children in `min-h-screen flex flex-col` div with `<header>` containing "wallybrain" brand link (max-w-3xl, text-lg font-semibold) and `<main class="flex-1">` for content. Imports base path from `$app/paths`.
- **+page.svelte** updated: Removed `min-h-screen bg-zinc-950` wrapper (now inherited from layout/CSS). Changed h1 from "wallybrain" to "Tracks" since layout provides the brand link.
- **+error.svelte** updated: Changed `min-h-screen bg-zinc-950` to `min-h-[60vh]` since layout provides full height and dark background.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 9f4b6b7 | Track detail page with slug-based routing |
| 2 | 440c021 | Dark theme global styles and responsive layout polish |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SvelteKit types not generated for new route**
- **Found during:** Task 1
- **Issue:** `svelte-check` reported "Cannot find module './$types'" for the new `track/[slug]/+page.server.ts` because SvelteKit had not generated types for the new route directory.
- **Fix:** Ran `npx svelte-kit sync` to generate type definitions before re-running svelte-check.
- **Files affected:** None (build tooling only)

**2. [Rule 1 - Bug] Svelte 5 reactivity warning on track data**
- **Found during:** Task 1
- **Issue:** `const track = data.track` captures only the initial value of `data`, triggering Svelte 5 warning "This reference only captures the initial value of data."
- **Fix:** Changed to `let track = $derived(data.track)` for proper reactivity.
- **Files modified:** src/routes/track/[slug]/+page.svelte
- **Commit:** 9f4b6b7

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles (svelte-check) | PASS (0 errors, 0 warnings) |
| Docker container builds | PASS |
| Container starts healthy | PASS |
| GET /music/ returns 200 | PASS |
| Listing page contains "wallybrain" nav link | PASS |
| GET /music/track/sound returns 200 (detail page) | PASS |
| Detail page has `<title>sound - wallybrain</title>` | PASS |
| Detail page has waveform-player | PASS |
| Detail page has cover art placeholder | PASS |
| Detail page shows category badge "track" | PASS |
| Detail page shows "0 plays" | PASS |
| Detail page shows "Added February 8, 2026" | PASS |
| GET /music/track/nonexistent returns 404 | PASS |
| 404 page contains "Back to tracks" link | PASS |
| CSS contains dark theme base styles (zinc-950 bg, zinc-200 text) | PASS |
| CSS contains smooth scrolling | PASS |
| CSS contains custom scrollbar styles | PASS |
| Layout header renders on both listing and detail pages | PASS |

## Performance

- **Duration:** ~6m
- **Start:** 2026-02-08T03:22:23Z
- **End:** 2026-02-08T03:28:35Z
- **Tasks:** 2/2 completed
- **Files created:** 2
- **Files modified:** 4

## Next Phase Readiness

Phase 4 is complete. Phase 5 (Admin Interface) can proceed:
- Track detail pages at /music/track/{slug} provide the public-facing track view
- Layout flex-column structure supports Phase 7 persistent player bar addition
- CoverArt, TrackCard, WaveformPlayer components are reusable for admin views
- Global dark theme eliminates per-page styling overhead for new pages

## Self-Check: PASSED

- src/routes/track/[slug]/+page.server.ts verified present on disk
- src/routes/track/[slug]/+page.svelte verified present on disk
- Commit 9f4b6b7 (Task 1) verified in git log
- Commit 440c021 (Task 2) verified in git log
