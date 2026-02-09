# Phase 5: Admin Interface - Research

**Researched:** 2026-02-08
**Domain:** SvelteKit admin UI, drag-and-drop file upload, metadata editing, status polling, Caddy forward_auth with Authelia 2FA
**Confidence:** HIGH

## Summary

Phase 5 adds a protected admin interface at `/music/admin` where the artist can upload audio files via drag-and-drop, edit track metadata, upload custom cover art, and monitor processing status. The existing codebase already has the upload API endpoint (`/api/upload` accepting multipart/form-data), the processing queue with status tracking (pending/processing/ready/failed), and the full database schema including title, description, category, tags, and cover art fields. What is missing is: (1) the admin UI pages and components, (2) API endpoints for track updates and listing all tracks (including non-ready ones), (3) a status polling mechanism, and (4) Caddy/Authelia configuration to protect admin routes with 2FA.

The Authelia + Caddy infrastructure is already deployed and working for the V1be Code Server at wallyblanchard.com. The existing Caddyfile uses `forward_auth authelia:9091` with the `/api/authz/forward-auth` URI. The current setup routes `/music` and `/music/*` directly to the SvelteKit app without auth, and everything else through Authelia. For Phase 5, admin routes at `/music/admin/*` need to be carved out of the public music routes and placed behind `forward_auth`. This requires modifying the Caddyfile to match admin paths first (before the general music path) and adding a path-specific bypass rule in Authelia's access control so public music routes remain unauthenticated.

The admin UI itself is straightforward SvelteKit work: a new route group at `src/routes/admin/`, drag-and-drop upload using native HTML5 drag events (ondragover/ondrop) with a hidden file input fallback, a metadata edit form using SvelteKit form actions, and polling for processing status using `$effect` with `setInterval`. No new npm dependencies are needed -- everything can be built with existing SvelteKit, Tailwind CSS, and native browser APIs. The existing `sharp` library handles cover art resizing for manually uploaded art.

**Primary recommendation:** Create admin routes at `/music/admin` with two pages (upload + track list/edit). Protect these routes at the Caddy layer using `forward_auth` on path matcher `@admin path /music/admin /music/admin/*`. Use native HTML5 drag-and-drop events (no library needed for single-file drop zones). Poll for status updates using `$effect` + `setInterval` every 2 seconds. Build metadata editing with SvelteKit form actions and `use:enhance`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | ^2.50.x | Admin page routing, form actions, server-side data loading | Already in use; form actions handle metadata editing natively |
| Tailwind CSS | ^4.1.x | Admin UI styling consistent with dark theme | Already in use; same dark/moody aesthetic as public pages |
| Drizzle ORM | ^0.45.x | Database queries for track CRUD operations | Already in use; update/insert/select patterns established |
| sharp | ^0.34.x | Cover art resize when manually uploaded | Already in use for processing pipeline art extraction |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new libraries needed) | - | - | All required functionality is built-in to SvelteKit and native browser APIs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native HTML5 drag-and-drop events | filedrop-svelte or svelte-file-dropzone | Libraries add dependency for simple drop zone; native ondragover/ondrop is ~20 lines of code for a single-file upload scenario |
| Polling with setInterval | Server-Sent Events (SSE) | SSE is more efficient but adds complexity (EventSource endpoint, connection management); polling every 2s is simple and adequate for a single-user admin interface |
| SvelteKit form actions | Raw fetch() to API endpoints | Form actions provide progressive enhancement, validation patterns, and integrate with `use:enhance`; better UX than raw fetch |

**Installation:**
```bash
# No new packages needed -- all dependencies are already installed
```

## Architecture Patterns

### Recommended Project Structure (new files for this phase)

