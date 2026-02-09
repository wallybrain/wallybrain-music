# Phase 1: Foundation - Research

**Researched:** 2026-02-08
**Domain:** SvelteKit project scaffolding, SQLite database, Docker deployment, Caddy reverse proxy subpath routing
**Confidence:** HIGH

## Summary

Phase 1 delivers the infrastructure skeleton: a SvelteKit application running inside Docker, connected to SQLite via Drizzle ORM, with filesystem storage directories, reachable at wallyblanchard.com/music through the existing Caddy reverse proxy. No audio processing, no player, no admin UI -- just the working foundation that all subsequent phases build on.

The primary technical challenges are: (1) correctly configuring SvelteKit's base path (`/music`) so all routes and assets resolve properly behind Caddy's `handle_path` path-stripping proxy, (2) structuring the Caddy routing so public `/music/*` routes are open while `/music/admin/*` routes are gated by Authelia (even though admin UI comes in Phase 5, the routing structure should be established now), and (3) getting the Docker container to build, run, and pass health checks with the SQLite database and filesystem volumes properly mounted.

The stack is well-established and all components have HIGH confidence: SvelteKit 2.50.x with Svelte 5, adapter-node, Drizzle ORM 0.45.x with better-sqlite3, Tailwind CSS 4.x via `@tailwindcss/vite`, and a multi-stage Docker build. The `sv create` CLI can scaffold the project with Drizzle and Tailwind addons in one command, reducing manual setup significantly.

**Primary recommendation:** Use `npx sv create` with the Drizzle (SQLite + better-sqlite3) and Tailwind addons to scaffold the project, configure `paths.base: '/music'` in svelte.config.js, and use `handle_path /music/*` in Caddy to strip the prefix before proxying to the SvelteKit container.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.50.x | Full-stack framework (SSR + API routes) | Ships less JS than React. Built-in API routes. Svelte 5 runes. adapter-node for Docker. |
| @sveltejs/adapter-node | latest | Builds SvelteKit for Node.js server | Produces `build/` directory with `index.js` server. Handles static assets, precompression. |
| Svelte | 5.x | Component framework | Runes reactivity model. Compiled output. First-class TypeScript. |
| TypeScript | 5.x | Type safety | SvelteKit + Drizzle both require it for schema/route type safety. |
| Drizzle ORM | 0.45.x | Type-safe SQL query builder | ~7kb. Zero binary deps. Single optimized queries. Drizzle Kit for migrations. |
| better-sqlite3 | 12.x | SQLite driver for Node.js | Fastest synchronous SQLite driver. Drizzle's recommended SQLite driver. |
| drizzle-kit | latest | Migration generation + push | `generate` creates SQL files, `push` applies directly. `migrate` runs programmatically. |
| Tailwind CSS | 4.x | Utility-first CSS | v4 uses `@tailwindcss/vite` plugin. No PostCSS config needed. CSS-first configuration. |
| Node.js | 20.x | Runtime | Already installed on server. LTS through April 2026. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/vite | latest | Tailwind Vite plugin | Always -- replaces old PostCSS-based setup for Tailwind v4 |
| @types/better-sqlite3 | latest | TypeScript types | Always -- type definitions for better-sqlite3 |
| dotenv | latest | Environment variable loading | Development only -- production uses Docker env vars |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | libsql | libsql adds remote DB support we don't need; better-sqlite3 is simpler for local file DB |
| Drizzle ORM | Prisma | Prisma has ~8MB engine binary, slower cold starts, more overhead |
| Tailwind CSS | Plain CSS | Tailwind's utility classes speed up dark theme development significantly |
| adapter-node | adapter-auto | adapter-auto adds detection logic; we know we're deploying to Node.js |

**Installation (via sv CLI):**
```bash
# Scaffold project with addons
npx sv create wallybrain-music
# Select: SvelteKit minimal, TypeScript, Tailwind, Drizzle (SQLite + better-sqlite3)
cd wallybrain-music
npm install
```

