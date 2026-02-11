# Technology Stack: Revenue-Generating Music Platform

**Project:** Music marketplace platform (new project, inheriting from wallybrain-music)
**Researched:** 2026-02-10

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SvelteKit 2 | ^2.50 | Full-stack framework | Already proven in wallybrain-music. SSR for SEO (artist pages need to be indexable). Excellent DX for solo dev. Lighter than Next.js. |
| Svelte 5 | ^5.50 | UI framework | Runes reactivity model, compact bundle size, excellent performance. Already have deep expertise from v1.0/v1.1 work. |
| Tailwind CSS 4 | ^4.1 | Styling | OKLCH design tokens via @theme already built for wallybrain-music. Port the entire design system. |
| wavesurfer.js | ^7.12 | Audio waveform player | The signature UI differentiator. Gradient waveforms, per-track color theming already built. Port directly. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16+ | Primary database | Multi-tenant, concurrent writes, proper access control, JSONB for flexible metadata, full-text search built-in. SQLite cannot handle multi-user concurrent writes safely. |
| Drizzle ORM | ^0.45 | Database ORM | Already used in wallybrain-music with SQLite. Drizzle supports PostgreSQL with the same API -- schema definitions change from `sqliteTable` to `pgTable` but query patterns are identical. Zero new learning. |
| drizzle-kit | ^0.31 | Migrations | Same CLI, different dialect config. Migration path is well-documented. |

**Why PostgreSQL over SQLite:**
- SQLite allows only one writer at a time -- a marketplace with concurrent uploads, purchases, and page views will deadlock
- PostgreSQL has row-level security, proper user management, and connection pooling
- Full-text search (via `tsvector`) eliminates the need for a separate search service
- JSONB columns handle semi-structured metadata (track credits, liner notes, etc.)
- Every production SaaS uses PostgreSQL or MySQL -- SQLite is for embedded/single-user only

**Confidence:** HIGH -- PostgreSQL is the industry standard for multi-tenant web apps. Drizzle's PostgreSQL support is documented.

### Object Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare R2 | Current | Audio files, cover art, waveform peaks | Zero egress fees. $0.015/GB/month storage. Free tier: 10GB storage, 10M Class B reads/month, 1M Class A writes/month. S3-compatible API. |

**Why Cloudflare R2 over alternatives:**
- **vs. S3:** AWS charges $0.09/GB egress. Audio streaming is bandwidth-heavy -- at 100 streams/day of 5MB tracks, that is 15GB/month egress = $1.35/month on S3 vs. $0 on R2. At scale, this difference becomes enormous.
- **vs. Backblaze B2:** B2 is cheaper storage ($0.005/GB vs $0.015/GB) but charges $0.01/GB egress. For a platform serving audio files publicly, egress costs dominate. R2 wins.
- **vs. Local VPS storage:** The current wallybrain-music uses local `/data/` volume. This does not scale, has no CDN, and ties storage to a single server. R2 provides global CDN via Cloudflare's edge network.

**Cost projection:**
| Scale | Storage (audio + art) | Monthly R2 Cost | Notes |
|-------|----------------------|-----------------|-------|
| 50 artists, 500 tracks | ~25 GB | ~$0.38 | Well within free tier for reads |
| 200 artists, 2000 tracks | ~100 GB | ~$1.50 | Negligible |
| 1000 artists, 10000 tracks | ~500 GB | ~$7.50 | Still cheaper than a VPS disk upgrade |

