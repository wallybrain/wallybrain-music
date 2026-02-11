# Architecture: Revenue-Generating Music Platform

**Domain:** Music marketplace / direct-to-fan sales platform
**Researched:** 2026-02-10
**Overall confidence:** MEDIUM-HIGH

## Current wallybrain-music Architecture (for reference)

```
Single-artist, single-tenant, local everything:

  Browser <--> SvelteKit (Node.js)
                  |
                  +-- SQLite (better-sqlite3, single file)
                  |
                  +-- Local filesystem (/data/audio/, /data/art/, /data/peaks/)
                  |
                  +-- No auth (admin routes are open)
```

This cannot scale to multi-artist. Every layer needs to change.

## Recommended Architecture

```
Multi-tenant marketplace:

  Browser <--> Caddy (HTTPS, reverse proxy)
                  |
                  +-- SvelteKit (Node.js, Docker)
                  |     |
                  |     +-- Better Auth (sessions, user management)
                  |     |
                  |     +-- Drizzle ORM (query builder)
                  |     |     |
                  |     |     +-- PostgreSQL (Docker, shared DB, tenant isolation via artist_id FK)
                  |     |
                  |     +-- Stripe SDK (payments, Connect)
                  |     |
                  |     +-- R2 Client (@aws-sdk/client-s3)
                  |     |     |
                  |     |     +-- Cloudflare R2 (audio, art, peaks)
                  |     |
                  |     +-- Resend (transactional email)
                  |
                  +-- Stripe Webhooks (purchase confirmations, Connect events)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| SvelteKit App | SSR, routing, API endpoints, business logic | All other components |
| PostgreSQL | Data persistence, full-text search, relational integrity | SvelteKit via Drizzle |
| Cloudflare R2 | Audio file storage, cover art, waveform peaks, download delivery | SvelteKit via S3 SDK; Browser directly for playback (public R2 URLs) |
| Stripe | Payment processing, artist payouts, tax reporting | SvelteKit via Stripe SDK + webhooks |
| Better Auth | Session management, user creation, password hashing | SvelteKit (middleware) + PostgreSQL |
| Resend | Email delivery (receipts, notifications) | SvelteKit API calls |
| Caddy | TLS termination, reverse proxy, static asset caching | Browser + SvelteKit |

---

## Database Schema (PostgreSQL)

### Core Tables

```
users
  id              UUID PRIMARY KEY
  email           TEXT UNIQUE NOT NULL
  password_hash   TEXT
  display_name    TEXT
  avatar_url      TEXT
  role            ENUM('fan', 'artist', 'admin')
  stripe_account_id  TEXT              -- Stripe Connect account (artists only)
  stripe_onboarded   BOOLEAN DEFAULT FALSE
  created_at      TIMESTAMPTZ DEFAULT NOW()
  updated_at      TIMESTAMPTZ DEFAULT NOW()

artist_profiles
  id              UUID PRIMARY KEY REFERENCES users(id)
  slug            TEXT UNIQUE NOT NULL  -- URL slug: /artist-slug
  bio             TEXT
  location        TEXT
  website_url     TEXT
  social_links    JSONB               -- { bandcamp, soundcloud, instagram, etc. }
  header_image_url TEXT
  is_published    BOOLEAN DEFAULT FALSE

releases
  id              UUID PRIMARY KEY
  artist_id       UUID NOT NULL REFERENCES users(id)
  slug            TEXT NOT NULL        -- URL: /artist-slug/release-slug
  title           TEXT NOT NULL
  description     TEXT
  release_type    ENUM('album', 'ep', 'single', 'set', 'experiment')
  cover_art_url   TEXT
  dominant_color  TEXT                 -- Extracted from cover art
  price_cents     INTEGER NOT NULL     -- Minimum price in cents (0 = free)
  name_your_price BOOLEAN DEFAULT FALSE
  currency        TEXT DEFAULT 'usd'
  status          ENUM('draft', 'published', 'archived')
  published_at    TIMESTAMPTZ
  created_at      TIMESTAMPTZ DEFAULT NOW()
  updated_at      TIMESTAMPTZ DEFAULT NOW()
  UNIQUE(artist_id, slug)

tracks
  id              UUID PRIMARY KEY
  release_id      UUID NOT NULL REFERENCES releases(id)
  title           TEXT NOT NULL
  track_number    INTEGER NOT NULL
  duration        INTEGER              -- seconds
  bitrate         INTEGER
  file_size       INTEGER
  audio_url       TEXT NOT NULL         -- R2 key for original audio
  peaks_url       TEXT                  -- R2 key for waveform peaks JSON
  original_filename TEXT
  status          ENUM('pending', 'processing', 'ready', 'failed')
  error_message   TEXT
  play_count      INTEGER DEFAULT 0
  created_at      TIMESTAMPTZ DEFAULT NOW()

