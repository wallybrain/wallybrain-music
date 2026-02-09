---
phase: 02-processing-pipeline
plan: 02
subsystem: processing-pipeline
tags: [upload, queue, orchestrator, processing, api, sveltekit]
dependency_graph:
  requires: [ffmpeg-runtime, audiowaveform-runtime, magic-byte-validation, ffprobe-validation, mp3-transcoding, peaks-generation, metadata-extraction, artwork-processing]
  provides: [upload-endpoint, processing-queue, processing-orchestrator, queue-startup]
  affects: [03-01-PLAN, 05-PLAN]
tech_stack:
  added: []
  patterns: [in-process-sequential-queue, formdata-upload, uuid-track-ids, slug-generation, crash-recovery]
key_files:
  created:
    - src/lib/server/processors/processTrack.ts
    - src/lib/server/queue.ts
    - src/routes/api/upload/+server.ts
  modified:
    - src/hooks.server.ts
decisions:
  - id: in-process-queue
    decision: "Use track status field as queue state instead of separate job table"
    reason: "Simple in-process sequential queue with isProcessing flag avoids extra table; track status field already has pending/processing/ready/failed enum"
  - id: crash-recovery-strategy
    decision: "Reset stuck 'processing' tracks to 'pending' on startup, plus 5s safety interval"
    reason: "Handles mid-processing crashes without external monitoring; safety interval catches orphaned pending tracks"
metrics:
  duration: 5m06s
  completed: 2026-02-08
---

# Phase 2 Plan 2: Upload Endpoint and Processing Pipeline Summary

POST /music/api/upload endpoint with magic-byte validation, sequential in-process job queue using track status as queue state, and processTrack orchestrator chaining all 6 processing steps with crash recovery on boot.

## What Was Built

### Task 1: Processing orchestrator and job queue (e8fa3d8)
- **processTrack.ts**: Orchestrates validate -> transcode -> peaks -> metadata -> artwork -> DB update sequence
  - Updates status pending -> processing -> ready (or failed with errorMessage)
  - Cover art extraction wrapped in try/catch (failure does not block track processing)
  - Imports all 6 processor/validator modules from Plan 02-01
- **queue.ts**: In-process sequential queue with isProcessing flag guard
  - `enqueueProcessing()` triggers processNext() check
  - `startQueueProcessor()` resets stuck 'processing' tracks to 'pending', then starts processing
  - 5-second safety interval catches orphaned pending tracks
  - setTimeout(processNext, 100) after each job completes chains to next
- **hooks.server.ts**: Added startQueueProcessor() call after migrate() for automatic queue startup

### Task 2: Upload API endpoint (dc63d5c)
- **POST /music/api/upload**: Accepts multipart/form-data with 'audio' field
  - Magic byte validation rejects non-audio files with 400 status and error message
  - Missing file/body returns 400 with "Audio file required"
  - Generates UUID track IDs, derives slug from filename (lowercase, alphanumeric, hyphens)
  - Slug collision handling with numeric suffix retry loop (up to 10 attempts)
  - Saves originals to /data/audio/originals/<id><ext>, preserving original extension
  - Inserts DB record with status='pending', enqueues background processing
  - Returns 201 with { trackId, slug, status: 'pending' }
- Auto-fix: wrapped formData parsing in try/catch for requests without multipart body

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e8fa3d8 | Processing orchestrator, sequential queue, queue startup in hooks |
| 2 | dc63d5c | Upload API endpoint with validation and queue integration |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] formData() throws on missing multipart body**
- **Found during:** Task 2 verification (curl test without -F flag)
- **Issue:** `request.formData()` throws when request has no multipart/form-data content type, returning 500 instead of 400
- **Fix:** Wrapped formData() call in try/catch, returning 400 with "Audio file required" on parse failure
- **Files modified:** src/routes/api/upload/+server.ts
- **Commit:** dc63d5c

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles (svelte-check) | PASS (0 errors, 0 warnings) |
| processTrack imports all 6 modules | PASS |
| hooks.server.ts calls migrate() + startQueueProcessor() | PASS |
| Docker build succeeds | PASS |
| Container starts healthy | PASS |
| Queue processor started (log) | PASS |
| POST invalid file -> 400 "Unknown file type" | PASS |
| POST missing file -> 400 "Audio file required" | PASS |
| POST valid WAV -> 201 with trackId, slug, status | PASS |
| Track status pending -> processing -> ready | PASS |
| Transcoded MP3 at /data/audio/<id>.mp3 | PASS |
| Peaks JSON at /data/peaks/<id>.json | PASS |
| Original preserved at /data/audio/originals/<id>.wav | PASS |
| Slug derived from filename | PASS |
| Bitrate stored as 320000 | PASS |

## Performance

- **Duration:** 5m06s
- **Start:** 2026-02-08T01:54:56Z
- **End:** 2026-02-08T02:00:02Z
- **Tasks:** 2/2 completed
- **Files created:** 3
- **Files modified:** 1

## Next Phase Readiness

Phase 2 is complete. The full processing pipeline is operational:
- Upload endpoint accepts audio files
- Queue processes tracks sequentially with crash recovery
- All artifacts produced (MP3, peaks, metadata, art)
- Status tracked in database throughout

Phase 3 (Playback API) can proceed -- tracks are being stored with all data needed for playback (audioPath, peaksPath, duration, metadata).

## Self-Check: PASSED

- All 3 created files verified present (processTrack.ts, queue.ts, +server.ts)
- Modified file verified present (hooks.server.ts)
- Commit e8fa3d8 (Task 1) verified in git log
- Commit dc63d5c (Task 2) verified in git log
