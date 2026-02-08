# Phase 4: Track Pages - Research

**Researched:** 2026-02-08
**Domain:** SvelteKit page routing, Tailwind CSS dark theme, cover art serving, responsive layout, slug-based permalinks
**Confidence:** HIGH

## Summary

Phase 4 transforms the existing minimal track listing into a full public-facing experience with two pages: a track listing page (browse all published tracks) and a track detail page (individual track with waveform player, description, and liner notes). The existing codebase already has the foundation: a WaveformPlayer component, a track listing query, and an upload pipeline that generates cover art. What is missing is the SvelteKit route structure for `/track/[slug]`, a cover art serving endpoint, the dark/moody visual design system, and responsive layouts.

The technical work divides cleanly into two plans. Plan 04-01 handles data and routing: the cover art API endpoint, the track detail page route with slug-based lookup, updating the listing page query to include cover art and play count data, and slug-based navigation between listing and detail. Plan 04-02 handles the visual design system: establishing the dark theme with Tailwind CSS v4, creating the track card component for the listing, designing the detail page layout with waveform player integration, and ensuring responsive behavior across mobile/tablet/desktop breakpoints.

Key observations from the existing codebase: (1) Cover art is stored at `/data/art/{trackId}.jpg` (500x500 JPEG) but there is NO endpoint to serve it -- one must be created. (2) The `artThumb` column exists in the schema but is never populated -- the artwork processor only generates a single 500x500 image. For Phase 4, using the single art file for both listing thumbnails and detail display is sufficient (CSS handles sizing). A thumbnail endpoint can be deferred. (3) The slug field is already populated during upload with collision handling. (4) API endpoints use UUID track IDs (as decided in Phase 3), while public page URLs use slugs (as decided in Phase 3). (5) The existing WaveformPlayer component is fully reusable for the detail page without modification.

**Primary recommendation:** Create a `/track/[slug]` route with server-side slug lookup, add a cover art API endpoint at `/api/tracks/[id]/art`, use Tailwind CSS v4 with a forced dark theme (class-based via `dark` class on `<html>`) and a custom color palette rooted in zinc/violet tones already established in the WaveformPlayer. Design mobile-first with breakpoints at sm (640px), md (768px), and lg (1024px).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.50.x | Page routing, server-side data loading, SSR | Already in use; provides `[slug]` dynamic routes, `+page.server.ts` load functions, `svelte:head` for meta |
| Tailwind CSS | ^4.1.x | Dark theme, responsive design, utility-first styling | Already in use; v4 CSS-first config, `dark:` variant, responsive breakpoints built-in |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new libraries needed) | - | - | All required libraries are already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written CSS | Skeleton UI / DaisyUI component library | Would impose design opinions; the dark/moody electronic music aesthetic needs custom design, not generic components |
| Server-side art serving | Caddy file_server for `/data/art` | Would require Caddyfile changes; keeping art behind an API endpoint is simpler for now and matches the pattern for peaks/audio |
| `enhanced:img` | Standard `<img>` tag | `enhanced:img` is for build-time static images; cover art is user-uploaded and served dynamically -- must use standard `<img>` |

**Installation:**
```bash
# No new packages needed -- all dependencies are already installed
```

## Architecture Patterns

### Recommended Project Structure (new files for this phase)

```
src/
├── lib/
│   └── components/
│       ├── WaveformPlayer.svelte      # Existing (reused on detail page)
│       ├── TrackCard.svelte            # New: track card for listing page
│       └── CoverArt.svelte            # New: cover art image with fallback
├── routes/
│   ├── +layout.svelte                 # Updated: add dark class, global nav/footer
│   ├── +page.svelte                   # Updated: track listing with cards
│   ├── +page.server.ts                # Updated: query includes art, playCount
│   ├── +error.svelte                  # New: custom error page for 404s
│   ├── track/
│   │   └── [slug]/
│   │       ├── +page.svelte           # New: track detail page
│   │       └── +page.server.ts        # New: load track by slug
│   └── api/
│       └── tracks/
│           └── [id]/
│               ├── art/
│               │   └── +server.ts     # New: cover art serving endpoint
│               ├── audio/
│               │   └── +server.ts     # Existing
│               └── peaks/
│                   └── +server.ts     # Existing
```

