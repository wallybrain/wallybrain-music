# Phase 3: Waveform Player - Research

**Researched:** 2026-02-08
**Domain:** wavesurfer.js audio waveform player, SvelteKit audio streaming, HTTP range requests, audiowaveform peaks integration
**Confidence:** HIGH

## Summary

Phase 3 delivers the core playback experience: a wavesurfer.js waveform player component that renders pre-generated peaks instantly and plays audio via an HTTP streaming endpoint with range request support. The two plans split cleanly -- 03-01 builds the client-side Svelte component with wavesurfer.js, and 03-02 builds the server-side audio streaming and peaks API endpoints.

wavesurfer.js v7 is a TypeScript rewrite of the library with zero dependencies, shipping at roughly 30kb gzipped. It natively supports pre-decoded peaks via the `peaks` constructor option, accepting `Array<Float32Array | number[]>`. The audiowaveform tool (already installed in the Docker container at v1.10.1) generates peaks in a JSON format with integer values (-127 to 127 for 8-bit), which must be normalized to the -1 to 1 range that wavesurfer.js expects. The recommended approach is server-side pre-normalization rather than relying on wavesurfer's `normalize: true` option, which divides by the max value in the array (potentially over-stretching quiet sections).

The audio streaming endpoint must handle HTTP range requests properly -- this is critical for Safari compatibility. Safari sends an initial `bytes=0-1` probe request and will refuse to play audio if the server does not respond with a proper 206 Partial Content response. SvelteKit's `+server.ts` endpoints can return `Response` objects with custom headers and Node.js `ReadableStream` bodies, making range request handling straightforward. Audio files are MP3 320kbps CBR stored at `/data/audio/{trackId}.mp3` (from Phase 2).

**Primary recommendation:** Use wavesurfer.js v7 with pre-normalized peaks served from a `/api/tracks/[id]/peaks` endpoint, a drag-to-seek waveform component built as a Svelte 5 component with `onMount`/cleanup lifecycle, and a `/api/tracks/[id]/audio` streaming endpoint that handles HTTP range requests with proper 206 responses and `Accept-Ranges: bytes` headers.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wavesurfer.js | ^7.12.x | Waveform visualization and audio playback | TypeScript rewrite, zero deps, ~30kb gzip, native pre-decoded peaks support, active maintenance |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | wavesurfer.js is self-contained; no additional audio libraries required |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| wavesurfer.js | peaks.js (BBC) | peaks.js is lower-level, requires more custom UI work; wavesurfer.js has better out-of-box player UX |
| wavesurfer.js | Custom canvas rendering | Massive effort for seeking, responsive resize, cross-browser audio; wavesurfer handles all this |
| Server-side peak normalization | Client-side `normalize: true` | Client normalize divides by max in array, over-stretches quiet tracks; server-side is more accurate |

**Installation:**
```bash
npm install wavesurfer.js
```

## Architecture Patterns

### Recommended Project Structure (new files for this phase)

```
src/
├── lib/
│   └── components/
│       └── WaveformPlayer.svelte    # Reusable waveform player component
├── routes/
│   └── api/
│       └── tracks/
│           └── [id]/
│               ├── audio/
│               │   └── +server.ts   # Audio streaming with range requests
│               └── peaks/
│                   └── +server.ts   # Normalized peaks JSON endpoint
```

### Pattern 1: wavesurfer.js Lifecycle in Svelte 5

