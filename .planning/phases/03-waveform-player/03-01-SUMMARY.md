---
phase: 03-waveform-player
plan: 01
subsystem: waveform-player
tags: [peaks, audio-streaming, range-requests, api, caching, normalization]
dependency_graph:
  requires: [sqlite-schema, drizzle-orm, audiowaveform-peaks, mp3-transcoding]
  provides: [peaks-endpoint, audio-streaming-endpoint]
  affects: [03-02-PLAN]
tech_stack:
  added: []
  patterns: [peak-normalization, http-range-requests, immutable-caching, node-readable-to-web-stream]
key_files:
  created:
    - src/routes/api/tracks/[id]/peaks/+server.ts
    - src/routes/api/tracks/[id]/audio/+server.ts
  modified: []
decisions:
  - id: uuid-api-paths
    decision: "Use UUID track ID (not slug) for API data endpoints"
    reason: "Audio and peaks files are stored with UUID filenames; slug is for public-facing pages (Phase 4)"
  - id: server-side-normalization
    decision: "Normalize peaks server-side by dividing 8-bit integers by 127"
    reason: "wavesurfer.js expects -1.0 to 1.0 floats; server-side normalization with fixed divisor avoids per-track distortion from client-side normalize:true"
metrics:
  duration: 5m39s
  completed: 2026-02-08
---

# Phase 3 Plan 1: Peaks and Audio Streaming API Endpoints Summary

Peaks normalization endpoint dividing audiowaveform 8-bit integers by 127 to float array, plus audio streaming endpoint with HTTP 206 range request support including Safari bytes=0-1 probe, both with immutable cache headers and database-validated track lookups.

## What Was Built

### Task 1: Peaks normalization endpoint (c29db5c)
- **GET /api/tracks/[id]/peaks**: Returns normalized float array from audiowaveform JSON
  - Database lookup validates track exists and has peaksPath before serving
  - Reads peaks JSON file from filesystem path stored in database
  - Normalizes 8-bit integer data (-127 to 127) to floats (-1.0 to 1.0) by dividing by 127
  - Returns just the float array (not the full audiowaveform object) for wavesurfer.js
  - Cache-Control: public, max-age=31536000, immutable
  - Returns 404 for missing tracks or missing/unreadable peaks files

### Task 2: Audio streaming endpoint with range requests (589d6f6)
- **GET /api/tracks/[id]/audio**: Streams MP3 with full HTTP range request support
  - Database lookup validates track exists and status is 'ready'
  - Accept-Ranges: bytes header on ALL responses (critical for Safari)
  - Full file: 200 with Content-Length, streams via Readable.toWeb()
  - Range request: 206 with Content-Range and exact Content-Length
  - Safari bytes=0-1 probe: returns exactly 2 bytes with status 206
  - Open-ended ranges (bytes=N-): serves from N to end of file
  - End clamped to fileSize-1 to prevent out-of-bounds reads
  - Cache-Control: public, max-age=31536000, immutable
  - Returns 404 for missing tracks, non-ready tracks, or missing audio files

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c29db5c | Peaks normalization endpoint with DB lookup and immutable caching |
| 2 | 589d6f6 | Audio streaming with HTTP 206 range requests and Safari support |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles (svelte-check) | PASS (0 errors, 0 warnings) |
| Docker build succeeds | PASS |
| Container starts healthy | PASS |
| Peaks: returns JSON array of floats | PASS (empty array for empty peaks data) |
| Peaks: Cache-Control immutable | PASS |
| Peaks: 404 for nonexistent track | PASS |
| Audio: full file returns 200 with Content-Length: 1088 | PASS |
| Audio: Accept-Ranges: bytes on all responses | PASS |
| Audio: Safari probe bytes=0-1 returns 206, Content-Length: 2 | PASS |
| Audio: Mid-file range bytes=100-199 returns 206, Content-Length: 100 | PASS |
| Audio: Open-ended range bytes=100- returns 206, Content-Length: 988 | PASS |
| Audio: Content-Range header format correct | PASS |
| Audio: Cache-Control immutable | PASS |
| Audio: 404 for nonexistent track | PASS |

## Performance

- **Duration:** 5m39s
- **Start:** 2026-02-08T02:29:19Z
- **End:** 2026-02-08T02:34:58Z
- **Tasks:** 2/2 completed
- **Files created:** 2
- **Files modified:** 0

## Next Phase Readiness

Plan 03-01 is complete. Both API endpoints are operational:
- Peaks endpoint normalizes and serves float arrays for wavesurfer.js
- Audio endpoint handles full requests, range requests, and Safari probe
- Both validate track existence via database lookup
- Both include immutable cache headers

Plan 03-02 (WaveformPlayer Svelte component) can proceed -- both data sources it needs are ready.

## Self-Check: PASSED

- Both created files verified present (peaks/+server.ts, audio/+server.ts)
- Commit c29db5c (Task 1) verified in git log
- Commit 589d6f6 (Task 2) verified in git log
