# Phase 2: Processing Pipeline - Research

**Researched:** 2026-02-08
**Domain:** Audio file processing, transcoding, waveform generation, metadata extraction
**Confidence:** MEDIUM-HIGH

## Summary

Audio processing pipelines in Node.js combine multiple specialized tools for transcoding (ffmpeg), waveform generation (audiowaveform), metadata extraction (music-metadata), and image processing (sharp). The standard pattern uses child_process.spawn (NOT exec) for CPU-intensive operations, SQLite-backed job queues for async processing, and server-only modules in SvelteKit to prevent accidental client-side exposure.

**Key architectural decisions:** Install ffmpeg and audiowaveform via multi-stage Docker builds (copy static binaries from mwader/static-ffmpeg, install audiowaveform from Debian package). Use better-sqlite3 with WAL mode for the job queue. Use music-metadata for cover art extraction (not ffmpeg) to avoid unnecessary re-encoding. Use file-type for magic byte validation before processing.

**Primary recommendation:** Use a simple SQLite-backed queue (node-persistent-queue or build minimal custom solution) rather than Redis/BullMQ for single-container deployment. Process audio files sequentially to avoid resource contention, with status tracking in database. ALWAYS use spawn() not exec() to prevent shell injection vulnerabilities.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | Latest | SQLite driver | 4-5x faster than node-sqlite3, synchronous API simpler for queue operations |
| drizzle-orm | Latest | ORM with better-sqlite3 | Already in Phase 1, native better-sqlite3 support |
| music-metadata | Latest | Audio metadata + cover art extraction | Supports all major formats (MP3, FLAC, WAV, etc), extracts ID3/Vorbis/APE tags |
| sharp | Latest | Image resizing | Fastest Node.js image processor (4-5x faster than ImageMagick), uses libvips |
| file-type | Latest | Magic byte file validation | Industry standard for binary signature detection |
| audiowaveform | 1.10.1+ | Waveform peak generation | BBC standard, generates JSON compatible with wavesurfer.js |
| ffmpeg | 8.0.1+ | Audio transcoding | Universal standard, handles all format conversions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-persistent-queue | Latest | SQLite-backed async queue | If building custom queue is too complex |
| fluent-ffmpeg | Latest | ffmpeg wrapper for Node.js | Optional wrapper if direct spawn is too complex |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | node-sqlite3 | Async API, but 4-5x slower and callback-based |
| audiowaveform | peaks.js/json-waveform | Pure Node.js, but slower and less accurate |
| music-metadata | ffmetadata | Less comprehensive format support |
| SQLite queue | BullMQ + Redis | More features, but adds container complexity |
| Custom queue | In-memory Promise queue | Simpler code, but loses jobs on restart |

**Installation:**
```bash
# Node.js packages
npm install better-sqlite3 music-metadata sharp file-type

# Optional: if using fluent-ffmpeg wrapper
npm install fluent-ffmpeg

# Optional: if using pre-built queue library
npm install node-persistent-queue
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── server/              # Server-only modules
│   │   ├── queue.ts         # Job queue implementation
│   │   ├── processors/      # Processing functions
│   │   │   ├── transcode.ts
│   │   │   ├── peaks.ts
│   │   │   ├── metadata.ts
│   │   │   └── artwork.ts
│   │   └── validators/      # File validation
│   │       ├── magicBytes.ts
│   │       └── ffprobe.ts
├── routes/
│   └── api/
│       └── upload/
│           └── +server.ts   # Upload endpoint
```