**What:** Initialize wavesurfer.js in `onMount`, destroy on component unmount
**When to use:** Always -- wavesurfer.js requires a DOM container and must not run during SSR

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type WaveSurfer from 'wavesurfer.js';

  let { audioUrl, peaksUrl, duration }: {
    audioUrl: string;
    peaksUrl: string;
    duration: number;
  } = $props();

  let container: HTMLDivElement;
  let wavesurfer: WaveSurfer | null = $state(null);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let volume = $state(1);

  onMount(() => {
    let ws: WaveSurfer;

    // Dynamic import to avoid SSR issues
    import('wavesurfer.js').then(async ({ default: WaveSurfer }) => {
      // Fetch pre-normalized peaks
      const response = await fetch(peaksUrl);
      const peaksData = await response.json();

      ws = WaveSurfer.create({
        container,
        waveColor: '#4a4a5a',
        progressColor: '#8b5cf6',
        cursorColor: '#8b5cf6',
        cursorWidth: 2,
        height: 80,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: false,        // We pre-normalize server-side
        interact: true,
        dragToSeek: true,        // Enable drag-to-seek (PLAY-02)
        url: audioUrl,
        peaks: [peaksData],      // Pre-decoded peaks (PLAY-03)
        duration: duration,      // Known duration from DB
      });

      ws.on('play', () => isPlaying = true);
      ws.on('pause', () => isPlaying = false);
      ws.on('timeupdate', (time) => currentTime = time);

      wavesurfer = ws;
    });

    return () => {
      ws?.destroy();
    };
  });
</script>

