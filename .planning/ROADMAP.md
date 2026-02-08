# Roadmap: wallybrain-music

## Overview

This roadmap delivers a self-hosted music platform at wallyblanchard.com/music in 7 phases. The build order follows content flow: foundation and processing pipeline first (so content can exist), then the public playback and display experience (so visitors can hear it), then admin tools (so the artist can manage it efficiently), then engagement features and the persistent player (so the experience deepens over time). Every phase delivers a coherent, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - SvelteKit project scaffold, SQLite database, Docker container, filesystem layout, Caddy routing (2026-02-08)
- [x] **Phase 2: Processing Pipeline** - Upload endpoint and async processing: transcode, peak generation, metadata extraction, cover art resize (2026-02-08)
- [x] **Phase 3: Waveform Player** - wavesurfer.js integration with server-side peaks, play/pause, scrub, volume, time display, audio streaming (2026-02-08)
- [x] **Phase 4: Track Pages** - Track listing, detail pages, cover art, permalinks, dark/moody aesthetic, responsive layout (2026-02-08)
- [ ] **Phase 5: Admin Interface** - Drag-and-drop upload UI, metadata editor, processing status display, Authelia 2FA protection
- [ ] **Phase 6: Discovery and Engagement** - Content type and tag filtering, play count tracking, Open Graph meta tags
- [ ] **Phase 7: Persistent Player and Queue** - Bottom-bar player that persists across navigation, continuous auto-play queue

## Phase Details

### Phase 1: Foundation
**Goal**: A working SvelteKit application runs in Docker, connects to SQLite, and is reachable at wallyblanchard.com/music via Caddy
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Visiting wallyblanchard.com/music returns a page served by the SvelteKit application through Caddy reverse proxy
  2. The SQLite database exists with the tracks/tags schema and can be queried by the application
  3. The filesystem storage directories (audio, peaks, art) exist and are writable by the application
  4. The application runs in a Docker container that restarts automatically and reports healthy via health check
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md -- SvelteKit scaffold with Tailwind CSS, Drizzle ORM, SQLite schema, Docker container
- [x] 01-02-PLAN.md -- Caddy routing, shared Docker network, end-to-end verification at wallyblanchard.com/music

### Phase 2: Processing Pipeline
**Goal**: Uploaded audio files are automatically transcoded, analyzed, and prepared for playback
**Depends on**: Phase 1
**Requirements**: INFRA-03
**Success Criteria** (what must be TRUE):
  1. An audio file submitted to the upload endpoint produces a transcoded MP3 (320kbps CBR), a peaks JSON file, extracted metadata (duration, bitrate), and resized cover art
  2. Processing runs asynchronously -- the upload returns immediately and the track status progresses through pending/processing/ready/failed
  3. Invalid or corrupt files are rejected with clear error messages (magic byte validation, ffprobe check)
  4. Processing results are stored in the correct filesystem directories and recorded in the database
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md -- Docker infrastructure (ffmpeg, audiowaveform), npm packages, schema update, processing functions and validators
- [x] 02-02-PLAN.md -- Upload API endpoint, processing orchestrator, job queue, queue startup on boot

### Phase 3: Waveform Player
**Goal**: Visitors can play audio tracks with an interactive waveform visualization that loads instantly
**Depends on**: Phase 2
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-06, PLAY-07, INFRA-04, UI-03
**Success Criteria** (what must be TRUE):
  1. Visitor can click play on a track and see a waveform animate as the audio plays, then pause it
  2. Visitor can click or drag anywhere on the waveform to seek to that position, and audio resumes from there
  3. Waveform renders immediately from pre-generated peak data without any client-side audio decoding
  4. Visitor can see current playback time and total duration updating in real time
  5. Visitor can adjust volume with a control, and audio streaming supports seeking via HTTP range requests (including Safari)
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md -- Peaks normalization endpoint and audio streaming endpoint with HTTP range request support
- [x] 03-02-PLAN.md -- WaveformPlayer Svelte component with wavesurfer.js, wired into main page