### Pattern 1: Upload with Async Processing
**What:** Accept file upload, validate immediately, queue processing, return immediately
**When to use:** All audio uploads to prevent blocking the upload endpoint
**Example:**
```typescript
// Source: SvelteKit file upload patterns + job queue pattern
// routes/api/upload/+server.ts
import { db } from '$lib/server/db';
import { tracks } from '$lib/server/schema';
import { validateAudioFile } from '$lib/server/validators/magicBytes';
import { enqueueProcessing } from '$lib/server/queue';

export async function POST({ request }) {
  const formData = await request.formData();
  const file = formData.get('audio') as File;

  // Immediate validation (fast checks only)
  if (!file.name) {
    return new Response('File required', { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validationResult = await validateAudioFile(buffer);

  if (!validationResult.valid) {
    return new Response(validationResult.error, { status: 400 });
  }

  // Save to /data/audio/ and create DB record with status='pending'
  const trackId = db.insert(tracks).values({
    status: 'pending',
    originalFilename: file.name
  }).returning().get().id;

  // Queue async processing (returns immediately)
  await enqueueProcessing(trackId);

  return json({ trackId, status: 'pending' });
}
```

### Pattern 2: Two-Stage Validation
**What:** Fast validation (magic bytes) at upload, deep validation (ffprobe) during processing
**When to use:** Every audio file
**Example:**
```typescript
// Source: file-type + ffprobe validation patterns
// lib/server/validators/magicBytes.ts
import { fileTypeFromBuffer } from 'file-type';

const SUPPORTED_TYPES = ['audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg', 'audio/opus'];

export async function validateAudioFile(buffer: Buffer) {
  // Check first 4100 bytes for magic number (file-type requirement)
  const type = await fileTypeFromBuffer(buffer.slice(0, 4100));

  if (!type) {
    return { valid: false, error: 'Unknown file type' };
  }

  if (!SUPPORTED_TYPES.includes(type.mime)) {
    return { valid: false, error: `Unsupported format: ${type.mime}` };
  }

  return { valid: true, mime: type.mime };
}

// lib/server/validators/ffprobe.ts
import { spawn } from 'node:child_process';

export async function validateWithFFprobe(filepath: string) {
  return new Promise((resolve, reject) => {
    // SECURITY: Using spawn(), not exec() - prevents shell injection
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_streams',
      '-of', 'json',
      filepath
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => stdout += data);
    ffprobe.stderr.on('data', (data) => stderr += data);

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        resolve({ valid: false, error: 'Corrupt or invalid audio file' });
      } else {
        const data = JSON.parse(stdout);
        resolve({
          valid: true,
          duration: parseFloat(data.streams[0].duration),
          bitrate: parseInt(data.streams[0].bit_rate)
        });
      }
    });
  });
}
```

### Pattern 3: Sequential Processing with Status Updates
**What:** Process track through multiple stages, updating status in database
**When to use:** All queued processing jobs
**Example:**
```typescript
// Source: Combined pattern from job queue + ffmpeg + audiowaveform usage
// lib/server/processors/processTrack.ts
import { db } from '$lib/server/db';
import { tracks } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { transcodeAudio } from './transcode';
import { generatePeaks } from './peaks';
import { extractMetadata } from './metadata';
import { extractAndResizeArt } from './artwork';

export async function processTrack(trackId: number) {
  try {
    // Update status to 'processing'
    db.update(tracks)
      .set({ status: 'processing' })
      .where(eq(tracks.id, trackId))
      .run();

    const track = db.select().from(tracks).where(eq(tracks.id, trackId)).get();
    const inputPath = `/data/audio/${track.originalFilename}`;

    // Step 1: Validate with ffprobe (deep check)
    const probeResult = await validateWithFFprobe(inputPath);
    if (!probeResult.valid) throw new Error(probeResult.error);

    // Step 2: Transcode to MP3 320kbps CBR
    const outputPath = `/data/audio/${trackId}.mp3`;
    await transcodeAudio(inputPath, outputPath);

    // Step 3: Generate peaks JSON
    const peaksPath = `/data/peaks/${trackId}.json`;
    await generatePeaks(outputPath, peaksPath);

    // Step 4: Extract metadata and cover art
    const metadata = await extractMetadata(inputPath);

    // Step 5: Extract and resize cover art
    if (metadata.coverArt) {
      const artPath = `/data/art/${trackId}.jpg`;
      await extractAndResizeArt(metadata.coverArt, artPath);
    }

    // Update database with results
    db.update(tracks)
      .set({
        status: 'ready',
        duration: probeResult.duration,
        bitrate: 320000,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album
      })
      .where(eq(tracks.id, trackId))
      .run();

  } catch (error) {
    db.update(tracks)
      .set({
        status: 'failed',
        errorMessage: error.message
      })
      .where(eq(tracks.id, trackId))
      .run();
  }
}
```

