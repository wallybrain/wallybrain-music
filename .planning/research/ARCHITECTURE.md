# Architecture Patterns

**Domain:** Self-hosted music streaming platform (SoundCloud-like)
**Project:** wallybrain-music
**Researched:** 2026-02-07

## Recommended Architecture

### System Overview

```
                        INTERNET
                           |
                     +-----v-----+
                     |   Caddy   | :443 (auto-HTTPS)
                     +-----+-----+
                           |
              +------------+------------+
              |                         |
     /music/* (public)         /music/admin/* (Authelia-gated)
              |                         |
              +------------+------------+
                           |
                     +-----v-----+
                     |  Node.js  | :8800 (internal only)
                     |   Server  |
                     +-----+-----+
                           |
         +---------+-------+-------+---------+
         |         |               |         |
    +----v---+ +---v----+   +-----v----+ +---v---+
    | SQLite | | Audio  |   | Waveform | | Cover |
    |   DB   | | Files  |   |  Peaks   | |  Art  |
    +--------+ +--------+   +----------+ +-------+
              /data/audio   /data/peaks   /data/art
```

### How It Integrates With Existing Infrastructure

The existing wallyblanchard.com stack runs Caddy + Authelia + code-server in Docker Compose. The music platform adds a new service to this stack:

1. **Caddy** gets new route rules for `/music` paths
2. **Authelia** gates admin routes (`/music/admin/*`) with existing 2FA
3. **Node.js server** runs as a new container (or host process) on port 8800
4. **Public pages** (`/music`, `/music/track/:slug`) bypass Authelia -- visitors browse freely

This is a path-based addition to the existing domain, not a new subdomain. Caddy's `handle_path` directive strips the prefix before proxying to the Node.js server.

### Component Boundaries

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **Caddy** | TLS termination, routing, auth gating, static file hints | Authelia, Node.js server | Caddy 2 (existing) |
| **Authelia** | Admin authentication (2FA) | Caddy (forward_auth) | Authelia (existing) |
| **Node.js API Server** | REST API, page rendering, upload handling, processing orchestration | SQLite, filesystem, audiowaveform, ffmpeg | Express or Fastify on Node 20 |
| **SQLite Database** | Track metadata, tags, play counts, processing status | Node.js server (via better-sqlite3) | SQLite 3 |
| **Audio Storage** | Raw uploads + processed streaming files | Node.js server (filesystem reads), Caddy (direct serve) | Local filesystem |
| **Waveform Peaks** | Pre-computed JSON peak data for wavesurfer.js | Node.js server (generation), Browser (fetch) | JSON files from audiowaveform |
| **Cover Art Storage** | Resized cover images per track | Node.js server (sharp processing), Browser (img tags) | Local filesystem |
| **Browser Client** | Waveform player, track listing, admin upload UI | Node.js API (fetch), peaks JSON (fetch), audio (streaming) | wavesurfer.js, vanilla JS or lightweight framework |

### Key Architectural Decision: Server-Rendered Pages + Client-Side Player

Use server-side rendered HTML (template engine like EJS or Handlebars) for page structure, with wavesurfer.js as the client-side interactive layer. No SPA framework needed -- this is a content site with one interactive widget (the player).

**Rationale:**
- Simpler build pipeline (no Webpack/Vite/bundler required)
- Better SEO for track pages
- Faster initial load
- The only client-side complexity is the waveform player, which wavesurfer.js handles as a standalone library
- Admin UI is low-traffic, can use the same approach with form submissions

## Data Flow

### Flow 1: Upload Pipeline (Admin)

This is the most architecturally significant flow. Uploads trigger a multi-step processing pipeline.