```
src/
├── routes/
│   ├── admin/
│   │   ├── +layout.svelte           # Admin layout (optional: admin nav, back link)
│   │   ├── +layout.server.ts        # Admin layout load: verify auth headers from Caddy
│   │   ├── +page.svelte             # Track management: list all tracks, status, edit links
│   │   ├── +page.server.ts          # Load all tracks (all statuses) + form actions for delete/retry
│   │   ├── upload/
│   │   │   ├── +page.svelte         # Drag-and-drop upload UI with metadata form
│   │   │   └── +page.server.ts      # Upload form action (reuses existing upload logic)
│   │   └── tracks/
│   │       └── [id]/
│   │           ├── +page.svelte     # Edit track metadata, cover art, tags
│   │           └── +page.server.ts  # Load track + update form action
│   └── api/
│       └── tracks/
│           └── [id]/
│               └── status/
│                   └── +server.ts   # GET endpoint returning track status (for polling)
```

### Pattern 1: Drag-and-Drop Upload with Native HTML5 Events

**What:** A drop zone component using ondragover/ondragenter/ondragleave/ondrop events with a hidden file input as fallback.
**When to use:** The admin upload page.

```svelte
<script lang="ts">
  let isDragging = $state(false);
  let files: File[] = $state([]);
  let fileInput: HTMLInputElement;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files) {
      files = [...e.dataTransfer.files];
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleFileSelect(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files) {
      files = [...input.files];
    }
  }
</script>

<div
  role="button"
  tabindex="0"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  class="border-2 border-dashed rounded-lg p-12 text-center transition-colors
    {isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-700 hover:border-zinc-500'}"
>
  <p class="text-zinc-400">Drag audio files here or</p>
  <button onclick={() => fileInput.click()} class="text-violet-400 hover:text-violet-300 underline">
    browse files
  </button>
  <input
    bind:this={fileInput}
    type="file"
    accept="audio/*"
    multiple
    onchange={handleFileSelect}
    class="hidden"
  />
</div>
```

**Key details:**
- `e.preventDefault()` on both dragover and drop is required -- without it, the browser opens the file
- Use Svelte 5 event attributes (`ondrop`, `ondragover`) not Svelte 4 directives (`on:drop`)
- `isDragging` state for visual feedback when dragging over the zone
- Hidden `<input type="file">` as click-to-browse fallback (accessible)
- `accept="audio/*"` for file type hint (not a security measure -- server validates)

### Pattern 2: Upload Submission via fetch() to Existing API

**What:** After files are selected, submit them to the existing `/api/upload` endpoint using fetch() with FormData, then track status via polling.
**When to use:** When the user drops files or clicks "Upload."

```typescript
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('audio', file);

  const res = await fetch('/music/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }

  return await res.json(); // { trackId, slug, status: 'pending' }
}
```

**Key details:**
- Reuses the existing `/api/upload` POST endpoint -- no new upload endpoint needed
- Do NOT set Content-Type header manually; let the browser set `multipart/form-data` with boundary
- The upload endpoint already handles: magic byte validation, slug generation, collision handling, and queue enqueue
- Returns `{ trackId, slug, status }` which the UI uses for status polling

### Pattern 3: Processing Status Polling with $effect

**What:** After upload, poll the track status endpoint every 2 seconds until status is 'ready' or 'failed'.
**When to use:** After each file upload to show real-time processing progress.

```svelte
<script lang="ts">
  let trackId = $state<string | null>(null);
  let status = $state<string>('pending');
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    if (!trackId || status === 'ready' || status === 'failed') return;

    const interval = setInterval(async () => {
      const res = await fetch(`/music/api/tracks/${trackId}/status`);
      if (res.ok) {
        const data = await res.json();
        status = data.status;
        if (data.errorMessage) errorMessage = data.errorMessage;
      }
    }, 2000);

    return () => clearInterval(interval);
  });
</script>
```

**Key details:**
- `$effect` runs only in the browser (not during SSR) -- safe for setInterval
- Cleanup function clears the interval when component unmounts or when `trackId`/`status` changes
- Stops polling when status reaches terminal state ('ready' or 'failed')
- 2-second interval is adequate for a single-user admin -- processing typically takes 5-30 seconds