### Pattern 4: Using child_process.spawn for CPU-Intensive Operations
**What:** Use spawn (NOT exec) for ffmpeg/audiowaveform to handle streaming output and prevent shell injection
**When to use:** All ffmpeg and audiowaveform operations
**Example:**
```typescript
// Source: Node.js child_process best practices
// lib/server/processors/transcode.ts
import { spawn } from 'node:child_process';

export async function transcodeAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // SECURITY: spawn() with array args prevents shell injection
    // NEVER use exec() with user-controlled paths
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-codec:a', 'libmp3lame',
      '-b:a', '320k',          // CBR 320kbps
      '-write_id3v2', '1',
      '-id3v2_version', '3',
      '-map_metadata', '0',    // Preserve metadata
      '-y',                    // Overwrite output
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => stderr += data.toString());

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed: ${stderr}`));
      }
    });
  });
}

// lib/server/processors/peaks.ts
export async function generatePeaks(audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // SECURITY: spawn() with array args prevents shell injection
    const audiowaveform = spawn('audiowaveform', [
      '-i', audioPath,
      '-o', outputPath,
      '--pixels-per-second', '20',
      '--bits', '8'
    ]);

    let stderr = '';
    audiowaveform.stderr.on('data', (data) => stderr += data.toString());

    audiowaveform.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`audiowaveform failed: ${stderr}`));
      }
    });
  });
}
```

### Pattern 5: Extract Cover Art with music-metadata + Resize with sharp
**What:** Use music-metadata to extract embedded cover art, sharp to resize
**When to use:** Every track that has embedded artwork
**Example:**
```typescript
// Source: music-metadata docs + sharp usage patterns
// lib/server/processors/metadata.ts
import { parseFile, selectCover } from 'music-metadata';

export async function extractMetadata(filepath: string) {
  const metadata = await parseFile(filepath);

  let coverArt = null;
  if (metadata.common.picture && metadata.common.picture.length > 0) {
    const cover = selectCover(metadata.common.picture);
    coverArt = cover ? cover.data : null;
  }

  return {
    title: metadata.common.title,
    artist: metadata.common.artist,
    album: metadata.common.album,
    coverArt
  };
}

// lib/server/processors/artwork.ts
import sharp from 'sharp';

export async function extractAndResizeArt(
  coverBuffer: Buffer,
  outputPath: string
): Promise<void> {
  await sharp(coverBuffer)
    .resize(500, 500, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}
```

### Pattern 6: Simple SQLite Queue
**What:** Use database as job queue with status polling
**When to use:** Single-container deployments where Redis is overkill
**Example:**
```typescript
// Source: SQLite job queue patterns
// lib/server/queue.ts
import { db } from './db';
import { jobQueue } from './schema';
import { eq } from 'drizzle-orm';
import { processTrack } from './processors/processTrack';

export async function enqueueProcessing(trackId: number) {
  db.insert(jobQueue).values({
    trackId,
    status: 'queued',
    createdAt: new Date()
  }).run();

  // Trigger processing (could be cron, interval, or immediate)
  processNext();
}

let isProcessing = false;

async function processNext() {
  if (isProcessing) return;

  const job = db.select()
    .from(jobQueue)
    .where(eq(jobQueue.status, 'queued'))
    .orderBy(jobQueue.createdAt)
    .limit(1)
    .get();

  if (!job) return;

  isProcessing = true;

  try {
    db.update(jobQueue)
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(jobQueue.id, job.id))
      .run();

    await processTrack(job.trackId);

    db.update(jobQueue)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(jobQueue.id, job.id))
      .run();
  } catch (error) {
    db.update(jobQueue)
      .set({ status: 'failed', error: error.message })
      .where(eq(jobQueue.id, job.id))
      .run();
  } finally {
    isProcessing = false;
    // Check for next job
    setTimeout(processNext, 100);
  }
}