**Confidence:** HIGH -- R2 pricing verified via [official Cloudflare R2 pricing page](https://developers.cloudflare.com/r2/pricing/).

### Payments

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Stripe Connect (Standard) | Current | Artist payouts, fan purchases | Industry standard for marketplace payments. Standard accounts: $0 platform fee, artists connect their own Stripe accounts. Stripe handles 1099-K tax reporting. |

**Why Stripe Connect Standard (not Express or Custom):**
- **Standard:** Artists connect their own Stripe account. Platform has zero liability for payouts. Stripe handles all tax reporting (1099-K). No per-account fees. Artists see their own Stripe dashboard.
- **Express:** Stripe-hosted onboarding, simpler for artists, but costs $2/month per active connected account + 0.25% + $0.25 per payout. At 100 artists = $200/month just for accounts.
- **Custom:** Full white-label control but enormous compliance burden. Requires PCI DSS. Not feasible for solo dev.

**Standard is the right choice** because it eliminates platform liability for tax reporting, costs nothing, and artists who already have Stripe can onboard in 3 clicks (Stripe's new "networked onboarding" feature from 2025).

**Fee structure for the platform:**
- Fan pays $10 for an album
- Stripe takes 2.9% + $0.30 = $0.59
- Platform takes 10% of the sale = $1.00
- Artist receives $10 - $0.59 - $1.00 = **$8.41 (84.1%)**
- This is competitive with Bandcamp (82-85% to artist)

**Confidence:** HIGH -- Stripe Connect pricing verified via [official Stripe pricing](https://stripe.com/pricing) and [Connect pricing](https://stripe.com/connect/pricing).

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Better Auth | Latest | User authentication (artists + fans) | Modern, actively maintained replacement for deprecated Lucia. Supports email/password, OAuth, session management. Works with Drizzle and PostgreSQL. |

**Why Better Auth over alternatives:**
- **Lucia v3:** Deprecated as of March 2025. The creator has transitioned it to an educational resource. The Svelte CLI still includes `sv add lucia` but the underlying library is unmaintained.
- **Auth.js (SvelteKit):** Highly opinionated abstractions, difficult to customize. Better for "plug and play OAuth" than for a custom marketplace auth system with roles.
- **Clerk/Auth0/Okta:** Third-party services with per-user pricing. At 1000+ users, costs escalate. Adds external dependency. Not necessary for this use case.
- **Better Auth:** Modern TypeScript-first auth library. Supports email/password + OAuth. Works with Drizzle ORM. Active development. Growing SvelteKit community adoption.

**Alternative considered:** Roll your own following Lucia's educational guides. This is viable since the Svelte CLI's `sv add lucia` scaffolds the pattern, but Better Auth provides maintained session management, CSRF protection, and rate limiting that you would otherwise hand-roll.

**Confidence:** MEDIUM -- Better Auth is newer with less SvelteKit battle-testing than Lucia had. The Svelte ecosystem is in an auth transition period. Either Better Auth or the Lucia-pattern (hand-rolled sessions following the guide) will work.

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Docker + Docker Compose | Current | Container orchestration | Already used for wallybrain-music. Consistent environment. |
| Caddy | Current | Reverse proxy + HTTPS | Already running on the VPS for wallyblanchard.com. Automatic HTTPS. |
| PostgreSQL (Docker) | 16-alpine | Database server | Run as a Docker service alongside the app. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sharp | ^0.34 | Image processing | Cover art resize, thumbnail generation, dominant color extraction. Already used in wallybrain-music. |
| music-metadata | ^11 | Audio metadata extraction | Read ID3 tags, duration, bitrate from uploads. Already used in wallybrain-music. |
| file-type | ^21 | MIME type detection | Validate uploads are actually audio files. Already used in wallybrain-music. |
| @aws-sdk/client-s3 | ^3 | R2 client | S3-compatible SDK for Cloudflare R2 uploads/downloads. |
| stripe | ^17 | Stripe API client | Payment processing, Connect account management, webhook handling. |
| resend | ^4 | Transactional email | Purchase confirmations, artist notifications, password resets. $0 for first 100 emails/day. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | SvelteKit 2 | Next.js 15 | More multi-tenant examples exist, but switching frameworks wastes existing expertise and design system. SvelteKit is fully capable. |
| Database | PostgreSQL | Turso (SQLite edge) | Turso is interesting for per-tenant DBs but adds complexity and vendor lock-in. PostgreSQL is proven and self-hosted. |
| Storage | Cloudflare R2 | Backblaze B2 | B2 has cheaper storage but charges egress. Audio streaming is egress-heavy -- R2 wins on total cost. |
| Payments | Stripe Connect | PayPal Commerce Platform | Stripe has better developer experience, better documentation, and is the standard for SaaS/marketplace. PayPal has higher fees and worse DX. |
| Auth | Better Auth | Auth.js | Auth.js is too opinionated for custom marketplace auth. Better Auth gives more control over the auth flow. |
| Email | Resend | SendGrid | Resend is simpler, cheaper at low volume, better DX. SendGrid is overkill until 10K+ emails/month. |
| Search | PostgreSQL full-text | Algolia/Meilisearch | At <10K tracks, PostgreSQL `tsvector` with GIN index is fast enough. External search adds infrastructure. |

## What to Port from wallybrain-music

These files/components can be directly reused or adapted with minimal changes:

| Component | Source | Adaptation Needed |
|-----------|--------|-------------------|
| WaveformPlayer.svelte | Direct port | Add artist context, purchase state awareness |
| PersistentPlayer.svelte | Direct port | Add "Buy" button, artist attribution |
| CoverArt.svelte | Direct port | Change image source from local path to R2 URL |
| TrackCard.svelte | Adapt | Add artist name, price display, purchase indicator |
| EqIndicator.svelte | Direct port | No changes needed |
| colorUtils.ts | Direct port | No changes needed |
| formatTime.ts | Direct port | No changes needed |
| Design tokens (app.css @theme) | Direct port | No changes needed |
| Audio processing pipeline (transcode, peaks, metadata, artwork) | Adapt | Change output destination from local fs to R2 |
| Upload validation (magicBytes, ffprobe) | Direct port | No changes needed |

**What must be rebuilt from scratch:**
- Database schema (new PostgreSQL schema with users, artists, releases, tracks, purchases, payouts)
- Authentication system (new -- wallybrain-music has none)
- File storage layer (new -- R2 client instead of local fs)
- All `+page.server.ts` files (new data loading patterns for multi-tenant)
- Admin routes (replaced by artist dashboard)

## Installation

```bash
# Core framework
npm install @sveltejs/kit@latest @sveltejs/adapter-node svelte vite

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Storage
npm install @aws-sdk/client-s3

# Payments
npm install stripe

# Auth
npm install better-auth

# Audio/Image processing (port from wallybrain-music)
npm install sharp music-metadata file-type

# UI (port from wallybrain-music)
npm install wavesurfer.js
npm install @fontsource-variable/space-grotesk @fontsource/space-mono

# Email
npm install resend

# Dev dependencies
npm install -D @sveltejs/vite-plugin-svelte @tailwindcss/vite tailwindcss typescript svelte-check
```

## Sources

- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) -- verified 2026-02-10
- [Stripe Connect Pricing](https://stripe.com/connect/pricing) -- verified 2026-02-10
- [Stripe Pricing](https://stripe.com/pricing) -- 2.9% + $0.30 per transaction
- [Drizzle ORM PostgreSQL docs](https://orm.drizzle.team/docs/get-started/postgresql-new) -- migration from SQLite is documented
- [Better Auth SvelteKit integration](https://svelte.dev/docs/cli/better-auth) -- listed in official Svelte CLI docs
- [SvelteKit Auth docs](https://svelte.dev/docs/kit/auth) -- official auth guidance post-Lucia deprecation
- [Lucia deprecation discussion](https://github.com/lucia-auth/lucia/discussions/1707) -- confirmed deprecated March 2025
- [SvelteKit multi-tenant discussion](https://github.com/sveltejs/kit/discussions/8699) -- reroute hook pattern
- [Resend pricing](https://resend.com/pricing) -- 100 emails/day free tier
