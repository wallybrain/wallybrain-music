# Architecture: Design System Integration for wallybrain-music

**Domain:** Visual polish layer for an existing SvelteKit music platform
**Researched:** 2026-02-09
**Overall confidence:** HIGH

## Current Architecture Snapshot

The existing codebase is a SvelteKit 2 app (Svelte 5 with runes) using Tailwind CSS v4 via the `@tailwindcss/vite` plugin. All styling is currently inline Tailwind utility classes with zero design tokens, zero CSS custom properties, and a minimal `app.css` that imports Tailwind and sets a dark base + scrollbar styles.

### Existing File Map

```
src/
  app.css                              # Tailwind import + dark base + scrollbar
  routes/
    +layout.svelte                     # Shell: header, main, PersistentPlayer
    +page.svelte                       # Track listing with FilterBar + TrackCards
    +error.svelte                      # Error page
    track/[slug]/+page.svelte          # Track detail with WaveformPlayer + CoverArt
    admin/+layout.svelte               # Admin shell
    admin/+page.svelte                 # Admin dashboard
    admin/upload/+page.svelte          # Upload page
    admin/tracks/[id]/+page.svelte     # Track edit page
  lib/
    components/
      TrackCard.svelte                 # Track list item (cover, title, play button)
      WaveformPlayer.svelte            # Wavesurfer.js inline player
      PersistentPlayer.svelte          # Fixed bottom bar player
      CoverArt.svelte                  # Album art with size variants
      FilterBar.svelte                 # Category + tag filter pills
    stores/
      playerState.svelte.ts            # Reactive player state (Svelte 5 class)
    utils/
      formatTime.ts                    # Duration formatting
```

### Current Styling Patterns

| Pattern | Where Used | Count |
|---------|-----------|-------|
| Inline Tailwind utilities | Every component | 100% of styling |
| Hardcoded color values | WaveformPlayer (wavesurfer config) | `#4a4a5a`, `#8b5cf6` |
| Tailwind CSS variables | app.css base layer | `var(--color-zinc-*)` |
| Component `<style>` blocks | Nowhere | 0 uses |
| Design tokens | Nowhere | 0 defined |
| CSS custom properties | Nowhere (beyond Tailwind defaults) | 0 defined |
| Svelte transitions | Nowhere | 0 uses |
| Svelte animate directives | Nowhere | 0 uses |

### Hardcoded Colors Audit

These values are scattered across components and need consolidation:

| Color | Hex/Class | Semantic Meaning | Used In |
|-------|-----------|-----------------|---------|
| `violet-600` | `#7c3aed` | Primary/accent (active state) | TrackCard, FilterBar, WaveformPlayer, PersistentPlayer |
| `violet-500` | `#8b5cf6` | Primary hover / waveform progress | TrackCard, WaveformPlayer, PersistentPlayer, track detail |
| `violet-400` | -- | Primary text links | Listing page, track detail |
| `zinc-950` | -- | App background | app.css base |
| `zinc-900` | -- | Card/surface background | TrackCard, PersistentPlayer, scrollbar |
| `zinc-800` | -- | Borders, tag backgrounds | Multiple |
| `zinc-200`/`zinc-300` | -- | Primary text | Base text, headings |
| `zinc-400`/`zinc-500` | -- | Secondary/muted text | Timestamps, meta info |
| `#4a4a5a` | Hardcoded hex | Waveform base color | WaveformPlayer, PersistentPlayer |
| `#8b5cf6` | Hardcoded hex | Waveform progress/cursor | WaveformPlayer, PersistentPlayer |

---

## Recommended Architecture

### Design Principle: Progressive Enhancement via Tokens

The architecture adds a design token layer in `app.css` using Tailwind v4's `@theme` directive, then components are updated incrementally to reference these tokens. No component rewrites. No new dependencies. No `<style>` blocks in components.

### Architecture Layers

```
                    +---------------------------+
                    |     Tailwind Utilities     |  Markup classes (existing)
                    +---------------------------+
                              |
                    +---------------------------+
                    |   Semantic Token Layer     |  @theme in app.css (NEW)
                    +---------------------------+
                              |
                    +---------------------------+
                    |  Custom Animations Layer   |  @theme @keyframes (NEW)
                    +---------------------------+
                              |
                    +---------------------------+
                    |   Svelte Transitions       |  transition:/in:/out: (NEW)
                    +---------------------------+
```

