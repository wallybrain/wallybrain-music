# Project Research Summary

**Project:** wallybrain-music
**Domain:** Self-hosted single-artist music streaming platform (SoundCloud-like portfolio)
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

This project is a personal music portfolio and streaming platform for electronic music. The research reveals a clear, battle-tested approach: SvelteKit for the full-stack framework (minimal JS, built-in API routes), SQLite for single-admin data storage, wavesurfer.js for waveform playback, and server-side audio processing during upload (not on playback). The architecture integrates cleanly with existing infrastructure (Caddy reverse proxy, Authelia 2FA) by adding path-based routing for `/music` routes.

The recommended approach avoids SPA complexity since only one component is interactive (the audio player). Server-rendered pages with wavesurfer.js embedded provide better SEO, faster initial loads, and simpler deployment. Critical architectural decisions include: pre-generating waveform peaks server-side (prevents browser crashes on 60-minute tracks), letting Caddy serve static audio files directly (not through Node.js), and building an async upload processing pipeline from day one (transcode, extract metadata, generate peaks, resize cover art).

Key risks center on large file handling. The most critical pitfall is client-side audio decoding for waveform generation, which crashes browsers on long tracks. Mitigation: use audiowaveform CLI to pre-compute peaks during upload. Second risk: missing HTTP range request support breaks scrubbing/seeking, especially on Safari. Mitigation: Caddy's file_server handles this natively. Third risk: VPS disk exhaustion from retaining uncompressed originals and lack of monitoring. Mitigation: decide early whether to keep originals, set upload size limits, and add disk usage monitoring.

## Key Findings

### Recommended Stack

SvelteKit provides the ideal balance for a single-admin music platform: full-stack in one process (frontend + API routes), 40-60% smaller bundle than React, and adapter-node deploys behind Caddy identically to the existing V1be Code Server setup. SQLite with Drizzle ORM eliminates a database container while providing type-safe queries. The stack prioritizes simplicity and performance over feature bloat.

**Core technologies:**
- **SvelteKit 2.x**: Full-stack framework with Svelte 5 runes — ships minimal JS, eliminates separate backend, single process deployment
- **SQLite + better-sqlite3**: Single-file database, zero config, perfect for single-admin workload — already used elsewhere on server (Authelia)
- **Drizzle ORM**: Type-safe queries, 7kb minified, zero runtime overhead — far lighter than Prisma
- **wavesurfer.js 7.x**: Waveform rendering and playback — industry standard, supports pre-computed peaks (critical for performance)
- **ffmpeg**: Audio transcoding and metadata extraction — already available via apt
- **audiowaveform (BBC)**: Server-side peak generation — prevents browser memory issues on long tracks
- **sharp**: Cover art resizing — 20x faster than Jimp, WebP/AVIF support
- **Tailwind CSS 4.x**: Utility-first styling — v4 is 5x faster builds, CSS-first config, no component library needed for custom dark aesthetic

**Critical version notes:**
- Node.js 20.x (already installed, LTS through April 2026)
- TypeScript 5.x (required for Drizzle type safety)
- audiowaveform via PPA: `sudo add-apt-repository ppa:chris-needham/ppa && sudo apt install audiowaveform`

**Why NOT alternatives:**
- Not Next.js: React overhead, Vercel-centric, overkill for single-user
- Not PostgreSQL: Requires container, overkill for single-admin writes
- Not Prisma: 8MB engine binary, slower cold starts vs Drizzle
- Not component library (Skeleton/DaisyUI): Imposes design system that conflicts with custom dark/moody brand

### Expected Features

Research identifies a clear MVP: waveform player, track listing, admin upload UI, and dark aesthetic. Phase 2 adds engagement features (persistent player, auto-queue). User accounts, comments, and monetization are explicitly anti-features for v1.

**Must have (table stakes):**
- Waveform audio player with scrubbing — THE core SoundCloud experience; plain `<audio>` tag is unacceptable
- Pre-generated waveform peaks — performance requirement for 60-minute tracks
- Cover art per track — every music platform shows artwork
- Track listing page with metadata — browsing experience
- Dark/moody responsive design — electronic music audience expectation
- Admin drag-and-drop upload — artist needs easy content addition
- Share links with Open Graph tags — social media sharing