### Pattern 1: Slug-Based Route with Server Load

**What:** Create a dynamic route at `src/routes/track/[slug]/` that looks up a track by slug in the database and returns its full data for SSR rendering.
**When to use:** The track detail page -- every track has a permalink at `/music/track/{slug}`.

```typescript
// src/routes/track/[slug]/+page.server.ts
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const track = db.select()
    .from(tracks)
    .where(eq(tracks.slug, params.slug))
    .get();

  if (!track || track.status !== 'ready') {
    throw error(404, 'Track not found');
  }

  return { track };
};
```

**Key details:**
- Look up by `slug` column (has unique index from migration 0000)
- Filter for `status === 'ready'` so non-published tracks return 404
- SvelteKit generates `PageServerLoad` types automatically based on the route params
- The `error()` function triggers the nearest `+error.svelte` component

### Pattern 2: Cover Art Serving Endpoint

**What:** A `+server.ts` GET endpoint that reads a track's cover art file from disk and streams it with proper Content-Type and cache headers.
**When to use:** For `<img>` src attributes that reference `/music/api/tracks/{id}/art`.

```typescript
// src/routes/api/tracks/[id]/art/+server.ts
import type { RequestHandler } from './$types';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const track = db.select({ artPath: tracks.artPath })
    .from(tracks)
    .where(eq(tracks.id, params.id))
    .get();

  if (!track || !track.artPath) {
    throw error(404, 'Cover art not found');
  }

  let fileSize: number;
  try {
    fileSize = statSync(track.artPath).size;
  } catch {
    throw error(404, 'Cover art not found');
  }

  const stream = createReadStream(track.artPath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(fileSize),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

**Key details:**
- Cover art files are JPEG (500x500), stored at `/data/art/{trackId}.jpg`
- Use UUID track ID in the API URL (consistent with audio/peaks endpoints)
- Cache immutably -- art is tied to the UUID, so re-processing creates a new UUID
- Return 404 if track has no cover art (artPath is null or file missing)

### Pattern 3: Dark Theme with Tailwind CSS v4

**What:** Force the entire application into dark mode using Tailwind v4's class-based dark variant.
**When to use:** Globally -- the entire wallybrain-music site uses a dark aesthetic.

```css
/* src/app.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-surface-900: var(--color-zinc-900);
  --color-surface-950: var(--color-zinc-950);
  --color-accent: var(--color-violet-600);
  --color-accent-hover: var(--color-violet-500);
}
```

```svelte
<!-- src/app.html -->
<html lang="en" class="dark">
```

**Why class-based over system preference:** This is a music platform with an intentional dark aesthetic. It should always be dark, regardless of the user's OS setting. Setting `class="dark"` on `<html>` and using `dark:` prefixed classes ensures consistent appearance.

**Alternatively (simpler approach):** Since the site is ALWAYS dark, we can skip the `dark:` variant entirely and just use the dark colors directly (e.g., `bg-zinc-950` instead of `dark:bg-zinc-950`). The current codebase already does this -- the existing `+page.svelte` uses `bg-zinc-950` without any `dark:` prefix. This is the recommended approach: just use dark colors directly.

### Pattern 4: Cover Art Component with Fallback

**What:** A reusable CoverArt component that shows the track's cover art or a styled placeholder when no art exists.
**When to use:** Both the track listing cards and the detail page.

```svelte
<!-- src/lib/components/CoverArt.svelte -->
<script lang="ts">
  let { trackId, artPath, title, size = 'md' }: {
    trackId: string;
    artPath: string | null;
    title: string;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 md:w-32 md:h-32',
    lg: 'w-full max-w-md aspect-square',
  };
</script>

{#if artPath}
  <img
    src="/music/api/tracks/{trackId}/art"
    alt="Cover art for {title}"
    class="{sizeClasses[size]} rounded-lg object-cover"
    loading="lazy"
  />
{:else}
  <div class="{sizeClasses[size]} rounded-lg bg-zinc-800 flex items-center justify-center">
    <span class="text-zinc-600 text-2xl">&#9835;</span>
  </div>
{/if}
```

**Key details:**
- Uses `loading="lazy"` for listing pages (many images)
- Square aspect ratio enforced by `aspect-square` or equal w/h
- Placeholder shows a music note symbol when no cover art exists
- Uses the API endpoint URL, not the filesystem path

### Pattern 5: Linking Between Listing and Detail Pages

**What:** Use SvelteKit's client-side navigation with `<a>` tags for track links.
**When to use:** Track cards in the listing link to detail pages.

```svelte
<a href="/music/track/{track.slug}" class="block">
  <!-- Track card content -->
</a>
```

**Key details:**
- Use `/music/track/{slug}` -- the `/music` base path is the SvelteKit `paths.base` and must be included in `href` attributes
- SvelteKit automatically uses client-side navigation for same-origin `<a>` tags with `data-sveltekit-preload-data="hover"` (set in app.html)
- This means page transitions are fast (data preloads on hover)
- The `base` path (`/music`) is already configured in `svelte.config.js`

**Important:** For links within SvelteKit pages, the `base` path from `svelte.config.js` must be included. The correct pattern is `href="/music/track/{slug}"` not `href="/track/{slug}"`. Alternatively, import `base` from `$app/paths` and use `href="{base}/track/{slug}"`. The `$app/paths` approach is more maintainable.

### Anti-Patterns to Avoid

- **Using `enhanced:img` for dynamic cover art:** `enhanced:img` only works for static images known at build time. Cover art is user-uploaded and served from an API -- must use standard `<img>` tag.
- **Hardcoding the base path:** Do not hardcode `/music` throughout templates. Use `base` from `$app/paths` so the base path is configurable from one place (`svelte.config.js`).
- **Creating separate mobile/desktop components:** Use Tailwind's responsive utilities (`sm:`, `md:`, `lg:`) for responsive design. One component with responsive classes, not two components conditionally rendered.
- **Fetching track data client-side on the detail page:** Use `+page.server.ts` load functions for SSR. This ensures the page content is available for SEO crawlers and loads instantly on navigation.
- **Generating thumbnail images at request time:** The artwork processor already generates a single 500x500 image. Use CSS to size it for listing (small) vs detail (large). Do not add server-side resize-on-request complexity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page routing with slugs | Custom URL parser | SvelteKit `[slug]` dynamic routes | Built-in param extraction, type generation, SSR integration |
| Responsive breakpoints | Custom media queries | Tailwind `sm:`, `md:`, `lg:` prefixes | Standardized breakpoints, utility-first, no custom CSS |
| Image lazy loading | Intersection Observer code | `loading="lazy"` attribute | Native browser support, zero JS overhead |
| Page transitions | Custom router | SvelteKit client-side navigation | Automatic with `<a>` tags, preloads on hover |
| 404 error pages | Custom middleware | SvelteKit `+error.svelte` | Automatic error boundary, treewalk to nearest error page |
| Dark mode | Custom CSS variables toggle | Tailwind dark colors directly | Site is always dark -- no toggle needed, just use dark palette |

**Key insight:** This phase requires no new libraries. Everything is achievable with SvelteKit routing, Tailwind CSS classes, and the existing component infrastructure. The work is routing structure, data queries, and visual design.

## Common Pitfalls

### Pitfall 1: Missing Base Path in Links

**What goes wrong:** Links to `/track/{slug}` result in 404 because the application is mounted at `/music`.
**Why it happens:** Forgetting that `paths.base` is `/music` in `svelte.config.js`. Internal links need the full path prefix.
**How to avoid:** Import `base` from `$app/paths` and use `{base}/track/{slug}` in all `href` attributes. Or use string literal `/music/track/{slug}` consistently.
**Warning signs:** Links work in dev but 404 in production; clicking track cards navigates to a blank page.

### Pitfall 2: Slug Lookup Returns Non-Ready Track

**What goes wrong:** A visitor hits a permalink for a track that is still processing or has failed, and sees an error or partial data.
**Why it happens:** The slug exists in the database (created at upload time) before the track is ready.
**How to avoid:** Always filter by `status === 'ready'` in the detail page load function. Non-ready tracks should return 404, not partial data.
**Warning signs:** Detail page shows missing cover art, zero duration, or broken waveform for a track that was just uploaded.

### Pitfall 3: Cover Art Image Not Displaying

**What goes wrong:** The `<img>` tag renders but shows a broken image icon.
**Why it happens:** Several possible causes: (1) Track has no cover art (artPath is null) and there is no fallback. (2) The API endpoint path is wrong. (3) The cover art file does not exist on disk even though artPath is set.
**How to avoid:** Always check `artPath` before rendering an `<img>`. Provide a placeholder/fallback component. The CoverArt component pattern handles this.
**Warning signs:** Broken image icons on the listing page or detail page.

### Pitfall 4: Layout Shift from Cover Art Loading

**What goes wrong:** The page layout jumps around as cover art images load, creating a jarring visual experience.
**Why it happens:** Images without explicit dimensions cause reflow when they load. The browser does not know the image size until it arrives.
**How to avoid:** Set explicit width/height or use `aspect-ratio: 1/1` on the image container. All cover art is 500x500 (square), so containers should enforce square aspect ratio.
**Warning signs:** Content below track cards shifts downward as images load on the listing page.

### Pitfall 5: Duration Display for Tracks Without Duration

**What goes wrong:** Duration shows as "0:00" or "NaN" on the listing page.
**Why it happens:** The `duration` field is nullable in the schema. If ffprobe fails or the value is not populated, it defaults to null.
**How to avoid:** Use the existing `formatTime` utility which handles non-finite values gracefully. Display a dash or nothing when duration is null.
**Warning signs:** "0:00" or "NaN:NaN" appearing next to track titles on the listing page.

### Pitfall 6: Multiple WaveformPlayer Instances on Listing Page

**What goes wrong:** Every track on the listing page has a WaveformPlayer that loads peaks and creates a wavesurfer instance, causing excessive API calls and memory usage.
**Why it happens:** The current `+page.svelte` renders a WaveformPlayer for every track. This was fine for Phase 3 prototyping but is wrong for a proper listing page.
**How to avoid:** The listing page should show track cards WITHOUT waveform players. The WaveformPlayer belongs only on the detail page. The listing page shows cover art, title, duration, and play count as a clickable card.
**Warning signs:** Listing page is slow to load, makes many peaks/audio API calls, high memory usage.

## Code Examples

### Track Listing Page Load Function

```typescript
// src/routes/+page.server.ts
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const readyTracks = db
    .select({
      id: tracks.id,
      slug: tracks.slug,
      title: tracks.title,
      duration: tracks.duration,
      playCount: tracks.playCount,
      artPath: tracks.artPath,
      category: tracks.category,
      createdAt: tracks.createdAt,
    })
    .from(tracks)
    .where(eq(tracks.status, 'ready'))
    .orderBy(desc(tracks.createdAt))
    .all();

  return { tracks: readyTracks };
};
```

### Track Detail Page with svelte:head

```svelte
<!-- src/routes/track/[slug]/+page.svelte -->
<script lang="ts">
  import WaveformPlayer from '$lib/components/WaveformPlayer.svelte';
  import CoverArt from '$lib/components/CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import { base } from '$app/paths';

  let { data } = $props();
  const track = data.track;
</script>

<svelte:head>
  <title>{track.title} - wallybrain</title>
  <meta name="description" content={track.description || `Listen to ${track.title} by wallybrain`} />
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
  <a href="{base}/" class="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-block">
    &larr; Back to all tracks
  </a>

  <div class="flex flex-col md:flex-row gap-6 mb-8">
    <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="lg" />
    <div class="flex-1">
      <h1 class="text-2xl md:text-3xl font-bold text-white mb-2">{track.title}</h1>
      {#if track.duration}
        <p class="text-zinc-400 text-sm">{formatTime(track.duration)}</p>
      {/if}
      <p class="text-zinc-500 text-xs mt-1">{track.playCount} plays</p>
    </div>
  </div>

  <WaveformPlayer trackId={track.id} duration={track.duration ?? 0} />

  {#if track.description}
    <div class="mt-8 prose prose-invert prose-zinc max-w-none">
      <h2 class="text-lg font-semibold text-zinc-300 mb-3">About this track</h2>
      <p class="text-zinc-400 whitespace-pre-wrap">{track.description}</p>
    </div>
  {/if}
</div>
```

### Track Card Component for Listing

```svelte
<!-- src/lib/components/TrackCard.svelte -->
<script lang="ts">
  import CoverArt from './CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import { base } from '$app/paths';

  let { track }: {
    track: {
      id: string;
      slug: string;
      title: string;
      duration: number | null;
      playCount: number;
      artPath: string | null;
    };
  } = $props();
</script>

<a
  href="{base}/track/{track.slug}"
  class="flex items-center gap-4 p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors group"
>
  <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />
  <div class="flex-1 min-w-0">
    <h2 class="text-zinc-200 font-medium truncate group-hover:text-white transition-colors">
      {track.title}
    </h2>
    <div class="flex items-center gap-3 text-xs text-zinc-500 mt-1">
      {#if track.duration}
        <span>{formatTime(track.duration)}</span>
      {/if}
      <span>{track.playCount} plays</span>
    </div>
  </div>
</a>
```

### Custom Error Page

```svelte
<!-- src/routes/+error.svelte -->
<script>
  import { page } from '$app/state';
  import { base } from '$app/paths';
</script>

<div class="min-h-screen bg-zinc-950 flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-zinc-300 mb-2">{page.status}</h1>
    <p class="text-zinc-500 mb-6">{page.error?.message || 'Something went wrong'}</p>
    <a href="{base}/" class="text-violet-400 hover:text-violet-300">Back to tracks</a>
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `tailwind.config.js` darkMode | Tailwind v4 CSS-first `@custom-variant dark` | Tailwind v4 (2025) | Config in CSS file, not JS; simpler setup |
| SvelteKit `$page` store | SvelteKit `$app/state` module | SvelteKit 2.x / Svelte 5 | Reactive page state via runes, not stores |
| Svelte 4 `on:click` directive | Svelte 5 `onclick` attribute | Svelte 5 | Lowercase event attributes, not `on:` directives |
| `<svelte:component>` for dynamic | Direct component import | Svelte 5 | Simpler component composition |

**Deprecated/outdated:**
- `$page` store: Still works in Svelte 5 but `$app/state` module `page` is the recommended approach
- `on:click` syntax: Replaced by `onclick` in Svelte 5 (the old syntax still works but emits warnings)
- Tailwind `tailwind.config.js`: In Tailwind v4, configuration is CSS-first; JS config is legacy

## Design System: Dark/Moody Electronic Music Aesthetic

### Color Palette

Based on existing codebase colors (already established in WaveformPlayer and page templates):

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| Background (deepest) | `#09090b` | `bg-zinc-950` | Page background |
| Surface | `#18181b` | `bg-zinc-900` | Cards, containers |
| Surface hover | `#27272a` | `bg-zinc-800` | Interactive hover states |
| Text primary | `#e4e4e7` | `text-zinc-200` | Headings, important text |
| Text secondary | `#a1a1aa` | `text-zinc-400` | Body text, descriptions |
| Text muted | `#71717a` | `text-zinc-500` | Meta info, play counts |
| Accent | `#7c3aed` | `bg-violet-600` | Buttons, waveform progress |
| Accent hover | `#8b5cf6` | `bg-violet-500` | Button hover states |
| Border | `#27272a` | `border-zinc-800` | Dividers, card borders |

### Typography

- **Headings:** System sans-serif stack (Tailwind default), bold weight, zinc-200
- **Body:** Regular weight, zinc-400
- **Meta/small:** text-xs or text-sm, zinc-500
- **Monospace:** Time displays use `font-mono tabular-nums` (already in WaveformPlayer)

### Spacing and Layout

- **Max content width:** `max-w-3xl` (48rem / 768px) for single-column layouts
- **Page padding:** `px-4 py-8` mobile, increasing at breakpoints
- **Card padding:** `p-3` to `p-4`
- **Vertical rhythm:** `space-y-4` for track lists, `space-y-8` for sections

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| Default (mobile) | < 640px | Single column, stacked cover art + info, smaller text |
| `sm:` | >= 640px | Wider padding |
| `md:` | >= 768px | Side-by-side cover art + info on detail page |
| `lg:` | >= 1024px | Max width constraint, centered content |

## Architectural Considerations for Future Phases

### Phase 7 (Persistent Player) Impact

The persistent player (Phase 7) will add a fixed bottom bar that plays audio while navigating between pages. Phase 4 must NOT:
- Mount WaveformPlayer on the listing page (it belongs on detail pages only; Phase 7 will move it to a layout-level persistent component)
- Use full-page-height layouts that would conflict with a bottom bar (leave room for future `pb-20` or similar)
- Couple player state to page components -- keep it in props, not global state

Phase 4 SHOULD:
- Structure the layout component (`+layout.svelte`) to be extendable with a bottom bar later
- Keep track data loading in `+page.server.ts` (not in layout) so individual pages control what data they need

### Phase 6 (Discovery) Impact

Phase 6 adds filtering to the listing page. Phase 4 should:
- Keep the listing page query simple but ordered by `createdAt DESC`
- Use a clean data structure that can accept filter params later
- Not hardcode the listing layout in a way that prevents adding filter controls above the track list

### Phase 5 (Admin Interface) Impact

Phase 5 reuses the track display components. Phase 4 should:
- Make `TrackCard` and `CoverArt` components reusable (accept data via props, not hard-coded queries)
- Keep components in `$lib/components/` where admin pages can also import them

## Open Questions

1. **Description field formatting**
   - What we know: The `description` column is plain text (TEXT in SQLite). Currently no tracks have descriptions (populated only if set via admin, which does not exist yet).
   - What's unclear: Whether description should support Markdown or remain plain text.
   - Recommendation: Render as plain text with `whitespace-pre-wrap` for now. Markdown support can be added in Phase 5 (admin interface) if desired. Avoids adding a Markdown parsing dependency.

2. **Liner notes as separate field vs part of description**
   - What we know: Requirement DISP-03 mentions "description/liner notes" as content on the detail page. The schema has a single `description` field.
   - What's unclear: Whether "liner notes" implies a separate field or is just part of the description.
   - Recommendation: Treat them as the same field. The description IS the liner notes. No schema change needed. The admin UI (Phase 5) can label it "Description / Liner Notes" for clarity.

3. **Cover art for tracks without embedded art**
   - What we know: Cover art is extracted from audio file metadata (embedded album art). Tracks without embedded art have `artPath = null`.
   - What's unclear: What percentage of uploads will have embedded art. Electronic music exported from DAWs often lacks embedded cover art.
   - Recommendation: Display a styled placeholder (dark background with music note icon). This is implemented in the CoverArt component pattern above. The admin UI (Phase 5) can add manual cover art upload later.

## Sources

### Primary (HIGH confidence)
- [SvelteKit Routing Docs](https://svelte.dev/docs/kit/routing) - Dynamic routes with `[slug]` params
- [SvelteKit SEO Docs](https://svelte.dev/docs/kit/seo) - `svelte:head` for meta tags
- [SvelteKit Errors Docs](https://svelte.dev/docs/kit/errors) - `+error.svelte` error boundaries
- [SvelteKit Images Docs](https://svelte.dev/docs/kit/images) - `enhanced:img` limitations for dynamic images
- [Tailwind CSS v4 Dark Mode Docs](https://tailwindcss.com/docs/dark-mode) - `@custom-variant dark` CSS-first configuration
- Existing codebase: `schema.ts`, `+page.svelte`, `WaveformPlayer.svelte`, `processTrack.ts`, `artwork.ts`, `svelte.config.js` -- all read and analyzed

### Secondary (MEDIUM confidence)
- [SvelteKit State Management Docs](https://kit.svelte.dev/docs/state-management) - Layout state persistence across navigation
- [SvelteKit Loading Data Docs](https://svelte.dev/docs/kit/load) - `+page.server.ts` load function patterns
- [How to add SEO to SvelteKit](https://maier.tech/posts/how-to-add-a-basic-seo-component-to-sveltekit) - Per-page meta tag patterns

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation and existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all patterns use existing SvelteKit + Tailwind infrastructure
- Architecture: HIGH - SvelteKit dynamic routes are well-documented; slug-based lookup is a standard pattern; cover art serving follows the existing peaks/audio endpoint pattern
- Design system: HIGH - Color palette already established in existing code; Tailwind dark mode documented; responsive breakpoints are built-in
- Pitfalls: HIGH - All pitfalls identified from real codebase analysis (base path issues, nullable fields, cover art fallback) and SvelteKit documentation

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (stable -- SvelteKit routing is mature; Tailwind v4 API is stable)
