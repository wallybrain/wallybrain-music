# Technology Stack

**Project:** wallybrain-music
**Researched:** 2026-02-07

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SvelteKit | 2.x (Svelte 5) | Full-stack framework (UI + API routes) | Ships 40-60% less JS than React equivalents. Built-in API routes eliminate separate backend. Svelte 5 runes provide clean reactivity. adapter-node deploys behind Caddy identically to the existing V1be setup. Single process = simpler Docker container. | HIGH |
| Node.js | 20.x (already installed) | Runtime | Already on the server. LTS through April 2026. No reason to change. | HIGH |
| TypeScript | 5.x | Type safety | SvelteKit has first-class TS support. Drizzle ORM requires it for schema type safety. Catches bugs before runtime. | HIGH |

**Why SvelteKit over alternatives:**

- **Not Next.js:** Heavier runtime, React ecosystem overhead, Vercel-centric tooling. Overkill for a single-user music site.
- **Not Astro:** Optimized for content/static sites. Lacks the interactive SPA-like behavior needed for a continuous audio player that persists across page navigation.
- **Not separate Fastify + Svelte SPA:** Adds deployment complexity (two processes), CORS configuration, and duplicate routing logic. SvelteKit's server routes handle API needs cleanly in one process.

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SQLite | 3.x (via better-sqlite3) | Primary data store | Single-file database. No separate process. Perfect for single-user/admin app. Backup = copy one file. Already used by Authelia on this server. | HIGH |
| better-sqlite3 | 12.6.x | SQLite driver | Fastest synchronous SQLite driver for Node.js. Drizzle ORM's recommended SQLite driver. | HIGH |
| Drizzle ORM | 0.45.x | Query builder + schema | Type-safe SQL. ~7kb minified. Zero binary dependencies. Generates single optimized queries (no N+1). Drizzle Kit handles migrations. Far lighter than Prisma. | HIGH |
| drizzle-kit | latest | Migrations | Automatic SQL migration generation from schema changes. `push` for dev, `generate`/`migrate` for production. | HIGH |

**Why SQLite over PostgreSQL:** This is a single-admin music catalog, not a multi-user SaaS. SQLite eliminates a database container, simplifies backup (copy a file), and has zero concurrent-write concerns with one admin user. If the project ever needs multi-user features, migrating to PostgreSQL via Drizzle is straightforward since Drizzle abstracts the driver.

### Audio Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ffmpeg | system package | Waveform peak generation, audio transcoding | Industry standard. Can extract peak data for waveform visualization without loading entire files into memory. Already available via apt. | HIGH |
| music-metadata | 11.x | ID3/metadata parsing | Extracts title, artist, album, duration, genre from uploaded audio files. Pure ESM. Supports MP3, FLAC, WAV, OGG, AAC. Promise-based API. Actively maintained (published days ago). | HIGH |
| sharp | 0.34.x | Cover art processing | Resizes uploaded cover art to multiple sizes (thumbnail, player, full). 20x faster than Jimp. Built on libvips. WebP/AVIF output for modern browsers. | HIGH |

**Why ffmpeg for waveform peaks over audiowaveform (BBC):**
- ffmpeg is already available via apt and handles transcoding needs too
- audiowaveform requires compiling from source or adding a PPA
- For pre-computed peaks fed to wavesurfer.js, ffmpeg's `astats` filter extracts gain data that can be normalized to 0-1 range
- If peak quality is insufficient, audiowaveform can be added later as an enhancement

### Frontend / UI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| wavesurfer.js | 7.x | Waveform visualization + playback | The standard for browser audio waveform rendering. Built on Web Audio API + Canvas. Shadow DOM isolation. Supports pre-computed peaks (critical for performance). Plugins for regions, minimap, timeline. TypeScript types included. | HIGH |
| Tailwind CSS | 4.x | Styling | Utility-first. v4 has 5x faster full builds, 100x faster incremental. No config file needed (CSS-first configuration). Dark mode via `prefers-color-scheme` or class strategy. Perfect for custom dark/moody aesthetic without fighting a component library. | HIGH |

**Why NOT a component library (Skeleton UI, DaisyUI, etc.):** The goal is a dark/moody electronic music aesthetic -- a custom brand, not a generic UI. Component libraries impose design opinions that would need extensive overriding. Tailwind gives full control. The UI surface is small (player, track list, upload form) so the productivity gain from a component library is minimal.

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | 29.x (installed) | Containerization | Consistent deployment. Matches existing V1be pattern. Single Dockerfile for the SvelteKit app. | HIGH |
| Docker Compose | v2 (installed) | Orchestration | Extends existing Caddy compose stack or runs standalone behind it. Health checks, restart policies, volume mounts for audio storage. | HIGH |
| Caddy | 2.x (existing) | Reverse proxy + SSL | Already running for wallyblanchard.com. Add `handle /music/*` block to existing Caddyfile. Auto-SSL. No additional setup. | HIGH |
| Authelia | existing | Admin auth (upload UI) | Already configured with TOTP 2FA. Protect `/music/admin/*` routes via `forward_auth`. Public `/music` routes bypass auth. | HIGH |