tags
  id              SERIAL PRIMARY KEY
  name            TEXT UNIQUE NOT NULL
  slug            TEXT UNIQUE NOT NULL

release_tags
  release_id      UUID REFERENCES releases(id) ON DELETE CASCADE
  tag_id          INTEGER REFERENCES tags(id) ON DELETE CASCADE
  PRIMARY KEY (release_id, tag_id)

purchases
  id              UUID PRIMARY KEY
  fan_id          UUID REFERENCES users(id)  -- NULL if guest purchase
  release_id      UUID NOT NULL REFERENCES releases(id)
  artist_id       UUID NOT NULL REFERENCES users(id)
  amount_cents    INTEGER NOT NULL     -- What the fan paid
  platform_fee_cents INTEGER NOT NULL  -- Platform's 10% cut
  stripe_fee_cents   INTEGER NOT NULL  -- Stripe's processing fee
  artist_payout_cents INTEGER NOT NULL -- What the artist receives
  stripe_payment_id  TEXT UNIQUE NOT NULL
  email           TEXT NOT NULL         -- For download link delivery
  download_count  INTEGER DEFAULT 0
  created_at      TIMESTAMPTZ DEFAULT NOW()

sessions
  id              TEXT PRIMARY KEY
  user_id         UUID NOT NULL REFERENCES users(id)
  expires_at      TIMESTAMPTZ NOT NULL
```

### Key Design Decisions

1. **Shared database, tenant isolation via foreign keys**: All artists share one PostgreSQL database. Data is isolated by `artist_id` foreign keys. This is simpler than database-per-tenant and appropriate for a marketplace where cross-tenant queries (browse, search) are core features.

2. **UUIDs for primary keys**: Prevents enumeration attacks (cannot guess artist IDs or purchase IDs). Standard for multi-tenant SaaS.

3. **Releases as the purchasable unit**: Fans buy releases (albums, EPs, singles), not individual tracks. This matches Bandcamp's model and simplifies pricing/checkout. Individual track downloads are delivered as part of the release purchase.

4. **JSONB for social links**: Artists have variable social media profiles. JSONB avoids a separate table for what is essentially a key-value map.

5. **Separate artist_profiles table**: Not every user is an artist. The profile table holds artist-specific data and is created when a fan upgrades to an artist account. The `slug` lives here, not on the users table.

---

## Data Flow

### Upload Flow (Artist uploads a release)

```
1. Artist authenticates --> SvelteKit checks session
2. Artist fills out release form (title, description, price, cover art, audio files)
3. SvelteKit API receives multipart upload
4. For each audio file:
   a. Validate file type (magic bytes + ffprobe)
   b. Extract metadata (music-metadata)
   c. Upload original to R2 (audio/[artist_id]/[release_id]/[track_id].flac)
   d. Transcode to MP3 for streaming (ffmpeg)
   e. Upload MP3 to R2 (audio/[artist_id]/[release_id]/[track_id].mp3)
   f. Generate waveform peaks (existing peaks.ts processor)
   g. Upload peaks JSON to R2
5. For cover art:
   a. Validate image
   b. Resize to standard sizes (sharp)
   c. Extract dominant color (sharp.stats())
   d. Upload to R2 (art/[artist_id]/[release_id]/cover.webp)