**Should have (competitive):**
- Persistent bottom-bar player — biggest UX upgrade; continues playing during navigation
- Continuous queue/auto-play — turns visits into listening sessions
- Play count tracking — social proof without user accounts
- Content type categories (Finished/Experiments/Sets/Exports) — organizes growing library
- Genre/tag filtering — discoverability within catalog
- Track descriptions/liner notes — differentiates portfolio from streaming service
- Keyboard shortcuts — power user feature (space = play/pause)

**Defer (v2+):**
- User registration/accounts — only if community features are ever needed
- Comments system — requires accounts or third-party auth, spam risk
- Likes/favorites — social features without users are empty metrics
- Downloads — removes incentive to return; gate behind email capture if ever added
- Monetization/payments — use Bandcamp instead
- Playlists — categories sufficient for v1
- Video support — different technical domain entirely
- Mobile app — responsive web sufficient

### Architecture Approach

The architecture extends existing infrastructure rather than creating a parallel system. Caddy adds `/music` route rules, Authelia gates admin routes with existing 2FA, and a new Node.js server runs on port 8800 (internal only). Public pages bypass auth for visitor access. This path-based integration avoids subdomain complexity and reuses proven patterns from the V1be Code Server deployment.

**Major components:**
1. **Caddy (existing)** — TLS termination, path-based routing (`/music/*` public, `/music/admin/*` auth-gated), static file serving for audio/peaks/art (bypasses Node.js for performance)
2. **Authelia (existing)** — Admin authentication via forward_auth, 2FA already configured, no changes needed
3. **Node.js API server (new)** — SvelteKit on port 8800, handles page rendering, API routes, upload processing orchestration, database queries
4. **SQLite database (new)** — Tracks, tags, play counts, processing status — synchronous via better-sqlite3, file-based backup
5. **Filesystem storage (new)** — `/data/wallybrain-music/` with audio/peaks/art directories, Docker volume or bind mount for persistence
6. **Processing pipeline (new)** — Async multi-step (transcode → metadata → peaks → cover art) triggered by upload, status tracking in DB

**Data flow:**
- Upload: Admin submits multipart form → Node.js validates/saves raw → returns 202 Accepted → async processing pipeline runs → status updates to "ready"
- Playback: Visitor loads track page → wavesurfer.js fetches pre-computed peaks JSON → streams audio via HTTP range requests from Caddy file_server
- Seeking: Browser sends `Range: bytes=X-Y` header → Caddy returns 206 Partial Content → instant seek without full download

**Filesystem layout:**
```
/data/wallybrain-music/
  audio/
    raw/           # Original uploads (for re-processing)
    {id}.mp3       # Transcoded streaming versions
  peaks/
    {id}.json      # Waveform peak data
  art/
    {id}-full.webp
    {id}-thumb.webp
  db/
    music.db       # SQLite database
```

**Key architectural decisions:**
- Server-rendered pages + client-side player, not SPA (simpler, better SEO, faster load)
- Caddy serves audio/peaks/art directly, Node.js only handles dynamic requests (API/rendering)
- Processing is async (upload returns 202, processes in background with status polling)
- Keep raw uploads for re-processing if settings change later
- Slug-based URLs (`/music/track/deep-space-ambient`) for SEO and UX

### Critical Pitfalls

Top 5 pitfalls from research, prioritized by impact:

1. **Client-side waveform decoding crashes browsers** — A 60-minute MP3 decoded in-browser expands to ~1.2GB memory, crashing tabs or devices. Solution: Pre-generate peaks server-side with audiowaveform CLI during upload, pass to wavesurfer.js. Never decode large files client-side. (Phase 1: upload pipeline)

2. **Missing HTTP range request support breaks seeking** — Without 206 Partial Content responses, seeking fails or forces full file download. Safari refuses to play entirely. Solution: Use Caddy file_server to serve audio (handles ranges natively), not Node.js reverse proxy. (Phase 1: architecture)

3. **No upload processing pipeline** — Storing raw uploads without transcoding leads to inconsistent formats, no waveform data, missing duration metadata, extreme disk usage. Solution: Build multi-step pipeline from day one: validate → transcode to MP3 → extract metadata → generate peaks → resize cover art. (Phase 1: core feature)

