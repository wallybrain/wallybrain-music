# wallybrain-music

## Quick Reference

| Key | Value |
|-----|-------|
| Live at | `wallybrain.net` (primary), `wallybrain.icu` (301 redirects to .net) |
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
- `/` — Homepage: logo hero, album collections grid, TrackCard listing
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
| `TrackCard` | Track card with play overlay and EqIndicator |
| `CoverArt` | Reusable art display with `entityType` prop ('tracks' or 'collections') |
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

## Current Content (2026-02-16)

- 95 tracks, all status=ready
- 9 albums: Oort (13), Pantagruelian Otalgia (12), Garbage Toys (11), MEM (10), Forever Wandering (14), Zero (7), Rejoice in the Wolf (11), 555 (8), ylem (9)
- Every track belongs to an album

## Design System

- **Aesthetic**: Space-age metal/carbon fiber, beveled `.metal-panel` elements
- **Colors**: OKLCH semantic tokens in `app.css` @theme block — surfaces, text, accents, borders, waveform gradients
- **Typography**: Space Grotesk (headings), Space Mono (monospace accents)
- **Per-track theming**: Dominant color extraction → ambient tint overlays, cover art glow
- **Player bar**: Glassmorphism (backdrop-blur-md), `z-[200]` above `body::before` overlay (z-100)
- **Z-index scale**: overlay=100, player=200, nav=300, toasts=400

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v1.0 MVP | 2026-02-09 | Core platform: upload, player, admin, filtering, queue playback |
| v1.1 Visual Polish | 2026-02-10 | OKLCH tokens, typography, waveform gradient, animations, View Transitions |
| v1.2 Space-age | 2026-02-10 | Metal/carbon fiber aesthetic, WallybrainLogo, crosshatch bg |
| v1.3 Collections | 2026-02-11 | Albums/playlists: collections table, upload modes, admin pages, public pages |
| v1.4 Homepage | 2026-02-14 | Homepage redesign with album grid, global nav, Sign In/Out |
| v1.5 Admin & Releases | 2026-02-14 | Bandcamp-style admin panel, batch operations, collection management |
| v1.6 Auth & CSP | 2026-02-14 | Authelia session verification, CSP nonces, Mozilla Observatory A+ |
| v1.8 Player & Reorder | 2026-02-14 | Homepage album reorder (SortableJS), Play All fix, dual playback fix |
| v1.9 Domain Migration | 2026-02-17 | Primary domain → wallybrain.net (.icu 301 redirects), Google Search Console, sitemap, canonical URLs, OG/Twitter meta tags |

## Known Tech Debt

1. **Player behavior** — Known issues with playback state, needs follow-up investigation

## Gotchas

- **Auth cookies are on `.icu` domain** — admin access must go through `wallybrain.icu/admin` (not `.net/admin`) because Authelia session cookies are domain-scoped. The Caddyfile excludes `/admin` from the `.icu` → `.net` redirect.
- **backdrop-blur on mobile** causes audio stutter — limit to single element (player bar)
- **CSS transforms on waveform ancestors** break drag-to-seek in wavesurfer.js
- **`body::before` overlay** at z-100 — player at z-200, nav at z-300, toasts at z-400
- **Docker bind mounts track inodes** — `Edit` tool creates new inode, need `docker restart` not just HMR reload
- **Drizzle migration generator** can include stale ALTER TABLE for columns that already exist — always review before deploying
- **Crosshatch bg removed on mobile** (commit `4af943c`) for performance

## Potential Next Features

| Feature | Effort | Notes |
|---------|--------|-------|
| **v1.7 Store** | Large | Stripe Checkout store — sell tracks/albums as downloads. Research in `.planning/research/STORE-FEATURE-NOTES.md` |
| Fix player issues | Medium | Playback state bugs flagged but not yet investigated |
| ~~Per-track OG meta tags~~ | ~~Small~~ | Done — canonical URLs, OG tags, Twitter cards all on .net |
| Search | Medium | Won't scale past ~100 tracks without it |
| RSS/podcast feed | Medium | Distribution channel |
