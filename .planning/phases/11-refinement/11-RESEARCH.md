# Phase 11: Refinement - Research

**Researched:** 2026-02-10
**Domain:** Grid/list layout toggle with localStorage persistence, View Transitions API for page navigation, CSS hover zoom on cover art
**Confidence:** HIGH

## Summary

Phase 11 adds three visual refinements to the music platform: a grid/list layout toggle for the track listing, smooth page transitions when navigating between routes, and a hover zoom effect on cover art within track cards. All three features are achievable with zero new dependencies using the existing SvelteKit 2, Svelte 5, and Tailwind v4 stack.

The track listing currently uses a vertical list layout (`space-y-3` with horizontal TrackCard components). Adding a grid view requires a toggle button that switches between CSS Grid and the existing list layout, with the user's preference persisted to localStorage. The project already uses Svelte 5 runes with a class-based state pattern (see `playerState.svelte.ts`), so a `layoutPreference.svelte.ts` store following the same pattern with `$effect`-driven localStorage sync is the natural fit.

For page transitions, the View Transitions API has reached 89.49% global browser support (Baseline Newly available as of October 2025 with Firefox 144 joining Chrome and Safari). SvelteKit provides `onNavigate` in `$app/navigation` specifically designed for this integration. The implementation is roughly 10 lines in `+layout.svelte` plus CSS keyframes in `app.css`. TypeScript 5.9.3 (installed in this project) includes `startViewTransition` in its DOM types natively, so no type workaround is needed. The persistent player bar (fixed position, `z-50`) needs a `view-transition-name` to prevent it from being captured in the root transition snapshot.

The cover art hover zoom is pure CSS: `overflow-hidden` on the container with `transform: scale()` on the image during `:hover`, using `transition` for smooth animation. The critical constraint is that this zoom happens on TrackCard's cover art only (not the track detail page), and TrackCard does NOT contain any WaveformPlayer, so the `transform` is safe. The CoverArt component at size `sm` (used in TrackCards) needs an `overflow-hidden` wrapper and `group-hover:scale-110` on the `<img>`.

**Primary recommendation:** Implement all three features using only existing stack capabilities: Svelte 5 `$state` + `$effect` for localStorage persistence, native View Transitions API via `onNavigate` for page transitions, and CSS `transform: scale()` with `overflow-hidden` for cover art zoom. No new npm dependencies needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte | ^5.50.0 | `$state`/`$effect` runes for layout preference store | Already installed; runes are the Svelte 5 state pattern |
| @sveltejs/kit | ^2.50.2 | `onNavigate` lifecycle for view transitions integration | Already installed; built-in hook for this exact use case |
| tailwindcss | ^4.1.18 | Grid/list layout utilities, transition classes | Already installed; Tailwind classes for responsive grid |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All requirements met by existing stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| View Transitions API | Svelte `transition:` directive on route wrapper | Svelte transitions require wrapper elements, can interfere with layout; View Transitions API is the platform standard |
| View Transitions API | sveltekit-view-transition library | Extra dependency for what is ~10 lines of code |
| localStorage + $effect | svelte-persisted-state library | Extra dependency for a trivial persist pattern (5 lines) |
| CSS transform zoom | JavaScript mouse-position zoom | Overkill for a simple scale effect; CSS is simpler and GPU-accelerated |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended File Changes
```
src/
├── app.css                        # ADD: view transition CSS keyframes, grid layout utilities
├── lib/
│   └── stores/
│       └── layoutPreference.svelte.ts  # NEW: persisted grid/list preference store
├── routes/
│   ├── +layout.svelte             # MODIFY: add onNavigate for view transitions
│   └── +page.svelte               # MODIFY: add layout toggle UI, switch between grid/list
└── lib/components/
    ├── TrackCard.svelte            # MODIFY: support compact grid variant
    ├── TrackCardGrid.svelte        # NEW: grid-optimized card (vertical layout)
    └── CoverArt.svelte            # MODIFY: add overflow-hidden + hover zoom on sm size
```

### Pattern 1: Persisted Layout Preference with Svelte 5 Runes

**What:** A module-level reactive state using `$state` with `$effect` to sync to localStorage, following the same class pattern as `playerState.svelte.ts`.
**When to use:** Whenever user preferences need to persist across page loads.

