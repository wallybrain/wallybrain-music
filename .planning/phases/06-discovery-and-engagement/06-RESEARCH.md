# Phase 6: Discovery and Engagement - Research

**Researched:** 2026-02-09
**Domain:** SvelteKit URL-based filtering, Drizzle ORM dynamic queries, play count tracking, Open Graph meta tags
**Confidence:** HIGH

## Summary

Phase 6 adds four capabilities to the wallybrain music site: category filtering (finished/experiment/set/export), tag filtering (genre-based), anonymous play count tracking, and Open Graph meta tags for social sharing. The existing codebase already has the schema foundations in place -- `tracks.category`, `tracks.playCount`, the `tags` table, and the `track_tags` junction table are all defined in Drizzle schema. The track detail page already displays play counts and tags. What is missing is the filtering UI and server logic on the listing page, the play count increment API endpoint, and the OG meta tags on the detail page.

The recommended approach uses SvelteKit's native URL search parameters with GET form submission for progressive enhancement. Filters flow through `url.searchParams` in the server load function, which builds dynamic Drizzle WHERE clauses using the `and()` composition pattern. Play count increments happen via a POST API endpoint with client-side debouncing. OG meta tags are rendered server-side in `<svelte:head>` on the track detail page, using the existing cover art API endpoint for `og:image`.

**Primary recommendation:** Use URL searchParams for filter state (progressive enhancement), Drizzle's `and()` with conditional filter arrays for dynamic queries, a POST endpoint at `/api/tracks/[id]/play` for play counts, and static OG meta tags in `<svelte:head>` on the detail page.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.50.2 | Framework, routing, SSR, load functions | Already in use |
| Drizzle ORM | ^0.45.1 | Database queries, dynamic WHERE clauses | Already in use |
| Svelte 5 | ^5.50.0 | UI components with runes ($state, $derived, $props) | Already in use |
| Tailwind CSS | ^4.1.18 | Styling filter UI, tags, badges | Already in use |
| better-sqlite3 | ^12.6.2 | SQLite driver | Already in use |

### Supporting (no new dependencies needed)
This phase requires NO new npm dependencies. Everything is achievable with the existing stack:
- URL filtering: SvelteKit native `url.searchParams` + `goto()` from `$app/navigation`
- Dynamic queries: Drizzle ORM `and()`, `eq()`, `inArray()`, `exists()`, `sql` operators
- Play count: SvelteKit API endpoint + `setTimeout` debounce (no library needed)
- OG meta tags: Native `<svelte:head>` with `<meta>` tags

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native searchParams | sveltekit-search-params npm | Adds dependency; native is sufficient for this use case and is Svelte 5 compatible |
| Manual debounce | lodash.debounce | Overkill for single use case; 5-line setTimeout wrapper suffices |
| Static OG tags | @ethercorps/sveltekit-og (dynamic image generation) | Unnecessary complexity; cover art already exists as static images |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended File Structure for Phase 6 Changes
```
src/
  routes/
    +page.server.ts          # MODIFY: Add searchParams reading, dynamic WHERE, tag query
    +page.svelte              # MODIFY: Add filter UI, wire to URL params
    track/[slug]/
      +page.server.ts         # MODIFY: (no changes needed, already returns tags)
      +page.svelte            # MODIFY: Add OG meta tags in <svelte:head>
    api/tracks/[id]/
      play/+server.ts         # NEW: POST endpoint for play count increment
  lib/
    components/
      TrackCard.svelte        # MODIFY: Add category badge, tag display
      FilterBar.svelte        # NEW: Category + tag filter UI component
```

### Pattern 1: URL SearchParams for Filter State (Progressive Enhancement)
**What:** Filter state lives in the URL via query parameters (`?category=set&tag=ambient`). The server load function reads these, applies them to the DB query, and returns filtered results. The UI uses a GET `<form>` that works without JavaScript.
**When to use:** Any time filter state should be shareable, bookmarkable, and work without JS.
**Example:**
```typescript
// src/routes/+page.server.ts
// Source: https://svelte.dev/docs/kit/load
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const category = url.searchParams.get('category');
  const selectedTags = url.searchParams.getAll('tag');

  // SvelteKit auto-tracks searchParams access and re-runs load when they change
  // ... build dynamic query based on these values
};
```