**Manual equivalent (if sv create doesn't set up everything):**
```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @sveltejs/adapter-node @tailwindcss/vite tailwindcss @types/better-sqlite3 typescript
```

## Architecture Patterns

### Recommended Project Structure

```
wallybrain-music/
├── src/
│   ├── lib/
│   │   └── server/
│   │       └── db/
│   │           ├── client.ts        # Drizzle + better-sqlite3 connection
│   │           ├── schema.ts        # Table definitions (tracks, tags, track_tags)
│   │           └── migrate.ts       # Programmatic migration runner
│   ├── routes/
│   │   ├── +layout.svelte          # Root layout (imports app.css)
│   │   ├── +page.svelte            # Landing / track listing (future)
│   │   ├── +page.server.ts         # Server load function (query tracks)
│   │   ├── health/
│   │   │   └── +server.ts          # GET /music/health -> 200 OK (Docker healthcheck)
│   │   └── api/
│   │       └── ...                  # API routes (future phases)
│   ├── app.css                     # Tailwind import: @import "tailwindcss"
│   └── app.html                    # HTML template
├── drizzle/                        # Generated migration SQL files
├── drizzle.config.ts               # Drizzle Kit configuration
├── svelte.config.js                # SvelteKit config (adapter-node, paths.base)
├── vite.config.ts                  # Vite config (@tailwindcss/vite plugin)
├── Dockerfile                      # Multi-stage build
├── docker-compose.yml              # Container orchestration
├── .env                            # Local dev secrets (never committed)
└── package.json
```

### Pattern 1: SvelteKit Base Path Configuration

**What:** Configure SvelteKit to serve all routes under `/music` prefix so it works behind Caddy's `handle_path /music/*` which strips the prefix.

**When to use:** Always -- the app lives at wallyblanchard.com/music, not at the root.

**Critical insight:** Caddy's `handle_path` strips `/music` before proxying. SvelteKit's `paths.base` adds `/music` to all generated URLs. These work together: Caddy strips the prefix on incoming requests, SvelteKit adds it back on generated links/assets. The SvelteKit server itself handles routes at `/` internally, but all URLs it generates include the `/music` prefix.

**svelte.config.js:**
```javascript
// Source: https://svelte.dev/docs/kit/configuration
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true
    }),
    paths: {
      base: '/music'
    }
  }
};
```

**Using base in components (SvelteKit 2.26+):**
```svelte
<script>
  // resolve() is the modern approach (base is deprecated since 2.26)
  import { resolve } from '$app/paths';
</script>

<!-- resolve() automatically prepends the base path -->
<a href={resolve('/track/my-song')}>My Song</a>
<!-- Renders as: /music/track/my-song -->
```

**Historical issue (RESOLVED):** GitHub issue #3726 reported that adapter-node did not correctly serve static assets when `paths.base` was set. This was fixed in PR #4448 before SvelteKit 1.0. Current versions (2.50.x) handle this correctly.

### Pattern 2: Caddy Routing with Path Stripping

**What:** Configure Caddy to route `/music/*` requests to the SvelteKit container, stripping the `/music` prefix. Admin routes get Authelia forward_auth.

**When to use:** Production deployment.

**Critical insight:** `handle` and `handle_path` blocks are mutually exclusive -- only the first matching block runs. Caddy sorts by path specificity (longer paths first). So `/music/admin/*` (more specific) is evaluated before `/music/*` (less specific). This is exactly what we need.

**Caddyfile addition (add to existing wallyblanchard.com block):**
```
{$DOMAIN} {
    # Admin routes: Authelia-gated (more specific path, evaluated first)
    handle /music/admin/* {
        forward_auth authelia:9091 {
            uri /api/authz/forward-auth
            copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
        }
        uri strip_prefix /music
        reverse_proxy wallybrain-music:8800
    }

    # Public music routes: no auth (less specific, evaluated second)
    handle_path /music/* {
        reverse_proxy wallybrain-music:8800
    }

    # Existing routes (code-server, etc.)
    forward_auth authelia:9091 {
        uri /api/authz/forward-auth
        copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
    }
    reverse_proxy code-server:8080
}
```

**Why `handle` (not `handle_path`) for admin:** The admin route needs both `forward_auth` AND path stripping. Using `handle` with explicit `uri strip_prefix` gives us control over the order of operations (auth first, then strip, then proxy). With `handle_path`, the stripping happens automatically before forward_auth runs, which could cause the auth check to use the wrong path.

**Alternative simpler approach (if admin auth is deferred to Phase 5):**
```
{$DOMAIN} {
    # All music routes: public for now
    handle_path /music/* {
        reverse_proxy wallybrain-music:8800
    }

    # Existing routes
    forward_auth authelia:9091 {
        uri /api/authz/forward-auth
        copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
    }
    reverse_proxy code-server:8080
}
```

### Pattern 3: Drizzle Schema for Tracks Database

**What:** Define the SQLite schema using Drizzle ORM's TypeScript DSL.

**When to use:** Phase 1 -- this is the foundation schema that all other phases depend on.

**schema.ts:**
```typescript
// Source: https://orm.drizzle.team/docs/column-types/sqlite
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey().notNull(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  duration: integer('duration', { mode: 'number' }),         // seconds
  bitrate: integer('bitrate'),                                // kbps
  fileSize: integer('file_size'),                             // bytes
  audioPath: text('audio_path').notNull(),
  peaksPath: text('peaks_path'),
  artPath: text('art_path'),
  artThumb: text('art_thumb'),
  category: text('category', {
    enum: ['track', 'set', 'experiment', 'export']
  }).default('track').notNull(),
  status: text('status', {
    enum: ['pending', 'processing', 'ready', 'failed']
  }).default('pending').notNull(),
  playCount: integer('play_count').default(0).notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
});

export const trackTags = sqliteTable('track_tags', {
  trackId: text('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.trackId, table.tagId] }),
}));
```

**drizzle.config.ts:**
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/db/music.db',
  },
  out: './drizzle',
});
```

**client.ts:**
```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL || './data/db/music.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
```

### Pattern 4: Docker Multi-Stage Build for SvelteKit

**What:** Dockerfile that builds SvelteKit with adapter-node and runs in a minimal Node.js image.

**When to use:** Always -- the app runs in Docker per INFRA-05.

**Dockerfile:**
```dockerfile
# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Runtime stage
FROM node:20-bookworm-slim
WORKDIR /app