// Start queue processor on app startup (hooks.server.ts)
export function startQueueProcessor() {
  setInterval(processNext, 1000); // Check every second
}
```

### Anti-Patterns to Avoid
- **Using exec() instead of spawn():** exec() buffers entire output in memory (will crash on large files), and opens shell injection vulnerabilities. ALWAYS use spawn() with argument arrays
- **Validating file extension only:** Trivially spoofed, always use magic bytes
- **Processing synchronously in upload endpoint:** Blocks upload response, terrible UX, will timeout
- **Using node-sqlite3 for queue:** 4-5x slower than better-sqlite3, callback-based API more complex
- **Not enabling WAL mode:** Readers block writers in default journal mode, kills concurrency
- **Processing multiple tracks concurrently:** Will exhaust memory with ffmpeg/audiowaveform, process sequentially

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio transcoding | Custom MP3 encoder | ffmpeg | Format complexity, edge cases, years of bug fixes |
| Waveform generation | Canvas-based peak extraction | audiowaveform | C++ performance, accuracy, wavesurfer.js compatibility |
| Magic byte validation | Manual byte checking | file-type npm | Hundreds of formats, constantly updated signatures |
| Image resizing | Node.js canvas/gd | sharp | 4-5x faster, libvips handles edge cases |
| Metadata extraction | Manual ID3/Vorbis parsing | music-metadata | Multiple tag formats, encoding issues, embedded images |
| SQLite driver | Custom bindings | better-sqlite3 | Memory management, performance optimization, battle-tested |

**Key insight:** Audio processing has deceptively complex edge cases (corrupt files, exotic encodings, malformed tags). Use mature libraries that have handled thousands of edge cases. Custom implementations will hit production issues.

## Common Pitfalls

### Pitfall 1: file-type is ESM-only (Breaking Change)
**What goes wrong:** `import { fileTypeFromBuffer } from 'file-type'` fails with ERR_REQUIRE_ESM
**Why it happens:** file-type v17+ is pure ESM, incompatible with CommonJS require()
**How to avoid:** Use dynamic import() or install v16.5.4 if stuck on CommonJS
**Warning signs:** "ERR_REQUIRE_ESM: require() of ES Module not supported"

### Pitfall 2: SvelteKit BODY_SIZE_LIMIT Blocks Large Uploads
**What goes wrong:** Uploads over 512KB fail with 413 Payload Too Large
**Why it happens:** SvelteKit node adapter defaults to 512KB max body size
**How to avoid:** Set environment variable `BODY_SIZE_LIMIT=0` (unlimited) or specific size like `BODY_SIZE_LIMIT=100000000` (100MB)
**Warning signs:** 413 status, uploads fail at specific size threshold

### Pitfall 3: audiowaveform Requires Build Dependencies
**What goes wrong:** Attempting to build audiowaveform fails with missing libgd-dev, libboost, etc.
**Why it happens:** audiowaveform is C++ with many system dependencies
**How to avoid:** Use Debian .deb package from GitHub releases, or copy binaries from Docker image
**Warning signs:** CMake errors, missing header files during build

### Pitfall 4: ffprobe Doesn't Decode, Misses Corruption
**What goes wrong:** Corrupt files pass ffprobe validation but fail during playback
**Why it happens:** ffprobe only reads headers, doesn't decode full stream
**How to avoid:** Use ffprobe for quick check, but actual transcoding with ffmpeg is authoritative validation
**Warning signs:** ffprobe succeeds but ffmpeg fails during transcode

### Pitfall 5: music-metadata.picture is Array, Not Single Value
**What goes wrong:** Trying to access metadata.common.picture.data directly throws error
**Why it happens:** picture field is array (files can have multiple embedded images)
**How to avoid:** Check array length, use selectCover() helper to get primary image
**Warning signs:** "Cannot read property 'data' of undefined"

### Pitfall 6: sharp Cannot Process Corrupt Images
**What goes wrong:** Extracted cover art buffer crashes sharp with "Input buffer contains unsupported image format"
**Why it happens:** Some embedded artwork is corrupt or uses exotic formats
**How to avoid:** Wrap sharp operations in try/catch, skip artwork processing on failure
**Warning signs:** Sharp throws during resize operation

### Pitfall 7: Forgetting WAL Mode in better-sqlite3
**What goes wrong:** Queue reads block processing writes, or vice versa
**Why it happens:** Default SQLite journal mode only allows one writer OR multiple readers, not both
**How to avoid:** Run `PRAGMA journal_mode = WAL` on database startup
**Warning signs:** SQLITE_BUSY errors, slow queue processing

### Pitfall 8: audiowaveform JSON Version Mismatch
**What goes wrong:** wavesurfer.js can't parse generated peaks JSON
**Why it happens:** audiowaveform v2 JSON format includes channels field, wavesurfer.js expects specific structure
**How to avoid:** Test integration with actual wavesurfer.js, ensure version 2 format compatibility
**Warning signs:** Waveform doesn't render, console errors about peaks data structure

## Code Examples

Verified patterns from official sources:

### audiowaveform JSON Output Format
```json
// Source: https://github.com/bbc/audiowaveform/blob/master/doc/DataFormat.md
{
  "version": 2,
  "channels": 2,
  "sample_rate": 48000,
  "samples_per_pixel": 512,
  "bits": 8,
  "length": 3,
  "data": [-65,63,-66,64,-40,41,-39,45,-55,43,-55,44]
}
```

### SvelteKit File Upload Handler
```typescript
// Source: https://www.okupter.com/blog/sveltekit-file-upload
import { fail } from '@sveltejs/kit';
import { writeFileSync } from 'fs';