4. **Node.js serving audio files** — Proxying audio through Node.js blocks the event loop with I/O, degrades API responsiveness under load, wastes resources. Solution: Caddy serves audio/peaks/art as static files, Node.js only handles API/rendering. (Phase 1: architecture)

5. **VPS disk exhaustion** — Audio files are large (100 tracks = 2-6GB depending on format choices). No monitoring leads to silent failures, database corruption, crashes. Solution: Set upload size limits, add disk usage monitoring (dashboard + Discord alerts at 80%/90%), decide whether to keep originals or discard after transcoding. (Phase 1: limits, Phase 3+: monitoring)

**Other notable pitfalls:**
- iOS/Safari autoplay restrictions (lazy AudioContext on user gesture)
- Mobile waveform performance (test on real devices early)
- VBR MP3 seek inaccuracy (transcode to CBR in pipeline)
- File upload security (validate magic bytes + ffprobe, never trust extension)
- Cover art sizing (generate thumbnails, don't serve 3000x3000px originals)

## Implications for Roadmap

Based on research, the dependency structure strongly suggests 3-4 core phases followed by enhancement phases. The processing pipeline must exist before playback features, and both must exist before admin UI refinement. Integration happens after functionality works.

### Phase 1: Foundation & Processing Pipeline
**Rationale:** Database schema and upload processing are prerequisites for everything else. You cannot build playback without processed content, and you cannot add features without a data layer. The upload pipeline is where the most critical pitfalls are prevented (client-side decoding, missing peaks, security validation).

**Delivers:**
- Database schema (tracks, tags, track_tags tables with indexes)
- File storage structure (`/data/wallybrain-music/audio/peaks/art`)
- Upload endpoint with multipart parsing (multer)
- Audio transcoding via ffmpeg (to MP3 320kbps CBR)
- Metadata extraction via music-metadata (duration, bitrate, codec)
- Waveform peak generation via audiowaveform CLI
- Cover art processing via sharp (resize to multiple sizes)
- Async processing pipeline with status tracking
- File validation (magic bytes + ffprobe) for security

**Addresses features:**
- Pre-generated waveform peaks (from FEATURES.md table stakes)
- Cover art per track (table stakes)
- Basic metadata (title, duration, artist)

**Avoids pitfalls:**
- Pitfall 1: Client-side decoding crashes (peaks generated server-side)
- Pitfall 3: No processing pipeline (built from day one)
- Pitfall 9: Upload security vulnerabilities (magic byte validation)
- Pitfall 13: Processing failure handling (status tracking)
- Pitfall 14: Cover art sizing (thumbnails generated on upload)

**Research flag:** Low — Processing pipelines are well-documented. ffmpeg, audiowaveform, sharp, and music-metadata all have clear documentation.

### Phase 2: Public Playback Experience
**Rationale:** This is what visitors see. Depends on Phase 1 producing processed content. The waveform player is the signature feature — without it, the platform is just a file server. This phase implements the core SoundCloud-like experience.

**Delivers:**
- Track listing page (server-rendered, queries SQLite)
- Track detail/permalink pages with metadata
- Waveform player component (wavesurfer.js integration)
- Audio streaming endpoint with HTTP range request support
- Dark/moody UI styling (Tailwind CSS, custom aesthetic)
- Responsive design (mobile-friendly layouts)
- Loading states and buffering indicators

**Addresses features:**
- Waveform audio player with scrubbing (THE core feature)
- Track listing page (table stakes)
- Dark/moody responsive design (brand identity)
- Share links (track permalinks)

**Avoids pitfalls:**
- Pitfall 1: Client-side decoding (uses Phase 1 peaks)
- Pitfall 2: Range request support (architecture decision here)
- Pitfall 4: Node.js serving audio (use Caddy file_server)
- Pitfall 5: iOS AudioContext autoplay (lazy creation on user gesture)
- Pitfall 6: Mobile waveform performance (test early on real devices)
- Pitfall 8: VBR seek inaccuracy (Phase 1 transcoded to CBR)

**Research flag:** Medium — wavesurfer.js has excellent docs, but mobile touch interaction and iOS autoplay behavior need real-device testing during development.

### Phase 3: Admin Interface
**Rationale:** Could theoretically use API/CLI for initial uploads, but a proper admin UI makes ongoing management practical. Depends on Phase 1 pipeline existing and Phase 2 proving the display layer works. Admin sees processing status and can edit after upload.

**Delivers:**
- Admin upload UI with drag-and-drop (behind Authelia)
- Metadata form (title, description, category, tags)
- Processing status display (pending/processing/ready/failed)
- Track listing with edit/delete actions
- Metadata editor (fix mistakes without re-uploading)

**Addresses features:**
- Admin drag-and-drop upload (table stakes for artist workflow)
- Admin metadata editor (differentiator, quality of life)
- Content type categories UI (finished/experiments/sets/exports)

**Avoids pitfalls:**
- Pitfall 13: Processing failures (status visible in admin UI)

**Research flag:** Low — Standard form handling and file upload UI. No novel patterns.

### Phase 4: Infrastructure Integration
**Rationale:** Integration with existing Caddy/Authelia stack is the deployment step. Kept separate from functionality so development can happen locally without infrastructure concerns. This phase makes it live on wallyblanchard.com.

**Delivers:**
- Caddy routing rules (handle_path for `/music/*`)
- Authelia forward_auth for `/music/admin/*`
- Docker Compose configuration (new service in existing stack)
- Static file serving via Caddy file_server (audio/peaks/art)
- Health checks and restart policies
- Volume mounts for persistent data

**Addresses features:**
- None directly, but required for production deployment

**Avoids pitfalls:**
- Pitfall 2: Range requests (Caddy file_server native support)
- Pitfall 4: Node.js serving audio (architecture clarified here)
- Pitfall 10: Caddy buffering (file_server avoids this)

**Research flag:** Low — Caddy and Docker Compose are well-documented. Pattern matches existing V1be Code Server deployment.

### Phase 5: Engagement Features
**Rationale:** Enhances the experience after core functionality works. These features increase time-on-site and return visits but are not required for a working platform. Persistent player requires careful state management.

**Delivers:**
- Play count tracking (increment on play start, debounced)
- Tag/category filtering on listing page
- Keyboard shortcuts (space, arrows)
- Open Graph meta tags for social sharing
- Hover time preview on waveform
- Sort by play count/recency

**Addresses features:**
- Play count tracking (differentiator, social proof)
- Genre/tag filtering (discoverability)
- Keyboard shortcuts (polish)
- Open Graph tags (social sharing)

**Research flag:** Low — Standard web features with established patterns.

### Phase 6: Persistent Player (Optional)
**Rationale:** The biggest UX upgrade but requires SPA-like state management. If the site uses server-rendered pages (recommended), this either requires AJAX page transitions or embedding the player in an iframe/web component that persists across navigation. Significant complexity increase for a feature that can be deferred.

**Delivers:**
- Bottom-bar player that persists across page navigation
- Client-side routing or AJAX page loading
- Continuous queue with auto-play next

**Addresses features:**
- Persistent bottom-bar player (THE differentiator for SoundCloud-like UX)
- Continuous queue/auto-play (engagement multiplier)

**Research flag:** High — This pattern requires research into SPA-in-server-rendered architecture or web component embedding. Multiple implementation approaches exist (Turbo Frames, HTMX, SvelteKit load functions, iframe embedding) with trade-offs. Recommend `/gsd:research-phase` if this phase is prioritized.

### Phase Ordering Rationale

- **Sequential dependency:** Playback (Phase 2) cannot exist without processed content (Phase 1). Admin UI (Phase 3) depends on the pipeline (Phase 1) and benefits from seeing the display layer (Phase 2) work first. Integration (Phase 4) deploys working functionality.

- **Risk mitigation:** Most critical pitfalls cluster in Phase 1 (upload pipeline and architecture). Getting these right early prevents rewrites later. Phase 2 addresses playback pitfalls while functionality is still flexible.

- **Value delivery:** Phases 1-2 deliver a working public-facing music player. Phase 3 adds admin convenience. Phase 4 makes it live. Phase 5+ adds polish.

- **Persistent player deferred:** Phase 6 is architecturally complex (SPA-like state management conflicts with server-rendered recommendation). Can be added later if the simpler multi-page approach proves insufficient. Most music portfolio sites skip this entirely; SoundCloud is the exception, not the rule.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 6 (Persistent Player):** Complex state management in server-rendered context. Multiple approaches (SvelteKit load functions, HTMX, Turbo, web components) with unclear trade-offs. If prioritized, run `/gsd:research-phase` to evaluate options.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Processing Pipeline):** Well-documented. ffmpeg, audiowaveform, sharp, multer, better-sqlite3 all have clear guides.
- **Phase 2 (Playback):** wavesurfer.js has excellent docs. HTTP range requests are standard. Some iOS testing needed but patterns are established.
- **Phase 3 (Admin UI):** Standard CRUD forms and file upload. No novel patterns.
- **Phase 4 (Integration):** Caddy and Docker Compose are well-documented. Matches existing infrastructure.
- **Phase 5 (Engagement):** All standard web features with established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified on npm with recent releases. Versions confirmed for SvelteKit (2.49.x), wavesurfer.js (7.11-7.12), Drizzle (0.45.1), better-sqlite3 (12.6.2), Tailwind (4.1.18). Official docs available for all core tech. |
| Features | HIGH | Comparison against SoundCloud, Bandcamp, Navidrome, and Funkwhale clarified table stakes vs differentiators. Anti-features list prevents scope creep. MVP recommendation aligns with single-admin use case. |
| Architecture | HIGH | Patterns match proven approaches (SoundCloud architecture blog, Funkwhale architecture docs, Node.js streaming guides, BBC audiowaveform usage). Integration with existing Caddy/Authelia follows V1be Code Server precedent. |
| Pitfalls | HIGH | All critical pitfalls documented in browser bug trackers (Chromium, Firefox), library issue trackers (wavesurfer.js, waveform-data.js), and official docs (MDN, WebKit blog). Phase mappings show when each pitfall must be addressed. |

