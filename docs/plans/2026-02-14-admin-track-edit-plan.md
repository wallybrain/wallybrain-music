# Admin Track & Collection Editing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the collection edit page a full track management hub (drag-reorder, search-add, remove, inline edit), add batch operations to the admin track list, and polish the track edit page with grouped layout, save toasts, and unsaved-changes warnings.

**Architecture:** Four new JSON API endpoints handle reorder, remove, search, and batch ops. The collection edit page uses SortableJS for drag-reorder and client-side fetch for all track management. The admin track list adds checkbox selection and a floating batch action bar. The track edit page gets form sections, toast notifications via `use:enhance`, and a `dirty` flag with `beforeunload`.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), SortableJS, Tailwind 4, Drizzle ORM, SQLite

---

### Task 1: Install SortableJS

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run inside the container (where npm is available):
```bash
cd /home/lwb3/wallybrain-music && npm install sortablejs && npm install -D @types/sortablejs
```

**Step 2: Verify installation**

Run: `grep sortablejs /home/lwb3/wallybrain-music/package.json`
Expected: `"sortablejs": "^1.x.x"` in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add sortablejs for drag-to-reorder"
```

---

### Task 2: API — Reorder tracks in collection

**Files:**
- Create: `src/routes/api/collections/[id]/tracks/reorder/+server.ts`

**Step 1: Create the reorder endpoint**

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections, collectionTracks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const collection = db.select({ id: collections.id })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) throw error(404, 'Collection not found');

	const { positions } = await request.json();

	if (!Array.isArray(positions)) {
		return json({ error: 'positions must be an array of {trackId, position}' }, { status: 400 });
	}

	for (const { trackId, position } of positions) {
		db.update(collectionTracks)
			.set({ position })
			.where(and(
				eq(collectionTracks.collectionId, params.id),
				eq(collectionTracks.trackId, trackId),
			))
			.run();
	}

	return json({ ok: true });
};
```

**Step 2: Verify the file compiles**

Run: `cd /home/lwb3/wallybrain-music && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5`
Expected: No errors in the new file (existing Drizzle type warnings are OK)

**Step 3: Commit**

```bash
git add src/routes/api/collections/[id]/tracks/reorder/+server.ts
git commit -m "api: PATCH /api/collections/[id]/tracks/reorder endpoint"
```

---

### Task 3: API — Remove track from collection

**Files:**
- Create: `src/routes/api/collections/[id]/tracks/[trackId]/+server.ts`

**Step 1: Create the remove endpoint**

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections, collectionTracks, tracks } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
	const collection = db.select({ id: collections.id })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) throw error(404, 'Collection not found');

	db.delete(collectionTracks)
		.where(and(
			eq(collectionTracks.collectionId, params.id),
			eq(collectionTracks.trackId, params.trackId),
		))
		.run();

	// Recalculate aggregates
	const agg = db.select({
		count: sql<number>`count(*)`,
		totalDur: sql<number>`coalesce(sum(${tracks.duration}), 0)`,
	})
		.from(collectionTracks)
		.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
		.where(eq(collectionTracks.collectionId, params.id))
		.get();

	db.update(collections)
		.set({
			trackCount: agg?.count ?? 0,
			totalDuration: agg?.totalDur ?? 0,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(collections.id, params.id))
		.run();

	return json({ ok: true });
};
```

**Step 2: Verify the file compiles**

Run: `cd /home/lwb3/wallybrain-music && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/routes/api/collections/[id]/tracks/[trackId]/+server.ts
git commit -m "api: DELETE /api/collections/[id]/tracks/[trackId] endpoint"
```

---

### Task 4: API — Search tracks

**Files:**
- Create: `src/routes/api/tracks/search/+server.ts`

**Step 1: Create the search endpoint**

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks, collectionTracks } from '$lib/server/db/schema';
import { like, eq, notInArray, and, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() || '';
	const excludeCollection = url.searchParams.get('exclude') || '';

	if (q.length < 1) {
		return json([]);
	}

	let excludeTrackIds: string[] = [];
	if (excludeCollection) {
		excludeTrackIds = db.select({ trackId: collectionTracks.trackId })
			.from(collectionTracks)
			.where(eq(collectionTracks.collectionId, excludeCollection))
			.all()
			.map(r => r.trackId);
	}

	const conditions = [
		like(tracks.title, `%${q}%`),
		eq(tracks.status, 'ready'),
	];

	if (excludeTrackIds.length > 0) {
		conditions.push(sql`${tracks.id} NOT IN (${sql.join(excludeTrackIds.map(id => sql`${id}`), sql`, `)})`);
	}

	const results = db.select({
		id: tracks.id,
		title: tracks.title,
		duration: tracks.duration,
		artPath: tracks.artPath,
	})
		.from(tracks)
		.where(and(...conditions))
		.limit(10)
		.all();

	return json(results);
};
```

