# wallybrain-music

## What This Is

A self-hosted music platform at wallyblanchard.com/music where wallybrain publishes and presents music. Features an immersive visual experience with per-track color theming, waveform gradient playback via wavesurfer.js, custom OKLCH design tokens, View Transitions API navigation, grid/list layout toggle, and a glassmorphism persistent player bar. Includes cover art with ambient glow effects, admin upload/edit behind Authelia 2FA, content filtering, play counts, and Open Graph sharing. Supports finished tracks, live sets, experiments, and raw Ableton exports.

## Core Value

Visitors can discover and listen to wallybrain's music through an immersive, visually engaging player — the waveform experience combined with per-track color theming is what makes this feel like a real music platform, not just a file listing.

## Current State

**Shipped:** v1.1 Visual Polish (2026-02-10)
**Codebase:** ~2,472 LOC (Svelte/TypeScript), SvelteKit 2 + Svelte 5 + SQLite + Docker
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
- ✓ Custom typography (Space Grotesk headings, Space Mono timestamps) — v1.1
- ✓ OKLCH design tokens via Tailwind v4 @theme with semantic naming — v1.1
- ✓ WCAG AA contrast (4.5:1 minimum) on all text — v1.1
- ✓ Typography hierarchy (distinct headings, body, captions, metadata) — v1.1
- ✓ Waveform gradient (purple-to-violet progression) — v1.1
- ✓ Cover art depth (shadow/glow elevation) — v1.1
- ✓ Track card hover micro-interactions — v1.1
- ✓ Player bar glassmorphism (translucent blur) — v1.1
- ✓ Background atmosphere (radial gradient, not flat) — v1.1
- ✓ Skeleton loading placeholders — v1.1
- ✓ Dominant color extraction with ambient tint on track detail — v1.1
- ✓ Equalizer bar animation indicator on playing tracks — v1.1
- ✓ Staggered entrance animations on track listing — v1.1
- ✓ Cover art ambient glow matching dominant color — v1.1
- ✓ Grid/list layout toggle with persistent preference — v1.1
- ✓ View Transitions API smooth page navigation — v1.1
- ✓ Cover art hover zoom on track cards — v1.1

### Active

(None — define requirements for next milestone via `/gsd:new-milestone`)

### Out of Scope

- User accounts / authentication for visitors — display-only; social interaction deferred
- Download buttons — not offering downloads
- Comments / likes / reposts — real interaction deferred to future version
- Mobile app — web only
- Monetization / payments — not a commercial platform
- Video content — audio-only platform
- Light mode / theme switcher — dark theme is core to electronic music identity
- Real-time audio visualizer (canvas-based) — high complexity, not core
- Particle backgrounds — performance cost, distracting
- Custom cursor — accessibility concerns

## Context

- **Existing infrastructure**: wallyblanchard.com runs on Caddy with Authelia 2FA, hosting V1be Code Server. Music serves at `/music` path.
- **Artist identity**: "wallybrain" is the music persona; wallyblanchard.com is the personal domain.
- **Design system**: Full OKLCH semantic token system (surfaces, text, accents, borders, waveform) defined in app.css @theme block. All colors are semantic — no hardcoded zinc/violet values remain.
- **Visual identity**: Per-track color theming via dominant color extraction (sharp), ambient tint overlays, cover art glow. Glassmorphism player bar. View Transitions with 150ms crossfade.
- **Content variety**: Tracks range from polished productions to rough Ableton exports. Category system handles this via type field.
- **Related project**: ableton-mcp (~/ableton-mcp/) is an MCP server for Claude-to-Ableton Live control.
- **Known tech debt**: Pre-existing Drizzle type error (category type mismatch), TrackCardGrid reimplements image rendering (DRY), second backdrop-blur-sm on grid play overlay.

## Constraints

- **Hosting**: Integrates with existing Caddy + Authelia setup on wallyblanchard.com
- **Storage**: Audio files stored on the VPS directly (no cloud storage / S3)
- **Admin access**: Upload UI behind Authelia 2FA
- **Performance**: Waveform generation and audio streaming work for tracks up to ~60min (live sets)
- **Mobile audio**: Limit backdrop-blur to single primary element (player bar) — additional blur causes audio stutter
- **Waveform safety**: Never apply CSS transforms/filters on waveform ancestor elements — breaks drag-to-seek

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Path-based routing (/music) over subdomain | Simpler Caddy config, single domain | ✓ Good |
| Server-side audio storage over S3/R2 | Simpler for v1, avoids cloud costs | ✓ Good |
| Display-only social over real accounts | Reduces v1 complexity | ✓ Good |
| Dark/moody aesthetic | Fits electronic music genre | ✓ Good — v1.1 polished it from bland to distinctive |
| SvelteKit + Svelte 5 with $state runes | Modern reactive patterns, SSR support | ✓ Good |
| SQLite via Drizzle ORM | Simple, no external DB process | ✓ Good |
| In-process job queue (no Redis/Bull) | Sequential processing sufficient for personal use | ✓ Good |
| wavesurfer.js with server-side peaks | Instant waveform render, no client decode | ✓ Good |
| Persistent player outside {@render children()} | Survives SvelteKit page navigation | ✓ Good |
| Queue from visible (filtered) tracks | Natural UX — play what you're browsing | ✓ Good |
| OKLCH color space over hex/HSL | Perceptually uniform, modern CSS, better gradients | ✓ Good |
| Semantic tokens via Tailwind v4 @theme | Single source of truth for all colors, easy theming | ✓ Good |
| sharp stats() for color extraction | Zero new deps (sharp already used for resize) | ✓ Good |
| EqIndicator as pure CSS animation | No JS, GPU-accelerated, tiny footprint | ✓ Good |
| Ambient tint as -z-10 sibling | Avoids CSS transform on waveform ancestors | ✓ Good |
| Hex+alpha for box-shadow glow | Avoids OKLCH browser edge cases in box-shadow | ✓ Good |
| View Transitions API over Svelte transitions | Native, performant, works with SSR navigation | ✓ Good |
| Player bar CSS isolation for transitions | view-transition-name prevents player flicker | ✓ Good |
| Cover art zoom only on sm size | Prevents waveform interference on detail pages | ✓ Good |
| Grid/list via localStorage class store | Persistent, simple, no backend needed | ✓ Good |

---
*Last updated: 2026-02-10 after v1.1 Visual Polish milestone*
