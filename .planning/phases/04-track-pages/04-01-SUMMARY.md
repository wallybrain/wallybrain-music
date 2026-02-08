---
phase: 04-track-pages
plan: 01
subsystem: track-pages
tags: [cover-art, track-card, listing-page, error-page, api-endpoint, svelte5-components]
dependency_graph:
  requires: [sqlite-schema, drizzle-orm, audio-endpoint-pattern, formatTime-utility]
  provides: [cover-art-endpoint, cover-art-component, track-card-component, track-listing-page, error-page]
  affects: [04-02-PLAN, 05-01-PLAN, 06-01-PLAN]
tech_stack:
  added: []
  patterns: [cover-art-serving, placeholder-fallback, card-layout, svelte5-runes, base-path-imports]
key_files:
  created:
    - src/routes/api/tracks/[id]/art/+server.ts
    - src/lib/components/CoverArt.svelte
    - src/lib/components/TrackCard.svelte
    - src/routes/+error.svelte
  modified:
    - src/routes/+page.server.ts
    - src/routes/+page.svelte
decisions:
  - id: no-waveform-on-listing
    decision: "Removed WaveformPlayer from listing page, replaced with card-based layout"
    reason: "Per research pitfall #6: multiple wavesurfer instances cause excessive API calls and memory usage; waveform belongs on detail page only"
  - id: immutable-cache-art
    decision: "Cover art endpoint uses Cache-Control: public, max-age=31536000, immutable"
    reason: "Art files are tied to UUID track IDs; re-processing creates new UUIDs so cache invalidation is not needed"
metrics:
  duration: 3m
  completed: 2026-02-08
---

# Phase 4 Plan 1: Cover Art Endpoint, Components, and Listing Page Summary

Cover art API endpoint serving JPEG with immutable cache headers, reusable CoverArt component with music note placeholder fallback, TrackCard component for card-based listing, listing page rewrite removing WaveformPlayer instances, and custom dark-themed 404 error page.

## What Was Built

### Task 1: Cover art API endpoint and CoverArt component (1a4cf08)
- **Cover art endpoint** (src/routes/api/tracks/[id]/art/+server.ts): GET handler that looks up track by UUID, selects artPath, streams JPEG file with `createReadStream` + `Readable.toWeb()`, returns 404 if track not found, artPath null, or file missing on disk. Headers: `Content-Type: image/jpeg`, `Content-Length`, `Cache-Control: public, max-age=31536000, immutable`.
- **CoverArt.svelte** (src/lib/components/CoverArt.svelte): Svelte 5 component with `$props()` runes accepting trackId, artPath, title, and optional size (sm/md/lg). Renders `<img>` with `loading="lazy"` when artPath is truthy, or a styled placeholder `<div>` with music note unicode character (&#9835;) when artPath is falsy. Size-dependent classes for both image and placeholder text sizing.

### Task 2: TrackCard, listing page rewrite, and error page (248ce50)
- **TrackCard.svelte** (src/lib/components/TrackCard.svelte): Svelte 5 component wrapping CoverArt (size="sm") and track metadata in a clickable `<a>` tag linking to `{base}/track/{track.slug}`. Shows title (truncate, hover:text-white), duration via formatTime (if not null), and play count. Card styling: semi-transparent zinc-900 background with hover transition.
- **+page.server.ts** updated: Added artPath, playCount, category, createdAt to select query. Removed status from response. Added `desc(tracks.createdAt)` ordering for newest-first display.
- **+page.svelte** rewritten: Removed WaveformPlayer import entirely. Added TrackCard import and base path import. Added `<svelte:head>` with title and meta description. Page header: "wallybrain" h1 with "electronic music" subtitle. Track list renders TrackCard components in space-y-3 layout. Empty state preserved.
- **+error.svelte** (src/routes/+error.svelte): Custom error page using `page` from `$app/state`. Centered full-height layout with dark zinc-950 background. Shows status code as large heading, error message as body text, and "Back to tracks" link in violet.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1a4cf08 | Cover art API endpoint and CoverArt component |
| 2 | 248ce50 | TrackCard component, listing page rewrite, error page |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles (svelte-check) | PASS (0 errors, 0 warnings) |
| Docker container builds | PASS |
| Container starts healthy | PASS |
| GET /music/ returns 200 with listing page | PASS |
| Listing page contains "wallybrain" heading | PASS |
| No waveform-player class in listing HTML | PASS (0 occurrences) |
| GET /music/api/tracks/{id}/art returns 404 for track without art | PASS |
| GET /music/api/tracks/nonexistent/art returns 404 | PASS |
| GET /music/track/nonexistent returns 404 error page | PASS |
| Error page contains "Back to tracks" link | PASS |

## Performance

- **Duration:** ~3m
- **Start:** 2026-02-08T03:15:11Z
- **End:** 2026-02-08T03:18:28Z
- **Tasks:** 2/2 completed
- **Files created:** 4
- **Files modified:** 2

## Next Phase Readiness

Plan 04-01 is complete. Plan 04-02 can proceed:
- CoverArt and TrackCard components are reusable for detail page
- Cover art endpoint is live and serving (or returning 404 for missing art)
- Error page handles 404s with dark theme styling
- Listing page query includes all fields needed for future filtering (category, createdAt)

## Self-Check: PASSED

- art/+server.ts verified present on disk
- CoverArt.svelte verified present on disk
- TrackCard.svelte verified present on disk
- +error.svelte verified present on disk
- Commit 1a4cf08 (Task 1) verified in git log
- Commit 248ce50 (Task 2) verified in git log