**Step 2: Verify the file compiles**

Run: `cd /home/lwb3/wallybrain-music && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/routes/api/tracks/search/+server.ts
git commit -m "api: GET /api/tracks/search endpoint with collection exclusion"
```

---

### Task 5: API — Batch track operations

**Files:**
- Create: `src/routes/api/tracks/batch/+server.ts`

**Step 1: Create the batch endpoint**

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags, collectionTracks, collections } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

function recalcCollectionAggregates(collectionId: string) {
	const agg = db.select({
		count: sql<number>`count(*)`,
		totalDur: sql<number>`coalesce(sum(${tracks.duration}), 0)`,
	})
		.from(collectionTracks)
		.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
		.where(eq(collectionTracks.collectionId, collectionId))
		.get();

	db.update(collections)
		.set({
			trackCount: agg?.count ?? 0,
			totalDuration: agg?.totalDur ?? 0,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(collections.id, collectionId))
		.run();
}

export const POST: RequestHandler = async ({ request }) => {
	const { action, trackIds, payload } = await request.json();

	if (!Array.isArray(trackIds) || trackIds.length === 0) {
		return json({ error: 'trackIds must be a non-empty array' }, { status: 400 });
	}

	const now = new Date().toISOString();

	switch (action) {
		case 'setCategory': {
			const validCategories = ['track', 'set', 'experiment', 'export', 'album', 'playlist'];
			if (!validCategories.includes(payload)) {
				return json({ error: 'Invalid category' }, { status: 400 });
			}
			db.update(tracks)
				.set({ category: payload, updatedAt: now })
				.where(inArray(tracks.id, trackIds))
				.run();
			return json({ ok: true, affected: trackIds.length });
		}

		case 'addTags': {
			const tagNames = (payload as string)
				.split(',')
				.map((t: string) => t.trim().toLowerCase())
				.filter(Boolean);

			if (tagNames.length === 0) {
				return json({ error: 'No tags provided' }, { status: 400 });
			}

			for (const name of tagNames) {
				db.insert(tags).values({ name }).onConflictDoNothing().run();
				const tag = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
				if (tag) {
					for (const trackId of trackIds) {
						db.insert(trackTags)
							.values({ trackId, tagId: tag.id })
							.onConflictDoNothing()
							.run();
					}
				}
			}
			return json({ ok: true, affected: trackIds.length });
		}

		case 'delete': {
			// Capture parent collections before cascade
			const parentCollections = db
				.select({ collectionId: collectionTracks.collectionId })
				.from(collectionTracks)
				.where(inArray(collectionTracks.trackId, trackIds))
				.all();

			const uniqueCollectionIds = [...new Set(parentCollections.map(p => p.collectionId))];

			for (const trackId of trackIds) {
				// Clean up files
				const { unlinkSync, existsSync, readdirSync } = await import('node:fs');
				const origDir = '/data/audio/originals';
				if (existsSync(origDir)) {
					for (const f of readdirSync(origDir).filter(f => f.startsWith(trackId + '.'))) {
						try { unlinkSync(`${origDir}/${f}`); } catch {}
					}
				}
				for (const p of [
					`/data/audio/${trackId}.mp3`,
					`/data/peaks/${trackId}.json`,
					`/data/art/${trackId}.jpg`,
				]) {
					try { if (existsSync(p)) unlinkSync(p); } catch {}
				}
			}

			db.delete(tracks).where(inArray(tracks.id, trackIds)).run();

			for (const cId of uniqueCollectionIds) {
				recalcCollectionAggregates(cId);
			}

			return json({ ok: true, affected: trackIds.length });
		}

		default:
			return json({ error: `Unknown action: ${action}` }, { status: 400 });
	}
};
```

**Step 2: Verify the file compiles**

Run: `cd /home/lwb3/wallybrain-music && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/routes/api/tracks/batch/+server.ts
git commit -m "api: POST /api/tracks/batch for bulk category/tags/delete"
```

---

### Task 6: Collection edit page — Drag-to-reorder with SortableJS

**Files:**
- Modify: `src/routes/admin/collections/[id]/+page.svelte`

**Step 1: Add SortableJS import and drag-reorder to the track list**

Replace the entire track list section (lines 91–116 of the current file) with a SortableJS-powered version. Key changes:

- Import `Sortable` from `sortablejs` and use `onMount` to initialize
- Add a `bind:this` container `div` for Sortable
- Each track row gets a `.drag-handle` grip icon (the `≡` character or SVG)
- `onEnd` callback fires `PATCH /api/collections/[id]/tracks/reorder`
- Optimistic: the DOM is already reordered by Sortable; on fetch error, reload the page

The track rows change from `<a>` links to `<div>` elements (links interfere with drag). Add a separate "edit" icon link to navigate to the track edit page.

**Step 2: Add remove-track button to each row**

- Add an X button on the right side of each track row
- On click, show inline "Remove? [Yes] [No]" replacing the X
- On confirm, `DELETE /api/collections/[id]/tracks/[trackId]`, then remove the row from the local array
- On cancel, restore the X button

**Step 3: Add inline title editing**

- Title text: on click, replace with `<input>` pre-filled with current value
- On blur or Enter: `fetch('/admin/tracks/[id]?/update', { method: 'POST', body: FormData })` with just title + slug + current category
- On success: flash green, update local state
- On Escape: revert to original text

**Step 4: Add inline category dropdown**

- Small `<select>` next to the title, shows current category
- On change: same fetch as title inline edit but with new category value
- Flash green on success

**Step 5: Verify the page renders**

Run: `docker restart wallybrain-music` (to pick up new dependency)
Navigate to any collection edit page and verify the track list renders with drag handles.

**Step 6: Commit**

```bash
git add src/routes/admin/collections/[id]/+page.svelte
git commit -m "feat: drag-to-reorder, remove, inline edit on collection page"
```

---

### Task 7: Collection edit page — Search-to-add tracks

**Files:**
- Modify: `src/routes/admin/collections/[id]/+page.svelte`

**Step 1: Add the search-to-add UI below the track list**

- "Add Track" button → on click, toggles open a search input
- On input (debounced 300ms): `GET /api/tracks/search?q={term}&exclude={collectionId}`
- Results render as a dropdown list: small cover art + title + duration
- On click a result: `POST /api/collections/[id]/tracks` with `{ trackId }`, then push to local tracks array, close dropdown
- On Escape or click outside: close the dropdown

**Step 2: Verify search works**

Navigate to a collection edit page, click "Add Track", type a partial track title, verify results appear and clicking one adds it to the list.

**Step 3: Commit**

```bash
git add src/routes/admin/collections/[id]/+page.svelte
git commit -m "feat: search-to-add tracks on collection edit page"
```

---

### Task 8: Admin track list — Batch selection and operations

**Files:**
- Modify: `src/routes/admin/+page.svelte`
- Modify: `src/routes/admin/+page.server.ts` (add `dominantColor` to select for CoverArt)

**Step 1: Add checkboxes and select-all to the track list**

- Each track row gets a checkbox (left side, before the CoverArt)
- Header row with a "select all" checkbox
- Track `selectedIds` state as a `Set<string>`

**Step 2: Add inline title editing**

- Same pattern as collection page: click title → input → blur/Enter saves via fetch
- Category: inline `<select>`, change saves immediately

**Step 3: Add floating batch action bar**

When `selectedIds.size > 0`, show a fixed-bottom `metal-panel` bar:
- Left: `{N} selected` text
- Right: three buttons:
  - **Category** — opens a small dropdown to pick category, on select calls `POST /api/tracks/batch` with `{ action: 'setCategory', trackIds, payload }`
  - **Tags** — opens a small text input, on Enter calls `POST /api/tracks/batch` with `{ action: 'addTags', trackIds, payload }`
  - **Delete** — `confirm()` prompt, on yes calls `POST /api/tracks/batch` with `{ action: 'delete', trackIds }`, removes from local array

After any batch action succeeds: clear selection, `invalidateAll()` to refresh data.

**Step 4: Verify batch operations work**

Navigate to `/admin`, select multiple tracks, verify batch category change works.

**Step 5: Commit**

```bash
git add src/routes/admin/+page.svelte src/routes/admin/+page.server.ts
git commit -m "feat: batch select, inline edit, floating action bar on admin track list"
```

---

### Task 9: Track edit page — Layout groups, toast, dirty tracking

**Files:**
- Modify: `src/routes/admin/tracks/[id]/+page.svelte`

**Step 1: Group form fields into sections**

Wrap fields in section dividers with FNORD-style headings:

```svelte
<div class="space-y-1">
  <h3 class="text-xs font-mono uppercase tracking-widest text-accent-muted mb-3">Metadata</h3>
  <!-- title, slug, description, category fields -->
</div>

<hr class="border-border-subtle my-6" />

<div class="space-y-1">
  <h3 class="text-xs font-mono uppercase tracking-widest text-accent-muted mb-3">Tags</h3>
  <!-- tag input -->
</div>

<hr class="border-border-subtle my-6" />

<div class="space-y-1">
  <h3 class="text-xs font-mono uppercase tracking-widest text-accent-muted mb-3">Cover Art</h3>
  <!-- CoverArt + upload -->
</div>
```

**Step 2: Add toast notification system**

Add a toast state variable and a small fixed-position toast element:

```svelte
<script>
  let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    toast = { message, type };
    if (type === 'success') {
      setTimeout(() => { toast = null; }, 2000);
    }
  }