```svelte
<!-- src/routes/+page.svelte (progressive enhancement) -->
<!-- GET form works without JS; with JS, use goto() for instant updates -->
<form method="GET" action="">
  <select name="category">
    <option value="">All types</option>
    <option value="track">Finished</option>
    <option value="set">Set</option>
    <option value="experiment">Experiment</option>
    <option value="export">Export</option>
  </select>

  <!-- Tag checkboxes -->
  {#each availableTags as tag}
    <label>
      <input type="checkbox" name="tag" value={tag} checked={selectedTags.includes(tag)} />
      {tag}
    </label>
  {/each}

  <noscript><button type="submit">Filter</button></noscript>
</form>
```

### Pattern 2: Drizzle Dynamic WHERE with Conditional Filters
**What:** Build an array of SQL conditions based on active filters, then spread into `and()`.
**When to use:** Any query where filter conditions are optional/combinable.
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/conditional-filters-in-query
import { and, eq, exists, sql, SQL } from 'drizzle-orm';
import { tracks, tags, trackTags } from '$lib/server/db/schema';

const filters: SQL[] = [];

// Always filter to ready tracks
filters.push(eq(tracks.status, 'ready'));

// Optional category filter
if (category) {
  filters.push(eq(tracks.category, category));
}

// Optional tag filter using EXISTS subquery
if (selectedTags.length > 0) {
  for (const tagName of selectedTags) {
    const sq = db
      .select({ id: sql`1` })
      .from(trackTags)
      .innerJoin(tags, eq(trackTags.tagId, tags.id))
      .where(and(
        eq(trackTags.trackId, tracks.id),
        eq(tags.name, tagName)
      ));
    filters.push(exists(sq));
  }
}

const results = db
  .select({ /* fields */ })
  .from(tracks)
  .where(and(...filters))
  .orderBy(desc(tracks.createdAt))
  .all();
```

### Pattern 3: Play Count Increment API
**What:** A POST endpoint that atomically increments `play_count` using SQL `column + 1`. Client calls it once per play with debouncing.
**When to use:** Any anonymous counter that should resist casual abuse.
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/incrementing-a-value
// src/routes/api/tracks/[id]/play/+server.ts
import { eq, sql } from 'drizzle-orm';
import { tracks } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ params }) => {
  const track = db.select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.id, params.id))
    .get();

  if (!track) {
    return error(404, 'Track not found');
  }

  db.update(tracks)
    .set({ playCount: sql`${tracks.playCount} + 1` })
    .where(eq(tracks.id, params.id))
    .run();

  return new Response(null, { status: 204 });
};
```

### Pattern 4: Open Graph Meta Tags in svelte:head
**What:** Server-rendered meta tags for social platform link previews.
**When to use:** Any page that will be shared on social platforms.
**Example:**
```svelte
<!-- Source: https://ogp.me/ -->
<!-- src/routes/track/[slug]/+page.svelte -->
<svelte:head>
  <meta property="og:title" content={track.title} />
  <meta property="og:description" content={track.description || `Listen to ${track.title} by wallybrain`} />
  <meta property="og:type" content="music.song" />
  <meta property="og:url" content="https://wallyblanchard.com/music/track/{track.slug}" />
  <meta property="og:image" content="https://wallyblanchard.com/music/api/tracks/{track.id}/art" />
  <meta property="og:site_name" content="wallybrain" />
  {#if track.duration}
    <meta property="music:duration" content={String(track.duration)} />
  {/if}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={track.title} />
  <meta name="twitter:description" content={track.description || `Listen to ${track.title} by wallybrain`} />
  <meta name="twitter:image" content="https://wallyblanchard.com/music/api/tracks/{track.id}/art" />
</svelte:head>
```

### Anti-Patterns to Avoid
- **Client-side-only filtering:** Never filter tracks only in the browser. Server-side filtering via URL params ensures SSR works, links are shareable, and the page works without JS.
- **Unprotected counters without any debounce:** A play count endpoint with zero protection would let a simple `for` loop inflate counts. At minimum, debounce on the client side.
- **Using `history.pushState` directly:** In SvelteKit, always use `goto()` or `pushState` from `$app/navigation` to update URLs. Direct History API calls conflict with SvelteKit's router.
- **Generating OG images dynamically:** The existing cover art endpoint already serves JPEG images. Do not add Satori/Sharp-based OG image generation unless there is a specific reason the cover art is unsuitable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state management | Custom state sync between URL and UI | SvelteKit `url.searchParams` + `goto()` | SvelteKit auto-tracks searchParam access and re-runs load functions when they change |
| Atomic increment | Read-then-write pattern (`SELECT count, UPDATE count+1`) | Drizzle `sql\`column + 1\`` in `.set()` | Avoids race conditions; single atomic SQL statement |
| Dynamic query building | String concatenation of SQL | Drizzle `and()` with filter arrays | Type-safe, injection-proof, handles undefined gracefully |
| OG tag validation | Manual testing by sharing links | opengraph.xyz validator tool | Instantly shows how Discord/Twitter/Facebook will render the preview |

