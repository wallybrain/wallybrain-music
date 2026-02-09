---
phase: 06-discovery-and-engagement
plan: 02
subsystem: api, ui
tags: [play-count, open-graph, twitter-card, social-sharing, meta-tags, drizzle-orm]

requires:
  - phase: 03-waveform-player
    provides: WaveformPlayer component with play event handling
  - phase: 04-track-pages
    provides: Track detail page with svelte:head block and cover art endpoint

provides:
  - POST /api/tracks/[id]/play endpoint for atomic play count increment
  - WaveformPlayer play count tracking (once per page session)
  - Open Graph meta tags on track detail page for social sharing
  - Twitter Card meta tags on track detail page
  - Canonical URL link tag

affects: [07-persistent-player]

tech-stack:
  added: []
  patterns: [fire-and-forget fetch for analytics, atomic SQL increment, absolute URLs for OG tags]

key-files:
  created:
    - src/routes/api/tracks/[id]/play/+server.ts
  modified:
    - src/lib/components/WaveformPlayer.svelte
    - src/routes/track/[slug]/+page.svelte

key-decisions:
  - "Fire-and-forget fetch for play count (no await, no blocking playback)"
  - "hasCountedPlay flag resets on component unmount (each page visit can count once)"
  - "Absolute URLs hardcoded with wallyblanchard.com domain for OG tags (not relative {base})"

patterns-established:
  - "Analytics endpoints: fire-and-forget POST from client, atomic SQL increment on server"
  - "Social meta tags: absolute URLs with domain, not relative paths"

duration: 3min
completed: 2026-02-09
---

# Phase 6 Plan 2: Play Count Tracking and Social Sharing Summary

**Atomic play count API with debounced WaveformPlayer integration, plus OG/Twitter Card meta tags with absolute wallyblanchard.com URLs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T02:29:43Z
- **Completed:** 2026-02-09T02:32:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- POST endpoint at `/api/tracks/[id]/play` atomically increments play count via SQL
- WaveformPlayer fires play count once per page session on first play event (pause/resume does not re-trigger)
- Track detail pages include complete Open Graph and Twitter Card meta tags with absolute URLs
- Canonical URL and music:duration OG tags for enhanced SEO and rich previews

## Task Commits

Each task was committed atomically:

1. **Task 1: Play count API endpoint and WaveformPlayer integration** - `6ff49f1` (feat)
2. **Task 2: Open Graph and Twitter Card meta tags on track detail page** - `92dd2f1` (feat)

## Files Created/Modified
- `src/routes/api/tracks/[id]/play/+server.ts` - POST endpoint for atomic play count increment (new)
- `src/lib/components/WaveformPlayer.svelte` - Added hasCountedPlay flag and onPlay() handler
- `src/routes/track/[slug]/+page.svelte` - Added OG, Twitter Card, and canonical meta tags

## Decisions Made
- Fire-and-forget fetch for play count (no await) -- playback should never be blocked by analytics
- hasCountedPlay flag resets on component unmount, so each page visit where the user plays counts once
- Hardcoded absolute URLs (`https://wallyblanchard.com/music/...`) for all OG/Twitter tags, since relative `{base}` paths do not work with social crawlers
- No rate limiting on play count endpoint -- personal portfolio site, not a monetization platform

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Play count tracking and social sharing complete
- Docker rebuild required to deploy changes (`docker compose up --build -d`)
- Phase 6 plans complete; Phase 7 (persistent player) ready when needed
- OG tags can be validated post-deploy using opengraph.xyz or Facebook Sharing Debugger

## Self-Check: PASSED

All files verified present. Both commits (6ff49f1, 92dd2f1) confirmed in git log.

---
*Phase: 06-discovery-and-engagement*
*Completed: 2026-02-09*
