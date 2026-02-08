# Domain Pitfalls

**Domain:** Self-hosted music streaming platform (SoundCloud-like)
**Researched:** 2026-02-07

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or make the platform unusable.

### Pitfall 1: Client-Side Waveform Decoding of Large Files

**What goes wrong:** Using `decodeAudioData()` in the browser to generate waveform visualizations. A 60-minute live set at 320kbps MP3 is ~140MB. When `decodeAudioData` decodes this, the uncompressed PCM data expands to ~1.2GB in memory. The browser tab crashes, hard-crashes to desktop in low-memory situations, or renders an inaccurate waveform.

**Why it happens:** It seems simple -- load the file, decode it, draw the waveform. Libraries like wavesurfer.js default to client-side decoding. Developers test with 3-minute tracks (which work fine) and never test with 30-60 minute files until it is too late.

**Consequences:**
- Browser tab crashes or freezes on any long track (live sets, DJ mixes)
- Mobile devices crash even on medium-length tracks (~15 min)
- Users think the site is broken; there is no graceful fallback
- Firefox is particularly prone to OOM crashes in `decodeAudioData`

**Prevention:** Generate waveform peaks server-side during upload processing using `audiowaveform` (BBC's C++ tool). Store peaks as JSON files alongside audio files. Pass pre-computed peaks to wavesurfer.js via `wavesurfer.load(url, peaks)`. Never decode large files in the browser.

**Detection:** Test with a 60-minute MP3 file on Chrome and Firefox. Open DevTools Memory tab during load. If memory spikes above 500MB, you have this problem.

**Phase:** Must be addressed in Phase 1 (upload pipeline). Waveform generation is part of the upload processing pipeline, not a frontend concern.

**Confidence:** HIGH -- documented in wavesurfer.js issues, BBC waveform-data.js issues, Chromium bug tracker, and Mozilla Bugzilla.

**Sources:**
- [Chromium bug #447580: decodeAudioData memory](https://bugs.chromium.org/p/chromium/issues/detail?id=447580)
- [Mozilla bug #1066036: OOM crash in decodeAudioData](https://bugzilla.mozilla.org/show_bug.cgi?id=1066036)
- [bbc/waveform-data.js #32: Chrome crashes with large files](https://github.com/bbc/waveform-data.js/issues/32)
- [wavesurfer.js #1075: peaks from large files](https://github.com/katspaugh/wavesurfer.js/issues/1075)

---

### Pitfall 2: Missing or Broken HTTP Range Request Support

**What goes wrong:** The audio player cannot seek (scrub) to arbitrary positions in the track. User clicks the middle of a waveform and either nothing happens, playback restarts from the beginning, or the browser downloads the entire file before seeking.

**Why it happens:** HTTP Range requests (returning 206 Partial Content with `Content-Range` header) are required for seeking in audio files served over HTTP. If the Node.js backend serves audio files without proper range request handling, seeking breaks. Safari is particularly strict -- it sends a test request for bytes 0-1 and refuses to play if range requests are not supported.

**Consequences:**
- No scrubbing/seeking on any track
- Safari refuses to play audio entirely
- Users must listen from the beginning every time
- 60-minute live sets become unlistenable without seeking

**Prevention:** Two paths depending on architecture:
1. **Let Caddy serve static files directly** (recommended): Caddy's `file_server` automatically handles range requests and returns 206 with correct `Content-Range` headers. No custom code needed.
2. **If Node.js must serve files**: Use `fs.createReadStream({ start, end })` with correct `Content-Range` and `Content-Length` headers. Watch for off-by-one: if bytes 0-0 are requested, that is 1 byte, so `chunksize = (end - start) + 1`.

**Detection:** Open browser DevTools Network tab. Click the middle of a playing track's waveform. Check that the request returns 206 (not 200) and includes a `Content-Range` header. Test in Safari specifically.

**Phase:** Phase 1 (streaming architecture). This is a fundamental architecture decision -- who serves audio files.

**Confidence:** HIGH -- well-documented browser behavior, confirmed in Safari WebKit blog and multiple Node.js streaming guides.

**Sources:**
- [How to serve media on Node.js](https://gist.github.com/padenot/1324734)
- [Caddy file_server: 206 for partial content](https://caddyserver.com/docs/caddyfile/directives/file_server)
- [WebKit: New video policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)

---

### Pitfall 3: No Upload Processing Pipeline (Raw File Storage)

**What goes wrong:** Audio files are stored exactly as uploaded with no server-side processing. Over time this leads to: inconsistent formats (WAV, FLAC, MP3, AAC mixed together), missing waveform data, no duration metadata, enormous disk usage from uncompressed formats, and tracks that some browsers cannot play.

**Why it happens:** It feels simpler to just save the file and serve it. Processing seems like a "nice to have" that can be added later. But without it, every downstream feature (waveform display, duration display, format compatibility, disk management) is broken or inconsistent.

**Consequences:**
- WAV/FLAC uploads consume 10-50x more disk than MP3/Opus equivalents
- No waveform data means client-side decoding (see Pitfall 1)
- No duration means the player cannot show track length before playback
- Browser codec support varies: Firefox cannot play AAC natively, Safari has limited Opus support
- Disk fills up rapidly on a VPS with limited storage

**Prevention:** Build an upload processing pipeline from the start:
1. Accept any common audio format (WAV, FLAC, MP3, AAC, OGG, AIFF)
2. Validate the file is actually audio (check magic bytes, not just extension)
3. Transcode to a web-safe streaming format (MP3 320kbps for compatibility, or Opus in WebM for modern browsers)
4. Keep the original file in an archive directory (or discard if disk is precious)
5. Extract metadata (duration, sample rate, channels) via `ffprobe`
6. Generate waveform peaks via `audiowaveform`
7. Store all derived data (peaks JSON, metadata, transcoded file) together

**Detection:** Upload a 60-minute WAV file (about 635MB at 44.1kHz stereo). If it gets stored as-is, you have this problem.

**Phase:** Phase 1 (core upload pipeline). This is the foundational backend feature.

**Confidence:** HIGH -- standard practice in every music platform (SoundCloud, Bandcamp, etc.)

---

### Pitfall 4: Serving Audio Through Node.js Instead of Caddy

**What goes wrong:** Node.js handles every audio file request, tying up the event loop with I/O-bound file streaming. Under even modest concurrent load (5-10 simultaneous listeners), API responsiveness degrades. For 60-minute tracks, a single stream ties up resources for the entire duration.

**Why it happens:** It seems natural to route everything through Express, especially when the API and file serving are in the same codebase. Developers think "it is just a `res.sendFile()`" without realizing the performance implications.

**Consequences:**
- Node.js event loop blocked by file I/O, slowing API responses
- Memory pressure from buffering large files
- No built-in caching, ETag, or compression for static files
- Reinventing what Caddy already does better (TLS, HTTP/2, range requests, caching headers)

**Prevention:** Use Caddy to serve audio files directly as static assets. Caddy already handles TLS, HTTP/2, range requests (206), ETags, compression, and cache headers automatically. Node.js should only handle API requests (metadata, upload processing, admin actions).

Architecture:
```
Client -> Caddy -> /music/* (static frontend)
                -> /audio/* (static audio files via file_server)
                -> /api/*  (reverse proxy to Node.js)
```

**Detection:** Check if audio file requests hit your Node.js process. If `req.url` matches audio file patterns in your Express logs, you have this problem.

**Phase:** Phase 1 (architecture). This is a day-one architecture decision.

**Confidence:** HIGH -- well-established Node.js production best practice. Express docs themselves recommend reverse proxy for static files.

**Sources:**
- [Browsee: Serving static files slowing down Express](https://browsee.io/blog/serving-static-files-could-be-slowing-down-nodejs-express-server/)
- [Node.js performance: missing middleware](https://medium.com/@oresoftware/node-js-performance-the-most-common-piece-of-missing-middleware-for-servers-in-production-54fd23f00bf7)

---

## Moderate Pitfalls

### Pitfall 5: iOS/Safari AudioContext Autoplay Restrictions

**What goes wrong:** Audio does not play on iOS Safari or desktop Safari. The user clicks play and nothing happens. No error is visible.

**Why it happens:** Safari requires that an `AudioContext` be created or resumed inside a user gesture (click/tap event). If the AudioContext is created on page load (common in waveform libraries), it starts in a `suspended` state. If audio loading is asynchronous (fetch + decode), Safari may lose the user-interaction context by the time playback starts.

**Prevention:**
- Create `AudioContext` lazily on first user click, not on page load
- Always check `audioCtx.state` and call `audioCtx.resume()` if suspended
- Do not use `decodeAudioData` asynchronously after a click -- the gesture context expires
- Use the HTML5 `<audio>` element for playback (not raw Web Audio API buffers) since wavesurfer.js v7+ defaults to this approach
- If using wavesurfer.js, the default MediaElement backend avoids most AudioContext issues

**Detection:** Test on iOS Safari (real device, not simulator). Tap play. If nothing happens and there are no console errors, this is likely the cause.

**Phase:** Phase 2 (player implementation). Must be handled during frontend player development.

**Confidence:** HIGH -- documented by Apple/WebKit and MDN.

**Sources:**
- [MDN: Autoplay guide for media and Web Audio APIs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [MDN: Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

---

### Pitfall 6: Waveform Player Performance on Mobile

**What goes wrong:** The waveform player is janky, unresponsive, or crashes on mobile devices. Touch-based scrubbing does not work correctly -- sometimes it seeks, sometimes it scrolls the page, sometimes the waveform drags instead of the playback position.

**Why it happens:** Waveform rendering involves re-drawing canvas elements on every animation frame. On high-DPI mobile screens (Retina), the canvas resolution doubles or triples, multiplying the rendering work. Touch events conflict with page scroll events. wavesurfer.js has documented issues with mobile touch interaction.

**Prevention:**
- Use pre-computed peaks (reduces CPU work to just rendering, no decoding)
- Set appropriate `height` and avoid unnecessary canvas redraws
- Use `passive: false` on touch event listeners for the waveform container and call `preventDefault()` to prevent scroll conflicts
- Test on real mobile devices early, not just Chrome DevTools device emulation
- Consider a simpler progress bar fallback for very old/slow devices

**Detection:** Test on a mid-range Android phone (not a flagship). Load a track and try scrubbing. If the frame rate drops below 30fps or touch interactions conflict with scrolling, you have this problem.

**Phase:** Phase 2 (player implementation). Address during frontend development.

**Confidence:** MEDIUM -- documented in wavesurfer.js issues, but specific behavior varies by device and library version.

**Sources:**
- [wavesurfer.js #22: Mobile browser performance](https://github.com/katspaugh/wavesurfer.js/issues/22)
- [wavesurfer.js #3336: Event propagation issues in mobile Safari](https://github.com/katspaugh/wavesurfer.js/issues/3336)

---

### Pitfall 7: VPS Disk Space Exhaustion

**What goes wrong:** The server runs out of disk space. Audio uploads fail silently, the database becomes corrupted, Node.js crashes, or the entire VPS becomes unresponsive.

**Why it happens:** Audio files are large. A modest library of 100 tracks at 320kbps MP3, averaging 10 minutes each, is about 2.3GB. Add original uploads (WAV/FLAC), waveform data, cover art, and the number doubles or triples. If the upload pipeline stores both originals and transcoded versions without cleanup, disk usage grows rapidly. Log files and temporary processing files add up. VPS disks are typically 25-80GB.

**Prevention:**
- Track disk usage in the admin dashboard (show used/total/remaining)
- Set a disk space threshold alert (e.g., Discord webhook at 80% and 90% usage)
- Decide early: keep originals or discard after transcoding (for a personal catalog, discarding originals after transcoding is usually fine since you have the originals on your local machine)
- Clean up temporary files from the processing pipeline (failed uploads, intermediate transcodes)
- Set `maxFileSize` limits on uploads (reject files over a reasonable limit, e.g., 500MB)
- Monitor with a cron job: `df -h | grep -E '^/dev/' | awk '{if ($5+0 > 80) print}'`

**Detection:** Run `df -h` on the VPS. If the audio partition is above 70%, plan ahead.

**Phase:** Phase 1 (upload pipeline) for limits and cleanup. Phase 3+ for monitoring dashboard.

**Confidence:** HIGH -- basic server administration, but commonly forgotten for media-heavy applications.

---

### Pitfall 8: Seek Inaccuracy with Variable Bit Rate (VBR) MP3

**What goes wrong:** User clicks a position in the waveform but playback jumps to a slightly different position -- off by several seconds. The waveform progress indicator and actual playback position drift apart over a long track.

**Why it happens:** MP3 files with variable bit rate (VBR) do not have a linear relationship between byte position and time position. HTTP range requests work on byte offsets, but seeking needs time offsets. Without proper VBR headers (Xing/LAME), the browser guesses the seek position based on average bitrate, which is inaccurate for VBR files. This is worse on longer tracks where the accumulated error is larger.

**Prevention:**
- Transcode to constant bit rate (CBR) MP3 during upload processing: `ffmpeg -i input.wav -b:a 320k -codec:a libmp3lame output.mp3` (CBR is the default when you specify `-b:a`)
- Alternatively, ensure VBR files have proper Xing headers (most modern encoders add these, but re-encoded or concatenated files may lack them)
- If using Opus/WebM, this problem does not apply (Opus containers have proper seeking metadata)

**Detection:** Upload a VBR MP3. Play it, then seek to 45:00 in a 60-minute track. Check if the actual playback position matches the displayed position.

**Phase:** Phase 1 (upload processing). Transcoding to CBR should be part of the pipeline.

**Confidence:** MEDIUM -- documented in Web Audio discussions and HTML5 audio precision libraries.

**Sources:**
- [@synesthesia-project/precise-audio](https://www.npmjs.com/package/@synesthesia-project/precise-audio)
- [Gapless-5: HTML5 and WebAudio](https://github.com/regosen/Gapless-5)

---

### Pitfall 9: File Upload Security Vulnerabilities

**What goes wrong:** An attacker uploads a malicious file disguised as an audio file (e.g., a PHP script renamed to `.mp3`, or a polyglot file). If the file is served with incorrect content-type headers or from a path that allows execution, it could lead to remote code execution or XSS.

**Why it happens:** Validating only the file extension or the `Content-Type` header from the HTTP request is trivially bypassable. The client controls both of these values. Even MIME type checking can be fooled by polyglot files.

**Prevention:**
- Validate magic bytes (file signatures) server-side using a library like `file-type` (npm)
- Whitelist accepted formats: MP3, WAV, FLAC, AAC, OGG, AIFF, OPUS
- Reject anything that does not pass magic byte validation, regardless of extension
- Run uploaded files through `ffprobe` -- if ffprobe cannot parse it as audio, reject it
- Store uploaded files outside the web root; serve them through Caddy's `file_server` with explicit `Content-Type: audio/*` headers
- Generate unique filenames (UUIDs) -- never use the original filename for storage
- Authelia protects the admin upload UI, but still validate server-side (defense in depth)

**Detection:** Try uploading a text file renamed to `.mp3`. If it is accepted and stored, validation is insufficient.

**Phase:** Phase 1 (upload pipeline). Security must be built in from the start.

**Confidence:** HIGH -- OWASP Unrestricted File Upload is a well-documented vulnerability class.

**Sources:**
- [OWASP: Unrestricted File Upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- [OWASP: File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

---

### Pitfall 10: Caddy Response Buffering Breaking Audio Streaming

**What goes wrong:** Audio streams are interrupted, stall, or have high latency. Large audio files take an unexpectedly long time to start playing. The reverse proxy seems to be buffering the entire response before sending it to the client.

**Why it happens:** When using Caddy as a reverse proxy to Node.js, Caddy may buffer the response before forwarding it. This is fine for small API responses but catastrophic for streaming large audio files. The default behavior does not periodically flush the response buffer.

**Prevention:**
- Serve audio files directly via Caddy's `file_server` (not proxied through Node.js) -- this avoids the problem entirely
- If audio must go through the reverse proxy, set `flush_interval -1` in the Caddy `reverse_proxy` directive to disable response buffering and flush immediately after each write
- If using `file_server`, Caddy handles streaming natively and this is not an issue

**Detection:** Start playing a 60-minute track. Check the Network tab -- if the initial response takes more than 1-2 seconds, or if the entire file appears to download before playback begins, buffering is the cause.

**Phase:** Phase 1 (architecture). Caddy configuration is part of initial setup.

**Confidence:** MEDIUM -- documented in Caddy community forums for audio/video streaming use cases.

**Sources:**
- [Caddy community: Audio streaming issues with reverse proxy](https://caddy.community/t/audio-streaming-issues-with-caddy-reverse-proxy/20559)
- [Caddy docs: reverse_proxy flush_interval](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

---

## Minor Pitfalls

### Pitfall 11: Waveform Peaks File Bloat

**What goes wrong:** Waveform peaks JSON files become unnecessarily large, adding to storage consumption and slowing down frontend load times.

**Why it happens:** Using too many pixels-per-second or 16-bit depth when generating peaks data. A 60-minute track with `--pixels-per-second 200 --bits 16` produces a peaks file that is several megabytes. This is downloaded by every visitor before the waveform renders.

**Prevention:**
- Use `--pixels-per-second 10` (or at most 20) and `--bits 8` for peaks generation
- For a typical waveform display width of 800-1200px, you need at most 1200 data points for the entire track -- excessive resolution is invisible
- Use binary `.dat` format instead of JSON (smaller even after gzip)
- Serve peaks files with appropriate `Cache-Control` headers so they are cached by the browser
- Command: `audiowaveform -i track.mp3 -o track.json --pixels-per-second 10 --bits 8`

**Detection:** Check the file size of generated peaks JSON. If it is over 50KB for a typical track, the resolution is too high.

**Phase:** Phase 1 (upload pipeline configuration).

**Confidence:** HIGH -- documented in audiowaveform and wavesurfer.js documentation.

**Sources:**
- [wavesurfer.js FAQ: pre-decoded peaks](https://wavesurfer.xyz/faq/)
- [audiowaveform README](https://github.com/bbc/audiowaveform)

---

### Pitfall 12: Missing or Incorrect Content-Type Headers for Audio

**What goes wrong:** Browser refuses to play audio, or plays it incorrectly. Some browsers download the file instead of streaming it. Cover art images do not display.

**Why it happens:** Caddy and Node.js infer content types from file extensions. If audio files are stored with non-standard extensions (e.g., `.opus` without a `.webm` container, or UUID-named files without extensions), the wrong `Content-Type` is served.

**Prevention:**
- Store transcoded audio with proper extensions (`.mp3`, `.webm`, `.ogg`)
- If using UUID filenames, store the MIME type in the database and set headers explicitly
- Verify Caddy's MIME type mappings include your audio formats
- Test that `Content-Type: audio/mpeg` is returned for MP3 files in the response headers

**Detection:** Open DevTools Network tab, click on an audio request, check the `Content-Type` response header.

**Phase:** Phase 1 (file storage and serving architecture).

**Confidence:** HIGH -- basic HTTP but commonly overlooked with generated filenames.

---

### Pitfall 13: No Graceful Handling of Processing Failures

**What goes wrong:** An upload fails during transcoding or waveform generation, leaving orphaned files, partial database entries, or a track that appears in the listing but cannot be played.

**Why it happens:** FFmpeg can fail for many reasons: corrupt input file, unsupported codec, out of disk space, killed by OOM. If the upload pipeline does not handle these failures atomically, the system is left in an inconsistent state.

**Prevention:**
- Use a status field on track records: `processing`, `ready`, `failed`
- Only show `ready` tracks to public visitors
- Wrap the processing pipeline in a try/catch that cleans up partial files on failure
- Log FFmpeg stderr output on failure for debugging
- Show processing status in the admin UI so failed uploads are visible and can be retried
- Consider a processing queue (even a simple in-memory queue) so a failed job does not crash the server

**Detection:** Upload a corrupt audio file (e.g., a truncated MP3). Check if it appears in the track listing and whether the admin UI indicates the failure.

**Phase:** Phase 1 (upload pipeline). Error handling must be designed into the pipeline from the start.

**Confidence:** HIGH -- standard engineering practice, but frequently skipped in v1 implementations.

---

### Pitfall 14: Cover Art Sizing and Loading Performance

**What goes wrong:** Cover art images are served at original resolution (e.g., 3000x3000px artwork from Ableton exports), causing slow page loads, layout shifts, and excessive bandwidth usage. Or cover art is stretched/squished because aspect ratios are not enforced.

**Why it happens:** Album artwork from DAWs and music production tools is often very high resolution. Serving these directly without resizing wastes bandwidth and slows rendering, especially on track listing pages with many visible covers.

**Prevention:**
- Generate thumbnails during upload processing (e.g., 300x300 and 600x600)
- Use `sharp` (npm) for server-side image resizing -- it is fast and memory-efficient
- Serve thumbnails on listing pages, full-size on detail/player pages
- Use fixed aspect ratio containers in CSS (`aspect-ratio: 1/1`) to prevent layout shifts
- Support tracks without cover art with a default placeholder

**Detection:** Load the track listing page. Check DevTools Network tab for image sizes. If any cover art response is over 200KB, it needs resizing.

**Phase:** Phase 1 (upload pipeline) for thumbnail generation. Phase 2 for frontend display.

**Confidence:** HIGH -- standard web performance practice.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Upload pipeline | Raw file storage without processing (Pitfall 3) | Build transcoding + peaks generation from day one |
| Upload pipeline | Processing failures leaving orphaned data (Pitfall 13) | Atomic processing with status tracking |
| Upload pipeline | File upload security bypass (Pitfall 9) | Magic byte validation + ffprobe verification |
| Streaming architecture | Missing range request support (Pitfall 2) | Caddy file_server, not Node.js, serves audio |
| Streaming architecture | Node.js serving static files (Pitfall 4) | Architecture: Caddy static, Node.js API only |
| Streaming architecture | Caddy buffering (Pitfall 10) | Use file_server for audio, not reverse_proxy |
| Waveform player | Client-side decoding crash (Pitfall 1) | Server-side peaks with audiowaveform |
| Waveform player | iOS autoplay restrictions (Pitfall 5) | Lazy AudioContext creation on user gesture |
| Waveform player | Mobile performance (Pitfall 6) | Pre-computed peaks, real-device testing |
| Waveform player | Seek inaccuracy (Pitfall 8) | CBR transcoding in upload pipeline |
| Storage management | Disk exhaustion (Pitfall 7) | Monitoring, cleanup, upload limits |
| UI/frontend | Cover art performance (Pitfall 14) | Server-side thumbnail generation |
| UI/frontend | Missing content types (Pitfall 12) | Proper file extensions and MIME configuration |

---

## Key Takeaway

The single most impactful architectural decision is: **process audio on upload, not on playback**. This one principle prevents Pitfalls 1, 3, 8, 11, and 14. SoundCloud's architecture blog confirms this -- they use RabbitMQ to asynchronously process uploads (transcode, generate waveforms, extract metadata, notify). For a single-user admin platform, a simple synchronous pipeline (or a basic queue) achieves the same goal without the complexity.

The second most impactful decision is: **let Caddy serve audio files directly**. This prevents Pitfalls 2, 4, and 10 with zero custom code.

**Sources:**
- [SoundCloud: Waveforms, Let's Talk About Them](https://developers.soundcloud.com/blog/waveforms-let-s-talk-about-them/)
- [SoundCloud Architecture Evolution](https://medium.com/@stephen_sun/the-evolution-of-soundclouds-architecture-part-1-20a876e621a0)
- [Joe Karlsson: Self-Hosted Music Still Sucks in 2025](https://www.joekarlsson.com/2025/06/self-hosted-music-still-sucks-in-2025/)