### Pattern 4: Metadata Editing with SvelteKit Form Actions

**What:** Use SvelteKit form actions for track metadata updates (title, description, category, tags, cover art).
**When to use:** The track edit page at `/admin/tracks/[id]`.

```typescript
// src/routes/admin/tracks/[id]/+page.server.ts
import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const track = db.select().from(tracks).where(eq(tracks.id, params.id)).get();
  if (!track) throw error(404, 'Track not found');

  const trackTagRows = db.select({ name: tags.name })
    .from(trackTags)
    .innerJoin(tags, eq(trackTags.tagId, tags.id))
    .where(eq(trackTags.trackId, params.id))
    .all();

  return { track, tags: trackTagRows.map(t => t.name) };
};

export const actions = {
  update: async ({ request, params }) => {
    const data = await request.formData();
    const title = data.get('title') as string;
    const description = data.get('description') as string;
    const category = data.get('category') as string;
    const tagsInput = data.get('tags') as string;

    if (!title?.trim()) {
      return fail(400, { error: 'Title is required' });
    }

    db.update(tracks)
      .set({
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'track',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tracks.id, params.id))
      .run();

    // Handle tags: parse comma-separated, upsert into tags table, update track_tags
    if (tagsInput !== null) {
      // Clear existing tags for this track
      db.delete(trackTags).where(eq(trackTags.trackId, params.id)).run();

      const tagNames = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      for (const name of tagNames) {
        // Insert tag if not exists, get its ID
        db.insert(tags).values({ name }).onConflictDoNothing().run();
        const tag = db.select().from(tags).where(eq(tags.name, name)).get();
        if (tag) {
          db.insert(trackTags).values({ trackId: params.id, tagId: tag.id }).run();
        }
      }
    }

    return { success: true };
  },
} satisfies Actions;
```

**Key details:**
- Uses `satisfies Actions` for type-safe action definitions
- Form actions receive `params` (route params) and `request` (form data)
- Tag handling: comma-separated input, upsert-or-ignore into tags table, link via trackTags junction
- `fail()` returns validation errors that preserve form state
- The existing schema already has `description`, `category`, `tags`, and `trackTags` tables -- no schema changes needed

### Pattern 5: Cover Art Manual Upload via Form Action

**What:** Allow the admin to upload a custom cover art image through the metadata edit form.
**When to use:** When a track has no embedded cover art, or the admin wants to replace it.

```typescript
// Inside the update action in +page.server.ts
const artFile = data.get('coverArt') as File | null;
if (artFile && artFile.size > 0) {
  const artBuffer = Buffer.from(await artFile.arrayBuffer());
  const artPath = `/data/art/${params.id}.jpg`;
  await extractAndResizeArt(artBuffer, artPath);
  db.update(tracks)
    .set({ artPath, updatedAt: new Date().toISOString() })
    .where(eq(tracks.id, params.id))
    .run();
}
```

**Key details:**
- Reuses the existing `extractAndResizeArt` function from `$lib/server/processors/artwork.ts`
- sharp resizes to 500x500 JPEG, matching existing art format
- Overwrites existing art file (same path `/data/art/{trackId}.jpg`)
- Art path in DB is updated to mark that art now exists
- Form must have `enctype="multipart/form-data"` for file uploads

### Pattern 6: Caddy Path-Based Forward Auth

**What:** Modify the Caddyfile to protect `/music/admin/*` paths with Authelia forward_auth while keeping other `/music/*` paths public.
**When to use:** Routing configuration for admin protection.

```caddyfile
{$DOMAIN} {
    # Admin music routes: require Authelia 2FA
    @admin path /music/admin /music/admin/*
    handle @admin {
        forward_auth authelia:9091 {
            uri /api/authz/forward-auth
            copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
        }
        reverse_proxy wallybrain-music:8800
    }

    # Public music routes: no auth required
    @music path /music /music/*
    handle @music {
        reverse_proxy wallybrain-music:8800
    }

    # Everything else: code-server behind Authelia
    handle {
        forward_auth authelia:9091 {
            uri /api/authz/forward-auth
            copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
        }
        reverse_proxy code-server:8080
    }
}
```