export const actions = {
  default: async ({ request }) => {
    const formData = Object.fromEntries(await request.formData());

    if (!(formData.fileToUpload as File).name) {
      return fail(400, { error: true, message: 'File required' });
    }

    const { fileToUpload } = formData as { fileToUpload: File };
    writeFileSync(
      `static/${fileToUpload.name}`,
      Buffer.from(await fileToUpload.arrayBuffer())
    );

    return { success: true };
  }
};
```

### better-sqlite3 WAL Mode Setup
```typescript
// Source: better-sqlite3 performance docs
import Database from 'better-sqlite3';

const db = new Database('/data/wallybrain-music.db');
db.pragma('journal_mode = WAL');
```

### ffmpeg MP3 Transcode Command
```bash
# Source: https://trac.ffmpeg.org/wiki/Encode/MP3
ffmpeg -i input.flac \
  -codec:a libmp3lame \
  -b:a 320k \
  -write_id3v2 1 \
  -id3v2_version 3 \
  -map_metadata 0 \
  output.mp3
```

### audiowaveform Peak Generation Command
```bash
# Source: https://github.com/bbc/audiowaveform
audiowaveform -i audio.mp3 -o peaks.json --pixels-per-second 20 --bits 8
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| file-type CommonJS | file-type ESM-only | v17 (2021) | Breaking change, requires dynamic import or downgrade |
| audiowaveform Ubuntu PPA | Debian .deb packages | 2024 | PPA deprecated, use GitHub releases |
| fluent-ffmpeg wrapper | Direct spawn | Ongoing | Wrapper adds abstraction layer, direct spawn more transparent |
| Redis job queues | SQLite job queues | 2024-2025 | SQLite matured with WAL mode, simpler for single-container apps |
| ImageMagick/GraphicsMagick | sharp | 2018-present | sharp 4-5x faster, maintained actively |

