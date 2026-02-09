---
status: diagnosed
trigger: "Investigate why the waveform player doesn't play audio on the track detail page at /music/track/{slug}"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T03:50:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two root causes identified: (1) empty source audio produces corrupt MP3 and empty peaks, (2) duration=null causes WaveSurfer to hang waiting for loadedmetadata on a corrupt audio file
test: traced full pipeline from upload -> processing -> DB -> API endpoints -> WaveSurfer init
expecting: n/a - root causes confirmed
next_action: apply fixes to processTrack validation and WaveformPlayer duration handling

## Symptoms

expected: Clicking play on the waveform player plays the track audio
actual: Nothing plays - the Play button appears disabled ("Loading waveform..." may persist), waveform is empty/flat
errors: Browser console likely shows WaveSurfer error or silent hang on loadedmetadata
reproduction: visit /music/track/sound, click play on waveform player
started: After Phase 4 moved player from listing page to detail page only (but the root cause is data/processing, not the move)

## Eliminated

- hypothesis: API routing broken after Phase 4 move (paths hardcoded wrong)
  evidence: Both /music/api/tracks/{id}/audio and /music/api/tracks/{id}/peaks return HTTP 200. The hardcoded /music/ prefix matches the svelte.config.js base path.
  timestamp: 2026-02-08T03:30:00Z

- hypothesis: SvelteKit base path misconfiguration
  evidence: svelte.config.js has base='/music', detail page renders correctly at /music/track/sound, SSR output is valid
  timestamp: 2026-02-08T03:30:00Z

- hypothesis: WaveformPlayer component has a code bug from the Phase 4 move
  evidence: Component code is unchanged - passes trackId and duration correctly. The issue is data-level, not a component bug introduced by the move.
  timestamp: 2026-02-08T03:35:00Z

## Evidence

- timestamp: 2026-02-08T03:20:00Z
  checked: Docker container status
  found: wallybrain-music container is up and healthy, listening on port 8800
  implication: Infrastructure is working

- timestamp: 2026-02-08T03:22:00Z
  checked: Track listing page HTML at /music/
  found: One track exists - id="fb9a6a7e-0f66-4737-b4df-7a004bf0f1de", slug="sound", duration=null
  implication: Duration is null in the database, passed as 0 to WaveformPlayer via `track.duration ?? 0`

- timestamp: 2026-02-08T03:24:00Z
  checked: Peaks endpoint response
  found: Returns empty JSON array `[]` (HTTP 200)
  implication: Peaks data is empty - waveform will render flat/invisible

- timestamp: 2026-02-08T03:24:00Z
  checked: Audio endpoint response headers
  found: Content-Length=1088, Content-Type=audio/mpeg (HTTP 200)
  implication: Audio file is only 1088 bytes - essentially just MP3 ID3 headers with no actual audio frames

- timestamp: 2026-02-08T03:26:00Z
  checked: Original uploaded file
  found: /data/audio/originals/fb9a6a7e-0f66-4737-b4df-7a004bf0f1de.wav is 44 bytes (WAV header only, no audio data)
  implication: The source file has zero audio content - it's an empty WAV

- timestamp: 2026-02-08T03:27:00Z
  checked: ffprobe on transcoded MP3
  found: "Failed to find two consecutive MPEG audio frames" - ffprobe reports the MP3 as invalid
  implication: ffmpeg produced a corrupt/empty MP3 from the empty WAV source

- timestamp: 2026-02-08T03:28:00Z
  checked: Peaks JSON file on disk
  found: {"version":2,"channels":1,"sample_rate":0,"samples_per_pixel":0,"bits":8,"length":0,"data":[]}
  implication: audiowaveform produced empty peaks because the MP3 has no audio data

- timestamp: 2026-02-08T03:29:00Z
  checked: ffprobe on original WAV for duration
  found: ffprobe returns no "duration" field for a 44-byte WAV. validateWithFFprobe returns duration=undefined.
  implication: processTrack stores duration as null in DB