### Component Boundaries

| Component | Receives Tokens Via | Animations Added | Transitions Added | Modifications |
|-----------|-------------------|------------------|-------------------|---------------|
| `app.css` | N/A (defines them) | Custom @keyframes | N/A | **Modified** (token definitions) |
| `+layout.svelte` | Utility classes | None | Wrap PersistentPlayer in transition | **Modified** (transition wrapper) |
| `TrackCard.svelte` | Utility classes | Hover micro-interactions | None (always rendered) | **Modified** (CSS hover effects) |
| `WaveformPlayer.svelte` | CSS vars for wavesurfer config | Loading skeleton pulse | `out:fade` / `in:fade` for loading states | **Modified** (token colors, transitions) |
| `PersistentPlayer.svelte` | CSS vars for wavesurfer config | None | `transition:fly` for mount/unmount | **Modified** (token colors, transition on root) |
| `CoverArt.svelte` | Utility classes | Hover scale | None (always rendered) | **Modified** (CSS hover effects) |
| `FilterBar.svelte` | Utility classes | Active pill styling | `transition:slide` for clear-all area | **Modified** (minor transition) |
| `+page.svelte` | Utility classes | None | `animate:flip` on track list reorder | **Modified** (add flip to each block) |
| `track/[slug]/+page.svelte` | Utility classes | None | `in:fade` for page content | **Minimal modification** |

---

## Design Token Architecture (app.css)

### Token Strategy: Extend, Don't Replace

All design tokens are defined in `src/app.css` using Tailwind v4's `@theme` directive. This approach:

1. Generates real Tailwind utility classes (e.g., `bg-surface`, `text-accent`)
2. Exposes CSS custom properties at `:root` (e.g., `var(--color-surface)`)
3. Requires zero new files or dependencies
4. Is tree-shaken by Tailwind -- only tokens referenced in markup are included

**Critical decision:** Use `@theme` to extend the default palette -- do NOT use `--color-*: initial` to replace it. The existing components reference `zinc-*` and `violet-*` extensively. Replacing defaults would break every component. Semantic tokens coexist with Tailwind defaults.

### Token Namespace Definitions

```css
@import "tailwindcss";

@theme {
  /* -- Semantic Surface Colors -- */
  --color-surface: oklch(0.145 0.005 285.82);         /* base background, ~ zinc-950 */
  --color-surface-raised: oklch(0.21 0.006 285.75);   /* card/panel bg, ~ zinc-900 */
  --color-surface-overlay: oklch(0.274 0.006 286);     /* elevated surfaces, ~ zinc-800 */

  /* -- Semantic Accent Colors -- */
  --color-accent: oklch(0.585 0.233 277.12);           /* primary action, ~ violet-500 */
  --color-accent-hover: oklch(0.536 0.245 276.94);     /* hover state, ~ violet-600 */
  --color-accent-muted: oklch(0.653 0.195 277.12);     /* subtle accent, ~ violet-400 */

  /* -- Semantic Text Colors -- */
  --color-text-primary: oklch(0.871 0.006 286.29);     /* headings/body, ~ zinc-200 */
  --color-text-secondary: oklch(0.552 0.016 285.94);   /* meta/labels, ~ zinc-500 */
  --color-text-muted: oklch(0.442 0.017 285.79);       /* faint text, ~ zinc-600 */

  /* -- WaveSurfer-Specific Tokens -- */
  --color-waveform-base: oklch(0.35 0.02 280);         /* replaces hardcoded #4a4a5a */
  --color-waveform-progress: oklch(0.585 0.233 277);   /* replaces hardcoded #8b5cf6 */

  /* -- Custom Easings -- */
  --ease-smooth: cubic-bezier(0.22, 0.61, 0.36, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* -- Custom Animations -- */
  --animate-fade-in: fade-in 0.3s var(--ease-smooth) both;
  --animate-slide-up: slide-up 0.35s var(--ease-smooth) both;
  --animate-scale-in: scale-in 0.2s var(--ease-spring) both;
  --animate-pulse-glow: pulse-glow 2s ease-in-out infinite;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 oklch(0.585 0.233 277 / 0); }
    50% { box-shadow: 0 0 16px 2px oklch(0.585 0.233 277 / 0.3); }
  }
}

@layer base {
  html {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    scroll-behavior: smooth;
  }
}

/* Scrollbar styling (unchanged) */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--color-surface-raised); }
::-webkit-scrollbar-thumb { background: var(--color-surface-overlay); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-zinc-600); }
```