**Deprecated/outdated:**
- **audiowaveform Ubuntu PPA (Chris Needham):** No longer maintained, use Debian packages from GitHub releases
- **file-type v16:** CommonJS version still works but no longer updated
- **node-sqlite3:** Still maintained but better-sqlite3 is objectively faster and simpler

## Open Questions

1. **Should we use fluent-ffmpeg wrapper or direct spawn?**
   - What we know: Direct spawn is more transparent, less abstraction
   - What's unclear: Does fluent-ffmpeg provide meaningful value for complex operations?
   - Recommendation: Start with direct spawn for transparency, add fluent-ffmpeg if spawn code gets too complex

2. **Should processing start immediately or via cron/interval?**
   - What we know: Immediate processing best UX, interval-based simpler
   - What's unclear: Risk of queue exhaustion if uploads spike
   - Recommendation: Use setInterval with isProcessing flag (shown in examples), prevents concurrent processing

3. **Should we support multiple audio formats or transcode everything to MP3?**
   - What we know: Transcoding normalizes format, simplifies playback
   - What's unclear: User preference for lossless formats
   - Recommendation: Always transcode to MP3 for playback, keep original file for archival

4. **Docker: Build audiowaveform from source or use .deb package?**
   - What we know: Source requires many build deps, .deb is simpler
   - What's unclear: Availability of .deb for arm64
   - Recommendation: Download .deb from GitHub releases during Docker build (arm64 and amd64 both available)

## Sources

### Primary (HIGH confidence)
- [BBC audiowaveform GitHub](https://github.com/bbc/audiowaveform) - Installation, JSON format specification
- [audiowaveform DataFormat.md](https://github.com/bbc/audiowaveform/blob/master/doc/DataFormat.md) - Complete JSON spec
- [mwader/static-ffmpeg](https://github.com/wader/static-ffmpeg) - Multi-stage Docker builds with ffmpeg
- [FFmpeg Encode/MP3 Wiki](https://trac.ffmpeg.org/wiki/Encode/MP3) - MP3 encoding parameters
- [wavesurfer.js docs](https://wavesurfer.xyz/docs/) - Pre-decoded peaks support
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) - Performance claims, WAL mode
- [sharp documentation](https://sharp.pixelplumbing.com/) - Image processing API
- [music-metadata GitHub](https://github.com/Borewit/music-metadata) - Cover art extraction
- [SvelteKit Server-only modules](https://svelte.dev/docs/kit/server-only-modules) - .server pattern

### Secondary (MEDIUM confidence)
- [Okupter SvelteKit file upload guide](https://www.okupter.com/blog/sveltekit-file-upload) - File handling pattern (verified with SvelteKit docs)
- [node-persistent-queue GitHub](https://github.com/damoclark/node-persistent-queue) - SQLite queue implementation
- [file-type npm](https://www.npmjs.com/package/file-type) - Magic byte validation (verified with GitHub)
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite) - better-sqlite3 integration (verified with GitHub)
- [Node.js child_process docs](https://nodejs.org/api/child_process.html) - spawn vs exec differences

### Tertiary (LOW confidence - needs validation)
- [karoid/audiowaveform-debian Docker Hub](https://hub.docker.com/layers/karoid/audiowaveform-debian/1.8.1-bookworm/images/sha256-562ff0d9d3fbe568ea34e1e958a9016c187c3bffedc5dc4131cdc51003337bb0) - Pre-built Bookworm image (not verified for trust)
- [fpetterlate/node-audiowaveform-server](https://github.com/fpetterlate/node-audiowaveform-server/blob/master/Dockerfile) - Ubuntu 18.04 example (outdated but shows pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified from official sources, widely adopted
- Architecture: MEDIUM-HIGH - Patterns synthesized from official docs + community examples, need real-world validation
- Pitfalls: MEDIUM - Based on GitHub issues and documentation, but some are inferred from error messages

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stack is stable, but file-type and sharp update frequently)