**Key details:**
- Caddy evaluates `handle` blocks in order of specificity -- named matchers with more specific paths match first
- `@admin` path matcher MUST come before `@music` because `/music/admin/*` is a subset of `/music/*`
- The `forward_auth` directive sends a subrequest to Authelia; if Authelia returns 2xx, the request proceeds; otherwise, Authelia redirects to the login portal
- Authelia copies `Remote-User` etc. headers to the proxied request -- the SvelteKit app can read these to confirm who is authenticated
- The SvelteKit app does NOT need to implement authentication itself -- Caddy/Authelia handle it at the proxy layer

### Anti-Patterns to Avoid

- **Implementing authentication in the SvelteKit app:** Authentication is handled at the Caddy proxy layer via Authelia forward_auth. Do NOT build login forms, session management, or JWT validation in SvelteKit. The app trusts the `Remote-User` header from Caddy.
- **Creating a new upload endpoint for admin:** The existing `/api/upload` endpoint already handles everything (validation, file writing, DB insert, queue enqueue). The admin UI should POST to this same endpoint using fetch() with FormData.
- **Using WebSocket or SSE for status updates:** Polling every 2 seconds is perfectly adequate for a single-user admin interface processing a handful of tracks. WebSocket/SSE adds connection management complexity for negligible benefit.
- **Building a separate tag management CRUD:** Tags are simple strings. Use comma-separated input in the metadata form with upsert-on-save. No separate tag admin page is needed.
- **Protecting API endpoints separately from pages:** The Caddy `@admin` matcher covers both pages and API calls under `/music/admin/*`. If the upload endpoint at `/api/upload` should also be protected, consider keeping it at its current public path (it requires no auth by design from Phase 2) or creating an admin-specific upload route.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication / 2FA | Login form, session cookies, TOTP validation | Caddy forward_auth + Authelia | Already deployed and working; handles login portal, TOTP, session cookies, redirect flows |
| Drag-and-drop file selection | Custom intersection observer or library | Native HTML5 ondragover/ondrop + hidden input | 20 lines of code; no dependency needed; well-supported in all browsers |
| Form submission with validation | Custom fetch + error handling | SvelteKit form actions + use:enhance | Built-in progressive enhancement, validation patterns, form state preservation |
| Image resize for cover art | Custom canvas manipulation | sharp (already installed) via extractAndResizeArt | Already handles resize to 500x500 JPEG; reuse existing function |
| Status update delivery | WebSocket server, SSE endpoint | setInterval polling via $effect | Simple, adequate for single-user admin, auto-cleanup on unmount |
| File type validation | Client-side file parsing | Server-side magic byte validation (existing) | Already in place; client accept attribute is a hint, not security |

**Key insight:** The existing codebase already provides 80% of the backend logic needed for admin. The upload endpoint, processing queue, validation, art processing, and database schema are all in place. Phase 5 is primarily a frontend task: building the UI pages that interact with existing backend capabilities, plus Caddy configuration for auth.

## Common Pitfalls

### Pitfall 1: Caddy Handle Block Ordering

**What goes wrong:** Admin routes are not protected because the general `/music/*` handle block matches before the more specific `/music/admin/*` block.
**Why it happens:** Caddy handle blocks with named matchers evaluate based on specificity, but if the order is wrong or matchers overlap, the wrong block may match.
**How to avoid:** Place the `@admin` handle block BEFORE the `@music` handle block in the Caddyfile. Caddy's named matcher specificity resolution means `/music/admin/*` should match first, but explicit ordering removes ambiguity.
**Warning signs:** Admin pages load without being redirected to the Authelia login portal.

### Pitfall 2: Missing enctype on File Upload Forms