**Key insight:** This entire phase uses existing SvelteKit and Drizzle patterns. There are zero custom solutions to build -- every feature maps to a well-documented framework pattern.

## Common Pitfalls

### Pitfall 1: Base Path in OG URLs
**What goes wrong:** OG meta tags use relative URLs or forget the `/music` base path, resulting in broken social previews.
**Why it happens:** The app runs at `base: '/music'` (see `svelte.config.js`). Social crawlers do not follow redirects well and need absolute URLs.
**How to avoid:** Always use fully qualified absolute URLs in OG tags: `https://wallyblanchard.com/music/track/{slug}`. Never use `{base}` in OG URLs since it is a relative prefix. Hardcode the domain or pass it from the server.
**Warning signs:** Social preview debugger shows broken image or wrong URL.

### Pitfall 2: Tag Filter Returning AND vs OR
**What goes wrong:** User selects two tags (ambient + modular), but the query returns no results because both tags are required on a single track (AND) when the user expected any matching tag (OR).
**Why it happens:** Multiple `exists()` subqueries composed with `and()` require ALL tags to be present.
**How to avoid:** Decide upfront which behavior to implement. For music discovery, AND semantics (tracks matching ALL selected tags) is standard -- it narrows results as you add more tags. Document this in the UI: "showing tracks with all selected tags."
**Warning signs:** Adding more tag filters reduces results to zero unexpectedly.

### Pitfall 3: SvelteKit Load Re-runs on SearchParam Change
**What goes wrong:** Every keypress in a text filter triggers a server load function re-run because SvelteKit tracks `url.searchParams` access.
**Why it happens:** SvelteKit automatically re-runs load functions when accessed search params change. If you call `goto()` on every keystroke, you get N requests.
**How to avoid:** Use `goto()` with debouncing for text inputs (250ms), or use immediate submission for discrete controls (checkboxes, select dropdowns). Since our filters are category selects and tag checkboxes (no text input), this is less of a concern, but keep it in mind if search is added later.
**Warning signs:** Network tab shows rapid successive requests while user interacts with filters.

### Pitfall 4: Play Count Fires on Page Load
**What goes wrong:** Play count increments every time the page loads instead of when the user actually plays the track.
**Why it happens:** Developer places the fetch call in `onMount` or the load function instead of tying it to the play event.
**How to avoid:** Fire the play count POST only from the WaveSurfer `play` event handler. Debounce so that pause/resume does not re-trigger. A simple flag (`hasCountedPlay`) that resets only on track change is sufficient.
**Warning signs:** Play counts are much higher than actual listens.

### Pitfall 5: OG Image Must Be Absolute URL and Correct Content Type
**What goes wrong:** Discord/Twitter do not display the image preview.
**Why it happens:** The `og:image` URL is relative, or the image endpoint returns wrong Content-Type, or the image is too small.
**How to avoid:** Use absolute URL (`https://wallyblanchard.com/music/api/tracks/{id}/art`). The existing art endpoint already returns `Content-Type: image/jpeg` correctly. Ensure cover art is at least 200x200px (ideally 1200x630 for best display, but square album art at 800x800 works fine for music).
**Warning signs:** Facebook Sharing Debugger or opengraph.xyz shows no image.

### Pitfall 6: Category Enum Mismatch
**What goes wrong:** Filter uses `finished` but schema uses `track`.
**Why it happens:** The requirements say "finished, experiment, set, export" but the schema enum is `['track', 'set', 'experiment', 'export']` (using `track` not `finished`).
**How to avoid:** Use the schema values (`track`, `set`, `experiment`, `export`) as the actual filter values. Display labels can be different: show "Finished" to the user but send `category=track` in the URL.
**Warning signs:** Category filter returns no results for "finished" tracks.

## Code Examples

Verified patterns from official sources:

### Querying Available Tags for Filter UI
```typescript
// Get all tags that are actually used by ready tracks
const availableTags = db
  .select({ name: tags.name })
  .from(tags)
  .innerJoin(trackTags, eq(tags.id, trackTags.tagId))
  .innerJoin(tracks, eq(trackTags.trackId, tracks.id))
  .where(eq(tracks.status, 'ready'))
  .groupBy(tags.name)
  .all()
  .map(t => t.name);
```

### Client-Side Filter Update with goto()
```typescript
// Source: https://svelte.dev/docs/kit/$app-navigation
import { goto } from '$app/navigation';
import { page } from '$app/state';

function updateFilters(category: string | null, selectedTags: string[]) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  for (const tag of selectedTags) params.append('tag', tag);

  const search = params.toString();
  goto(search ? `?${search}` : '?', { replaceState: true, keepFocus: true });
}
```

### Play Count Debounce on Client
```typescript
// In WaveformPlayer.svelte
let hasCountedPlay = false;

function onPlay() {
  if (!hasCountedPlay) {
    hasCountedPlay = true;
    fetch(`/music/api/tracks/${trackId}/play`, { method: 'POST' });
  }
}

// Wire to wavesurfer
ws.on('play', onPlay);
```

### Reusable Increment Helper
```typescript
// Source: https://orm.drizzle.team/docs/guides/incrementing-a-value
import { sql, type AnyColumn } from 'drizzle-orm';

export const increment = (column: AnyColumn, value = 1) => {
  return sql`${column} + ${value}`;
};

// Usage:
db.update(tracks)
  .set({ playCount: increment(tracks.playCount) })
  .where(eq(tracks.id, trackId))
  .run();
```

### Full Load Function with Dynamic Filtering
```typescript
// src/routes/+page.server.ts
import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags } from '$lib/server/db/schema';
import { eq, and, exists, desc, sql, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const category = url.searchParams.get('category');
  const selectedTags = url.searchParams.getAll('tag');

  const filters: SQL[] = [eq(tracks.status, 'ready')];

  if (category) {
    filters.push(eq(tracks.category, category));
  }

  if (selectedTags.length > 0) {
    for (const tagName of selectedTags) {
      const sq = db
        .select({ x: sql`1` })
        .from(trackTags)
        .innerJoin(tags, eq(trackTags.tagId, tags.id))
        .where(and(eq(trackTags.trackId, tracks.id), eq(tags.name, tagName)));
      filters.push(exists(sq));
    }
  }

  const readyTracks = db
    .select({
      id: tracks.id,
      title: tracks.title,
      slug: tracks.slug,
      duration: tracks.duration,
      artPath: tracks.artPath,
      playCount: tracks.playCount,
      category: tracks.category,
      createdAt: tracks.createdAt,
    })
    .from(tracks)
    .where(and(...filters))
    .orderBy(desc(tracks.createdAt))
    .all();

  // Get tags for each track (for display on cards)
  const trackIds = readyTracks.map(t => t.id);
  const allTrackTags = trackIds.length > 0
    ? db.select({ trackId: trackTags.trackId, name: tags.name })
        .from(trackTags)
        .innerJoin(tags, eq(trackTags.tagId, tags.id))
        .all()
    : [];

  const tagsByTrack = new Map<string, string[]>();
  for (const tt of allTrackTags) {
    if (!tagsByTrack.has(tt.trackId)) tagsByTrack.set(tt.trackId, []);
    tagsByTrack.get(tt.trackId)!.push(tt.name);
  }

  // Get available tags for filter UI
  const availableTags = db
    .select({ name: tags.name })
    .from(tags)
    .innerJoin(trackTags, eq(tags.id, trackTags.tagId))
    .innerJoin(tracks, eq(trackTags.trackId, tracks.id))
    .where(eq(tracks.status, 'ready'))
    .groupBy(tags.name)
    .all()
    .map(t => t.name);

  return {
    tracks: readyTracks.map(t => ({
      ...t,
      tags: tagsByTrack.get(t.id) ?? [],
    })),
    availableTags,
    activeCategory: category,
    activeTags: selectedTags,
  };
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte stores for URL state | `$app/state` page object + `goto()` | Svelte 5 / SvelteKit 2 | `$page` store deprecated in favor of `page` from `$app/state` |
| `$: reactive` declarations | `$derived()` rune | Svelte 5 | Codebase already uses runes |
| `on:click` event directives | `onclick` attribute | Svelte 5 | Codebase already uses new event syntax |
| `history.pushState()` | `pushState()` / `replaceState()` from `$app/navigation` | SvelteKit 2 | Must use SvelteKit's versions to avoid router conflicts |

**Deprecated/outdated:**
- `$page` store from `$app/stores`: Deprecated in Svelte 5. Use `page` from `$app/state` instead. However, the codebase currently uses `$props()` and `$derived()` patterns. The load function data is passed via `let { data } = $props()`.
- `on:event` syntax: Replaced by `onevent` attribute syntax in Svelte 5. Codebase already uses new syntax.

## Open Questions

1. **Tag filter semantics: AND or OR?**
   - What we know: AND (tracks must match ALL selected tags) is more standard for narrowing search. OR (tracks matching ANY selected tag) is better for discovery.
   - What's unclear: Which behavior is preferred for this music site.
   - Recommendation: Default to AND semantics. It is simpler to implement (multiple `exists()` subqueries), matches user mental model of "ambient + modular = tracks that are both ambient and modular"), and is the standard for most filter UIs. If OR is desired later, switch `exists()` composition from `and()` to `or()`.

2. **Play count abuse prevention level**
   - What we know: The requirement says "debounced, anonymous." No authentication for public visitors.
   - What's unclear: How much abuse prevention is needed for a personal music portfolio site.
   - Recommendation: Minimal prevention -- fire once per page session (flag reset on new track navigation). No IP tracking, no cookies, no rate limiting. This is a portfolio site, not Spotify. The play count is social proof, not a monetization metric.

3. **Canonical domain for OG URLs**
   - What we know: The app is served at `/music` base path, suggesting `wallyblanchard.com/music/`. The svelte.config.js sets `paths.base: '/music'`.
   - What's unclear: Whether the site runs at `wallyblanchard.com` or a different domain.
   - Recommendation: Define the canonical domain as an environment variable (`PUBLIC_SITE_URL=https://wallyblanchard.com`). Use it to construct absolute OG URLs. This avoids hardcoding and works across environments.

