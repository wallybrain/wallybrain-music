---
phase: 05-admin-interface
plan: 02
subsystem: admin-interface
tags: [metadata-editor, caddy-forward-auth, cover-art-upload, tag-management, slug-validation, prg-redirect]
dependency_graph:
  requires: [admin-layout, track-list, upload-endpoint, drizzle-orm, artwork-processor, authelia]
  provides: [metadata-edit-page, admin-auth-protection, public-tag-display, admin-edit-link]
  affects: [public-track-page]
tech_stack:
  added: []
  patterns: [sveltekit-form-actions, use-enhance, prg-redirect, cookie-based-admin-detection, caddy-forward-auth]
key_files:
  created:
    - src/routes/admin/tracks/[id]/+page.server.ts
    - src/routes/admin/tracks/[id]/+page.svelte
  modified:
    - src/routes/track/[slug]/+page.server.ts
    - src/routes/track/[slug]/+page.svelte
decisions:
  - "Save action uses redirect(303) to admin list (PRG pattern) instead of inline success message"
  - "Public track page checks authelia_session cookie to show conditional edit link (UX hint, not security boundary)"
  - "Tags displayed as small badges below play count on public track page"
metrics:
  duration: ~15m (including human-verify checkpoint and post-checkpoint UX fixes)
  completed: 2026-02-09
---

# Phase 5 Plan 2: Metadata Editor, Caddy Auth, and Post-Checkpoint Fixes

Track metadata edit page at /music/admin/tracks/[id] with form actions for title, slug, description, category, tags, and cover art upload. Admin routes protected by Caddy forward_auth with Authelia 2FA. Post-checkpoint UX fixes: save redirects to admin list, tags display on public page, conditional admin edit link.

## What Was Built

### Task 1: Track metadata edit page with form actions (2952c7e)
- **Server load + actions** (src/routes/admin/tracks/[id]/+page.server.ts): Load fetches track by ID + associated tags via join. Update action handles title (required), slug (validated, uniqueness-checked), description, category, comma-separated tags (normalized, upserted), and optional cover art upload (reuses extractAndResizeArt from processing pipeline). On success, redirects 303 to /music/admin.
- **Edit page UI** (src/routes/admin/tracks/[id]/+page.svelte): Svelte 5 form with use:enhance, enctype="multipart/form-data". Fields: title, slug (with URL preview), description textarea, category select, tags input, current cover art preview with file upload. Status badge. Validation errors shown inline. "View public page" link for ready tracks.

### Task 2: Caddy forward_auth for admin route protection (6a61764 in v1be-code-server)
- **Caddyfile** updated with `@admin path /music/admin /music/admin/*` matcher BEFORE `@music` matcher. Admin handler includes forward_auth to authelia:9091 then reverse_proxy to wallybrain-music:8800. Public music routes remain unauthenticated.

### Post-checkpoint UX fixes (7073717)
- **Save redirect**: Changed update action from `return { success: true }` to `redirect(303, '/music/admin')` for proper PRG pattern — user lands back on track list after saving
- **Tags on public page**: Added tag query to track/[slug] server load and tag badge rendering below play count
- **Admin edit link**: Public track page checks for `authelia_session` cookie, shows subtle "edit" link next to title when present

## Task Commits

| Task | Commit | Repo | Description |
|------|--------|------|-------------|
| 1 | 2952c7e | wallybrain-music | Track metadata edit page with form actions |
| 2 | 6a61764 | v1be-code-server | Caddy forward_auth for /music/admin routes |
| UX | 7073717 | wallybrain-music | Post-checkpoint fixes (redirect, tags, edit link) |

## Deviations from Plan

- **Save redirect added**: Plan specified `return { success: true }` but user testing revealed that staying on the edit page after save was confusing. Changed to redirect(303) to admin list (PRG pattern).
- **Public page tags added**: Not in original plan scope but needed — tags saved through admin edit weren't visible on public track page.
- **Admin edit link added**: User requested conditional edit link on public track page, implemented via authelia_session cookie detection.

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles (svelte-check) | PASS (0 errors) |
| Docker container builds and starts healthy | PASS |
| GET /music/admin/tracks/{id} renders edit form | PASS |
| Form has title, slug, description, category, tags, cover art fields | PASS |
| Save Changes button present | PASS |
| CSRF protection blocks non-browser POST | PASS (403) |
| Public /music/ accessible without auth | PASS (200) |
| Admin /music/admin/ redirects to Authelia | PASS (302) |
| Caddy logs clean (no errors) | PASS |
| Tags render on public track page | PASS |
| Edit link hidden without authelia_session cookie | PASS |
| Edit link visible with authelia_session cookie | PASS |
| Human verification: upload, edit metadata, save, view public | PASS |

## Performance

- **Duration:** ~15m (including checkpoint wait and UX iteration)
- **Tasks:** 2/2 auto tasks + 1 checkpoint + post-checkpoint fixes
- **Files created:** 2
- **Files modified:** 2 (public track page)

## Phase 5 Complete

Both plans delivered. The admin interface provides:
- Track list with status badges
- Drag-and-drop upload with live status polling
- Metadata editor (title, slug, description, category, tags, cover art)
- Authelia 2FA protection for all admin routes
- Public routes remain open
- Contextual admin edit link on public pages

## Self-Check: PASSED

- src/routes/admin/tracks/[id]/+page.server.ts verified present on disk
- src/routes/admin/tracks/[id]/+page.svelte verified present on disk
- src/routes/track/[slug]/+page.server.ts modified and verified
- src/routes/track/[slug]/+page.svelte modified and verified
- Commit 2952c7e (Task 1) verified in git log
- Commit 6a61764 (Task 2) verified in v1be-code-server git log
- Commit 7073717 (UX fixes) verified in git log