```
Admin Browser                    Node.js Server                    Filesystem
     |                               |                                |
     |  POST /api/tracks             |                                |
     |  (multipart: audio + art      |                                |
     |   + metadata form fields)     |                                |
     |------------------------------>|                                |
     |                               |                                |
     |                               |  1. Validate file types/sizes  |
     |                               |  2. Save raw upload            |
     |                               |  -------- write raw ---------->|
     |                               |     /data/audio/raw/{uuid}.ext |
     |                               |                                |
     |                               |  3. Insert DB record           |
     |                               |     status = "processing"      |
     |                               |                                |
     |  202 Accepted                 |                                |
     |  { trackId, status }          |                                |
     |<------------------------------|                                |
     |                               |                                |
     |                               |  4. ASYNC: Transcode to MP3    |
     |                               |     ffmpeg -> /data/audio/{id}.mp3
     |                               |                                |
     |                               |  5. ASYNC: Extract metadata    |
     |                               |     music-metadata -> duration,|
     |                               |     bitrate, codec info        |
     |                               |                                |
     |                               |  6. ASYNC: Generate peaks      |
     |                               |     audiowaveform ->           |
     |                               |     /data/peaks/{id}.json      |
     |                               |                                |
     |                               |  7. ASYNC: Process cover art   |
     |                               |     sharp -> resize to         |
     |                               |     /data/art/{id}-thumb.webp  |
     |                               |     /data/art/{id}-full.webp   |
     |                               |                                |
     |                               |  8. Update DB record           |
     |                               |     status = "ready"           |
     |                               |     duration, peaks_path, etc  |
     |                               |                                |
     |  (poll or SSE for status)     |                                |
     |------------------------------>|                                |
     |  { status: "ready" }          |                                |
     |<------------------------------|                                |
```

**Critical design choice:** Processing is async. The upload returns immediately with 202 Accepted, and processing happens in the background. For a single-user admin platform, a simple in-process async queue (no Redis/BullMQ needed) handles this fine. Use a lightweight approach:

```javascript
// Simple in-process queue -- sufficient for single-admin platform
async function processTrack(trackId, rawPath) {
  try {
    await transcodeToMp3(rawPath, streamPath);
    await extractMetadata(rawPath, trackId);
    await generatePeaks(streamPath, peaksPath);
    await processArt(artPath, trackId);
    await db.prepare('UPDATE tracks SET status = ? WHERE id = ?').run('ready', trackId);
  } catch (err) {
    await db.prepare('UPDATE tracks SET status = ? WHERE id = ?').run('error', trackId);
    logger.error(`Processing failed for track ${trackId}`, err);
  }
}

// Fire and forget after upload completes
processTrack(trackId, rawPath);
```

### Flow 2: Public Playback

```
Visitor Browser                  Caddy                    Node.js Server
     |                              |                          |
     |  GET /music                  |                          |
     |----------------------------->|  handle_path /music/*    |
     |                              |  reverse_proxy :8800     |
     |                              |------------------------->|
     |                              |                          |  Query DB: all tracks
     |                              |                          |  WHERE status = 'ready'
     |                              |  <HTML page>             |  ORDER BY created_at DESC
     |  <track listing page>        |<-------------------------|
     |<-----------------------------|                          |
     |                              |                          |
     |  Click track ->              |                          |
     |  GET /music/track/:slug      |                          |
     |----------------------------->|------------------------->|
     |                              |                          |  Query single track
     |                              |                          |  Increment play_count
     |  <track detail page>         |<-------------------------|
     |<-----------------------------|                          |
     |                              |                          |
     |  wavesurfer.js initializes:  |                          |
     |                              |                          |
     |  1. Fetch peaks JSON         |                          |
     |  GET /music/api/peaks/{id}   |                          |
     |----------------------------->|------------------------->|
     |  { data: [...] }             |<-------------------------|
     |<-----------------------------|                          |
     |                              |                          |
     |  2. Load audio (streaming)   |                          |
     |  GET /music/api/stream/{id}  |                          |
     |  Range: bytes=0-             |                          |
     |----------------------------->|------------------------->|
     |  206 Partial Content         |                          |  fs.createReadStream
     |  Content-Range: bytes 0-...  |                          |  with range headers
     |<-----------------------------|<-------------------------|
     |                              |                          |
     |  [User scrubs waveform]      |                          |
     |  Range: bytes=5242880-       |                          |
     |----------------------------->|  (same flow, new range)  |
```

**Key insight for large files (60-min sets):** wavesurfer.js v7 uses HTML5 audio element by default. When provided with pre-rendered peaks + duration, it renders the waveform immediately without decoding the full file. The audio streams via standard HTTP range requests. This means a 60-minute live set loads its waveform instantly and streams progressively -- no memory issues.

### Flow 3: Audio Streaming (Range Requests)

The Node.js server must handle HTTP range requests (206 Partial Content) for audio seeking. This is essential for scrubbing through long tracks.

```javascript
// Simplified range request handler
app.get('/api/stream/:id', (req, res) => {
  const filePath = getAudioPath(trackId);
  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const [start, end] = parseRange(range, stat.size);
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});
```