**What goes wrong:** Cover art upload silently fails -- the file data is empty or missing in the form action.
**Why it happens:** HTML forms default to `application/x-www-form-urlencoded` which cannot encode file data. The form must use `enctype="multipart/form-data"`.
**How to avoid:** Always add `enctype="multipart/form-data"` to any form containing `<input type="file">`.
**Warning signs:** `data.get('coverArt')` returns null or a File with size 0 in the form action.

### Pitfall 3: Forgetting to Prevent Default on Drag Events

**What goes wrong:** Dropping a file on the upload area opens the file in the browser instead of handling it.
**Why it happens:** The browser's default behavior for file drops is to navigate to the file. Both `ondragover` and `ondrop` must call `e.preventDefault()`.
**How to avoid:** Call `e.preventDefault()` in BOTH the `ondragover` and `ondrop` handlers. Missing either one causes the default behavior.
**Warning signs:** Dropping a file navigates away from the page or opens the file in a new tab.

### Pitfall 4: Polling Not Cleaning Up on Navigation

**What goes wrong:** Status polling continues after navigating away from the admin page, causing console errors or unnecessary API calls.
**Why it happens:** setInterval persists beyond component lifecycle if not properly cleaned up.
**How to avoid:** Use `$effect` with a cleanup return function that calls `clearInterval`. The `$effect` cleanup runs automatically when the component unmounts during SvelteKit navigation.
**Warning signs:** Network tab shows continued `/status` requests after navigating to public pages.

### Pitfall 5: Upload Endpoint Returns 413 for Large Files

**What goes wrong:** Uploading large audio files (100MB+) fails with a 413 error.
**Why it happens:** Request body size limit not configured or too low.
**How to avoid:** The existing docker-compose.yml already sets `BODY_SIZE_LIMIT=512M` and SvelteKit adapter-node respects this. Verify this is still in place. Caddy has no default body size limit, so no Caddy configuration needed.
**Warning signs:** Large file uploads fail immediately without reaching the validation logic.

### Pitfall 6: Tag Input Edge Cases

**What goes wrong:** Duplicate tags, empty tags, or case-inconsistent tags pollute the database.
**Why it happens:** Comma-separated tag input without normalization.
**How to avoid:** Trim whitespace, lowercase, filter empty strings, and use `onConflictDoNothing()` for the tags table insert. The tags table has a unique constraint on `name`.
**Warning signs:** Same tag appears multiple times in the filter UI (Phase 6), or tags with leading/trailing spaces.

### Pitfall 7: Admin API Endpoints Accessible Without Auth

**What goes wrong:** Track update/delete API endpoints under `/api/tracks/[id]` are accessible without authentication because they are not under the `/music/admin` path.
**Why it happens:** Admin actions placed under the public `/api` route instead of under the auth-protected `/admin` path.
**How to avoid:** Place admin-only form actions inside SvelteKit pages under `src/routes/admin/` (which maps to `/music/admin/*`). These are automatically protected by the Caddy forward_auth on the `@admin` matcher. Do NOT create separate `/api/admin/*` endpoints -- use form actions instead.
**Warning signs:** curl to update/delete endpoints succeeds without authentication.

## Code Examples

### Track Status API Endpoint (for polling)

```typescript
// src/routes/api/tracks/[id]/status/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const track = db.select({
    status: tracks.status,
    errorMessage: tracks.errorMessage,
  })
    .from(tracks)
    .where(eq(tracks.id, params.id))
    .get();

  if (!track) throw error(404, 'Track not found');

  return json(track);
};
```

### Admin Track List Load Function

```typescript
// src/routes/admin/+page.server.ts
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Admin sees ALL tracks, not just 'ready' ones
  const allTracks = db.select({
    id: tracks.id,
    title: tracks.title,
    slug: tracks.slug,
    status: tracks.status,
    category: tracks.category,
    duration: tracks.duration,
    artPath: tracks.artPath,
    errorMessage: tracks.errorMessage,
    createdAt: tracks.createdAt,
    updatedAt: tracks.updatedAt,
  })
    .from(tracks)
    .orderBy(desc(tracks.createdAt))
    .all();

  return { tracks: allTracks };
};
```