### Why This Structure

| Decision | Rationale |
|----------|-----------|
| Extend defaults, don't replace | Existing components reference `zinc-*` / `violet-*` heavily. Replacing would break everything. Semantic tokens coexist. |
| OKLCH color format | Tailwind v4 uses OKLCH internally. Perceptually uniform. All target browsers support it (Safari 16.4+, Chrome 111+, Firefox 128+). |
| Semantic naming (`surface`, `accent`, `text-primary`) | Components express intent, not specific colors. Enables future theming if desired. |
| Separate `waveform-*` tokens | WaveSurfer.js accepts color strings via JS config, not CSS classes. These tokens bridge the CSS-to-JS gap. |
| `@theme` not `:root` | `@theme` generates corresponding utility classes (`bg-surface`, `text-accent`). `:root` would only create CSS variables without utilities. |
| Custom easings as theme values | Generates `ease-smooth`, `ease-bounce`, `ease-spring` utility classes for `transition-timing-function`. |
| `@keyframes` inside `@theme` | Binds keyframes to `--animate-*` variables so they are tree-shaken if unused. Generates `animate-fade-in`, `animate-slide-up`, etc. |

**Confidence: HIGH** -- Based on official Tailwind CSS v4 `@theme` documentation.

---

## Data Flow: Token Resolution

### How Tokens Reach Components

```
app.css @theme block
    |
    +---> Tailwind compiler generates utility classes
    |       e.g., bg-surface, text-accent, ease-smooth, animate-fade-in
    |       Used in: component class="" attributes (inline Tailwind)
    |
    +---> CSS custom properties emitted at :root
            e.g., var(--color-waveform-base), var(--color-waveform-progress)
            Used in: WaveSurfer.create({ waveColor: ... }) via getComputedStyle
```

### WaveSurfer Token Integration

WaveSurfer.js v7 accepts color strings at initialization time. It does NOT read CSS custom properties directly. The integration pattern reads computed CSS variable values at mount time:

```typescript
// In WaveformPlayer.svelte and PersistentPlayer.svelte
onMount(() => {
  const styles = getComputedStyle(document.documentElement);
  const waveColor = styles.getPropertyValue('--color-waveform-base').trim();
  const progressColor = styles.getPropertyValue('--color-waveform-progress').trim();

  ws = WaveSurfer.create({
    container,
    waveColor: waveColor || '#4a4a5a',       // fallback preserves current behavior
    progressColor: progressColor || '#8b5cf6', // fallback preserves current behavior
    // ... rest of existing config unchanged
  });
});
```

This replaces the current hardcoded hex values with token-driven colors while keeping a fallback for safety.

**Confidence: HIGH** -- `getComputedStyle` is standard DOM API. WaveSurfer accepts any valid CSS color string including OKLCH.

---

## Svelte Transitions Architecture

### Where to Add Transitions

Svelte transitions (`transition:`, `in:`, `out:`) trigger when elements enter/leave the DOM due to `{#if}`, `{#each}`, or `{#await}` blocks. The existing codebase already has conditional rendering in the right places.

**Important constraint:** The `transition:` directive must be on a DOM element, not a Svelte component. If the transition target is a component, either wrap it in a `<div>` or move the transition inside the component's root element.

### Transition Map

| Component | Element | Trigger | Directive | Parameters |
|-----------|---------|---------|-----------|------------|
| PersistentPlayer (in layout) | Wrapper div or root element | `{#if playerState.currentTrack}` | `transition:fly` | `{{ y: 72, duration: 300, easing: quintOut }}` |
| WaveformPlayer | Loading text div | `{#if isLoading && !loadError}` | `out:fade` | `{{ duration: 200 }}` |
| WaveformPlayer | Error text div | `{#if loadError}` | `in:fade` | `{{ duration: 200 }}` |
| FilterBar | Clear-all section | `{#if hasActiveFilters}` | `transition:slide` | `{{ duration: 200 }}` |
| +page.svelte | Track list items | `{#each data.tracks as track (track.id)}` | `animate:flip` | `{{ duration: 250 }}` |
| track/[slug] | Content wrapper | Always rendered | CSS `animate-fade-in` | N/A (not conditional) |