## Database Schema

SQLite via better-sqlite3. Single file, zero config, synchronous API, fast for read-heavy workloads.

```sql
CREATE TABLE tracks (
  id            TEXT PRIMARY KEY,        -- UUID
  slug          TEXT UNIQUE NOT NULL,    -- URL-friendly: "deep-space-ambient-set"
  title         TEXT NOT NULL,
  description   TEXT,                    -- markdown or plain text
  duration      REAL,                    -- seconds (populated after processing)
  bitrate       INTEGER,                -- kbps
  file_size     INTEGER,                -- bytes
  audio_path    TEXT NOT NULL,           -- relative: "audio/abc123.mp3"
  peaks_path    TEXT,                    -- relative: "peaks/abc123.json"
  art_path      TEXT,                    -- relative: "art/abc123-full.webp"
  art_thumb     TEXT,                    -- relative: "art/abc123-thumb.webp"
  category      TEXT DEFAULT 'track',   -- track | set | experiment | export
  status        TEXT DEFAULT 'processing', -- processing | ready | error
  play_count    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE tags (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT UNIQUE NOT NULL           -- lowercase, trimmed
);

CREATE TABLE track_tags (
  track_id  TEXT REFERENCES tracks(id) ON DELETE CASCADE,
  tag_id    INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (track_id, tag_id)
);

-- Indexes for common queries
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_category ON tracks(category);
CREATE INDEX idx_tracks_created ON tracks(created_at DESC);
CREATE INDEX idx_tracks_slug ON tracks(slug);
```

**Why SQLite, not PostgreSQL:**
- Single-user admin, low-write workload (uploads are infrequent)
- Read-heavy public access (track listings, metadata queries)
- No separate database container to manage
- better-sqlite3 is synchronous and fast -- no connection pool overhead
- File-based backup is trivial (copy one file)
- Already using SQLite elsewhere in the stack (Authelia, SQLite MCP server)

## Filesystem Layout

```
/data/wallybrain-music/
  audio/
    raw/                    # Original uploads (kept for re-processing)
      abc123.wav
      def456.flac
    abc123.mp3              # Transcoded streaming copies
    def456.mp3
  peaks/
    abc123.json             # Waveform peak data (audiowaveform output)
    def456.json
  art/
    abc123-full.webp        # Full-size cover art (800x800)
    abc123-thumb.webp       # Thumbnail (200x200)
    def456-full.webp
    def456-thumb.webp
  db/
    music.db                # SQLite database
    music.db-wal            # WAL file (if WAL mode enabled)
```

**Mount this as a Docker volume** or bind-mount to a host directory. Keep raw uploads -- they enable re-processing if you change transcoding settings or peak resolution later.

## Patterns to Follow

### Pattern 1: Processing Pipeline as Sequential Async Steps

**What:** Break upload processing into discrete steps that run sequentially after the upload response returns.

**When:** Every track upload triggers this pipeline.

**Why:** Each step has clear inputs/outputs. If a step fails, the track status reflects exactly where it broke. Steps can be re-run individually.

```javascript
const STEPS = [
  { name: 'transcode', fn: transcodeToMp3 },
  { name: 'metadata',  fn: extractMetadata },
  { name: 'peaks',     fn: generatePeaks },
  { name: 'art',       fn: processCoverArt },
];

async function processTrack(trackId, paths) {
  for (const step of STEPS) {
    try {
      await step.fn(trackId, paths);
      updateStatus(trackId, `${step.name}_done`);
    } catch (err) {
      updateStatus(trackId, `${step.name}_failed`);
      throw err;
    }
  }
  updateStatus(trackId, 'ready');
}
```

### Pattern 2: Slug-Based URLs with Collision Handling

**What:** Generate URL slugs from track titles for human-readable URLs (`/music/track/deep-space-ambient`).

**When:** Every track creation.

**Why:** Better UX and SEO than UUID-based URLs. Append a short suffix on collision.

### Pattern 3: Caddy Serves Static Assets Directly

**What:** Configure Caddy to serve audio files, peak JSON, and cover art directly from the filesystem, bypassing Node.js for static content.

**When:** Production deployment.

**Why:** Caddy handles range requests natively and efficiently. Node.js should only handle dynamic requests (API, page rendering). This is a significant performance optimization for audio streaming.