## Sources

### Primary (HIGH confidence)
- Drizzle ORM official docs: [Conditional Filters](https://orm.drizzle.team/docs/guides/conditional-filters-in-query) - dynamic WHERE clause patterns with `and()` and filter arrays
- Drizzle ORM official docs: [Incrementing a Value](https://orm.drizzle.team/docs/guides/incrementing-a-value) - atomic increment with `sql` template
- Drizzle ORM official docs: [Operators](https://orm.drizzle.team/docs/operators) - `exists()`, `inArray()`, `eq()`, `and()` operators
- Drizzle ORM official docs: [Select Parent with Related Children](https://orm.drizzle.team/docs/guides/select-parent-rows-with-at-least-one-related-child-row) - EXISTS subquery pattern
- SvelteKit official docs: [Loading Data](https://svelte.dev/docs/kit/load) - `url.searchParams` access, dependency tracking, automatic re-runs
- SvelteKit official docs: [$app/navigation](https://svelte.dev/docs/kit/$app-navigation) - `goto()`, `replaceState()`, `pushState()` function signatures
- Open Graph protocol: [ogp.me](https://ogp.me/) - required OG properties, `music.song` type, `og:audio` tag

### Secondary (MEDIUM confidence)
- [Geoff Rich: Progressively Enhancing the Marvel By Year Filter](https://geoffrich.net/posts/marvel-filter-state/) - GET form progressive enhancement pattern for SvelteKit
- [Okupter: Taking Advantage of Query Parameters in SvelteKit](https://www.okupter.com/blog/sveltekit-query-parameters) - searchParams reading patterns
- [Programonaut: Change URL Query Parameters Without Reload](https://www.programonaut.com/how-to-change-url-query-parameters-without-reload-sveltekit/) - goto() with replaceState

### Tertiary (LOW confidence)
- None. All findings verified with official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all libraries already installed and in use
- Architecture: HIGH - All patterns verified against official SvelteKit and Drizzle docs; code examples tested against existing codebase structure
- Pitfalls: HIGH - Base path issue verified from `svelte.config.js`; category enum mismatch verified from `schema.ts`; load function re-run behavior verified from SvelteKit docs
- OG tags: HIGH - Standard well-documented protocol; existing art endpoint already serves correct content type

**Research date:** 2026-02-09
**Valid until:** 2026-03-11 (30 days - stable technologies, no fast-moving dependencies)
