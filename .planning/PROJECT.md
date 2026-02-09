# wallybrain-music

## What This Is

A self-hosted music platform at wallyblanchard.com/music where wallybrain publishes and presents music. Features waveform playback via wavesurfer.js, cover art, track metadata, persistent bottom-bar player with queue management, admin upload/edit interface behind Authelia 2FA, content filtering, play counts, and Open Graph sharing. Supports finished tracks, live sets, experiments, and raw Ableton exports.

## Core Value

Visitors can discover and listen to wallybrain's music through an immersive, visually engaging player — the waveform experience is what makes this feel like a real music platform, not just a file listing.

## Current State

**Shipped:** v1.0 MVP (2026-02-09)
**Codebase:** ~2,080 LOC (Svelte/TypeScript), SvelteKit 2 + Svelte 5 + SQLite + Docker
**Live at:** wallyblanchard.com/music

## Requirements

### Validated

- ✓ Waveform audio player with scrubbing — v1.0
- ✓ Track listing / profile page showing all tracks — v1.0
- ✓ Cover art display per track — v1.0
- ✓ Genre and tag system for categorization — v1.0
- ✓ Track descriptions / notes (process, inspiration, gear) — v1.0
- ✓ Play count tracking (display-only social) — v1.0
- ✓ Admin upload UI with drag-and-drop — v1.0
- ✓ Admin metadata editor (title, art, tags, description) — v1.0
- ✓ Dark/moody visual design — v1.0
- ✓ Serve at wallyblanchard.com/music via Caddy reverse proxy — v1.0
- ✓ Audio file storage on server — v1.0
- ✓ Support for multiple content types (finished, experiments, sets, exports) — v1.0
- ✓ Persistent bottom-bar player across page navigation — v1.0
- ✓ Continuous auto-play queue — v1.0

### Active

- [ ] Full visual redesign — distinctive identity, not generic Tailwind
- [ ] Visual richness — animations, gradients, textures, depth
- [ ] Typography and layout polish — spacing, hierarchy, font choices
- [ ] Cover art elevation — balanced with waveform, not secondary
- [ ] Minor UX fixes discovered during v1.0 usage

## Current Milestone: v1.1 Visual Polish

**Goal:** Transform the bland, template-looking site into a visually distinctive music platform that blends SoundCloud's functional clarity with Bandcamp's artistic presentation.

**Target:**
- Distinctive wallybrain visual identity (not generic Tailwind)
- Visual richness: animations, gradients, textures, depth
- Elevated cover art presentation balanced with waveform
- Typography and layout refinement
- Minor UX fixes

### Out of Scope

- User accounts / authentication for visitors — v1 is display-only; social interaction deferred
- Download buttons — not offering downloads in v1
- Comments / likes / reposts — display-only social for now; real interaction in future version
- Mobile app — web only
- Monetization / payments — not a commercial platform
- Video content — audio-only platform

## Context

- **Existing infrastructure**: wallyblanchard.com runs on Caddy with Authelia 2FA, hosting V1be Code Server. Music serves at `/music` path.
- **Artist identity**: "wallybrain" is the music persona; wallyblanchard.com is the personal domain.
- **User feedback**: Site works functionally but looks "bland" — visual polish is the clear next priority.
- **Content variety**: Tracks range from polished productions to rough Ableton exports. Category system handles this via type field.
- **Related project**: ableton-mcp (~/ableton-mcp/) is an MCP server for Claude-to-Ableton Live control.

## Constraints

- **Hosting**: Integrates with existing Caddy + Authelia setup on wallyblanchard.com
- **Storage**: Audio files stored on the VPS directly (no cloud storage / S3)
- **Admin access**: Upload UI behind Authelia 2FA
- **Performance**: Waveform generation and audio streaming work for tracks up to ~60min (live sets)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Path-based routing (/music) over subdomain | Simpler Caddy config, single domain | ✓ Good |
| Server-side audio storage over S3/R2 | Simpler for v1, avoids cloud costs | ✓ Good |
| Display-only social over real accounts | Reduces v1 complexity | ✓ Good |
| Dark/moody aesthetic | Fits electronic music genre | ⚠️ Revisit — "bland" feedback |
| SvelteKit + Svelte 5 with $state runes | Modern reactive patterns, SSR support | ✓ Good |
| SQLite via Drizzle ORM | Simple, no external DB process | ✓ Good |
| In-process job queue (no Redis/Bull) | Sequential processing sufficient for personal use | ✓ Good |
| wavesurfer.js with server-side peaks | Instant waveform render, no client decode | ✓ Good |
| Persistent player outside {@render children()} | Survives SvelteKit page navigation | ✓ Good |
| Queue from visible (filtered) tracks | Natural UX — play what you're browsing | ✓ Good |

---
*Last updated: 2026-02-09 after v1.1 milestone start*
