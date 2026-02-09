---
phase: 02-processing-pipeline
plan: 01
subsystem: audio-processing
tags: [ffmpeg, audiowaveform, sharp, music-metadata, file-type, docker, processing]
dependency_graph:
  requires: [sveltekit-app, docker-container]
  provides: [ffmpeg-runtime, audiowaveform-runtime, magic-byte-validation, ffprobe-validation, mp3-transcoding, peaks-generation, metadata-extraction, artwork-processing]
  affects: [02-02-PLAN]
tech_stack:
  added: [music-metadata@11.11.2, sharp@0.34.5, file-type@21.3.0, static-ffmpeg@7.1.1, audiowaveform@1.10.1]
  patterns: [spawn-child-process, multi-stage-docker-binary-copy, pure-function-processors]
key_files:
  created:
    - src/lib/server/validators/magicBytes.ts
    - src/lib/server/validators/ffprobe.ts
    - src/lib/server/processors/transcode.ts
    - src/lib/server/processors/peaks.ts
    - src/lib/server/processors/metadata.ts
    - src/lib/server/processors/artwork.ts
    - drizzle/0001_flimsy_pepper_potts.sql
  modified:
    - Dockerfile
    - package.json
    - package-lock.json
    - src/lib/server/db/schema.ts
decisions:
  - id: static-ffmpeg-version
    decision: "Use mwader/static-ffmpeg:7.1.1 (not 8.0.1 from plan)"
    reason: "7.1.1 is the latest available tag; 8.0.1 does not exist yet"
  - id: ca-certificates-for-curl
    decision: "Add ca-certificates package to Dockerfile apt-get install"
    reason: "node:20-bookworm-slim lacks CA certs; curl fails to download audiowaveform .deb without them"
metrics:
  duration: 3m41s
  completed: 2026-02-08
---

# Phase 2 Plan 1: Audio Processing Infrastructure Summary

Docker runtime with ffmpeg 7.1.1, audiowaveform 1.10.1, and 6 pure-function processing modules (2 validators, 4 processors) using spawn for all child processes.

## What Was Built

### Task 1: Docker build with ffmpeg, audiowaveform, and npm packages (738f462)
- Multi-stage Dockerfile with mwader/static-ffmpeg:7.1.1 stage for static ffmpeg/ffprobe binaries
- Audiowaveform 1.10.1 installed via .deb package with all Debian 12 runtime dependencies
- Added music-metadata, sharp, and file-type npm packages to dependencies
- Schema updated with originalFilename and errorMessage columns on tracks table
- Drizzle migration generated: ALTER TABLE tracks ADD original_filename text; ALTER TABLE tracks ADD error_message text
- Full Docker image builds and all three binaries verified: ffmpeg 7.1.1, ffprobe 7.1.1, audiowaveform 1.10.1

### Task 2: Processing functions and validators (3b03919)
- **magicBytes.ts**: Validates audio buffers against 6 supported MIME types (mpeg, flac, wav, ogg, aac, x-wav) using file-type library
- **ffprobe.ts**: Deep validation via ffprobe spawn, extracts duration and bitrate from format metadata
- **transcode.ts**: Transcodes to MP3 320kbps CBR with ID3v2 tag preservation via ffmpeg spawn
- **peaks.ts**: Generates waveform peaks JSON (20 pixels/sec, 8-bit) via audiowaveform spawn
- **metadata.ts**: Extracts title, artist, album, and cover art (via selectCover) using music-metadata parseFile
- **artwork.ts**: Resizes cover art to 500x500 JPEG at 85% quality using sharp
- All child processes use spawn with argument arrays (no shell injection risk)
- TypeScript compiles cleanly with zero errors

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 738f462 | Docker build + npm packages + schema migration |
| 2 | 3b03919 | 6 audio processing/validation modules |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ca-certificates missing in Docker slim image**
- **Found during:** Task 1 verification (docker build)
- **Issue:** curl failed with exit code 77 (SSL certificate error) when downloading audiowaveform .deb because node:20-bookworm-slim lacks ca-certificates package
- **Fix:** Added ca-certificates to the apt-get install list in Dockerfile
- **Files modified:** Dockerfile
- **Commit:** 738f462

**2. [Rule 3 - Blocking] static-ffmpeg:8.0.1 tag does not exist**
- **Found during:** Task 1 (Dockerfile creation)
- **Issue:** Plan specified mwader/static-ffmpeg:8.0.1 but that tag is not yet published
- **Fix:** Used mwader/static-ffmpeg:7.1.1 (latest available, ffmpeg 7.1.1)
- **Files modified:** Dockerfile
- **Commit:** 738f462

## Verification Results

| Check | Result |
|-------|--------|
| Docker builder stage builds | PASS |
| Full Docker image builds | PASS |
| ffmpeg -version in container | PASS (7.1.1) |
| ffprobe -version in container | PASS (7.1.1) |
| audiowaveform --version in container | PASS (1.10.1) |
| music-metadata, sharp, file-type in package.json | PASS |
| originalFilename + errorMessage in schema | PASS |
| Drizzle migration file exists | PASS |
| All 6 modules export correct functions | PASS |
| No exec usage (all spawn) | PASS |
| TypeScript compiles (0 errors, 0 warnings) | PASS |

## Performance

- **Duration:** 3m41s
- **Start:** 2026-02-08T01:47:31Z
- **End:** 2026-02-08T01:51:12Z
- **Tasks:** 2/2 completed
- **Files created:** 7
- **Files modified:** 4

## Next Phase Readiness

Plan 02-02 can proceed. All processing functions are independent, testable modules ready to be composed by the upload/processing orchestrator. The Docker image provides all required binary tools.

## Self-Check: PASSED

- All 7 created files verified present
- Commit 738f462 (Task 1) verified in git log
- Commit 3b03919 (Task 2) verified in git log