```
# Caddyfile addition
handle_path /music/static/* {
    root * /data/wallybrain-music
    file_server {
        precompressed gzip
    }
    header Cache-Control "public, max-age=31536000, immutable"
}

handle_path /music/* {
    reverse_proxy music-server:8800
}
```

**Alternative:** If Caddy-direct serving is too complex initially, the Node.js server can serve static files in v1 and optimize later. The architecture supports both paths.

### Pattern 4: Separate Admin and Public Route Groups

**What:** Admin routes go through Authelia forward_auth; public routes do not.

**When:** Caddy routing configuration.

**Why:** Visitors must not hit an auth wall. Admins must be authenticated for uploads/edits.

```
# Caddyfile structure
handle_path /music/admin/* {
    forward_auth authelia:9091 {
        uri /api/authz/forward-auth
        copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
    }
    reverse_proxy music-server:8800
}

handle_path /music/* {
    # No auth -- public access
    reverse_proxy music-server:8800
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Audio Decoding for Large Files

**What:** Letting wavesurfer.js decode the full audio file in the browser to generate waveforms.

**Why bad:** A 60-minute WAV file is ~600MB. Even a 60-minute MP3 at 320kbps is ~140MB. Browser Web Audio API will choke, freeze the tab, or crash. Memory consumption is extreme.

**Instead:** Pre-generate peaks server-side with audiowaveform. Pass peaks + duration to wavesurfer.js. The browser never decodes the full file.

### Anti-Pattern 2: Storing Audio in the Database

**What:** Putting audio binary data as BLOBs in SQLite.

**Why bad:** Bloats the database, makes backups slow, prevents Caddy from serving files directly, breaks range request patterns.

**Instead:** Store files on the filesystem. Store file paths in the database.

### Anti-Pattern 3: Synchronous Processing During Upload

**What:** Transcoding, peak generation, and art processing block the upload HTTP response.

**Why bad:** Transcoding a 60-minute file can take minutes. The upload request would time out. The admin gets no feedback.

**Instead:** Return 202 Accepted immediately. Process async. Provide status polling or SSE for progress.

### Anti-Pattern 4: SPA Architecture for a Content Site

**What:** Building a React/Vue SPA with client-side routing for what is fundamentally a content-display site.

**Why bad:** Adds build tooling complexity, bundle size, hydration overhead, and SEO challenges for zero benefit. The only interactive component is the audio player.

**Instead:** Server-rendered pages with wavesurfer.js as an embedded client-side component. Progressive enhancement.

### Anti-Pattern 5: No Raw File Retention

**What:** Deleting original uploads after transcoding to MP3.

**Why bad:** If you later want higher quality, different format, or different peak resolution, you must re-upload everything.

**Instead:** Keep raw uploads in a separate directory. Disk is cheap. Re-processing from originals is invaluable.

## Scalability Considerations

| Concern | At 50 tracks | At 500 tracks | At 5,000 tracks |
|---------|-------------|---------------|-----------------|
| **Database** | SQLite trivially handles this | SQLite still fine (single-digit ms queries) | SQLite can handle this; add pagination if listing slows |
| **Storage** | ~2GB (avg 5min tracks) | ~20GB | ~200GB -- may need disk expansion |
| **Waveform peaks** | ~50 JSON files, negligible disk | ~500 files, still negligible | Cache peak responses, consider CDN |
| **Page load** | Return all tracks | Paginate (20 per page) | Paginate + category/tag filtering essential |
| **Audio streaming** | Direct serve, no issues | Direct serve, no issues | Consider CDN or Cloudflare if bandwidth becomes a concern |
| **Processing** | In-process queue fine | In-process queue fine | Still fine -- uploads are infrequent, admin-only |

**Reality check:** This is a personal music portfolio. Reaching 500 tracks would take years of prolific output. The architecture is right-sized -- it scales to 5,000+ without redesign, but does not over-engineer for millions of users.

## Build Order (Dependencies Between Components)

This ordering reflects technical dependencies and suggests phase structure:

### Phase 1: Foundation (must exist first)

1. **Database schema + data layer** -- everything depends on track records
2. **File storage structure** -- audio/peaks/art directories
3. **Basic Node.js server** with health check endpoint

_Rationale: You cannot build upload, processing, or playback without the data foundation._

### Phase 2: Processing Pipeline (enables content)

4. **Upload endpoint** (multer for multipart) -- receives files, creates DB record
5. **Audio transcoding** (ffmpeg child process) -- produces streaming MP3
6. **Metadata extraction** (music-metadata) -- populates duration, bitrate
7. **Waveform generation** (audiowaveform CLI) -- produces peaks JSON
8. **Cover art processing** (sharp) -- resizes to standard dimensions

_Rationale: Without processed content, there is nothing to play. This is the "engine" of the platform._

### Phase 3: Public Playback (the core experience)

9. **Track listing page** -- server-rendered HTML, queries DB
10. **Track detail page** -- single track view with metadata
11. **Waveform player** (wavesurfer.js) -- loads peaks, streams audio
12. **Audio streaming endpoint** -- range request support for seeking

_Rationale: This is what visitors see. Depends on Phase 2 producing content to display._

### Phase 4: Admin Interface (content management)

13. **Admin upload UI** -- drag-and-drop, metadata form
14. **Admin track list** -- edit/delete/reorder tracks
15. **Processing status display** -- show pipeline progress

_Rationale: Could theoretically use CLI/API in Phase 2 for initial uploads. The admin UI makes ongoing management practical._

### Phase 5: Integration (goes live)

16. **Caddy routing** -- path-based routing for `/music`
17. **Authelia gating** -- admin routes behind 2FA
18. **Docker Compose additions** -- music server container
19. **Dark/moody styling** -- brand-appropriate CSS

_Rationale: Integration with existing infrastructure is the deployment step. Styling can be refined after functionality works._

### Phase 6: Polish (enhances experience)

20. **Play count tracking** -- increment on play start
21. **Tag/category filtering** -- browse by genre or type
22. **Persistent player** -- continue playing while navigating (optional)
23. **OG meta tags** -- social sharing with cover art

_Rationale: These enhance the experience but are not required for a working platform._

## External Dependencies

| Dependency | Type | Installation | Purpose |
|------------|------|-------------|---------|
| **ffmpeg** | System binary | `apt install ffmpeg` | Audio transcoding |
| **audiowaveform** | System binary | `sudo add-apt-repository ppa:chris-needham/ppa && sudo apt install audiowaveform` | Waveform peak generation |
| **better-sqlite3** | npm package | `npm install better-sqlite3` | SQLite driver |
| **music-metadata** | npm package | `npm install music-metadata` | Audio file metadata extraction |
| **sharp** | npm package | `npm install sharp` | Image resizing/conversion |
| **multer** | npm package | `npm install multer` | Multipart file upload parsing |
| **wavesurfer.js** | npm/CDN | `npm install wavesurfer.js` or CDN link | Client-side waveform player |

**Docker note:** If running in a container, ffmpeg and audiowaveform must be installed in the container image. Use a Node.js base image and add them:

```dockerfile
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y ffmpeg
# audiowaveform requires building from source or using a pre-built binary in Debian
# Alternative: use the audiowaveform Docker image as a build stage
```

## Sources

- [wavesurfer.js documentation](https://wavesurfer.xyz/docs/) -- HIGH confidence (official docs)
- [wavesurfer.js FAQ on large files](https://wavesurfer.xyz/faq/) -- HIGH confidence (official FAQ)
- [BBC audiowaveform GitHub](https://github.com/bbc/audiowaveform) -- HIGH confidence (official repo)
- [music-metadata npm](https://www.npmjs.com/package/music-metadata) -- HIGH confidence (official package)
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) -- HIGH confidence (official repo)
- [Caddy reverse_proxy docs](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) -- HIGH confidence (official docs)
- [HTTP 206 Partial Content in Node.js](https://www.codeproject.com/Articles/813480/HTTP-Partial-Content-In-Node-js) -- MEDIUM confidence (tutorial)
- [Funkwhale architecture docs](https://docs.funkwhale.audio/developer/architecture.html) -- HIGH confidence (official docs, reference only)
- [SoundCloud architecture evolution](https://medium.com/@stephen_sun/the-evolution-of-soundclouds-architecture-part-1-20a876e621a0) -- MEDIUM confidence (blog post)
- [Navidrome GitHub](https://github.com/navidrome/navidrome) -- HIGH confidence (official repo, reference only)
- [Express vs Fastify comparison](https://betterstack.com/community/guides/scaling-nodejs/fastify-express/) -- MEDIUM confidence (third-party comparison)
- [Multer + Sharp image processing](https://medium.com/codex/upload-and-image-compression-in-nodejs-with-multer-and-sharp-b691bf829b21) -- MEDIUM confidence (tutorial)