**Deployment architecture:**
```
Internet -> Caddy (:443, auto HTTPS)
              -> /music/*        -> wallybrain-music container (:3000)
              -> /music/admin/*  -> forward_auth Authelia -> wallybrain-music container (:3000)
              -> /               -> code-server (existing)
```

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| @sveltejs/adapter-node | latest | SvelteKit Node deployment | Always -- builds SvelteKit for Node.js server | HIGH |
| @wavesurfer/react | -- | DO NOT USE | This is React-specific. Use wavesurfer.js directly in Svelte components with `onMount`. | n/a |
| nanoid | 5.x | Short unique IDs | Track IDs, file names. URL-safe, collision-resistant, smaller than UUID. | MEDIUM |
| slug | latest | URL slugs | Generate URL-friendly track slugs from titles. | MEDIUM |
| mime-types | latest | MIME detection | Validate uploaded file types on the server side. | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | SvelteKit | Next.js | Heavier runtime, React overhead, Vercel-centric. Overkill for single-user site. |
| Framework | SvelteKit | Astro | No persistent audio player across navigation. Static-first, not app-first. |
| Framework | SvelteKit | Fastify + Svelte SPA | Two processes, CORS config, deployment complexity. SvelteKit handles both. |
| Database | SQLite | PostgreSQL | Requires separate container/process. Overkill for single-admin catalog. |
| ORM | Drizzle | Prisma | Heavier (~8MB engine binary). Slower cold starts. Query engine overhead. |
| ORM | Drizzle | Knex | Less type safety. Drizzle's TypeScript integration is superior. |
| Waveform | wavesurfer.js | Peaks.js (BBC) | Peaks.js requires Konva dependency and audiowaveform binary. wavesurfer.js is lighter and more widely used. |
| CSS | Tailwind | Skeleton UI | Imposes design system. Harder to achieve custom dark/moody branding. |
| CSS | Tailwind | DaisyUI | Same issue -- predefined themes conflict with bespoke aesthetic. |
| Image | sharp | Jimp | 20x slower. No native bindings = pure JS performance ceiling. |
| Process Mgr | Docker | PM2 | Already using Docker. PM2 adds another layer. Docker handles restarts, health checks. |
| Peaks | ffmpeg | audiowaveform (BBC) | Requires compilation from source. ffmpeg already available. Can upgrade later if needed. |
| Metadata | music-metadata | node-id3 | music-metadata supports more formats (FLAC, OGG, AAC), not just MP3. |

## File Storage Strategy

Audio files and cover art stored on the filesystem, not in the database.

```
/data/
  audio/          # Original uploaded audio files
    {trackId}.mp3
    {trackId}.flac
  peaks/          # Pre-computed waveform peak JSON
    {trackId}.json
  covers/         # Cover art at multiple sizes
    {trackId}-full.webp     # Original/large
    {trackId}-thumb.webp    # 200x200 thumbnail
    {trackId}-player.webp   # 400x400 for player
```

**Why filesystem over object storage (S3/MinIO):** Single server. No CDN needed for a personal site. Filesystem is simpler, faster for local access, and backed up with the rest of the server. Docker volume mount makes it persistent.

## Installation

```bash
# Initialize project
npx sv create wallybrain-music  # SvelteKit scaffolding with Svelte 5
cd wallybrain-music

# Core dependencies
npm install wavesurfer.js drizzle-orm better-sqlite3 music-metadata sharp

# Dev dependencies
npm install -D drizzle-kit @sveltejs/adapter-node tailwindcss @types/better-sqlite3 typescript
```

## Version Verification Notes

| Package | Version Claimed | Verification Method | Date Verified |
|---------|----------------|--------------------|--------------|
| wavesurfer.js | 7.x (7.11-7.12 range) | npm registry search | 2026-02-07 |
| better-sqlite3 | 12.6.2 | npm registry search | 2026-02-07 |
| drizzle-orm | 0.45.1 | npm registry search | 2026-02-07 |
| sharp | 0.34.5 | npm registry search | 2026-02-07 |
| music-metadata | 11.10.6 | npm registry search | 2026-02-07 |
| Tailwind CSS | 4.1.18 | npm registry + GitHub releases | 2026-02-07 |
| Fastify | 5.7.4 (NOT USED but verified) | npm registry search | 2026-02-07 |
| SvelteKit | 2.49.x | GitHub releases search | 2026-02-07 |

## Sources

- [wavesurfer.js official site](https://wavesurfer.xyz/) - Waveform library docs and features
- [wavesurfer.js npm](https://www.npmjs.com/package/wavesurfer.js) - Version verification
- [wavesurfer.js GitHub](https://github.com/katspaugh/wavesurfer.js) - Pre-computed peaks support
- [Drizzle ORM official docs](https://orm.drizzle.team/) - SQLite integration guide
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) - Version verification
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) - Version verification
- [sharp official site](https://sharp.pixelplumbing.com/) - Image processing capabilities
- [music-metadata npm](https://www.npmjs.com/package/music-metadata) - Audio metadata parsing
- [SvelteKit docs - adapter-node](https://svelte.dev/docs/kit/adapter-node) - Node.js deployment
- [SvelteKit docs - configuration](https://svelte.dev/docs/kit/configuration) - Base path config
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) - Performance improvements
- [Fastify vs Express comparison](https://betterstack.com/community/guides/scaling-nodejs/fastify-express/) - Framework benchmarks (informed decision NOT to use separate backend)
- [SQLite vs PostgreSQL comparison](https://www.datacamp.com/blog/sqlite-vs-postgresql-detailed-comparison) - Database selection rationale
- [ffmpeg-peaks npm](https://www.npmjs.com/package/ffmpeg-peaks) - Server-side peak generation
- [BBC audiowaveform GitHub](https://github.com/bbc/audiowaveform) - Alternative peak generation (considered but deferred)
- [Caddy reverse proxy docs](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) - Subpath routing
- [SvelteKit streaming guide](https://khromov.se/sveltekit-streaming-the-complete-guide/) - Audio streaming approaches