```typescript
// src/lib/stores/layoutPreference.svelte.ts
import { browser } from '$app/environment';

type LayoutMode = 'list' | 'grid';

class LayoutPreference {
  mode: LayoutMode = $state('list');

  constructor() {
    if (browser) {
      const stored = localStorage.getItem('layout-preference');
      if (stored === 'grid' || stored === 'list') {
        this.mode = stored;
      }
    }
  }

  toggle() {
    this.mode = this.mode === 'list' ? 'grid' : 'list';
    if (browser) {
      localStorage.setItem('layout-preference', this.mode);
    }
  }

  setMode(mode: LayoutMode) {
    this.mode = mode;
    if (browser) {
      localStorage.setItem('layout-preference', this.mode);
    }
  }
}

export const layoutPreference = new LayoutPreference();
```

**Why this pattern:** Matches the existing `playerState.svelte.ts` class-based approach. Uses `browser` guard from `$app/environment` to prevent SSR localStorage access. Writes to localStorage imperatively in setter methods (simpler than `$effect` subscription, avoids double-write on initialization).

### Pattern 2: View Transitions via onNavigate

**What:** Hook into SvelteKit's `onNavigate` lifecycle to wrap page changes in `document.startViewTransition()`.
**When to use:** Once, in the root `+layout.svelte`.

```svelte
<!-- In src/routes/+layout.svelte -->
<script>
  import { onNavigate } from '$app/navigation';

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>
```

**Key details:**
- `onNavigate` fires immediately before navigation, after data loading completes
- Feature-detects `document.startViewTransition` -- falls back to instant navigation in unsupported browsers
- TypeScript 5.9.3 includes `startViewTransition` in its DOM lib natively -- no `@ts-expect-error` needed
- SvelteKit waits for the returned Promise before completing navigation, ensuring the old-state snapshot is captured

### Pattern 3: View Transition CSS Animations

**What:** CSS keyframes for fade and optional slide transitions applied via `::view-transition-old/new` pseudo-elements.
**When to use:** In `app.css` alongside design tokens.

```css
/* View transition animations */
@keyframes vt-fade-in {
  from { opacity: 0; }
}

@keyframes vt-fade-out {
  to { opacity: 0; }
}

::view-transition-old(root) {
  animation: 150ms cubic-bezier(0.4, 0, 1, 1) both vt-fade-out;
}

::view-transition-new(root) {
  animation: 150ms cubic-bezier(0, 0, 0.2, 1) 50ms both vt-fade-in;
}

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

**Why crossfade over slide:** The app is a music platform with a persistent player bar at the bottom. Slide transitions can feel jarring when the fixed player stays stationary while content slides. A subtle crossfade (150ms) feels polished without drawing attention away from the music.

### Pattern 4: Persistent Player Bar Exclusion from Transitions

**What:** Give the persistent player bar its own `view-transition-name` to prevent it from being captured in the root transition snapshot (which would cause a visual "ghost" of the player during transitions).
**When to use:** On the PersistentPlayer component's root element.

```css
/* In PersistentPlayer.svelte or app.css */
.persistent-player {
  view-transition-name: player-bar;
}

/* Don't animate the player bar during transitions */
::view-transition-old(player-bar),
::view-transition-new(player-bar) {
  animation: none;
}
```

**Why:** Without this, the player bar (which is `position: fixed`) gets included in the root snapshot. During the crossfade, the player briefly appears twice (once in the old snapshot, once in the live DOM). Setting a separate `view-transition-name` isolates it from the root transition and the `animation: none` rule makes it stay put.

### Pattern 5: Grid/List Layout Toggle

**What:** Toggle between a vertical list (`space-y-3`) and a responsive CSS Grid for the track listing.
**When to use:** On the main `+page.svelte` track listing.

```svelte
<!-- In +page.svelte -->
<script>
  import { layoutPreference } from '$lib/stores/layoutPreference.svelte';
</script>

<!-- Toggle button -->
<button
  onclick={() => layoutPreference.toggle()}
  class="p-1.5 rounded bg-surface-overlay text-text-muted hover:text-text-secondary"
  aria-label="Toggle {layoutPreference.mode === 'list' ? 'grid' : 'list'} view"