# Create data directories
RUN mkdir -p /data/audio /data/peaks /data/art /data/db

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/package.json .
COPY --from=builder /app/drizzle drizzle/

EXPOSE 8800
ENV NODE_ENV=production
ENV PORT=8800
ENV ORIGIN=https://wallyblanchard.com
ENV BODY_SIZE_LIMIT=512M
ENV DATABASE_URL=/data/db/music.db

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8800/health || exit 1

CMD ["node", "build"]
```

**docker-compose.yml:**
```yaml
services:
  wallybrain-music:
    build: .
    container_name: wallybrain-music
    restart: unless-stopped
    volumes:
      - music-data:/data
    environment:
      - PORT=8800
      - ORIGIN=https://wallyblanchard.com
      - BODY_SIZE_LIMIT=512M
      - DATABASE_URL=/data/db/music.db
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8800/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  music-data:
```

### Pattern 5: Health Check Endpoint

**What:** A SvelteKit server route that Docker can poll to verify the app is running and the database is accessible.

**When to use:** Always -- INFRA-05 requires health checks.

**src/routes/health/+server.ts:**
```typescript
import { db } from '$lib/server/db/client';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Verify database is accessible
    db.run(sql`SELECT 1`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('Database unreachable', { status: 503 });
  }
};
```

**Note on base path and health checks:** The health endpoint will be at `/music/health` externally (due to `paths.base`), but the Docker HEALTHCHECK hits the container directly at port 8800. Since `handle_path` strips `/music`, the container receives requests at `/health`. However, SvelteKit with `paths.base: '/music'` expects requests to include the base prefix. The HEALTHCHECK URL should be `http://localhost:8800/music/health` -- SvelteKit's built-in server handles the base path routing internally.

