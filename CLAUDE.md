# wallybrain-music

## Quick Reference

| Key | Value |
|-----|-------|
| Live at | `wallybrain.icu` |
| Container | `wallybrain-music` — port 8800, `webproxy` network |
| Database | `/data/db/music.db` (SQLite via Drizzle ORM) |
| Auth | Authelia TOTP 2FA at `auth.wallybrain.icu`, protects `/admin/*` |
| Stack | SvelteKit 2, Svelte 5, Tailwind 4, wavesurfer.js 7, sharp, FFmpeg |
| Node | 20 (Docker), non-root user 1001:1001 |

## Architecture

```
Browser → Caddy (SSL, headers) → Authelia (admin routes) → SvelteKit :8800
                                                              ├── SQLite (tracks, collections, tags)
                                                              ├── /data/audio/  (transcoded MP3s)
                                                              ├── /data/peaks/  (waveform JSON)
                                                              └── /data/art/    (cover art + thumbs)
```

## Routes

**Public:**
- `/` — Homepage: logo hero, FilterBar, list/grid toggle, TrackCard listing
- `/track/[slug]` — Track detail: WaveformPlayer, metadata, ambient color tint
- `/collection/[slug]` — Collection: Play All button, ordered track list

**Admin (behind Authelia):**
- `/admin` — Track management list
- `/admin/tracks/[id]` — Edit track metadata + cover art
- `/admin/collections` — Collection list
- `/admin/collections/[id]` — Edit collection, reorder tracks
- `/admin/upload` — Upload (Individual / Album / Playlist modes)

**API:**
- `/api/upload` — File upload endpoint
- `/api/tracks/[id]/{art,audio,peaks,play,status}` — Track resources
- `/api/collections`, `/api/collections/[id]/{art,tracks}` — Collection CRUD

## Key Components

| Component | Purpose |
|-----------|---------|
| `PersistentPlayer` | Bottom bar player, survives navigation (view-transition-name isolated) |
| `WaveformPlayer` | wavesurfer.js wrapper with gradient, seek, peak loading |
| `TrackCard` / `TrackCardGrid` | List/grid track cards with play overlay and EqIndicator |
| `CoverArt` | Reusable art display with `entityType` prop ('tracks' or 'collections') |
| `FilterBar` | Category + tag filter UI |
| `WallybrainLogo` | SVG logo, `size` prop: 'lg' (homepage) / 'sm' (inner pages) |
| `EqIndicator` | Pure CSS animated equalizer bars on playing tracks |

## Processing Pipeline

Upload → FFprobe validate → FFmpeg transcode (192k AAC) → audiowaveform peaks (800 samples) → sharp artwork extraction + thumbnail + dominant color → update collection aggregates if applicable.

Queue-based, sequential, in-process (no Redis).

## Data Model

- **tracks** (19 cols): id, slug, title, description, duration, bitrate, fileSize, audioPath, peaksPath, artPath, artThumb, dominantColor, category (track/set/experiment/export/album/playlist), status (pending/processing/ready/failed), playCount, timestamps
- **collections** (12 cols): id, slug, title, description, type (album/playlist), artist, artPath, dominantColor, trackCount, totalDuration, timestamps
- **collection_tracks**: junction with position ordering
- **tags** + **track_tags**: freeform tag system

## Current Content (2026-02-12)

- 3 tracks (render, Ice Cream Cake, sound), all status=ready
- 0 collections (feature built but unused)
- 2 tags (trip hop, experimental)
- Track "sound" missing: cover art, duration metadata

## Design System

- **Aesthetic**: Space-age metal/carbon fiber, beveled `.metal-panel` elements
- **Colors**: OKLCH semantic tokens in `app.css` @theme block — surfaces, text, accents, borders, waveform gradients
- **Typography**: Space Grotesk (headings), Space Mono (monospace accents)
- **Per-track theming**: Dominant color extraction → ambient tint overlays, cover art glow
- **Player bar**: Glassmorphism (backdrop-blur-md), `z-[10000]` above `body::before` overlay (z-9999)

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v1.0 MVP | 2026-02-09 | Core platform: upload, player, admin, filtering, queue playback |
| v1.1 Visual Polish | 2026-02-10 | OKLCH tokens, typography, waveform gradient, animations, View Transitions |
| v1.2 Space-age | 2026-02-10 | Metal/carbon fiber aesthetic, WallybrainLogo, crosshatch bg |
| v1.3 Collections | 2026-02-11 | Albums/playlists: collections table, upload modes, admin pages, public pages |
| Post-v1.3 | 2026-02-11 | Global nav bar, Sign In/Out, domain migration, security hardening, mobile fixes |

## Known Tech Debt

1. **Drizzle type error** — `+page.server.ts` category type mismatch (pre-existing, not blocking)
2. **TrackCardGrid DRY** — Reimplements image rendering instead of reusing CoverArt component
3. **Stale DB files** — `data/db.sqlite3`, `data/wallybrain-music.db`, `data/music.db`, `data/db/wallybrain.db` are all empty/unused; only `data/db/music.db` is real
4. **Track "sound"** — Missing cover art and duration metadata

## Gotchas

- **backdrop-blur on mobile** causes audio stutter — limit to single element (player bar)
- **CSS transforms on waveform ancestors** break drag-to-seek in wavesurfer.js
- **`body::before` overlay** at z-9999 — sticky/fixed elements need `z-[10000]+`
- **Docker bind mounts track inodes** — `Edit` tool creates new inode, need `docker restart` not just HMR reload
- **Drizzle migration generator** can include stale ALTER TABLE for columns that already exist — always review before deploying
- **Crosshatch bg removed on mobile** (commit `4af943c`) for performance

## Potential Next Features

| Feature | Effort | Notes |
|---------|--------|-------|
| Upload more music (content) | Low | Platform needs tracks more than features |
| About/bio page | Small | Who is wallybrain? Visitors have no context |
| Featured/hero track on homepage | Small | Curated feel vs flat list |
| Per-track OG meta tags | Small | Better sharing on social/Discord |
| Search | Medium | Filter alone won't scale past ~20 tracks |
| RSS/podcast feed | Medium | Distribution channel |
| Waveform comments (SoundCloud-style) | Large | Community engagement |