<div bind:this={container}></div>
```

**Key details:**
- Dynamic `import('wavesurfer.js')` inside `onMount` avoids SSR problems
- Return cleanup function from `onMount` to call `ws.destroy()`
- Use `$state()` runes for reactive UI bindings (isPlaying, currentTime, volume)
- Pass `peaks` and `duration` at create time so waveform renders instantly without decoding

### Pattern 2: HTTP Range Request Handler in SvelteKit

**What:** A `+server.ts` GET endpoint that serves audio files with proper range request support
**When to use:** For the audio streaming endpoint (INFRA-04)

```typescript
// src/routes/api/tracks/[id]/audio/+server.ts
import type { RequestHandler } from './$types';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, request }) => {
  const filePath = `/data/audio/${params.id}.mp3`;

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    throw error(404, 'Track not found');
  }

  const fileSize = stat.size;
  const range = request.headers.get('range');

  // Always include Accept-Ranges so browsers know seeking is supported
  const baseHeaders: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  if (!range) {
    // No range header: return entire file
    const stream = createReadStream(filePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Length': String(fileSize),
      },
    });
  }

  // Parse range header: "bytes=start-end"
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  const stream = createReadStream(filePath, { start, end });

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': String(chunkSize),
    },
  });
};
```

### Pattern 3: Server-Side Peak Normalization

**What:** An endpoint that reads audiowaveform JSON and normalizes integer peaks to float values
**When to use:** For the peaks data endpoint (PLAY-03)

```typescript
// src/routes/api/tracks/[id]/peaks/+server.ts
import type { RequestHandler } from './$types';
import { readFileSync } from 'node:fs';
import { error, json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const peaksPath = `/data/peaks/${params.id}.json`;

  let raw;
  try {
    raw = JSON.parse(readFileSync(peaksPath, 'utf-8'));
  } catch {
    throw error(404, 'Peaks not found');
  }

  // audiowaveform 8-bit output: values range -127 to 127
  // wavesurfer.js expects -1.0 to 1.0
  // The data array interleaves min/max pairs per sample
  const normalized = raw.data.map((v: number) => v / 127);

  return json(normalized, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

### Anti-Patterns to Avoid

- **Decoding audio client-side for waveform rendering:** wavesurfer.js will decode the entire audio file to generate a waveform if no peaks are provided. This is slow (seconds for long tracks) and wastes bandwidth. Always provide pre-generated peaks.
- **Using `normalize: true` with audiowaveform data:** The normalize option divides all values by the maximum value in the peaks array. For quiet tracks or tracks with a single spike, this distorts the waveform shape. Pre-normalize server-side with a fixed divisor (127 for 8-bit).
- **Initializing wavesurfer.js at module scope in Svelte:** wavesurfer.js accesses the DOM. Any import or initialization outside `onMount` will break SSR. Always use dynamic `import()` inside `onMount`.
- **Serving audio files without `Accept-Ranges: bytes`:** Even for non-range requests, include this header. Safari checks for it before sending range requests. Without it, seeking may not work.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waveform rendering | Custom canvas drawing | wavesurfer.js | Handles HiDPI, responsive resize, seeking, drag, cursor, progress bar -- hundreds of edge cases |
| Peak data generation | Client-side FFT analysis | audiowaveform (already installed) | Server-side is faster, runs once, avoids downloading full audio file to browser |
| Audio seeking | Custom `<audio>` element + progress bar | wavesurfer.js integrated player | wavesurfer.js manages the underlying `<audio>` element, handles seek events, syncs waveform with playback position |
| Time formatting | Manual string concatenation | Simple utility function (see Code Examples) | Avoids repeated logic; but this IS simple enough to hand-roll (no library needed) |

**Key insight:** wavesurfer.js is the established solution for waveform audio players. It handles responsive resize, HiDPI canvas rendering, cross-browser audio playback, seeking, and progress visualization. Building any of this from scratch would be a multi-week effort with subtle browser-specific bugs.

## Common Pitfalls

### Pitfall 1: audiowaveform Peak Values Not Normalized

**What goes wrong:** Waveform renders as a flat line or nearly invisible because peak values are integers (-127 to 127) and wavesurfer.js expects floats (-1.0 to 1.0).
**Why it happens:** audiowaveform generates peaks in integer format for compact storage. wavesurfer.js has no automatic detection of integer ranges.
**How to avoid:** Normalize peaks server-side by dividing by 127 (for 8-bit). Serve normalized floats from the peaks endpoint.
**Warning signs:** Waveform appears as a thin line or is completely invisible despite having peak data.

### Pitfall 2: Safari Won't Play Audio Without Range Request Support

**What goes wrong:** Audio plays in Chrome/Firefox but not in Safari. No error is thrown; the audio element just does nothing.
**Why it happens:** Safari sends an initial `bytes=0-1` probe request. If the server responds with 200 (full file) instead of 206 (partial content), Safari assumes seeking is not supported and may refuse to play entirely.
**How to avoid:** Always handle range requests in the audio endpoint. Always include `Accept-Ranges: bytes` in all responses (even non-range ones). Return 206 with proper `Content-Range` header for range requests.
**Warning signs:** Audio works in development (Chrome) but fails after deployment testing in Safari.

### Pitfall 3: wavesurfer.js Initialization During SSR

**What goes wrong:** Build fails or server error with "document is not defined" or "window is not defined".
**Why it happens:** SvelteKit renders components on the server during SSR. wavesurfer.js accesses DOM APIs.
**How to avoid:** Use dynamic `import('wavesurfer.js')` inside `onMount()`, which only runs client-side. Never import wavesurfer.js at the top-level of a Svelte component.
**Warning signs:** Error in server logs referencing DOM APIs during page load.

### Pitfall 4: Missing `duration` When Using Pre-decoded Peaks

**What goes wrong:** Waveform renders but the time display shows 0:00 / 0:00 and seeking doesn't work properly.
**Why it happens:** When providing pre-decoded peaks, wavesurfer.js may not know the audio duration until the audio file starts loading/playing. If you need instant time display, you must provide the `duration` option.
**How to avoid:** Pass `duration` (in seconds) from the database to the WaveSurfer.create() options alongside the peaks.
**Warning signs:** Time display shows 0 or NaN until audio starts playing.

### Pitfall 5: Memory Leak From Not Destroying wavesurfer.js

**What goes wrong:** Each page navigation creates a new wavesurfer.js instance without destroying the old one. Audio continues playing from orphaned instances.
**Why it happens:** SvelteKit client-side navigation mounts/unmounts components. If the cleanup function is not returned from `onMount`, the instance persists.
**How to avoid:** Return a cleanup function from `onMount` that calls `ws.destroy()`. This removes event listeners, stops playback, and cleans up the canvas.
**Warning signs:** Multiple audio streams playing simultaneously, increasing memory usage.

### Pitfall 6: Range Request Off-by-One Errors

**What goes wrong:** Audio seeking jumps to wrong positions or causes playback glitches near the end of the track.
**Why it happens:** HTTP range requests use inclusive byte ranges (both start and end are included). An off-by-one error in the end calculation or Content-Length causes the browser to request overlapping or missing bytes.
**How to avoid:** Use the exact pattern: `end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1` and `chunkSize = end - start + 1`. The Content-Range header format is `bytes start-end/total`.
**Warning signs:** Audio artifacts at seek points, or audio cuts off before the actual end of the track.

## Code Examples

### Time Formatting Utility

```typescript
// src/lib/utils/formatTime.ts
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Volume Control Binding

```svelte
<!-- Inside WaveformPlayer.svelte -->
<input
  type="range"
  min="0"
  max="1"
  step="0.01"
  value={volume}
  oninput={(e) => {
    volume = parseFloat(e.currentTarget.value);
    wavesurfer?.setVolume(volume);
  }}
/>
```

### Play/Pause Button

```svelte
<button onclick={() => wavesurfer?.playPause()}>
  {isPlaying ? 'Pause' : 'Play'}
</button>
```

### Time Display

```svelte
<span>{formatTime(currentTime)} / {formatTime(duration)}</span>
```

### Loading State Detection

```svelte
<script lang="ts">
  let isLoading = $state(true);

  // Inside onMount after WaveSurfer.create():
  ws.on('ready', () => isLoading = false);
  ws.on('loading', (percent) => {
    // percent is 0-100 during audio fetch
  });
</script>

{#if isLoading}
  <div class="loading-indicator">Loading...</div>
{/if}
```

### Complete WaveSurfer Event Wiring

```typescript
// All relevant events for the player component
ws.on('play', () => isPlaying = true);
ws.on('pause', () => isPlaying = false);
ws.on('finish', () => isPlaying = false);
ws.on('timeupdate', (time) => currentTime = time);
ws.on('ready', (dur) => {
  isLoading = false;
  totalDuration = dur;
});
ws.on('error', (err) => {
  console.error('WaveSurfer error:', err);
  isLoading = false;
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wavesurfer.js v6 (Web Audio centric) | wavesurfer.js v7 (TypeScript, HTMLMediaElement default) | 2023 | v7 uses HTMLMediaElement by default (better mobile/Safari support), TypeScript types included, simpler API |
| `responsive: true` option | Built-in `fillParent: true` (default) | v7 | Waveform automatically fills container width, responds to resize via ResizeObserver |
| `backend: 'MediaElement'` explicit | Default in v7 | v7 | No longer need to specify backend for most use cases; MediaElement is the default |
| `wavesurfer.load(url, peaks)` | `peaks` and `duration` in create options | v7 | Can pass peaks at creation time, waveform renders before any audio loads |
| `on:click` / `on:play` Svelte syntax | `onclick` / Svelte 5 event handlers | Svelte 5 | Svelte 5 uses lowercase event attributes, not `on:` directives |

**Deprecated/outdated:**
- `responsive` option: Removed in v7. The waveform is responsive by default via `fillParent: true`.
- `backend: 'WebAudio'` as default: v7 defaults to MediaElement. Only use WebAudio if you need programmatic audio analysis.
- `wavesurfer.backend.peaks`: v6 internal API. In v7, use `exportPeaks()` or pass peaks via options.

## Open Questions

1. **Peaks data with empty arrays for test tracks**
   - What we know: The existing peaks file (`fb9a6a7e-...json`) has `data: []`, `length: 0`, `sample_rate: 0`. This suggests the test upload may have been a corrupt or extremely short file.
   - What's unclear: Whether a real upload produces correct peaks data.
   - Recommendation: Validate with a real audio file before building the component. The endpoint should handle empty/invalid peaks gracefully (show a fallback or placeholder waveform).

2. **Track ID vs Slug for API endpoints**
   - What we know: The DB stores both `id` (UUID) and `slug` (human-readable). Audio files are stored as `{trackId}.mp3`.
   - What's unclear: Whether API endpoints should use the UUID `id` (simpler, matches filenames) or the `slug` (more user-friendly URLs).
   - Recommendation: Use UUID `id` for API data endpoints (`/api/tracks/[id]/audio`, `/api/tracks/[id]/peaks`) since audio/peaks files use the UUID. Use `slug` for public-facing pages (Phase 4). This avoids filename mismatches.

3. **Cache headers for peaks and audio**
   - What we know: Audio files and peaks are immutable once generated (tied to track UUID).
   - What's unclear: Whether Caddy adds its own caching headers that might conflict.
   - Recommendation: Set `Cache-Control: public, max-age=31536000, immutable` on both audio and peaks endpoints. The UUID-based paths naturally act as cache-busters if a track is re-processed.

## Sources

### Primary (HIGH confidence)

- [wavesurfer.js GitHub source - WaveSurferOptions & WaveSurferEvents TypeScript types](https://github.com/katspaugh/wavesurfer.js/blob/main/src/wavesurfer.ts) - Complete API types verified
- [wavesurfer.js official site - FAQ on pre-generated peaks](https://wavesurfer.xyz/faq/) - Peak normalization requirements confirmed
- [wavesurfer.js GitHub - pre-decoded example](https://github.com/katspaugh/wavesurfer.js/blob/main/examples/predecoded.js) - Peaks loading pattern verified
- [wavesurfer.js npm](https://www.npmjs.com/package/wavesurfer.js) - Version 7.12.x confirmed as latest
- [Svelte docs - lifecycle hooks](https://svelte.dev/docs/svelte/lifecycle-hooks) - onMount cleanup pattern confirmed
- [Svelte playground - WaveSurfer.js integration](https://svelte.dev/playground/0117cb81e03e4e378a09483420fd745e) - Working Svelte + wavesurfer pattern
- Existing codebase: schema.ts, peaks.ts, processTrack.ts, Dockerfile -- all read and analyzed

### Secondary (MEDIUM confidence)

- [GitHub discussion #2769 - audiowaveform to wavesurfer.js normalization](https://github.com/katspaugh/wavesurfer.js/discussions/2769) - Normalization approaches and waveform-data library option
- [SvelteKit streaming files blog post](https://diekmeier.de/posts/2023-11-06-streaming-files-from-sveltekit/) - `Readable.toWeb()` pattern for SvelteKit
- [SvelteKit GitHub #5344 - streaming request/response docs](https://github.com/sveltejs/kit/issues/5344) - Confirmed Response + ReadableStream pattern
- [Safari range request requirements](https://discussions.apple.com/thread/250520118) - Safari `bytes=0-1` probe behavior confirmed
- [Node.js audio streaming guide](https://dev.to/gleidsonleite/symphony-in-bytes-mastering-audio-streaming-with-nodejs-2ipf) - Range request handler pattern

### Tertiary (LOW confidence)

- wavesurfer.js bundle size (~30kb gzipped) estimated from npm listing and TypeScript-only build; exact number not verified on bundlephobia

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - wavesurfer.js v7 is the clear choice, actively maintained, TypeScript types verified from source
- Architecture: HIGH - Svelte 5 + onMount lifecycle pattern well-documented; SvelteKit +server.ts endpoint pattern proven in existing codebase
- Peaks integration: HIGH - audiowaveform JSON format verified, normalization approach confirmed from multiple sources and maintainer guidance
- Range requests: HIGH - HTTP 206 pattern is well-established; Safari requirements documented by Apple and multiple independent sources
- Pitfalls: HIGH - All pitfalls sourced from real GitHub issues and known browser behavior

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (stable -- wavesurfer.js v7 API is mature; SvelteKit patterns are established)