**Overall confidence:** HIGH

All research is grounded in official documentation, verified package versions, and documented patterns from existing production systems. The stack choices are conservative (proven tools, not experimental). The architecture extends existing infrastructure rather than introducing new paradigms. Pitfalls are well-documented in authoritative sources (browser vendors, library maintainers, OWASP).

### Gaps to Address

**Persistent player implementation trade-offs:** Research identifies that a persistent bottom-bar player (Phase 6) conflicts with the server-rendered architecture recommendation. Three approaches exist (SvelteKit SPA mode with prerendering, HTMX with server-driven state, web component embedding), each with different complexity/performance/SEO trade-offs. If this feature is prioritized early, run targeted research on implementation approaches before starting development.

**Mobile device testing:** While iOS autoplay restrictions are well-documented, actual behavior of wavesurfer.js touch interactions varies by device and OS version. Real-device testing should happen during Phase 2 (playback) rather than relying solely on documentation or emulation.

**Disk space monitoring strategy:** Research flags disk exhaustion as a risk but does not prescribe a specific monitoring tool. During Phase 1 planning, decide: custom monitoring via cron + Discord webhook (matches existing stack patterns), or install a monitoring stack (Prometheus, Netdata). Custom approach recommended for consistency with existing infrastructure.

**audiowaveform installation in Docker:** Research notes audiowaveform requires a PPA on Ubuntu, which complicates Docker image builds. During Phase 1, evaluate: build from source in Dockerfile (adds build time), use pre-built binary (find trusted source), or use audiowaveform's official Docker image as a build stage. Building from source is most reliable but slowest.