6. Create release + track records in PostgreSQL
7. Status: draft (artist previews and publishes manually)
```

### Purchase Flow (Fan buys a release)

```
1. Fan clicks "Buy" on release page
2. SvelteKit creates a Stripe Checkout Session:
   - amount: release price (or fan's NYOP amount)
   - application_fee_amount: 10% of sale
   - transfer_data.destination: artist's Stripe Connect account ID
3. Fan is redirected to Stripe Checkout (hosted page)
4. Fan pays with card
5. Stripe sends webhook (checkout.session.completed) to SvelteKit
6. SvelteKit webhook handler:
   a. Verifies webhook signature
   b. Creates purchase record in PostgreSQL
   c. Generates time-limited signed R2 download URLs
   d. Sends email receipt with download links (Resend)
7. Fan downloads files (MP3, FLAC, WAV -- whatever the artist uploaded)
```

### Playback Flow (Anyone listens to a track)

```
1. Browser loads release page (SSR)
2. Track list renders with WaveformPlayer components
3. WaveformPlayer fetches peaks JSON from R2 (public URL)
4. Fan clicks play
5. wavesurfer.js streams audio from R2 (public URL for preview)
6. Play count incremented via API call
```

**Important:** Audio files for preview are publicly accessible R2 URLs. This is intentional -- Bandcamp also serves full tracks publicly for preview. The purchase gives the fan high-quality downloads (FLAC/WAV) and supports the artist. Copy protection is not the goal; convenience and supporting artists is.

---

## Multi-Tenancy Pattern

### URL Structure

```
/                           -- Homepage, browse latest releases
/browse                     -- Browse by tag, genre, type
/[artist-slug]              -- Artist profile page
/[artist-slug]/[release-slug]  -- Release page with track list + player
/dashboard                  -- Artist dashboard (auth required)
/dashboard/releases         -- Manage releases
/dashboard/releases/new     -- Create new release
/dashboard/analytics        -- Sales analytics
/collection                 -- Fan's purchased music (auth required)
/auth/login                 -- Login
/auth/register              -- Register (choose fan or artist)
```

### SvelteKit Routing

Use SvelteKit's dynamic routing with a catch-all pattern for artist slugs:

```
src/routes/
  +page.svelte              -- Homepage
  browse/+page.svelte       -- Browse page
  [artistSlug]/
    +page.svelte            -- Artist profile
    +page.server.ts         -- Load artist + releases
    [releaseSlug]/
      +page.svelte          -- Release page
      +page.server.ts       -- Load release + tracks
  dashboard/
    +layout.svelte          -- Artist dashboard layout (auth guard)
    +page.svelte            -- Dashboard home
    releases/
      +page.svelte          -- Release list
      new/+page.svelte      -- Create release
      [id]/+page.svelte     -- Edit release
    analytics/+page.svelte  -- Sales data
  collection/
    +page.svelte            -- Fan purchases
  auth/
    login/+page.svelte
    register/+page.svelte
  api/
    webhooks/stripe/+server.ts  -- Stripe webhook endpoint
    tracks/[id]/play/+server.ts -- Play count increment
```

**Slug collision prevention:** When an artist registers a slug, check it against a reserved words list (browse, dashboard, collection, auth, api, admin, etc.). This prevents `/dashboard` from being claimed as an artist slug.

---

## Patterns to Follow

### Pattern 1: Stripe Connect Standard with Destination Charges

```typescript
// Creating a checkout session for a purchase
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: release.title },
      unit_amount: amountCents,
    },
    quantity: 1,
  }],
  payment_intent_data: {
    application_fee_amount: Math.round(amountCents * 0.10), // 10% platform fee
    transfer_data: {
      destination: artist.stripeAccountId,
    },
  },
  success_url: `${origin}/${artistSlug}/${releaseSlug}?purchased=true`,
  cancel_url: `${origin}/${artistSlug}/${releaseSlug}`,
});
```

**Why destination charges:** The platform collects payment, takes its fee, and forwards the rest to the artist's connected account. This is the standard Stripe Connect pattern for marketplaces. The alternative (separate charges and transfers) is more complex and requires manual reconciliation.

### Pattern 2: Signed R2 URLs for Download Delivery

```typescript
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Generate a 24-hour download link
const command = new GetObjectCommand({
  Bucket: R2_BUCKET,
  Key: `audio/${artistId}/${releaseId}/${trackId}.flac`,
});
const downloadUrl = await getSignedUrl(r2Client, command, { expiresIn: 86400 });
```

**Why signed URLs:** The original high-quality files (FLAC, WAV) are private in R2. Only purchasers get time-limited download links. The streaming preview MP3s are public (no signed URL needed).

### Pattern 3: Auth Guards via SvelteKit Hooks

```typescript
// hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const session = await getSession(event);
  event.locals.user = session?.user ?? null;

  // Protect dashboard routes
  if (event.url.pathname.startsWith('/dashboard') && !event.locals.user?.role === 'artist') {
    redirect(303, '/auth/login');
  }

  return resolve(event);
};
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Database-Per-Tenant

**What:** Creating a separate PostgreSQL database or schema for each artist.
**Why bad:** Eliminates cross-tenant queries (browse, search, trending). Makes migrations a nightmare (run on every tenant DB). Adds connection pool complexity. Only justified at enterprise scale with strict data isolation requirements.
**Instead:** Shared database with `artist_id` foreign keys on all content tables. Simple, queryable, standard.

### Anti-Pattern 2: Client-Side Audio DRM

**What:** Attempting to prevent audio file copying through encryption, obfuscation, or stream protection.
**Why bad:** The Web Audio API exposes all audio data. Any DRM can be bypassed by recording the output. Bandcamp does not do this. It adds complexity, degrades the listening experience, and frustrates legitimate customers without stopping piracy.
**Instead:** Make purchasing convenient and affordable. The value proposition is "support the artist + get high-quality downloads," not "access to locked content."