- timestamp: 2026-02-08T03:32:00Z
  checked: Database query for track record
  found: duration=null, status="ready", audio_path and peaks_path both set
  implication: processTrack marked it "ready" despite the audio being empty - no validation of output quality

- timestamp: 2026-02-08T03:40:00Z
  checked: WaveSurfer v7.12.1 constructor source code (lines 86-99)
  found: Constructor calls `this.load(initialUrl, peaks, duration)` because initialUrl is truthy
  implication: WaveSurfer proceeds to loadAudio with URL + peaks + duration=0

- timestamp: 2026-02-08T03:42:00Z
  checked: WaveSurfer loadAudio method (lines 310-362)
  found: When channelData is provided (peaks=[[]] is truthy), blob fetch is SKIPPED. But duration=0 is falsy, so it waits for 'loadedmetadata' event from the media element. The media element is pointed at the corrupt MP3 URL.
  implication: loadedmetadata either never fires or fires with NaN/0 duration. The Promise on line 333 hangs indefinitely. The 'ready' event on line 361 never fires. isLoading stays true. Play button stays disabled.

- timestamp: 2026-02-08T03:45:00Z
  checked: SSR-rendered detail page HTML
  found: Play button renders with `disabled` attribute, "Loading waveform..." text shown
  implication: Confirms the client-side JS must complete initialization to enable playback - the hang prevents this

## Resolution

root_cause: |
  TWO INTERRELATED ROOT CAUSES:

  1. EMPTY SOURCE AUDIO FILE: The uploaded "sound.wav" is only 44 bytes (a bare WAV header with zero audio data). The processing pipeline (processTrack) does not validate that the source file contains actual audio content. ffmpeg produces a corrupt 1088-byte MP3 (ID3 headers only, no audio frames). audiowaveform produces empty peaks (data:[]). ffprobe returns no duration. Despite all this, processTrack marks the track as "ready" with duration=null.

  2. WAVESURFER HANGS ON duration=0 WITH PRE-DECODED PEAKS: The detail page passes `duration: track.duration ?? 0` which evaluates to `0`. WaveformPlayer creates WaveSurfer with `url` (truthy), `peaks: [[]]` (truthy), and `duration: 0` (falsy). Inside WaveSurfer's loadAudio:
     - Because channelData ([[]] is truthy), blob fetch is SKIPPED
     - Because duration=0 is falsy, WaveSurfer waits for 'loadedmetadata' from the HTMLMediaElement
     - The media element tries to load the corrupt MP3 but cannot parse valid audio metadata
     - The loadedmetadata event never fires (or fires with invalid data)
     - The ready event never emits
     - isLoading stays true, Play button stays disabled forever

  Even with valid audio, if duration is null/0 in the DB, WaveSurfer would still have issues because it falls into the loadedmetadata wait path instead of using the pre-decoded peaks path efficiently.

fix: |
  SUGGESTED FIXES (not yet applied):

  1. processTrack.ts - Add validation before marking "ready":
     - Check that duration is a positive number (not null/undefined/0/NaN)
     - Check that the transcoded MP3 is larger than just headers (>2KB minimum)
     - Check that peaks data array is non-empty
     - If any check fails, mark track as "failed" with descriptive error

  2. WaveformPlayer.svelte - Handle duration=0 defensively:
     - If duration is 0 or falsy, don't pass it to WaveSurfer (let WaveSurfer determine it from audio)
     - Or better: show an error state if duration is 0 (track wasn't processed correctly)
     - Add a timeout for the loading state - if still loading after 10s, show error

  3. Upload validation - The 44-byte WAV passed magic byte validation but has no content:
     - Add minimum file size check in upload endpoint (e.g., >1KB for any audio file)
     - Or validate with ffprobe BEFORE accepting the upload

verification:
files_changed: []
