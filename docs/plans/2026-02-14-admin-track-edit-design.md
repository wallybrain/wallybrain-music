# Admin Track & Collection Editing — Design

## Approach

Collection-centric: the collection edit page becomes the primary track management hub with drag-to-reorder, search-to-add, inline editing, and remove. The admin track list gains batch operations and inline editing. The standalone track edit page gets a layout refresh with save feedback and unsaved changes warning.

## 1. Collection Edit Page — Track Management Hub

### Drag-to-reorder (SortableJS)
- Drag handle (grip icon) on each track row
- SortableJS handles animation and DOM reordering
- On drop: `PATCH /api/collections/[id]/tracks/reorder` with new position array
- Backend updates all `position` values in `collection_tracks` in a single transaction
- Optimistic UI — reorder instantly, roll back on error

### Search-to-add tracks
- "Add Track" button at bottom of track list opens type-ahead search input
- `GET /api/tracks/search?q=term&exclude=collectionId` returns matching tracks not in this collection
- Results dropdown: cover art thumbnail + title + duration
- Selecting a result adds at end position, closes dropdown
- Uses existing `POST /api/collections/[id]/tracks` endpoint

### Remove track from collection
- X button on each track row
- Inline confirmation ("Remove?" with confirm/cancel) — no modal
- `DELETE /api/collections/[id]/tracks/[trackId]` (new endpoint)
- Recalculates `trackCount` and `totalDuration`

### Inline editing per track row
- Title: click to edit, text input, blur/Enter saves
- Category: small dropdown, change saves immediately
- Both use fetch to existing track update action (no page reload)
- Brief green flash on field after save

## 2. Admin Track List — Batch Operations & Inline Editing

### Inline editing
- Title: click to edit (same pattern as collection page)
- Category: inline dropdown, immediate save
- Both use fetch — no page reload
- Existing "Edit" link stays for deep editing (description, tags, art, audio)

### Batch selection
- Checkbox per track row + "select all" in header
- 1+ selected: floating action bar at bottom (`metal-panel` style)
- Action bar: `N selected` + action buttons

### Batch actions
- **Set Category**: dropdown, applies to all selected
- **Add Tags**: text input, adds to all selected (preserves existing)
- **Delete**: with confirmation prompt
- All hit `POST /api/tracks/batch` with `{ action, trackIds, payload }`
- Backend processes in a transaction

## 3. Track Edit Page — Layout & UX

### Form layout
- Grouped into sections with subtle dividers:
  - **Metadata**: title, slug, description, category
  - **Tags**: comma-separated input
  - **Cover Art**: CoverArt component + upload/remove
  - **Danger Zone**: reupload audio, delete
- Section headings in FNORD monospace style

### Save feedback
- Success: green toast ("Saved"), auto-dismiss 2s
- Error: red toast with message, stays until dismissed
- Uses `use:enhance` with `onUpdated` callback

### Unsaved changes warning
- `dirty` flag tracking (compare current vs loaded values)
- `beforeunload` browser prompt if dirty
- Inline warning on "Back to admin" if dirty ("Unsaved changes — save or discard?")
- Flag resets after successful save

## 4. Technical Details

### New dependency
- `sortablejs` + `@types/sortablejs`

### New API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/api/collections/[id]/tracks/reorder` | Update positions in transaction |
| DELETE | `/api/collections/[id]/tracks/[trackId]` | Remove track, recalc aggregates |
| GET | `/api/tracks/search?q=&exclude=` | Search tracks, exclude collection members |
| POST | `/api/tracks/batch` | Batch setCategory / addTags / delete |

### No schema changes
Existing tables cover everything: tracks, collections, collection_tracks, tags, track_tags.

### Files modified
- `/admin/collections/[id]/+page.svelte` — drag, search-add, remove, inline edit
- `/admin/+page.svelte` — batch select, inline edit, floating action bar
- `/admin/tracks/[id]/+page.svelte` — layout groups, toast, dirty tracking

### Styling
All new UI uses existing `metal-panel` class, FNORD text style, accent colors. No new CSS paradigms.