### Upload Page with Status Tracking

```svelte
<!-- src/routes/admin/upload/+page.svelte (conceptual structure) -->
<script lang="ts">
  import { base } from '$app/paths';

  let isDragging = $state(false);
  let uploads: Array<{
    file: File;
    trackId: string | null;
    status: 'uploading' | 'pending' | 'processing' | 'ready' | 'failed';
    error: string | null;
  }> = $state([]);

  async function handleFiles(fileList: FileList) {
    for (const file of fileList) {
      const entry = { file, trackId: null as string | null, status: 'uploading' as const, error: null as string | null };
      uploads.push(entry);

      try {
        const formData = new FormData();
        formData.append('audio', file);
        const res = await fetch(`${base}/api/upload`, { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        entry.trackId = data.trackId;
        entry.status = 'pending';
      } catch (err) {
        entry.status = 'failed';
        entry.error = err instanceof Error ? err.message : 'Upload failed';
      }
    }
  }

  // Poll status for tracks that are pending or processing
  $effect(() => {
    const active = uploads.filter(u => u.trackId && (u.status === 'pending' || u.status === 'processing'));
    if (active.length === 0) return;

    const interval = setInterval(async () => {
      for (const upload of active) {
        if (!upload.trackId) continue;
        try {
          const res = await fetch(`${base}/api/tracks/${upload.trackId}/status`);
          if (res.ok) {
            const data = await res.json();
            upload.status = data.status;
            if (data.errorMessage) upload.error = data.errorMessage;
          }
        } catch { /* ignore polling errors */ }
      }
    }, 2000);

    return () => clearInterval(interval);
  });
</script>
```

### Authelia Access Control Update

```yaml
# authelia/configuration.yml - updated access_control section
access_control:
  default_policy: deny
  rules:
    # Public music routes: bypass auth
    - domain: wallyblanchard.com
      resources:
        - '^/music(/(?!admin).*)?$'
      policy: bypass

    # Music admin routes: require 2FA
    - domain: wallyblanchard.com
      resources:
        - '^/music/admin(/.*)?$'
      policy: two_factor

    # Everything else on the domain: require 2FA (code-server, etc.)
    - domain: wallyblanchard.com
      policy: two_factor
```

**Alternative (simpler) approach for Authelia:** Since the existing Authelia config uses `default_policy: deny` and a single rule for `wallyblanchard.com` with `two_factor`, and Caddy already routes public music requests WITHOUT forward_auth, the Authelia rules may not need modification at all. The key insight is: Caddy only sends a forward_auth subrequest for paths handled by the `@admin` handle block. Public music paths never reach Authelia because they are handled by the `@music` block without forward_auth. Therefore, Authelia's existing blanket `two_factor` policy on `wallyblanchard.com` is sufficient -- it will apply to any request that reaches it, which will only be admin requests and code-server requests.

**Recommendation:** Do NOT modify Authelia's access_control rules. Only modify the Caddyfile to split the `/music/admin/*` paths into a separate handle block with forward_auth. This is the simpler and safer approach.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte 4 `on:drop` directive | Svelte 5 `ondrop` attribute | Svelte 5 (2024) | Use lowercase event attributes, not `on:` directives |
| `export let` for props | `$props()` rune | Svelte 5 (2024) | Destructured rune syntax for component props |
| Svelte stores for state | `$state` and `$derived` runes | Svelte 5 (2024) | Fine-grained reactivity without store boilerplate |
| `onMount` + `onDestroy` for intervals | `$effect` with cleanup return | Svelte 5 (2024) | Automatic cleanup, reactive dependencies |
| SvelteKit `$page` store | `$app/state` page | Svelte 5 / SvelteKit 2.x | Direct reactive access to page state |