</script>

{#if toast}
  <div class="fixed top-4 right-4 z-[10001] px-4 py-2 rounded-lg text-sm font-mono uppercase tracking-wider
    {toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}">
    {toast.message}
    {#if toast.type === 'error'}
      <button onclick={() => toast = null} class="ml-2 text-red-300 hover:text-red-200">&times;</button>
    {/if}
  </div>
{/if}
```

Wire it into `use:enhance`:

```svelte
<form method="POST" action="?/update" use:enhance={() => {
  return async ({ result, update }) => {
    if (result.type === 'success' || result.type === 'redirect') {
      showToast('Saved');
      dirty = false;
    } else if (result.type === 'failure') {
      showToast(result.data?.error || 'Save failed', 'error');
    }
    await update();
  };
}} enctype="multipart/form-data">
```

**Step 3: Add unsaved changes tracking**

```svelte
<script>
  import { onMount } from 'svelte';
  import { beforeNavigate } from '$app/navigation';

  let dirty = $state(false);
  let initialValues = $state({ title: '', slug: '', description: '', category: '', tags: '' });

  onMount(() => {
    initialValues = {
      title: track.title,
      slug: track.slug,
      description: track.description || '',
      category: track.category,
      tags: tagString,
    };
  });

  function checkDirty(e: Event) {
    const form = (e.target as HTMLElement).closest('form');
    if (!form) return;
    const fd = new FormData(form);
    dirty = fd.get('title') !== initialValues.title
      || fd.get('slug') !== initialValues.slug
      || fd.get('description') !== initialValues.description
      || fd.get('category') !== initialValues.category
      || fd.get('tags') !== initialValues.tags;
  }

  beforeNavigate(({ cancel }) => {
    if (dirty && !confirm('You have unsaved changes. Leave anyway?')) {
      cancel();
    }
  });
</script>

<svelte:window onbeforeunload={(e) => { if (dirty) { e.preventDefault(); } }} />
```

Add `oninput={checkDirty}` to the form element.

**Step 4: Verify the page renders with sections, toast, and dirty tracking**

Navigate to a track edit page, make a change, verify the dirty warning works, save and verify the toast appears.

**Step 5: Commit**

```bash
git add src/routes/admin/tracks/[id]/+page.svelte
git commit -m "feat: grouped layout, toast notifications, unsaved changes warning on track edit"
```

---

### Task 10: Docker rebuild and smoke test

**Files:**
- No code changes

**Step 1: Rebuild and restart the container**

```bash
cd /home/lwb3/wallybrain-music && docker compose up -d --build
```

**Step 2: Smoke test all features**

1. Navigate to `/admin` — verify checkboxes, inline edit, batch bar work
2. Navigate to `/admin/collections/[id]` — verify drag-reorder, search-add, remove, inline edit work
3. Navigate to `/admin/tracks/[id]` — verify section grouping, save toast, dirty warning work
4. Verify no console errors in browser dev tools

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: smoke test corrections for admin track editing"
```
