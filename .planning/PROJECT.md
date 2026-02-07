# wallybrain-music

## What This Is

A self-hosted music platform at wallyblanchard.com/music where wallybrain (the artist identity) can upload, organize, and present music to the public in a SoundCloud-like format. Features waveform playback, cover art, track metadata, and a dark/moody aesthetic designed for electronic music. Supports finished tracks, live sets, experiments, and raw Ableton exports.

## Core Value

Visitors can discover and listen to wallybrain's music through an immersive, visually engaging player — the waveform experience is what makes this feel like a real music platform, not just a file listing.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Waveform audio player with scrubbing
- [ ] Track listing / profile page showing all tracks
- [ ] Cover art display per track
- [ ] Genre and tag system for categorization
- [ ] Track descriptions / notes (process, inspiration, gear)
- [ ] Play count tracking (display-only social)
- [ ] Admin upload UI with drag-and-drop
- [ ] Admin metadata editor (title, art, tags, description)
- [ ] Dark/moody visual design
- [ ] Serve at wallyblanchard.com/music via Caddy reverse proxy
- [ ] Audio file storage on server
- [ ] Support for multiple content types (finished, experiments, sets, exports)

### Out of Scope

- User accounts / authentication for visitors — v1 is display-only; social interaction deferred
- Download buttons — not offering downloads in v1
- Comments / likes / reposts — display-only social for now; real interaction in future version
- Mobile app — web only
- Monetization / payments — not a commercial platform
- Video content — audio-only platform

## Context

- **Existing infrastructure**: wallyblanchard.com runs on Caddy with Authelia 2FA, hosting V1be Code Server. The music page will be added as a path (`/music`) on the same domain via Caddy routing.
- **Artist identity**: "wallybrain" is the music persona; wallyblanchard.com is the personal domain that hosts it. The music page should be branded as wallybrain, not wallyblanchard.
- **Content variety**: Tracks range from polished productions to rough Ableton exports and experiments. The platform needs to handle this range gracefully — perhaps via categories or tags.
- **Growth model**: Starting with a small collection, adding tracks regularly over time. Architecture should handle growing library without redesign.
- **Related project**: ableton-mcp (~/ableton-mcp/) is an MCP server for Claude-to-Ableton Live control — separate but thematically related.

## Constraints

- **Hosting**: Must integrate with existing Caddy + Authelia setup on wallyblanchard.com
- **Storage**: Audio files stored on the VPS directly (no cloud storage / S3 for v1)
- **Admin access**: Upload UI must be behind authentication (Authelia or equivalent)
- **Performance**: Waveform generation and audio streaming must work smoothly for tracks up to ~60min (live sets)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Path-based routing (/music) over subdomain | Simpler Caddy config, single domain, unified identity | — Pending |
| Server-side audio storage over S3/R2 | Simpler for v1, avoids cloud costs, sufficient for personal catalog | — Pending |
| Display-only social over real accounts | Reduces v1 complexity dramatically; can add accounts later | — Pending |
| Dark/moody aesthetic | Fits electronic music genre and wallybrain brand identity | — Pending |

---
*Last updated: 2026-02-07 after initialization*