**Deprecated/outdated:**
- `on:drop`, `on:dragover` event directives: Replaced by `ondrop`, `ondragover` in Svelte 5
- `createEventDispatcher`: Replaced by callback props in Svelte 5
- `$:` reactive statements: Replaced by `$derived` and `$effect` runes

## Open Questions

1. **Should the upload API endpoint be protected?**
   - What we know: The existing `/api/upload` endpoint at `/music/api/upload` is currently public (under the `@music` Caddy matcher). The admin upload page will call this endpoint from the browser.
   - What's unclear: Whether to move the upload action under admin-only routes or keep the existing endpoint.
   - Recommendation: Keep the existing `/api/upload` endpoint as-is. Since the admin page is behind Authelia, only authenticated users can reach the upload UI. The upload endpoint itself lacks exploitable data -- it only accepts files and enqueues processing. If desired, a simple request header check (`Remote-User` from Caddy) could be added as defense-in-depth, but it is not strictly necessary because unauthenticated users have no UI to submit to it.

2. **Multiple file upload in one drop**
   - What we know: The HTML5 drop event provides a FileList which can contain multiple files. The existing upload endpoint accepts one file per request.
   - What's unclear: Whether to support batch upload (upload all files sequentially) or single-file-only.
   - Recommendation: Support multiple files by iterating over the FileList and calling the upload endpoint once per file. Show each file's status independently. This matches the existing single-file API and avoids endpoint changes.

3. **Slug editing**
   - What we know: Slugs are auto-generated from filenames at upload time. The admin might want to customize them for nicer URLs.
   - What's unclear: Whether slug editing is in scope for ADMIN-02 ("set/edit track metadata").
   - Recommendation: Include slug as an editable field in the metadata form. Validate uniqueness before saving. The slug field has a unique constraint in the database, so collision handling is needed.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/routes/api/upload/+server.ts`, `src/lib/server/db/schema.ts`, `src/lib/server/queue.ts`, `src/lib/server/processors/processTrack.ts`, `src/lib/server/processors/artwork.ts`, `src/hooks.server.ts`
- Existing infrastructure: `/home/user/v1be-code-server/Caddyfile`, `/home/user/v1be-code-server/authelia/configuration.yml`, `/home/user/v1be-code-server/docker-compose.yml`
- [Caddy forward_auth directive](https://caddyserver.com/docs/caddyfile/directives/forward_auth) - Matcher syntax, subrequest behavior, copy_headers
- [Authelia Caddy Integration](https://www.authelia.com/integration/proxies/caddy/) - forward_auth URI, header copying
- [Authelia Access Control Configuration](https://www.authelia.com/configuration/security/access-control/) - Rule structure, resources regex, policy levels
- [SvelteKit Form Actions](https://svelte.dev/docs/kit/form-actions) - Action definition, use:enhance, fail(), formData handling
- [Svelte 5 $effect](https://svelte.dev/docs/svelte/$effect) - Cleanup return function, browser-only execution, dependency tracking

### Secondary (MEDIUM confidence)
- [Caddy Community: forward_auth with path matchers](https://caddy.community/t/need-help-with-forward-auth-directive/31108) - Path-specific handle block patterns
- [SvelteKit File Upload Patterns](https://www.okupter.com/blog/sveltekit-file-upload) - multipart/form-data with form actions

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation and existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; all patterns use existing SvelteKit + Tailwind + Drizzle
- Architecture: HIGH - Admin route structure follows established SvelteKit patterns; Caddy/Authelia integration directly extends existing working configuration
- Drag-and-drop: HIGH - Native HTML5 API, well-documented, used the same way for 10+ years
- Auth protection: HIGH - Caddy forward_auth + Authelia already working for code-server; same pattern extended to admin routes
- Polling: HIGH - `$effect` + `setInterval` documented in official Svelte 5 docs with cleanup example
- Pitfalls: HIGH - All pitfalls derived from codebase analysis and known web platform behaviors

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (stable -- SvelteKit form actions are mature; Caddy/Authelia integration is well-established)
