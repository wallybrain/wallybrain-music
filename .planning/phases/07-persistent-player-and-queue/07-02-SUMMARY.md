---
phase: 07-persistent-player-and-queue
plan: 02
subsystem: ui
tags: [svelte5, runes, player-state, queue, waveform-coexistence, track-cards]

requires:
  - phase: 07-persistent-player-and-queue
    plan: 01
    provides: "Global playerState singleton, QueueTrack type, PersistentPlayer component in layout"
  - phase: 04-track-pages
    provides: "TrackCard component, track listing page, track detail page with WaveformPlayer"
  - phase: 06-discovery-and-engagement
    provides: "Filter bar with tag/category filtering affecting visible tracks"
provides:
  - "Play button on TrackCard dispatching to global playerState with full queue context"
  - "Queue population from all visible (filtered) tracks on listing page"
  - "Track detail page play dispatch to persistent player (single-track queue)"
  - "WaveformPlayer coexistence: hidden when persistent player has same track, shown otherwise"
affects: []

tech-stack:
  added: []
  patterns:
    - "Queue population from visible track list via $derived QueueTrack[] mapping"
    - "Event prevention (preventDefault + stopPropagation) on buttons inside anchor tags"
    - "Conditional component rendering for audio coexistence (hide WaveformPlayer when persistent player active)"
    - "Three-state play button: play (not current), resume (current paused with ring indicator), pause (current playing)"

key-files:
  created: []
  modified:
    - src/lib/components/TrackCard.svelte
    - src/routes/+page.svelte
    - src/routes/track/[slug]/+page.svelte

key-decisions:
  - "Queue populated from all currently visible tracks (respects active filters) not all tracks in DB"
  - "Track detail page uses single-track queue for simplicity (no adjacent track context)"
  - "WaveformPlayer completely hidden when persistent player has same track (avoids double audio)"
  - "Play buttons on TrackCard use preventDefault + stopPropagation to avoid anchor navigation"

patterns-established:
  - "Queue context pattern: listing page maps data.tracks to QueueTrack[] via $derived, passes as allTracks prop"
  - "Coexistence pattern: $derived boolean checking playerState.currentTrack?.id === track.id to toggle UI sections"

duration: 2min
completed: 2026-02-09
---

# Phase 7 Plan 2: Play Trigger Wiring Summary

**TrackCard play buttons dispatching to global playerState with full queue from visible tracks, track detail page coexistence hiding WaveformPlayer when persistent player is active**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-09T03:04:20Z
- **Completed:** 2026-02-09T03:06:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TrackCard has a three-state play/pause button (play, resume with ring, pause) that dispatches to global playerState with full queue context
- Listing page maps visible tracks to QueueTrack[] and passes allTracks + index to each TrackCard, so clicking play populates the queue with all filtered tracks
- Track detail page conditionally renders: "Now Playing" controls when persistent player has this track, WaveformPlayer + "Play with continuous queue" button otherwise
- No double audio playback possible -- WaveformPlayer is completely removed from DOM when persistent player handles the same track

## Task Commits

Each task was committed atomically:

1. **Task 1: Add play button to TrackCard and pass queue data from listing page** - `125fcb5` (feat)
2. **Task 2: Wire track detail page with play dispatch and WaveformPlayer coexistence** - `0aef142` (feat)

## Files Created/Modified
- `src/lib/components/TrackCard.svelte` - Added playerState import, allTracks/index props, three-state play/pause button with event prevention, hover-reveal on desktop / always-visible on mobile
- `src/routes/+page.svelte` - Added QueueTrack type import, $derived queueTracks mapping from data.tracks, passes allTracks and index to each TrackCard in the loop
- `src/routes/track/[slug]/+page.svelte` - Added playerState import, isPlayingThisTrack $derived, playInPersistentPlayer function, conditional WaveformPlayer/Now Playing rendering

## Decisions Made
- Queue populated from all currently visible tracks (respects active filters from Phase 6) rather than all tracks in database -- clicking play after filtering gives a focused queue
- Track detail page dispatches single-track queue (just the viewed track) for v1 simplicity, matching research recommendation
- WaveformPlayer completely hidden (not just paused) when persistent player has same track -- simplest approach to avoid double wavesurfer instances and double audio
- Play buttons on TrackCard use both preventDefault and stopPropagation since cards are wrapped in anchor tags

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing type error in `+page.server.ts` (category filter string vs enum type from Phase 6) -- same issue noted in Plan 07-01 summary. Does not affect any files modified in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 phases complete -- the persistent player is fully wired end-to-end
- Play from listing page populates queue with all visible tracks and starts auto-advance
- Play from track detail page starts single-track playback in persistent player
- Navigation between pages preserves playback in the bottom bar
- Pre-existing +page.server.ts type error should be addressed in a future cleanup pass

## Self-Check: PASSED

All files exist, all commits verified, all content checks passed.

---
*Phase: 07-persistent-player-and-queue*
*Completed: 2026-02-09*