>
  {#if layoutPreference.mode === 'list'}
    <!-- Grid icon (4 squares) -->
    <svg>...</svg>
  {:else}
    <!-- List icon (horizontal lines) -->
    <svg>...</svg>
  {/if}
</button>

<!-- Track listing -->
{#if layoutPreference.mode === 'grid'}
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {#each data.tracks as track, i (track.id)}
      <TrackCardGrid {track} allTracks={queueTracks} index={i} />
    {/each}
  </div>
{:else}
  <div class="space-y-3">
    {#each data.tracks as track, i (track.id)}
      <div in:fly={{ y: 15, duration: 250, delay: Math.min(i * 60, 600), easing: cubicOut }}>
        <TrackCard {track} allTracks={queueTracks} index={i} />
      </div>
    {/each}
  </div>
{/if}
```

### Pattern 6: Grid Card Variant (Vertical Layout)

**What:** A vertical card layout for grid view showing cover art prominently with title and metadata below.
**When to use:** In grid layout mode only.

```svelte
<!-- TrackCardGrid.svelte -->
<a href="{base}/track/{track.slug}"
   class="flex flex-col rounded-lg bg-surface-raised hover:bg-surface-hover transition-all group overflow-hidden">
  <div class="relative aspect-square overflow-hidden">
    {#if track.artPath}
      <img
        src="{base}/api/tracks/{track.id}/art"
        alt="Cover art for {track.title}"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
      />
    {:else}
      <div class="w-full h-full bg-surface-overlay flex items-center justify-center">
        <span class="text-text-muted text-2xl">&#9835;</span>
      </div>
    {/if}
  </div>
  <div class="p-3">
    <h2 class="text-text-secondary font-medium text-sm truncate group-hover:text-text-primary transition-colors">
      {track.title}
    </h2>
    <div class="flex items-center gap-2 text-xs text-text-muted mt-1">
      {#if track.duration}
        <span class="font-mono tabular-nums">{formatTime(track.duration)}</span>
      {/if}
      <span class="uppercase tracking-wider">{categoryLabels[track.category] ?? track.category}</span>
    </div>
  </div>
</a>
```

### Pattern 7: Cover Art Hover Zoom on TrackCard (List View)

**What:** Subtle scale transform on hover, clipped by `overflow-hidden` container.
**When to use:** In the existing TrackCard component for the `sm` size CoverArt.

```svelte
<!-- In CoverArt.svelte, wrap image in overflow-hidden container for sm size -->
{#if artPath}
  <div class="{sizeClasses[size]} rounded-lg overflow-hidden shadow-lg shadow-black/40 shrink-0"
       style={glowStyle}>
    <img
      src="{base}/api/tracks/{trackId}/art"
      alt="Cover art for {title}"
      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      loading="lazy"
    />
  </div>
{:else}
  <!-- placeholder unchanged -->
{/if}
```

**Critical constraint:** The `group-hover:scale-110` applies `transform` to the `<img>` element inside CoverArt. This is safe because:
1. TrackCard (which uses CoverArt at size `sm`) does NOT contain any WaveformPlayer
2. The transform is on the `<img>` itself, not on any ancestor of a waveform
3. The CoverArt at size `lg` (track detail page) should NOT get the hover zoom -- it sits above the WaveformPlayer, and while the image itself is not an ancestor, the visual effect would be odd at that size anyway

### Anti-Patterns to Avoid

- **Using Svelte `transition:` for page transitions:** Svelte transitions require wrapper elements and manual coordination between incoming/outgoing pages. The View Transitions API handles this at the browser level with better performance (compositor-driven snapshots).
- **Animating layout switch with View Transitions:** The grid/list toggle should use a simple conditional render, not a view transition. View Transitions are for page navigation. Layout changes within a page should use CSS transitions or Svelte transitions.
- **CSS transforms on waveform ancestors:** NEVER apply `transform` to elements containing wavesurfer containers. The hover zoom goes on the `<img>` inside CoverArt at `sm` size only, which is in TrackCard (no waveform). The `lg` size CoverArt on the track detail page should NOT have hover zoom.
- **Multiple backdrop-blur elements:** The persistent player bar is the only element with `backdrop-blur`. View transitions should not introduce any additional backdrop-blur effects.
- **Oversized view transition animations:** Keep transition duration short (100-200ms). Longer transitions feel sluggish on a music app where users navigate frequently between tracks.
- **localStorage access during SSR:** Always guard localStorage reads/writes with `browser` from `$app/environment` or a `typeof window !== 'undefined'` check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persisted preferences | Complex pub/sub store with localStorage adapter | Svelte 5 class with `$state` + imperative localStorage in setters | ~15 lines, matches existing codebase pattern |
| Page transitions | Custom animation system with Svelte transition wrappers | View Transitions API via `onNavigate` | Browser-native, compositor-accelerated, ~10 lines setup |
| Layout toggle state | URL search params for layout mode | localStorage | Layout preference is a user preference, not part of the page state; URL params would break sharing |
| Grid/list responsive layout | Custom CSS media queries and breakpoints | Tailwind `grid-cols-2 sm:grid-cols-3` | Tailwind utilities handle responsive grid perfectly |
| Hover zoom animation | JavaScript mouseover/mouseout with requestAnimationFrame | CSS `transition-transform` + `group-hover:scale-110` | GPU-accelerated, zero JS, Tailwind classes |

**Key insight:** Every feature in this phase is achievable with platform APIs (View Transitions, localStorage, CSS transforms) and existing Svelte/Tailwind capabilities. Zero new dependencies needed.

## Common Pitfalls

### Pitfall 1: View Transition Ghosts the Persistent Player Bar
**What goes wrong:** During the crossfade transition, the fixed-position player bar appears twice -- once in the old-state snapshot and once in the live DOM.
**Why it happens:** `document.startViewTransition` captures a bitmap snapshot of the entire viewport, including fixed elements. The snapshot animates out while the live DOM animates in, creating a double-image effect.
**How to avoid:** Set `view-transition-name: player-bar` on the PersistentPlayer's root element and add `animation: none` for its `::view-transition-old` and `::view-transition-new` pseudo-elements. This isolates it from the root transition.
**Warning signs:** Player bar appearing to "flicker" or showing a fading duplicate during navigation.

### Pitfall 2: Layout Toggle Causes Flash on Page Load
**What goes wrong:** The page initially renders in list mode (SSR default), then switches to grid mode after hydration reads localStorage.
**Why it happens:** localStorage is a client-only API. During SSR, the layout defaults to 'list'. After hydration, the client reads 'grid' from localStorage and switches, causing a layout shift.
**How to avoid:** Default to 'list' as the initial state, which is also the more common/expected layout. The flash is only visible to users who previously chose grid AND have slow connections. For this app's scale, the flash is negligible. If it becomes a problem, a cookie-based approach (readable during SSR) could replace localStorage, but that adds complexity.
**Warning signs:** Brief flash of list layout before switching to grid on page load.

### Pitfall 3: Grid Cards Without Cover Art Look Empty
**What goes wrong:** In grid view, tracks without cover art show a large gray placeholder box that dominates the card.
**Why it happens:** The grid card uses `aspect-square` for the cover art area. Without art, the placeholder (a music note icon on gray) looks sparse.
**How to avoid:** Use a gradient background with the accent color as a fallback instead of a flat gray. Consider making the placeholder icon larger in grid view. The placeholder should still feel designed, not broken.
**Warning signs:** Grid view looking incomplete/broken when several tracks lack cover art.

### Pitfall 4: Hover Zoom on Touch Devices
**What goes wrong:** On touch devices, `hover` states stick after tap, causing the zoom to remain active.
**Why it happens:** Touch devices emulate hover on tap. The `:hover` pseudo-class activates and stays active until the user taps elsewhere.
**How to avoid:** Use `@media (hover: hover)` to only apply the zoom effect on devices with true hover capability: `@media (hover: hover) { .group:hover .cover-zoom { transform: scale(1.1); } }`. With Tailwind, this can be handled via the `hover:` modifier which already respects `@media (hover: hover)` in modern Tailwind versions. Alternatively, the subtle scale effect is harmless if it persists briefly on touch -- it's a minor cosmetic issue, not a functional one.
**Warning signs:** Cover art staying zoomed after tapping on mobile.

### Pitfall 5: View Transitions Interfere with Staggered Entrance
**What goes wrong:** The track listing page's staggered `in:fly` entrance animation conflicts with the view transition's crossfade, creating a jarring double-animation effect.
**Why it happens:** View Transitions animate the page snapshot crossfade while simultaneously Svelte's `in:fly` animates each card. Both happen at the same time.
**How to avoid:** Keep both animations subtle and short. The view transition crossfade (150ms) should complete before the stagger animation's later cards appear (first card at 0ms delay, later cards at 60ms intervals). If conflict is visible, reduce the view transition duration to 100ms or add a slight delay to the stagger start. Test visually during implementation.
**Warning signs:** Track cards appearing to animate twice (once as part of the page crossfade, then again as individual fly-in).

### Pitfall 6: Grid Layout Breaks Play Button Placement
**What goes wrong:** The play button that appears on hover in list view (positioned with flex on the right side) doesn't work in the vertical grid card layout.
**Why it happens:** The grid card has a different layout structure (vertical stack vs horizontal row). The play button needs different positioning.
**How to avoid:** In the grid card variant, overlay the play button on top of the cover art (absolute positioned, visible on hover). This is a common pattern in music apps (Spotify, Apple Music). Use `opacity-0 group-hover:opacity-100` with a semi-transparent background overlay.
**Warning signs:** Play button overlapping text, misaligned, or invisible in grid view.

### Pitfall 7: EqIndicator Not Visible in Grid View
**What goes wrong:** The equalizer animation indicator for the currently-playing track is not visible in grid card layout.
**Why it happens:** The list TrackCard shows the EqIndicator on the right side. The grid card may not have a natural place for it.
**How to avoid:** In grid view, overlay the EqIndicator on the cover art (similar to play button placement) when the track is currently playing. Alternatively, add a subtle accent-colored border/ring to the currently-playing grid card.
**Warning signs:** Users unable to tell which track is playing in grid view.

## Code Examples

### Complete Layout Preference Store

```typescript
// src/lib/stores/layoutPreference.svelte.ts
import { browser } from '$app/environment';

type LayoutMode = 'list' | 'grid';

const STORAGE_KEY = 'wallybrain-layout';

class LayoutPreference {
  mode: LayoutMode = $state('list');

  constructor() {
    if (browser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') {
        this.mode = stored;
      }
    }
  }

  toggle() {
    this.mode = this.mode === 'list' ? 'grid' : 'list';
    if (browser) {
      localStorage.setItem(STORAGE_KEY, this.mode);
    }
  }
}

export const layoutPreference = new LayoutPreference();
```

### View Transitions in Root Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  let { children } = $props();
  import { base } from '$app/paths';
  import { onNavigate } from '$app/navigation';
  import "../app.css";
  import PersistentPlayer from '$lib/components/PersistentPlayer.svelte';
  import { playerState } from '$lib/stores/playerState.svelte';

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<div class="min-h-screen flex flex-col">
  <header class="max-w-3xl mx-auto w-full px-4 pt-6 pb-2">
    <a href="{base}/" class="text-lg font-heading font-semibold text-text-secondary hover:text-text-primary transition-colors">
      wallybrain
    </a>
  </header>
  <main class="flex-1 {playerState.currentTrack ? 'pb-24' : ''}">
    {@render children()}
  </main>
  {#if playerState.currentTrack}
    <PersistentPlayer />
  {/if}
</div>
```

### View Transition CSS in app.css

```css
/* === View Transitions === */
@keyframes vt-fade-in {
  from { opacity: 0; }
}

@keyframes vt-fade-out {
  to { opacity: 0; }
}

::view-transition-old(root) {
  animation: 150ms cubic-bezier(0.4, 0, 1, 1) both vt-fade-out;
}

::view-transition-new(root) {
  animation: 150ms cubic-bezier(0, 0, 0.2, 1) 50ms both vt-fade-in;
}

/* Keep persistent player bar stable during transitions */
::view-transition-old(player-bar),
::view-transition-new(player-bar) {
  animation: none;
}

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

### Persistent Player View Transition Name

```svelte
<!-- Add to PersistentPlayer.svelte root element -->
<div class="fixed bottom-0 left-0 right-0 bg-surface-raised/90 backdrop-blur-lg border-t border-accent/15 shadow-[0_-4px_16px_rgba(0,0,0,0.4)] z-50"
     style="view-transition-name: player-bar;">
  <!-- ... existing content ... -->
</div>
```

### Cover Art with Hover Zoom (Modified CoverArt.svelte)

```svelte
<script lang="ts">
  import { base } from '$app/paths';

  let { trackId, artPath, title, size = 'md', dominantColor = null }: {
    trackId: string;
    artPath: string | null;
    title: string;
    size?: 'sm' | 'md' | 'lg';
    dominantColor?: string | null;
  } = $props();

  let glowStyle = $derived(
    dominantColor && size === 'lg'
      ? `box-shadow: 0 0 40px ${dominantColor}66, 0 0 80px ${dominantColor}33, 0 4px 16px rgba(0,0,0,0.4);`
      : ''
  );

  const sizeClasses: Record<string, string> = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 md:w-32 md:h-32',
    lg: 'w-full max-w-md aspect-square',
  };

  const placeholderTextSize: Record<string, string> = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  // Only enable hover zoom for sm size (used in TrackCard list view)
  let enableZoom = $derived(size === 'sm');
</script>

{#if artPath}
  <div class="{sizeClasses[size]} rounded-lg overflow-hidden shrink-0 {size === 'lg' ? '' : 'shadow-lg shadow-black/40'}"
       style={glowStyle}>
    <img
      src="{base}/api/tracks/{trackId}/art"
      alt="Cover art for {title}"
      class="w-full h-full object-cover {enableZoom ? 'transition-transform duration-300 group-hover:scale-110' : ''}"
      loading="lazy"
    />
  </div>
{:else}
  <div class="{sizeClasses[size]} rounded-lg bg-surface-overlay shadow-lg shadow-black/40 flex items-center justify-center shrink-0">
    <span class="text-text-muted {placeholderTextSize[size]}">&#9835;</span>
  </div>
{/if}
```

### Layout Toggle UI

```svelte
<!-- Toggle buttons in +page.svelte -->
<div class="flex items-center gap-1 bg-surface-overlay rounded-lg p-0.5">
  <button
    onclick={() => layoutPreference.setMode('list')}
    class="p-1.5 rounded {layoutPreference.mode === 'list' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'} transition-colors"
    aria-label="List view"
    aria-pressed={layoutPreference.mode === 'list'}
  >
    <svg class="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" stroke-width="2">
      <line x1="1" y1="4" x2="15" y2="4"/>
      <line x1="1" y1="8" x2="15" y2="8"/>
      <line x1="1" y1="12" x2="15" y2="12"/>
    </svg>
  </button>
  <button
    onclick={() => layoutPreference.setMode('grid')}
    class="p-1.5 rounded {layoutPreference.mode === 'grid' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'} transition-colors"
    aria-label="Grid view"
    aria-pressed={layoutPreference.mode === 'grid'}
  >
    <svg class="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" stroke-width="2">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1"/>
      <rect x="9.5" y="1" width="5.5" height="5.5" rx="1"/>
      <rect x="1" y="9.5" width="5.5" height="5.5" rx="1"/>
      <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1"/>
    </svg>
  </button>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte `transition:` wrappers for page transitions | View Transitions API via `onNavigate` | SvelteKit 1.24 (2023), Baseline Oct 2025 | Browser-native compositor animations, ~10 lines |
| Custom localStorage subscribe pattern (Svelte 4 stores) | Svelte 5 class with `$state` + imperative setter | Svelte 5 (2024) | Simpler, no subscribe/unsubscribe boilerplate |
| `@ts-expect-error` for `startViewTransition` | Native TypeScript DOM types | TypeScript 5.6+ (2024) | No workaround needed, full type safety |
| CSS `height` animation for layout changes | CSS Grid with `grid-template-columns` + conditional rendering | Modern Tailwind v4 | Clean responsive grid, no layout thrashing |
| JavaScript-based image zoom on hover | CSS `transform: scale()` + `overflow-hidden` | Always been standard | GPU-accelerated, zero JS |

**Deprecated/outdated:**
- `@types/dom-view-transitions` npm package: Unnecessary with TypeScript 5.6+; types are now in the standard DOM lib
- `svelte-persisted-store` for Svelte 5 projects: Designed for Svelte 4 stores; Svelte 5 runes make it trivial inline
- `beforeNavigate` for view transitions: `onNavigate` was introduced specifically because `beforeNavigate` fires too early (before data loading)

## Open Questions

1. **Stagger Animation Interaction with View Transitions**
   - What we know: Both the view transition crossfade and the Svelte `in:fly` stagger will fire during navigation to the track listing page.
   - What's unclear: Whether the combined effect looks polished or jarring.
   - Recommendation: Implement both, test visually. If conflicting, either reduce view transition duration to 100ms or remove the stagger delay (keep fly but with `delay: 0`).

2. **Grid Column Count on Different Screen Sizes**
   - What we know: `grid-cols-2 sm:grid-cols-3` is a reasonable starting point for the max-w-3xl container.
   - What's unclear: Whether 3 columns at sm+ looks good with the existing card design and cover art sizes.
   - Recommendation: Start with 2 columns on mobile, 3 on sm+. Tune during implementation. The max-w-3xl container is ~768px wide, so 3 columns gives ~240px per card, which is comfortable for a cover art + title layout.

3. **Header Element and View Transitions**
   - What we know: The header ("wallybrain" link) persists across all pages.
   - What's unclear: Whether the header should get its own `view-transition-name` to stay stable (like the player bar) or participate in the root crossfade.
   - Recommendation: Start without a separate name for the header (let it participate in the root fade). It's subtle enough that it should look fine. Add a separate name only if it looks bad during testing.

## Sources

### Primary (HIGH confidence)
- [SvelteKit $app/navigation docs](https://svelte.dev/docs/kit/$app-navigation) - `onNavigate` API signature and purpose: "runs the supplied callback immediately before we navigate to a new URL"
- [SvelteKit View Transitions blog post](https://svelte.dev/blog/view-transitions) - Official implementation pattern with exact code examples
- [Can I Use: View Transitions](https://caniuse.com/view-transitions) - 89.49% global support, Baseline Newly available Oct 2025
- [Chrome View Transitions 2025 update](https://developer.chrome.com/blog/view-transitions-in-2025) - `match-element`, nested groups, timing fixes
- [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) - API reference
- TypeScript 5.9.3 DOM lib (local verification) - `startViewTransition` types present in `lib.dom.d.ts`
- [MDN view-transition-name](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/view-transition-name) - Property reference for excluding elements

### Secondary (MEDIUM confidence)
- [Joy of Code: SvelteKit View Transitions](https://joyofcode.xyz/sveltekit-view-transitions) - Practical implementation guide with CSS examples and gotchas
- [W3C CSSWG issue #8941](https://github.com/w3c/csswg-drafts/issues/8941) - Named elements appearing above fixed elements during transitions (confirms player bar isolation need)
- [view-transition-name CSS-Tricks](https://css-tricks.com/almanac/properties/v/view-transition-name/) - Practical usage patterns
- [W3bits CSS Image Hover Zoom](https://w3bits.com/css-image-hover-zoom/) - overflow-hidden + scale pattern reference
- [Svelte 5 Persistent State (DEV Community)](https://dev.to/developerbishwas/svelte-5-persistent-state-strictly-runes-supported-3lgm) - Svelte 5 runes + localStorage patterns

### Tertiary (LOW confidence)
- Exact view transition + stagger animation interaction - Needs visual testing during implementation
- Optimal grid column count for max-w-3xl container - Needs visual testing with actual track data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All features use existing installed dependencies; no new packages
- Architecture (layout toggle): HIGH - Follows exact same pattern as existing playerState.svelte.ts
- Architecture (view transitions): HIGH - Official SvelteKit blog post provides exact code; TS 5.9 types verified locally
- Architecture (hover zoom): HIGH - Standard CSS pattern, verified no waveform ancestor conflicts
- Pitfalls: HIGH - Player bar transition issue documented in W3C spec issues; localStorage SSR guard is standard SvelteKit pattern
- Visual tuning (animation timing, grid columns): LOW - Starting values provided but need real-world testing

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain; View Transitions API is settled, Svelte 5 runes API is stable)