### Phase 4: Track Pages
**Goal**: Visitors can browse and discover tracks through a visually immersive dark-themed interface
**Depends on**: Phase 3
**Requirements**: DISP-01, DISP-02, DISP-03, SHARE-01, UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. Visitor can browse a track listing page that shows all published tracks with cover art, title, duration, and play count
  2. Visitor can click a track to view its detail page with description, liner notes, and the waveform player
  3. Each track has a unique permalink URL (/music/track/slug) that can be bookmarked and shared
  4. The entire interface uses a dark/moody aesthetic appropriate for electronic music
  5. All pages render correctly and are usable on mobile, tablet, and desktop screen sizes
**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md -- Cover art endpoint, CoverArt/TrackCard components, listing page rewrite, error page
- [x] 04-02-PLAN.md -- Track detail page with slug permalinks, dark theme global styles, responsive layout

### Phase 5: Admin Interface
**Goal**: The artist can upload and manage tracks through a protected web interface
**Depends on**: Phase 2, Phase 4
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Admin can drag and drop audio files onto an upload area and see them begin processing
  2. Admin can set and edit track metadata (title, description, cover art, tags, category) before and after upload
  3. Admin can see real-time processing status for each track (pending, processing, ready, failed)
  4. The admin interface is only accessible after authenticating through Authelia 2FA -- unauthenticated visitors cannot reach it
**Plans:** 2 plans

Plans:
- [ ] 05-01-PLAN.md -- Admin layout, track list page, drag-and-drop upload with status polling, status API endpoint
- [ ] 05-02-PLAN.md -- Track metadata edit page (title, slug, description, category, tags, cover art) and Caddy forward_auth protection

### Phase 6: Discovery and Engagement
**Goal**: Visitors can filter tracks by type and tags, tracks show social proof via play counts, and shared links render rich previews
**Depends on**: Phase 4
**Requirements**: DISP-04, DISP-05, DISP-06, SHARE-02
**Success Criteria** (what must be TRUE):
  1. Visitor can filter the track listing by content type (finished, experiment, set, export) and see only matching tracks
  2. Visitor can filter the track listing by genre tags (ambient, techno, modular, etc.) and combine with type filters
  3. Track play counts increment when a track is played (debounced, anonymous) and display on both listing and detail pages
  4. Sharing a track URL on social platforms (Discord, Twitter, etc.) shows a rich preview with title, description, and cover art via Open Graph tags
**Plans**: TBD

Plans:
- [ ] 06-01: Content type and tag filtering UI with query parameter state
- [ ] 06-02: Play count tracking API and Open Graph meta tags

### Phase 7: Persistent Player and Queue
**Goal**: Audio playback continues uninterrupted as visitors navigate between pages, with automatic progression through tracks
**Depends on**: Phase 3, Phase 4
**Requirements**: PLAY-04, PLAY-05
**Success Criteria** (what must be TRUE):
  1. Visitor starts playing a track, navigates to a different page, and the audio continues playing in a persistent bottom bar without interruption
  2. When the current track ends, the next track in the queue automatically begins playing
  3. The persistent player shows the current track info (title, cover art, waveform progress) and provides play/pause, skip, and volume controls
**Plans**: TBD

Plans:
- [ ] 07-01: Persistent bottom-bar player with SvelteKit client-side navigation
- [ ] 07-02: Continuous queue with auto-play next track

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-02-08 |
| 2. Processing Pipeline | 2/2 | Complete | 2026-02-08 |
| 3. Waveform Player | 2/2 | Complete | 2026-02-08 |
| 4. Track Pages | 2/2 | Complete | 2026-02-08 |
| 5. Admin Interface | 0/2 | Not started | - |
| 6. Discovery and Engagement | 0/2 | Not started | - |
| 7. Persistent Player and Queue | 0/2 | Not started | - |
