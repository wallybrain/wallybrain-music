# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Visitors can discover and listen to wallybrain's music through an immersive, visually engaging waveform player
**Current focus:** Phase 4 in progress (Track Pages) -- Plan 1 complete, Plan 2 next

## Current Position

Phase: 4 of 7 (Track Pages)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-08 -- Completed 04-01-PLAN.md (Cover art endpoint, components, listing page rewrite)

Progress: [███████░░░] ~50%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: ~7m
- Total execution time: 1.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 2/2 | ~30m | ~15m |
| 2 - Processing Pipeline | 2/2 | ~9m | ~4.5m |
| 3 - Waveform Player | 2/2 | ~10m | ~5m |
| 4 - Track Pages | 1/2 | ~3m | ~3m |

**Recent Trend:**
- Last 5 plans: 02-02 (5m), 03-01 (6m), 03-02 (4m), 04-01 (3m)
- Trend: Consistently fast execution with clean plan specifications

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 7-phase structure derived from 27 requirements; persistent player deferred to Phase 7 due to SPA complexity
- [Roadmap]: Processing pipeline (Phase 2) before playback (Phase 3) -- cannot play what hasn't been processed
- [Research]: SvelteKit + SQLite + wavesurfer.js + ffmpeg + audiowaveform stack confirmed
- [01-01]: Use Node.js fetch() for Docker health checks (wget unavailable in node:20-bookworm-slim)
- [01-01]: Run Drizzle migrations in hooks.server.ts on app startup for automatic schema management
- [01-01]: Manual SvelteKit scaffold (sv create CLI requires interactive input)
- [01-01]: Bind mount volumes for simpler backup (not named Docker volumes)
- [01-02]: Named matcher `@music path /music /music/*` for Caddy routing (handle_path strips prefix SvelteKit needs; forward_auth overrides handle blocks unless isolated)
- [01-02]: Let SvelteKit handle trailing-slash redirect (Caddy redir syntax ambiguous inside handle blocks)
- [01-02]: docker restart required over caddy reload for bind-mounted config changes
- [02-01]: Use mwader/static-ffmpeg:7.1.1 (8.0.1 not yet published)
- [02-01]: Add ca-certificates to Docker runtime for HTTPS downloads
- [02-02]: In-process sequential queue using track status field as queue state (no separate job table)
- [02-02]: Crash recovery: reset stuck 'processing' tracks to 'pending' on startup, plus 5s safety interval
- [03-01]: Use UUID track ID (not slug) for API data endpoints; slug for public pages in Phase 4
- [03-01]: Server-side peak normalization (divide by 127) instead of client-side normalize:true
- [03-02]: Dynamic import of wavesurfer.js inside onMount to avoid SSR errors
- [03-02]: Added loadError state for graceful degradation when peaks fetch fails
- [04-01]: Removed WaveformPlayer from listing page; card-based layout with TrackCard component instead
- [04-01]: Cover art endpoint uses immutable cache headers (art tied to UUID; re-processing creates new UUID)

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: audiowaveform installation in Docker needs evaluation during Phase 2 planning (build from source vs pre-built binary) -- RESOLVED: .deb package from GitHub releases works on bookworm
- [Research]: Persistent player (Phase 7) may need architectural prep in Phase 1 SvelteKit config -- evaluate during Phase 1 planning

## Session Continuity

Last session: 2026-02-08
Stopped at: Phase 4 Plan 1 complete, Plan 2 (track detail page with slug permalinks) next
Resume file: .planning/phases/04-track-pages/04-02-PLAN.md