**Cover art fallback handling:** Research assumes all tracks have cover art, but implementation should support tracks without art (common for quick uploads or experiments). Decide during Phase 1: use a default placeholder image, generate abstract art from track metadata (title/genre color), or display a styled empty state.

## Sources

### Primary (HIGH confidence)
- [wavesurfer.js official docs](https://wavesurfer.xyz/docs/) — Waveform library API, pre-computed peaks integration
- [wavesurfer.js FAQ](https://wavesurfer.xyz/faq/) — Large file handling, client-side decoding warnings
- [BBC audiowaveform GitHub](https://github.com/bbc/audiowaveform) — Server-side peak generation tool
- [SvelteKit official docs](https://svelte.dev/docs/kit) — adapter-node deployment, configuration
- [Drizzle ORM docs](https://orm.drizzle.team/) — SQLite integration, schema definition, migrations
- [Caddy file_server docs](https://caddyserver.com/docs/caddyfile/directives/file_server) — Static file serving, range requests
- [Caddy reverse_proxy docs](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) — Subpath routing, flush intervals
- [MDN: Autoplay guide for media and Web Audio APIs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) — iOS/Safari restrictions
- [MDN: Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — AudioContext state management
- [OWASP: File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — Upload security validation
- npm registry for all package version verification (wavesurfer.js 7.11-7.12, better-sqlite3 12.6.2, drizzle-orm 0.45.1, sharp 0.34.5, music-metadata 11.10.6, Tailwind CSS 4.1.18, SvelteKit 2.49.x)

### Secondary (MEDIUM confidence)
- [SoundCloud: Waveforms article](https://developers.soundcloud.com/blog/waveforms-let-s-talk-about-them/) — Processing pipeline approach
- [SoundCloud architecture evolution blog](https://medium.com/@stephen_sun/the-evolution-of-soundclouds-architecture-part-1-20a876e621a0) — Async processing patterns
- [Funkwhale architecture docs](https://docs.funkwhale.audio/developer/architecture.html) — Federation architecture (reference only, not applicable)
- [Navidrome GitHub](https://github.com/navidrome/navidrome) — Transcoding approach (reference only)
- [How to serve media on Node.js (gist)](https://gist.github.com/padenot/1324734) — Range request implementation example
- [WebKit: New video policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/) — iOS Safari behavior context
- [Multer + Sharp tutorial](https://medium.com/codex/upload-and-image-compression-in-nodejs-with-multer-and-sharp-b691bf829b21) — Image processing pipeline
- [Fastify vs Express comparison](https://betterstack.com/community/guides/scaling-nodejs/fastify-express/) — Framework benchmarks (informed decision NOT to use separate backend)
- [SQLite vs PostgreSQL comparison](https://www.datacamp.com/blog/sqlite-vs-postgresql-detailed-comparison) — Database selection rationale
- [Caddy community forum: Audio streaming issues](https://caddy.community/t/audio-streaming-issues-with-caddy-reverse-proxy/20559) — Buffering problem discussions
- [SoundCloud Features for Artists (2026)](https://roboticsandautomationnews.com/2026/01/15/the-new-soundcloud-features-every-artist-should-start-using/98173/) — Feature landscape
- [SoundCloud Reviews on G2](https://www.g2.com/products/soundcloud/reviews) — User expectations
- [Bandcamp for Artists](https://bandcamp.com/artists) — Feature comparison

### Tertiary (LOW confidence)
- [Browsee blog: Serving static files slowing down Express](https://browsee.io/blog/serving-static-files-could-be-slowing-down-nodejs-express-server/) — Node.js performance advice
- [Node.js performance article](https://medium.com/@oresoftware/node-js-performance-the-most-common-piece-of-missing-middleware-for-servers-in-production-54fd23f00bf7) — Missing middleware patterns
- [Joe Karlsson: Self-Hosted Music Still Sucks in 2025](https://www.joekarlsson.com/2025/06/self-hosted-music-still-sucks-in-2025/) — Self-hosting challenges
- Various browser bug trackers (Chromium #447580, Mozilla #1066036, wavesurfer.js issues #1075, #22, #3336, waveform-data.js #32) — Specific bug reports confirming pitfalls

### Browser Bug Trackers (HIGH confidence for pitfalls)
- [Chromium bug #447580](https://bugs.chromium.org/p/chromium/issues/detail?id=447580) — decodeAudioData memory issues
- [Mozilla bug #1066036](https://bugzilla.mozilla.org/show_bug.cgi?id=1066036) — OOM crash in decodeAudioData
- [wavesurfer.js #1075](https://github.com/katspaugh/wavesurfer.js/issues/1075) — Peaks from large files
- [wavesurfer.js #22](https://github.com/katspaugh/wavesurfer.js/issues/22) — Mobile browser performance
- [wavesurfer.js #3336](https://github.com/katspaugh/wavesurfer.js/issues/3336) — Mobile Safari event propagation
- [bbc/waveform-data.js #32](https://github.com/bbc/waveform-data.js/issues/32) — Chrome crashes with large files

---
*Research completed: 2026-02-07*
*Ready for roadmap: yes*