**IMPORTANT CORRECTION:** When SvelteKit is configured with `paths.base: '/music'`, the built-in Node.js server (from adapter-node) expects requests at the base path. So the health check URL must be `http://localhost:8800/music/health`, not `http://localhost:8800/health`. Caddy strips `/music` before proxying, but the internal health check bypasses Caddy and hits the container directly.

### Anti-Patterns to Avoid

- **Skipping `paths.base` configuration:** All links and assets will break when accessed via /music path. Every `<a href>` and asset URL must include the base prefix.
- **Using `handle_path` for admin routes:** Stripping the path before auth check could cause Authelia policy matching issues. Use `handle` with manual `uri strip_prefix` for routes needing forward_auth.
- **Putting the SQLite database inside the Docker image:** The database must be on a persistent volume. If it's in the image, data is lost on rebuild.
- **Hardcoding port 3000:** The existing stack uses various ports. Use port 8800 for the music service (per the project's 8xxx convention for web UIs).
- **Using `$defaultFn(() => new Date())` for timestamps:** This creates JavaScript Date objects, not SQL defaults. Use `default(sql\`(current_timestamp)\`)` so the database handles defaults even for direct SQL inserts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Manual SQL files | Drizzle Kit `generate` + `migrate` | Type-safe, version-tracked, handles column types |
| SQLite connection pooling | Custom pool | better-sqlite3 (synchronous, no pool needed) | Single-process app, synchronous driver, no pool complexity |
| Path prefix handling | Manual URL concatenation | SvelteKit `resolve()` from `$app/paths` | Automatically handles base path in all contexts (SSR, client) |
| Static asset serving | Express static middleware | adapter-node built-in + Caddy | adapter-node handles `_app/` assets; Caddy handles audio/art files |
| Health check framework | Custom monitoring | Docker HEALTHCHECK + SvelteKit route | Docker restarts unhealthy containers automatically |
| Slug generation | Regex-based slugifier | `slug` npm package or built-in | Handles unicode, special chars, collision avoidance |

**Key insight:** SvelteKit's `sv create` CLI with addons (Drizzle, Tailwind) scaffolds 80% of the Phase 1 boilerplate. Don't manually create config files that the CLI generates.

## Common Pitfalls

### Pitfall 1: SvelteKit Base Path + Caddy Path Stripping Mismatch

**What goes wrong:** Links work on one side but break on the other. Either (a) SvelteKit generates URLs without `/music` prefix and they 404 when users click them, or (b) Caddy strips `/music` but SvelteKit doesn't recognize the bare route.

**Why it happens:** SvelteKit's `paths.base` and Caddy's `handle_path` path stripping must work in concert. SvelteKit generates URLs with the base prefix (for the browser), but Caddy strips the prefix before proxying (so SvelteKit receives bare paths). If either side is misconfigured, routes break.

**How to avoid:**
1. Set `paths.base: '/music'` in svelte.config.js
2. Use `handle_path /music/*` in Caddy (which strips `/music` automatically)
3. Use `resolve()` from `$app/paths` for all internal links (never hardcode `/music`)
4. Set `ORIGIN=https://wallyblanchard.com` env var for adapter-node (critical for form actions and redirects)

**Warning signs:** 404 errors on navigation, assets loading from wrong path, redirect loops.

### Pitfall 2: CVE-2025-67647 -- DoS via Missing ORIGIN Variable

**What goes wrong:** The SvelteKit server crashes (DoS) when it has at least one prerendered route and runs behind adapter-node without the `ORIGIN` environment variable set, and no reverse proxy host header validation.

**Why it happens:** Versions 2.44.0 through 2.49.4 have an uncaught exception vulnerability. Fixed in 2.49.5+.

**How to avoid:**
1. Use SvelteKit 2.49.5 or later (current latest is 2.50.2)
2. Always set `ORIGIN=https://wallyblanchard.com` environment variable
3. Configure `PROTOCOL_HEADER=x-forwarded-proto` and `HOST_HEADER=x-forwarded-host` when behind Caddy

**Warning signs:** Server process exits unexpectedly. No error page served.

### Pitfall 3: SQLite Database Not on Persistent Volume

**What goes wrong:** Database is created inside the Docker container. When the container is rebuilt or restarted with a new image, all data is lost.

**Why it happens:** The database file defaults to a path inside the container filesystem, which is ephemeral.

**How to avoid:**
1. Mount a Docker volume at `/data`
2. Set `DATABASE_URL=/data/db/music.db`
3. Ensure the volume is defined in docker-compose.yml

**Warning signs:** Data disappears after `docker compose down && docker compose up`.

### Pitfall 4: BODY_SIZE_LIMIT Blocking Audio Uploads

**What goes wrong:** Uploading audio files fails with 413 Payload Too Large. The default body size limit in adapter-node is 512KB -- far too small for audio files.

**Why it happens:** SvelteKit adapter-node enforces `BODY_SIZE_LIMIT` (default 512KB) on all request bodies.

**How to avoid:** Set `BODY_SIZE_LIMIT=512M` (or `Infinity`) as an environment variable in the Docker container. Phase 1 doesn't handle uploads, but setting this now prevents confusion in Phase 2.

**Warning signs:** 413 errors on POST requests with files.

### Pitfall 5: Docker Network Connectivity Between Containers

**What goes wrong:** Caddy cannot reach the wallybrain-music container. Requests to /music/* return 502 Bad Gateway.

**Why it happens:** The music container must be on the same Docker network as Caddy. If using a separate docker-compose.yml, the containers are on different networks by default.

**How to avoid:** Either (a) add the music service to the existing v1be-code-server docker-compose.yml, or (b) create an external Docker network and join both compose stacks to it.

**Warning signs:** 502 Bad Gateway from Caddy. `docker network ls` shows containers on different networks.

### Pitfall 6: Tailwind v4 Setup Incompatibility

**What goes wrong:** Tailwind styles don't apply. Classes are present in HTML but no CSS is generated.

**Why it happens:** Tailwind v4 uses `@tailwindcss/vite` plugin instead of the old PostCSS-based setup. If you follow v3 tutorials, the configuration is wrong. Also, `@apply` no longer works in Svelte `<style>` blocks -- use `@reference "tailwindcss"` with `theme()` function instead.

**How to avoid:**
1. Use `@tailwindcss/vite` in vite.config.ts (not postcss.config.js)
2. Use `@import "tailwindcss"` in app.css (not `@tailwind base/components/utilities`)
3. In `<style>` blocks, use `@reference "tailwindcss"` to access theme values

**Warning signs:** No styles applied despite correct class names in HTML.

## Code Examples

### SvelteKit Configuration (svelte.config.js)
```javascript
// Source: https://svelte.dev/docs/kit/configuration
// Source: https://svelte.dev/docs/kit/adapter-node
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true
    }),
    paths: {
      base: '/music'
    }
  }
};
```

### Vite Configuration (vite.config.ts)
```typescript
// Source: https://tailwindcss.com/docs/guides/sveltekit
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
  ],
});
```

### Root Layout (+layout.svelte)
```svelte
<script>
  let { children } = $props();
  import "../app.css";
</script>

{@render children()}
```

### App CSS (app.css)
```css
@import "tailwindcss";
```

### Database Client (src/lib/server/db/client.ts)
```typescript
// Source: https://orm.drizzle.team/docs/get-started-sqlite
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const dbPath = process.env.DATABASE_URL || './data/db/music.db';
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
// Enable foreign key enforcement (off by default in SQLite)
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
```

### Migration Runner (src/lib/server/db/migrate.ts)
```typescript
// Source: https://orm.drizzle.team/docs/get-started-sqlite
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';

migrate(db, {
  migrationsFolder: './drizzle',
});

console.log('Migrations applied successfully');
```

### Drizzle Configuration (drizzle.config.ts)
```typescript
// Source: https://orm.drizzle.team/docs/get-started-sqlite
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/db/music.db',
  },
  out: './drizzle',
});
```

### Landing Page (src/routes/+page.svelte)
```svelte
<h1 class="text-3xl font-bold text-white">wallybrain</h1>
<p class="text-gray-400">Music platform loading...</p>
```

### Landing Page Server Load (src/routes/+page.server.ts)
```typescript
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const allTracks = db
    .select()
    .from(tracks)
    .where(eq(tracks.status, 'ready'))
    .all();

  return { tracks: allTracks };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { base } from '$app/paths'` | `import { resolve } from '$app/paths'` | SvelteKit 2.26 | `resolve()` auto-prepends base; `base` is deprecated |
| `@tailwind base; @tailwind components;` | `@import "tailwindcss"` | Tailwind CSS 4.0 | Single import replaces three directives |
| PostCSS + autoprefixer for Tailwind | `@tailwindcss/vite` plugin | Tailwind CSS 4.0 | No PostCSS config needed; 5x faster builds |
| `npx create svelte@latest` | `npx sv create` | Svelte CLI launch (late 2024) | Unified CLI with addon system (Drizzle, Tailwind built in) |
| `resolveRoute()` from `$app/paths` | `resolve()` from `$app/paths` | SvelteKit 2.26 | Cleaner API, same functionality |

**Deprecated/outdated:**
- `base` export from `$app/paths`: Use `resolve()` instead (deprecated since SvelteKit 2.26)
- PostCSS-based Tailwind setup: Use `@tailwindcss/vite` plugin for Tailwind v4
- `npx create svelte@latest`: Replaced by `npx sv create`
- SvelteKit < 2.49.5: Has CVE-2025-67647 DoS vulnerability

## Integration with Existing Infrastructure

### Current wallyblanchard.com Stack

The existing setup (in `/home/user/v1be-code-server/`) runs three containers:
- **caddy** (caddy:2-alpine) -- reverse proxy, SSL, ports 80/443
- **authelia** (authelia/authelia:latest) -- 2FA authentication portal at auth.wallyblanchard.com
- **code-server** (codercom/code-server:latest) -- VS Code in browser at wallyblanchard.com

### Integration Strategy

**Option A (Recommended): Separate docker-compose.yml with shared network**
- Keep wallybrain-music in its own docker-compose.yml in `/home/user/wallybrain-music/`
- Create an external Docker network that both compose stacks join
- Modify the existing Caddyfile to add `/music` routes
- This keeps the music project independent and avoids modifying the V1be stack

```bash
# Create shared network
docker network create webproxy

# In v1be-code-server/docker-compose.yml, add:
# networks:
#   default:
#     external: true
#     name: webproxy

# In wallybrain-music/docker-compose.yml, add:
# networks:
#   default:
#     external: true
#     name: webproxy
```

**Option B: Add to existing docker-compose.yml**
- Add the wallybrain-music service directly to `v1be-code-server/docker-compose.yml`
- Simpler networking (same compose network), but couples the projects

**Recommendation:** Option A. It follows the existing project structure pattern (each project in its own directory) and allows independent lifecycle management.

### Caddy Configuration

The Caddyfile lives at `/home/user/v1be-code-server/Caddyfile`. It needs new route blocks for `/music/*` added before the existing catch-all `reverse_proxy code-server:8080`.

### Filesystem Layout

```
/data/wallybrain-music/          # Docker volume mount point
├── db/
│   └── music.db                 # SQLite database
├── audio/                       # Audio files (Phase 2+)
├── peaks/                       # Waveform peak data (Phase 2+)
└── art/                         # Cover art images (Phase 2+)
```

The `/data/wallybrain-music/` path can be a bind mount to the host filesystem or a named Docker volume. A bind mount is simpler for backup (`cp -r /data/wallybrain-music/ backup/`).

## Open Questions

1. **Docker network strategy: shared external network or single compose file?**
   - What we know: Both approaches work. External network is more modular.
   - What's unclear: Whether the existing V1be stack already uses an external network, or if it needs to be migrated.
   - Recommendation: Check current Docker network setup, create external network if needed.

2. **Caddyfile management: who owns the Caddyfile?**
   - What we know: The Caddyfile currently lives in `/home/user/v1be-code-server/Caddyfile` and is mounted into the Caddy container.
   - What's unclear: Whether to keep it there and just add music routes, or move Caddy config to a shared location.
   - Recommendation: Keep the Caddyfile in its current location. Add the music routes there. The Caddyfile is a shared infrastructure concern, not project-specific.

3. **Database migration strategy: push or generate+migrate?**
   - What we know: `drizzle-kit push` applies schema directly (good for dev). `drizzle-kit generate` + `migrate()` creates versioned SQL files (good for production).
   - What's unclear: Whether to use push for initial setup and switch to generate+migrate later, or start with generate+migrate from day one.
   - Recommendation: Use `drizzle-kit push` for development, `drizzle-kit generate` + programmatic `migrate()` for production Docker builds. The migration files should be committed to git and run on container startup.

4. **Port selection: 8800 vs alternatives**
   - What we know: The project research suggests 8800. The convention is 8xxx for web UIs.
   - What's unclear: Whether port 8800 is already in use on the server.
   - Recommendation: Check with `ss -tlnp | grep 8800` before committing. Use 8800 if available.

## Sources

### Primary (HIGH confidence)
- [SvelteKit Configuration Docs](https://svelte.dev/docs/kit/configuration) -- paths.base configuration
- [SvelteKit adapter-node Docs](https://svelte.dev/docs/kit/adapter-node) -- ORIGIN, PORT, BODY_SIZE_LIMIT, handler.js
- [SvelteKit $app/paths Docs](https://svelte.dev/docs/kit/$app-paths) -- resolve() function (replaces deprecated base)
- [Drizzle ORM SQLite Getting Started](https://orm.drizzle.team/docs/get-started-sqlite) -- better-sqlite3 setup
- [Drizzle ORM SQLite Column Types](https://orm.drizzle.team/docs/column-types/sqlite) -- schema definition
- [Drizzle ORM Timestamp Default](https://orm.drizzle.team/docs/guides/timestamp-default-value) -- sql`(current_timestamp)` pattern
- [Tailwind CSS SvelteKit Guide](https://tailwindcss.com/docs/guides/sveltekit) -- @tailwindcss/vite setup
- [Caddy handle_path Docs](https://caddyserver.com/docs/caddyfile/directives/handle_path) -- path stripping
- [Caddy handle Docs](https://caddyserver.com/docs/caddyfile/directives/handle) -- mutual exclusivity, sorting
- [Caddy Directive Ordering](https://caddyserver.com/docs/caddyfile/directives) -- forward_auth before handle in order
- [Authelia Caddy Integration](https://www.authelia.com/integration/proxies/caddy/) -- forward_auth configuration
- [SvelteKit Drizzle CLI Addon](https://svelte.dev/docs/cli/drizzle) -- sv add drizzle setup

### Secondary (MEDIUM confidence)
- [Full Stack SvelteKit: SQLite + Drizzle](https://fullstacksveltekit.com/blog/sveltekit-sqlite-drizzle) -- complete setup walkthrough
- [SvelteKit Dockerfile Gist](https://gist.github.com/aradalvand/04b2cad14b00e5ffe8ec96a3afbb34fb) -- multi-stage build pattern
- [GitHub Advisory CVE-2025-67647](https://github.com/advisories/GHSA-j62c-4x62-9r35) -- DoS vulnerability details
- [SvelteKit Issue #3726](https://github.com/sveltejs/kit/issues/3726) -- adapter-node + paths.base fix history
- [Caddy Community: handle_path with handle ordering](https://caddy.community/t/handle-path-being-ignored-when-paired-with-handle-in-same-block/14393) -- sorting behavior

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified via npm registry (2026-02-07), official docs consulted
- Architecture: HIGH -- patterns verified against official SvelteKit, Caddy, Drizzle docs; Caddy routing behavior confirmed in community forums and official directive docs
- Pitfalls: HIGH -- CVE verified via GitHub Advisory Database; base path issue confirmed resolved via PR #4448; Caddy ordering confirmed in official docs
- Integration: MEDIUM -- Docker networking strategy depends on current server state (needs verification during implementation)

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable stack, 30-day validity)