### Transition Integration Patterns

**Pattern A: Wrapping a component in a transition div (PersistentPlayer)**

```svelte
<!-- In +layout.svelte -->
<script>
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
</script>

<!-- BEFORE -->
{#if playerState.currentTrack}
  <PersistentPlayer />
{/if}

<!-- AFTER -->
{#if playerState.currentTrack}
  <div transition:fly={{ y: 72, duration: 300, easing: quintOut }}>
    <PersistentPlayer />
  </div>
{/if}
```

**Pattern B: Transition on existing conditional element (WaveformPlayer)**

```svelte
<!-- In WaveformPlayer.svelte -->
<script>
  import { fade } from 'svelte/transition';
</script>

<!-- The {#if} block already exists, just add the directive -->
{#if isLoading && !loadError}
  <div out:fade={{ duration: 200 }} class="flex items-center justify-center h-20 text-zinc-500">
    <span>Loading waveform...</span>
  </div>
{/if}
```

**Pattern C: FLIP animation on keyed each block (track listing)**

```svelte
<!-- In +page.svelte -->
<script>
  import { flip } from 'svelte/animate';
</script>

{#each data.tracks as track, i (track.id)}
  <div animate:flip={{ duration: 250 }}>
    <TrackCard {track} allTracks={queueTracks} index={i} />
  </div>
{/each}
```

The `{#each}` block already uses `(track.id)` as a key, which is the prerequisite for `animate:flip`. When tracks are reordered by filter changes, existing items animate smoothly to their new positions.

**Pattern D: CSS animation for always-rendered elements (track detail page)**

Elements that are always present in the DOM cannot use Svelte's `transition:` directive. Use Tailwind's `animate-*` classes instead:

```svelte
<!-- In track/[slug]/+page.svelte -->
<div class="max-w-3xl mx-auto px-4 py-8 motion-safe:animate-fade-in">
```

**Confidence: HIGH** -- `animate:flip` in keyed `{#each}` is a core Svelte feature, unchanged in Svelte 5. Transition directives work identically with runes.

### Motion Accessibility

Always respect `prefers-reduced-motion`. Two approaches:

1. **Tailwind utility (CSS animations):** Use `motion-safe:animate-fade-in` -- animation only plays when the user has not enabled reduced motion.

2. **Svelte transitions (JS-driven):** Check the media query and set duration to 0:

```typescript
const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const transitionDuration = prefersReducedMotion ? 0 : 300;
```

---

## CSS Organization Strategy

### Decision: Single-File Token Architecture in app.css

All design tokens, custom animations, and base styles live in `src/app.css`. Do NOT create separate CSS files for tokens, animations, or component styles.

**Rationale:**
1. The app has 5 components and 3 public pages -- not complex enough to justify splitting
2. Tailwind v4 tree-shakes unused tokens, so file size is not a concern
3. Single source of truth eliminates import chains and maintenance overhead
4. `@theme` blocks must be at the top level of a CSS file processed by Tailwind

### app.css Structure (Post-Integration)

```css
/* 1. Tailwind import */
@import "tailwindcss";

/* 2. Design tokens via @theme */
@theme {
  /* Semantic colors */
  /* Custom easings */
  /* Custom animations + @keyframes */
}

/* 3. Base layer overrides */
@layer base {
  html { /* ... */ }
}

/* 4. Scrollbar styling (outside layers) */
::-webkit-scrollbar { /* ... */ }
```

### Why NOT Component `<style>` Blocks

The Tailwind CSS v4 official documentation explicitly recommends against using `<style>` blocks in Svelte components:

> "We recommend avoiding `<style>` blocks in your components and just styling things with utility classes directly in your markup."

Using `<style>` blocks with Tailwind v4 in Svelte requires adding `@reference "../app.css"` to every component, which:
- Adds boilerplate to every component
- Slows builds (Tailwind runs separately for each file)
- Creates a secondary styling pattern alongside utility classes

The project already follows the utility-class-only pattern. Maintain it.

**Confidence: HIGH** -- Official Tailwind v4 compatibility documentation at tailwindcss.com/docs/compatibility.

### Why NOT a Separate tokens.css File

A separate file like `src/lib/styles/tokens.css` might seem cleaner but creates problems:

1. `@theme` is processed by the Tailwind Vite plugin at the CSS entry point. A separate file would need `@import` ordering
2. Tailwind v4 supports `@import` and will inline the file, but it adds an indirection that complicates debugging
3. With fewer than 50 lines of tokens, the overhead of a separate file is not justified
4. When/if the app grows to 20+ components, splitting becomes warranted. Not at 5 components.

---

## Patterns to Follow

### Pattern 1: Gradual Token Adoption

Replace hardcoded colors with semantic tokens component-by-component. Do not refactor all components at once. Each component can be updated independently because tokens are additive (they don't remove existing Tailwind classes).

```svelte
<!-- BEFORE -->
<div class="bg-zinc-900/50 hover:bg-zinc-800/70">

<!-- AFTER (either old or new classes work -- migration is safe) -->
<div class="bg-surface-raised/50 hover:bg-surface-overlay/70">
```

Both old and new classes work simultaneously. No breaking changes during migration.

### Pattern 2: CSS Variables for JS-Consumed Values

For values that cross the CSS-to-JS boundary (WaveSurfer colors), read from computed styles:

```typescript
const styles = getComputedStyle(document.documentElement);
const color = styles.getPropertyValue('--color-waveform-progress').trim();
```

### Pattern 3: Svelte Transitions on Conditional Elements Only

Svelte transitions only trigger on elements that enter/leave the DOM via `{#if}`, `{#each}`, or `{#await}`. Do not add `transition:` to always-rendered elements -- use CSS animation utility classes instead.

```svelte
<!-- Conditional rendering: use Svelte transition -->
{#if visible}
  <div transition:fade>Content</div>
{/if}

<!-- Always present: use CSS animation class -->
<div class="motion-safe:animate-fade-in">Always here</div>
```

### Pattern 4: Motion-Safe by Default

Always gate animations behind `motion-safe:` or check `prefers-reduced-motion`:

```html
<div class="motion-safe:animate-fade-in">
```

This is a Tailwind v4 variant that wraps the animation in `@media (prefers-reduced-motion: no-preference)`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Token Overload

**What:** Defining semantic tokens for every possible color combination (e.g., `--color-card-border-hover-active`).
**Why bad:** Creates a second abstraction layer that is harder to maintain than the Tailwind classes themselves.
**Instead:** Define tokens only for values that are: (a) shared across 3+ components, (b) need to change together as a group, or (c) cross the CSS-to-JS boundary.

### Anti-Pattern 2: Wholesale Class Replacement

**What:** Converting every `zinc-800` to `surface-overlay` across all components in one pass.
**Why bad:** The existing `zinc-*` classes work perfectly. A bulk find-and-replace risks visual regressions with zero user-visible improvement.
**Instead:** Use semantic tokens for new additions and adopt them gradually in existing components when touching that component for other reasons.

### Anti-Pattern 3: Component `<style>` Blocks for Animations

**What:** Adding `<style>` blocks with `@keyframes` to individual Svelte components.
**Why bad:** Duplicates animation definitions. Requires `@reference` boilerplate. Breaks the utility-class-only pattern. Slows builds.
**Instead:** Define all `@keyframes` in `app.css` within `@theme`. Use `animate-*` utility classes or Svelte `transition:` directives.

### Anti-Pattern 4: Global Page Transitions

**What:** Adding page-level cross-fade transitions to all SvelteKit route navigations.
**Why bad:** SvelteKit does not have built-in page transition support. Implementing it requires complex `onNavigate` lifecycle hooks and shared layout state management. High complexity, low payoff for a 3-page app.
**Instead:** Use `in:fade` on specific content blocks or `animate-fade-in` on page wrappers for subtle entrance effects without the full page-transition infrastructure.

### Anti-Pattern 5: Using @apply Extensively

**What:** Extracting common utility patterns into `@apply`-based component classes in `app.css`.
**Why bad:** Creates an abstraction that hides what styles are applied, making it harder to understand component styling at a glance. Defeats the purpose of utility-first CSS.
**Instead:** Keep utilities inline. The repetition across components is acceptable at this scale and makes each component self-documenting.

---

## Integration Points Summary

### New vs. Modified Files

| File | Status | What Changes |
|------|--------|--------------|
| `src/app.css` | **MODIFIED** | Add `@theme` block with semantic tokens, easings, animations, `@keyframes`. Update `@layer base` to use token vars. |
| `src/lib/components/PersistentPlayer.svelte` | **MODIFIED** | Read `--color-waveform-*` via `getComputedStyle` for WaveSurfer config. Add `transition:fly` on root element. |
| `src/lib/components/WaveformPlayer.svelte` | **MODIFIED** | Read `--color-waveform-*` via `getComputedStyle` for WaveSurfer config. Add `out:fade`/`in:fade` on loading/error states. |
| `src/lib/components/TrackCard.svelte` | **MODIFIED** | Add CSS hover micro-interactions (scale, shadow) via utility classes. |
| `src/lib/components/CoverArt.svelte` | **MODIFIED** | Add hover scale/glow effect via utility classes. Lazy-load visual enhancement. |
| `src/lib/components/FilterBar.svelte` | **MODIFIED** | Add `transition:slide` on clear-all section. |
| `src/routes/+layout.svelte` | **MODIFIED** | Wrap PersistentPlayer `{#if}` block with transition div or move transition into component. |
| `src/routes/+page.svelte` | **MODIFIED** | Add `animate:flip` to track list `{#each}` wrapper. Import `flip` from `svelte/animate`. |
| `src/routes/track/[slug]/+page.svelte` | **MODIFIED** | Add `motion-safe:animate-fade-in` to content wrapper. |

**Zero new files. Zero new dependencies. Zero new directories.**

### Build Order (Dependency-Aware)

The phases below are ordered by dependency. Phases 2-5 are largely independent of each other and can be built in any order after Phase 1 completes.

```
Phase 1: Token Foundation (MUST be first)
  Modify app.css: add @theme block with all tokens, easings, @keyframes
  Modify app.css @layer base: reference semantic token vars
  WHY FIRST: Every subsequent phase references these tokens.

Phase 2: WaveSurfer Token Integration (depends on Phase 1)
  Modify WaveformPlayer.svelte: getComputedStyle for waveform colors
  Modify PersistentPlayer.svelte: getComputedStyle for waveform colors
  WHY: Removes last hardcoded hex values. Must wait for token CSS vars to exist.

Phase 3: Component Transitions (depends on Phase 1, independent of Phase 2)
  Modify +layout.svelte: PersistentPlayer fly transition wrapper
  Modify WaveformPlayer.svelte: loading/error fade transitions
  Modify FilterBar.svelte: active filters slide transition
  Modify PersistentPlayer.svelte: fly transition on root element
  WHY: These touch {#if} blocks that already exist. No new conditional logic.

Phase 4: Hover & Micro-interactions (depends on Phase 1, independent of 2-3)
  Modify TrackCard.svelte: hover scale, shadow, play button reveal
  Modify CoverArt.svelte: hover scale/glow effects
  WHY: Pure CSS additions via utility classes. No structural changes.

Phase 5: List & Page Animations (depends on Phase 1, independent of 2-4)
  Modify +page.svelte: animate:flip on track list {#each}
  Modify track/[slug]/+page.svelte: animate-fade-in on content wrapper
  WHY: Independent page-level enhancements.
```

---

## Sources

- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) -- HIGH confidence (official docs)
- [Tailwind CSS v4 Functions and Directives](https://tailwindcss.com/docs/functions-and-directives) -- HIGH confidence (official docs)
- [Tailwind CSS v4 Adding Custom Styles](https://tailwindcss.com/docs/adding-custom-styles) -- HIGH confidence (official docs)
- [Tailwind CSS v4 Animation Utilities](https://tailwindcss.com/docs/animation) -- HIGH confidence (official docs)
- [Tailwind CSS v4 Compatibility (Svelte)](https://tailwindcss.com/docs/compatibility) -- HIGH confidence (official docs)
- [Tailwind CSS v4 Theming Best Practices Discussion](https://github.com/tailwindlabs/tailwindcss/discussions/18471) -- MEDIUM confidence (community discussion with maintainer participation)
- [Svelte 5 Transition Directive](https://svelte.dev/docs/svelte/transition) -- HIGH confidence (official docs)
- [Svelte 5 Animate Directive](https://svelte.dev/docs/svelte/animate) -- HIGH confidence (official docs)
- [Tailwind CSS v4 and Svelte 5 Discussion](https://github.com/sveltejs/svelte/discussions/14668) -- MEDIUM confidence (community discussion)
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) -- HIGH confidence (official docs)
