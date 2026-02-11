# wallybrain-music

A self-hosted music platform for publishing and streaming electronic music. Built for [wallybrain.icu](https://wallybrain.icu).

## What it does

Upload audio files, and the platform automatically transcodes them, extracts metadata, generates waveform peaks, and serves them through a browser-based player with interactive waveform visualization. Tracks can be organized into albums and playlists.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit 2 (SSR, Node adapter) |
| UI | Svelte 5, Tailwind CSS 4 |
| Database | SQLite via Drizzle ORM |
| Audio player | wavesurfer.js 7 |
| Processing | FFmpeg (transcode), audiowaveform (peaks), sharp (artwork) |
| Runtime | Node 20, Docker |

## Features

- **Waveform player** with drag-to-seek, per-track dominant color theming, and play count tracking
- **Album/playlist collections** with ordered track lists and Play All
- **Drag-and-drop upload** with background processing pipeline (transcode, peaks, artwork extraction, thumbnail generation)
- **Cover art** extracted from audio metadata or uploaded manually, with dominant color detection
- **Category/tag filtering** on the homepage (tracks, sets, experiments, albums, playlists)
- **Grid and list view** toggle with persistent layout preference
- **Admin panel** for track and collection management (protected by Authelia 2FA)
- **Open Graph/Twitter meta** for link previews with artwork

## Architecture

```
Browser
  |
  v
Caddy (reverse proxy, SSL, security headers)
  |
  +-- / (public)        --> SvelteKit SSR
  +-- /admin/* (2FA)    --> Authelia forward_auth --> SvelteKit SSR
  |
SvelteKit (port 8800)
  |
  +-- SQLite (tracks, collections, tags)
  +-- /data/audio/      (transcoded audio files)
  +-- /data/peaks/      (waveform peak data)
  +-- /data/art/        (cover artwork + thumbnails)
```

## Running locally

```bash
docker compose up -d --build
```

The app serves on port 8800. Upload tracks at `/admin/upload`.

## Processing pipeline

When a file is uploaded:

1. **Validate** with FFprobe (format, duration, bitrate)
2. **Transcode** to 192k AAC via FFmpeg
3. **Generate peaks** with BBC audiowaveform (800 samples)
4. **Extract artwork** from audio metadata (or use uploaded image)
5. **Generate thumbnail** and detect dominant color via sharp
6. **Update collection aggregates** if track belongs to an album/playlist

## Data model

- **tracks** -- audio files with metadata, processing status, play count
- **collections** -- albums or playlists grouping tracks in order
- **tags** -- freeform labels attached to tracks via junction table

## Design

Space-age metal/carbon fiber aesthetic with crosshatch background texture, beveled panels, and ambient lighting overlays. Typography: Space Grotesk (headings) + Space Mono (monospace accents).