### Anti-Pattern 3: Building a Cart Before Validating Single Purchases

**What:** Implementing a full shopping cart with add-to-cart, cart management, and multi-release checkout from day one.
**Why bad:** Carts add significant state management complexity (persistence, expiration, price changes, inventory). Most fans buy one release at a time. Bandcamp's most common checkout is single-release.
**Instead:** Start with single-release "Buy Now" -> Stripe Checkout. Add cart later if usage data shows fans regularly want to buy multiple releases in one session.

### Anti-Pattern 4: Premature Microservices

**What:** Splitting the app into separate services (auth service, payment service, upload service) from the start.
**Why bad:** Operational overhead of multiple deployments, service discovery, and inter-service communication is enormous for a solo dev. The monolith handles the entire feature set easily at <1000 artists.
**Instead:** One SvelteKit monolith with well-organized modules. Extract services only when specific scaling bottlenecks emerge (likely never for this scale).

---

## Scalability Considerations

| Concern | At 10 Artists | At 100 Artists | At 1000 Artists |
|---------|--------------|----------------|-----------------|
| Database | Single PostgreSQL, no tuning needed | Add indexes on artist_id, release_id, created_at | Connection pooling (pgBouncer), read replicas if needed |
| Storage | ~5 GB R2 ($0.08/month) | ~50 GB R2 ($0.75/month) | ~500 GB R2 ($7.50/month) |
| Bandwidth | Minimal, free tier | R2 free egress handles this | R2 free egress still handles this |
| Uploads | Synchronous processing OK | Background queue recommended | Background queue essential, consider separate worker |
| Search | PostgreSQL LIKE is fine | PostgreSQL full-text with GIN index | Consider Meilisearch if query complexity grows |
| Email | <100/day (Resend free tier) | <1000/day (Resend $20/month) | Resend growth plan or switch to SES |
| Payments | No special handling | No special handling | Stripe handles scaling automatically |
| CDN | R2's built-in CDN | R2's built-in CDN | R2's built-in CDN (global edge) |

**The key insight:** R2's zero-egress pricing and Stripe's automatic scaling mean infrastructure costs grow slowly. The primary scaling concern is upload processing (CPU-bound audio transcoding), which can be addressed with a background job queue long before it becomes a bottleneck.

---

## Docker Compose Architecture

```yaml
services:
  app:
    build: .
    container_name: music-platform
    restart: unless-stopped
    ports:
      - "8801:8801"
    environment:
      - PORT=8801
      - DATABASE_URL=postgres://platform:${DB_PASSWORD}@db:5432/music_platform
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - R2_BUCKET=${R2_BUCKET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - ORIGIN=https://yourdomain.com
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal
      - webproxy

  db:
    image: postgres:16-alpine
    container_name: music-platform-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=platform
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=music_platform
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U platform"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

volumes:
  pgdata:

networks:
  internal:
  webproxy:
    external: true
```

Port 8801 avoids conflict with wallybrain-music on 8800.

---

## R2 Bucket Structure

```
audio/
  [artist_id]/
    [release_id]/
      [track_id].flac          -- Original high-quality (private, signed URLs for download)
      [track_id].mp3           -- Transcoded preview (public, streaming)

art/
  [artist_id]/
    [release_id]/
      cover.webp               -- Full-size cover art (public)
      cover-thumb.webp          -- Thumbnail (public)
    avatar.webp                -- Artist avatar (public)

peaks/
  [artist_id]/
    [release_id]/
      [track_id].json          -- Waveform peaks data (public)
```

**Access control:** Use R2 bucket policies or per-object ACLs. Preview MP3s, art, and peaks are public. Original FLAC/WAV files are private (served via signed URLs after purchase).

---

## Sources

- [Stripe Connect destination charges](https://docs.stripe.com/connect/destination-charges) -- recommended pattern for marketplace payments
- [Stripe Connect Standard accounts](https://docs.stripe.com/connect/standard-accounts) -- artist onboarding flow
- [AWS SDK v3 S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) -- compatible with R2
- [SvelteKit hooks](https://svelte.dev/docs/kit/hooks) -- auth guard pattern
- [SvelteKit routing](https://svelte.dev/docs/kit/routing) -- dynamic slug routing
- [PostgreSQL full-text search](https://www.postgresql.org/docs/current/textsearch.html) -- built-in search capability
- [SvelteKit multi-tenant discussion](https://github.com/sveltejs/kit/discussions/8699) -- patterns for multi-tenancy
