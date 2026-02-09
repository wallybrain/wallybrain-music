# Phase 7: Persistent Player and Queue - Research

**Researched:** 2026-02-09
**Domain:** SvelteKit persistent layout components, Svelte 5 global state with runes, wavesurfer.js v7 shared media element, audio queue management
**Confidence:** HIGH

## Summary

Phase 7 transforms the existing page-scoped WaveformPlayer into a persistent bottom-bar audio player that survives SvelteKit page navigations, with automatic queue progression. The architecture centers on three things: (1) a Svelte 5 reactive state module (`.svelte.ts` file) that holds the current track, queue, and playback state; (2) a persistent `PersistentPlayer` component rendered in the root `+layout.svelte` (which SvelteKit preserves across navigations); and (3) a shared `HTMLAudioElement` that the bottom-bar wavesurfer.js instance controls.

The key insight is that SvelteKit's root layout component is never destroyed during client-side navigation -- it is reused, and only the `{@render children()}` slot re-renders. Any DOM elements placed in the layout (like an audio player bar) persist naturally. The player state (current track, queue, isPlaying, volume) lives in a `src/lib/stores/playerState.svelte.ts` module using Svelte 5's `$state` rune with an object/class pattern, making it reactive across all importing components. When a visitor clicks "play" on a track page or track card, it updates the global state, which the persistent player component reacts to via `$effect`.

wavesurfer.js v7 supports an external `media` option in its constructor -- you can pass an `HTMLMediaElement` that wavesurfer will use instead of creating its own. This is critical: the persistent player owns the `Audio` element, and wavesurfer.js visualizes it. When switching tracks, we call `wavesurfer.load(newUrl, peaks, duration)` on the existing instance rather than destroying and recreating it. The `finish` event on wavesurfer triggers queue advancement.

**Primary recommendation:** Use a `.svelte.ts` state module with a class-based reactive store for player/queue state, render a `PersistentPlayer.svelte` component in root `+layout.svelte` below the `{@render children()}` slot, and use wavesurfer.js v7's `load()` method to switch tracks on a single persistent instance. Wire the existing track detail page and track listing to dispatch play actions through the shared store.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wavesurfer.js | ^7.12.x (already installed) | Waveform visualization in persistent player | Already used in Phase 3; supports `media` option and `load()` for track switching without destroy/recreate |
| Svelte 5 runes ($state, $derived, $effect) | ^5.50.x (already installed) | Global reactive state for player/queue | Built-in Svelte 5 feature; no external state library needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | All required libraries are already installed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `.svelte.ts` $state module | Svelte writable stores | Stores still work but runes are the Svelte 5 idiomatic approach; `$state` provides deep reactivity on objects |
| wavesurfer.js in bottom bar | Plain `<audio>` + CSS progress bar | Loses the waveform visualization which is a key UX feature of this music site |
| Single persistent wavesurfer instance | Destroy/recreate on track change | Destroy/recreate causes audio gaps and flash of empty waveform; `load()` is smoother |

**Installation:**
```bash
# No new packages needed -- wavesurfer.js and Svelte 5 already installed
```

## Architecture Patterns

### Recommended Project Structure (new files for this phase)

```
src/
├── lib/
│   ├── stores/
│   │   └── playerState.svelte.ts    # Global player/queue reactive state
│   └── components/
│       └── PersistentPlayer.svelte  # Bottom bar player component
├── routes/
│   └── +layout.svelte               # MODIFIED: add PersistentPlayer below children
```

### Pattern 1: Svelte 5 Class-Based Reactive Store in `.svelte.ts`

**What:** A class with `$state` properties exported from a `.svelte.ts` module file, providing globally reactive player state
**When to use:** For state that must be shared between the layout (PersistentPlayer), track detail pages, and track listing

```typescript
// src/lib/stores/playerState.svelte.ts

export type QueueTrack = {
  id: string;
  slug: string;
  title: string;
  duration: number;
  artPath: string | null;
};

class PlayerState {
  currentTrack: QueueTrack | null = $state(null);
  queue: QueueTrack[] = $state([]);
  queueIndex: number = $state(-1);
  isPlaying: boolean = $state(false);
  currentTime: number = $state(0);
  volume: number = $state(1);

  play(track: QueueTrack, queue: QueueTrack[] = [], index: number = 0) {
    this.currentTrack = track;
    this.queue = queue;
    this.queueIndex = index;
    this.isPlaying = true;
    this.currentTime = 0;
  }

  pause() {
    this.isPlaying = false;
  }

  resume() {
    this.isPlaying = true;
  }

  next(): boolean {
    if (this.queueIndex < this.queue.length - 1) {
      this.queueIndex++;
      this.currentTrack = this.queue[this.queueIndex];
      this.currentTime = 0;
      this.isPlaying = true;
      return true;
    }
    this.isPlaying = false;
    return false;
  }

  // ... skip, setVolume, etc.
}

export const playerState = new PlayerState();
```

**Key details:**
- File MUST have `.svelte.ts` extension for `$state` runes to work outside components
- Use a class (not exported primitives) because JS imports are read-only bindings; class property mutations work across modules
- This is client-only state -- safe for audio player since audio never runs on the server
- Deep reactivity: `$state` on arrays/objects means `queue.push()` and property assignments are reactive

### Pattern 2: Persistent Player in Root Layout

**What:** The `PersistentPlayer` component lives in `+layout.svelte`, outside the `{@render children()}` slot
**When to use:** Always -- this is the mechanism that keeps audio playing across navigations

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  let { children } = $props();
  import { base } from '$app/paths';
  import "../app.css";
  import PersistentPlayer from '$lib/components/PersistentPlayer.svelte';
  import { playerState } from '$lib/stores/playerState.svelte';
</script>

<div class="min-h-screen flex flex-col">
  <header class="max-w-3xl mx-auto w-full px-4 pt-6 pb-2">
    <a href="{base}/" class="text-lg font-semibold text-zinc-300 hover:text-white transition-colors">
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

**Key details:**
- The layout uses the existing flex-column structure (designed for this in Phase 4)
- `PersistentPlayer` is conditionally rendered only when a track is loaded
- `main` gets bottom padding (`pb-24`) when player is visible so content isn't hidden behind it
- SvelteKit NEVER destroys the root layout during client-side navigation -- the player persists

### Pattern 3: wavesurfer.js Instance Management with `load()`

**What:** Create a single wavesurfer.js instance in the PersistentPlayer's `onMount`, use `load()` to switch tracks
**When to use:** When the current track changes in the global state

```svelte
<!-- Inside PersistentPlayer.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { playerState } from '$lib/stores/playerState.svelte';
  import type WaveSurfer from 'wavesurfer.js';

  let container: HTMLDivElement = $state(null!);
  let wavesurfer: WaveSurfer | null = $state(null);
  let loadedTrackId: string = $state('');

  onMount(() => {
    let ws: WaveSurfer;

    const init = async () => {
      const { default: WaveSurfer } = await import('wavesurfer.js');

      ws = WaveSurfer.create({
        container,
        height: 40,
        waveColor: '#4a4a5a',
        progressColor: '#8b5cf6',
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        normalize: false,
        interact: true,
        dragToSeek: true,
      });

      ws.on('finish', () => {
        playerState.next();  // Auto-advance queue
      });
      ws.on('timeupdate', (time) => {
        playerState.currentTime = time;
      });
      ws.on('play', () => { playerState.isPlaying = true; });
      ws.on('pause', () => { playerState.isPlaying = false; });

      wavesurfer = ws;
    };

    init();

    return () => {
      ws?.destroy();
    };
  });

  // React to track changes
  $effect(() => {
    const track = playerState.currentTrack;
    if (!track || !wavesurfer || track.id === loadedTrackId) return;

    loadedTrackId = track.id;

    // Fetch peaks then load new track
    fetch(`/music/api/tracks/${track.id}/peaks`)
      .then(r => r.json())
      .then(peaks => {
        wavesurfer!.load(
          `/music/api/tracks/${track.id}/audio`,
          [peaks],
          track.duration
        );
      });
  });

  // React to play/pause state changes from external controls
  $effect(() => {
    if (!wavesurfer) return;
    if (playerState.isPlaying && wavesurfer.getCurrentTime() > 0) {
      wavesurfer.play();
    }
  });
</script>
```

**Key details:**
- `onMount` creates the wavesurfer instance ONCE; it is never destroyed during navigation
- `$effect` watches `playerState.currentTrack` and calls `load()` when it changes
- `wavesurfer.load(url, peaks, duration)` replaces the current audio without destroying the instance
- The `finish` event triggers `playerState.next()` for automatic queue progression
- `loadedTrackId` prevents re-loading the same track unnecessarily

### Pattern 4: Dispatching Play from Track Pages

**What:** Track detail pages and track cards call `playerState.play()` instead of managing their own wavesurfer instances
**When to use:** When the visitor clicks play on a track

```svelte
<!-- In track/[slug]/+page.svelte or TrackCard.svelte -->
<script>
  import { playerState } from '$lib/stores/playerState.svelte';

  function playTrack() {
    playerState.play(
      { id: track.id, slug: track.slug, title: track.title, duration: track.duration ?? 0, artPath: track.artPath },
      allTracks.map(t => ({ id: t.id, slug: t.slug, title: t.title, duration: t.duration ?? 0, artPath: t.artPath })),
      currentIndex
    );
  }
</script>
```

### Anti-Patterns to Avoid

- **Creating wavesurfer instances in page components for the persistent player:** The persistent player must live in the layout. Page-level wavesurfer instances get destroyed on navigation.
- **Using Svelte stores (`writable()`) when `$state` runes work:** While stores still work in Svelte 5, the `.svelte.ts` + `$state` pattern is more idiomatic and provides deep reactivity without `$` prefixing in templates.
- **Destroying and recreating wavesurfer on each track change:** Use `load()` to switch tracks on an existing instance. Destroy/recreate causes audio gaps, waveform flicker, and potential memory leaks.
- **Placing the audio element inside `<main>`:** Anything inside `{@render children()}` is re-rendered on navigation. The persistent player MUST be a sibling of the children slot in the layout.
- **Using module-level `$state` with primitive exports:** You cannot export a `$state` primitive directly and have it be reactive in importers. Use a class or object wrapper.
- **Forgetting bottom padding on main content:** Without padding, the fixed/sticky bottom player bar covers the last items on the page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waveform progress in bottom bar | Custom CSS progress bar | wavesurfer.js with `height: 40` | Consistent with track detail page waveform; drag-to-seek works automatically |
| Audio element management | Manual `new Audio()` with event wiring | wavesurfer.js (manages its internal audio element) | wavesurfer handles buffering, seeking, error recovery, Safari quirks |
| Reactive cross-component state | Custom event bus / pub-sub | Svelte 5 `$state` in `.svelte.ts` module | Built into the framework; deep reactivity, automatic dependency tracking |
| Queue data structure | Custom linked list | Simple array + index in state class | Queue is small (< 100 tracks); array operations are fine |
| Play count tracking | New mechanism | Existing `/api/tracks/[id]/play` POST endpoint | Already built in Phase 3/6; fire-and-forget fetch pattern established |

**Key insight:** The persistent player is primarily an architecture problem (where things live in the component tree), not a library problem. wavesurfer.js and Svelte 5 runes provide all the building blocks; the challenge is wiring them correctly across the layout boundary.

## Common Pitfalls

### Pitfall 1: Audio Stops on Navigation

**What goes wrong:** Audio stops playing when the visitor navigates to a different page.
**Why it happens:** The wavesurfer instance and audio element are inside a page component (e.g., `track/[slug]/+page.svelte`), which gets destroyed and recreated on navigation.
**How to avoid:** Place the persistent player component in `+layout.svelte`, outside the `{@render children()}` slot. Layout components are preserved during SvelteKit client-side navigation.
**Warning signs:** Audio restarts or stops when clicking any link.

### Pitfall 2: Double Audio Playback

**What goes wrong:** Two audio streams play simultaneously -- one from the track detail page's WaveformPlayer and one from the persistent bottom bar.
**Why it happens:** The track detail page still has its own WaveformPlayer component that creates its own wavesurfer instance and plays audio independently.
**How to avoid:** When the persistent player is active, the track detail page's WaveformPlayer should be either: (a) removed/hidden and replaced with a "Now Playing" indicator, or (b) kept as a visual-only waveform that delegates play/pause to the global state. The simplest approach: if `playerState.currentTrack?.id === track.id`, show a synced display; otherwise show the standalone WaveformPlayer.
**Warning signs:** Two play buttons visible, audio echo/doubling, volume appears louder than expected.

### Pitfall 3: $state Module Not Reactive

**What goes wrong:** Updating `playerState.currentTrack` in one component doesn't trigger re-renders in other components.
**Why it happens:** The file is named `.ts` instead of `.svelte.ts`, so the Svelte compiler doesn't process runes. Or the state is exported as a primitive instead of object/class.
**How to avoid:** (1) Name the file `playerState.svelte.ts` (the `.svelte.ts` extension is mandatory for runes outside components). (2) Export a class instance or object, not primitive values.
**Warning signs:** State updates work within the same component but not across components; no TypeScript errors but reactivity is silently broken.

### Pitfall 4: SSR Errors from Global State

**What goes wrong:** Server-side rendering fails with errors about audio APIs, or global state bleeds between requests.
**Why it happens:** The player state module is imported and initialized on the server, where `Audio` and DOM APIs don't exist. If the state holds mutable values, they could leak between SSR requests.
**How to avoid:** The player state module only stores data (track metadata, booleans, numbers) -- no DOM or audio APIs. wavesurfer.js is only initialized inside `onMount()` (client-only). The state values (`null`, `[]`, `false`) are safe defaults that don't cause SSR issues. Audio state is inherently client-only, so SSR "contamination" is not a real concern here (there's no server-side audio).
**Warning signs:** Build errors referencing `Audio`, `HTMLMediaElement`, or `document` during SSR.

### Pitfall 5: Queue Gets Stale After Filtering

**What goes wrong:** Visitor is playing through a queue, applies a filter on the track listing page, and the queue still contains the old unfiltered list.
**Why it happens:** The queue was populated when the visitor first clicked play; subsequent filter changes don't update it.
**How to avoid:** This is acceptable behavior for v1 -- the queue represents "what was showing when you hit play." Document this as a known limitation. A future enhancement could make the queue reactive to filter changes, but that adds significant complexity.
**Warning signs:** Tracks play that are not visible in the current filtered view.

### Pitfall 6: wavesurfer.load() Race Condition

**What goes wrong:** Visitor rapidly clicks play on different tracks. Multiple `load()` calls overlap, and the wrong track ends up playing.
**Why it happens:** `fetch` for peaks and `wavesurfer.load()` are async. If a second call starts before the first finishes, results interleave.
**How to avoid:** Track the `loadedTrackId` in state. Before applying `load()`, verify the track ID still matches what the user most recently requested. Discard stale results.
**Warning signs:** Waveform shows one track's shape but audio plays a different track; or audio stutters when rapidly switching.

## Code Examples

### Complete Player State Module

```typescript
// src/lib/stores/playerState.svelte.ts

export type QueueTrack = {
  id: string;
  slug: string;
  title: string;
  duration: number;
  artPath: string | null;
};

class PlayerState {
  currentTrack: QueueTrack | null = $state(null);
  queue: QueueTrack[] = $state([]);
  queueIndex: number = $state(-1);
  isPlaying: boolean = $state(false);
  currentTime: number = $state(0);
  volume: number = $state(1);

  get hasNext(): boolean {
    return this.queueIndex < this.queue.length - 1;
  }

  get hasPrev(): boolean {
    return this.queueIndex > 0;
  }

  play(track: QueueTrack, queue: QueueTrack[] = [], index: number = 0) {
    this.currentTrack = track;
    this.queue = queue;
    this.queueIndex = index;
    this.isPlaying = true;
    this.currentTime = 0;
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
  }

  next(): boolean {
    if (this.hasNext) {
      this.queueIndex++;
      this.currentTrack = this.queue[this.queueIndex];
      this.currentTime = 0;
      this.isPlaying = true;
      return true;
    }
    this.isPlaying = false;
    return false;
  }

  prev() {
    if (this.hasPrev) {
      this.queueIndex--;
      this.currentTrack = this.queue[this.queueIndex];
      this.currentTime = 0;
      this.isPlaying = true;
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  stop() {
    this.currentTrack = null;
    this.queue = [];
    this.queueIndex = -1;
    this.isPlaying = false;
    this.currentTime = 0;
  }
}

export const playerState = new PlayerState();
```

### Persistent Player Component Structure

```svelte
<!-- src/lib/components/PersistentPlayer.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { playerState } from '$lib/stores/playerState.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import CoverArt from './CoverArt.svelte';
  import { base } from '$app/paths';
  import type WaveSurfer from 'wavesurfer.js';

  let container: HTMLDivElement = $state(null!);
  let wavesurfer: WaveSurfer | null = $state(null);
  let loadedTrackId: string = $state('');

  onMount(() => {
    let ws: WaveSurfer;

    const init = async () => {
      const { default: WaveSurfer } = await import('wavesurfer.js');

      ws = WaveSurfer.create({
        container,
        height: 40,
        waveColor: '#4a4a5a',
        progressColor: '#8b5cf6',
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        normalize: false,
        interact: true,
        dragToSeek: true,
      });

      ws.on('finish', () => { playerState.next(); });
      ws.on('timeupdate', (time: number) => { playerState.currentTime = time; });
      ws.on('play', () => { playerState.isPlaying = true; });
      ws.on('pause', () => { playerState.isPlaying = false; });

      wavesurfer = ws;
    };

    init();
    return () => { ws?.destroy(); };
  });

  // Load new track when currentTrack changes
  $effect(() => {
    const track = playerState.currentTrack;
    if (!track || !wavesurfer) return;
    if (track.id === loadedTrackId) return;

    const trackId = track.id;
    loadedTrackId = trackId;

    fetch(`${base}/api/tracks/${trackId}/peaks`)
      .then(r => r.json())
      .then(peaks => {
        if (playerState.currentTrack?.id !== trackId) return; // Stale guard
        wavesurfer!.load(`${base}/api/tracks/${trackId}/audio`, [peaks], track.duration);
      });

    // Fire play count
    fetch(`${base}/api/tracks/${trackId}/play`, { method: 'POST' });
  });

  // Sync play/pause from external toggles
  $effect(() => {
    if (!wavesurfer) return;
    const shouldPlay = playerState.isPlaying;
    if (shouldPlay && !wavesurfer.isPlaying()) {
      wavesurfer.play();
    } else if (!shouldPlay && wavesurfer.isPlaying()) {
      wavesurfer.pause();
    }
  });

  // Sync volume
  $effect(() => {
    wavesurfer?.setVolume(playerState.volume);
  });
</script>

<div class="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 z-50">
  <div class="max-w-3xl mx-auto px-4 py-2 flex items-center gap-3">
    <!-- Cover art (small) -->
    {#if playerState.currentTrack}
      <a href="{base}/track/{playerState.currentTrack.slug}" class="shrink-0">
        <CoverArt
          trackId={playerState.currentTrack.id}
          artPath={playerState.currentTrack.artPath}
          title={playerState.currentTrack.title}
          size="sm"
        />
      </a>
    {/if}

    <!-- Track info -->
    <div class="min-w-0 shrink-0 w-28">
      <p class="text-sm text-zinc-200 truncate">{playerState.currentTrack?.title}</p>
      <p class="text-xs text-zinc-500 font-mono tabular-nums">
        {formatTime(playerState.currentTime)} / {formatTime(playerState.currentTrack?.duration ?? 0)}
      </p>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-2 shrink-0">
      <button onclick={() => playerState.prev()} disabled={!playerState.hasPrev} class="...">Prev</button>
      <button onclick={() => playerState.togglePlayPause()} class="...">
        {playerState.isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onclick={() => playerState.next()} disabled={!playerState.hasNext} class="...">Next</button>
    </div>

    <!-- Waveform (mini) -->
    <div bind:this={container} class="flex-1 min-w-0"></div>

    <!-- Volume -->
    <input type="range" min="0" max="1" step="0.01"
      value={playerState.volume}
      oninput={(e) => playerState.setVolume(parseFloat((e.currentTarget as HTMLInputElement).value))}
      class="w-16 accent-violet-500 shrink-0"
    />
  </div>
</div>
```

### Triggering Play from Track Listing

```svelte
<!-- Modified TrackCard.svelte - add play button -->
<script lang="ts">
  import { playerState } from '$lib/stores/playerState.svelte';
  import type { QueueTrack } from '$lib/stores/playerState.svelte';

  let { track, allTracks, index }: {
    track: { id: string; slug: string; title: string; duration: number | null; artPath: string | null; /* ... */ };
    allTracks?: QueueTrack[];
    index?: number;
  } = $props();

  function handlePlay(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    const queueTrack: QueueTrack = {
      id: track.id,
      slug: track.slug,
      title: track.title,
      duration: track.duration ?? 0,
      artPath: track.artPath,
    };
    playerState.play(queueTrack, allTracks ?? [queueTrack], index ?? 0);
  }
</script>
```

### Modified Layout with Bottom Padding

```svelte
<!-- Key change in +layout.svelte -->
<main class="flex-1" class:pb-24={playerState.currentTrack}>
  {@render children()}
</main>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte stores (`writable()`) | `$state` runes in `.svelte.ts` modules | Svelte 5 (2024) | Deep reactivity, no `$` prefix in templates, class-based stores |
| `<slot />` in layouts | `{@render children()}` in layouts | Svelte 5 (2024) | New snippet-based API; functionally identical for layout persistence |
| wavesurfer `destroy()` + recreate | wavesurfer `load()` on existing instance | wavesurfer.js v7 | Smoother track transitions, no audio gaps, no waveform flash |
| React Context for global player | Svelte module-level reactive state | N/A (framework difference) | Svelte's module state is simpler than Context; no provider tree needed |

**Deprecated/outdated:**
- `Svelte stores` (`writable`, `readable`): Not deprecated in Svelte 5, but `.svelte.ts` + `$state` is the recommended path forward for new code
- `on:click` event syntax: Svelte 5 uses `onclick` (lowercase, no colon)
- `<slot />`: Svelte 5 uses `{@render children()}` for content projection

## Open Questions

1. **Track detail page WaveformPlayer coexistence**
   - What we know: The track detail page currently has its own WaveformPlayer with a full-height waveform. When the persistent player is active for the same track, there would be two wavesurfer instances for the same audio.
   - What's unclear: Should the page-level WaveformPlayer be disabled/hidden when the persistent player is playing that track, or should it sync with the persistent player's state?
   - Recommendation: When the persistent player is playing the same track shown on the detail page, hide the page-level WaveformPlayer and show a "Now Playing" indicator instead. This avoids double audio and reduces resource usage. When the persistent player is playing a DIFFERENT track, keep the page-level WaveformPlayer functional as a standalone preview.

2. **Queue population strategy**
   - What we know: The queue needs to be populated when the visitor clicks play. On the track listing page, the queue is the visible list. On the track detail page, the queue could be just the single track or could include "related" tracks.
   - What's unclear: What tracks should be in the queue when playing from the detail page.
   - Recommendation: When playing from the listing page, queue = all currently visible tracks. When playing from the detail page, queue = just that single track (no auto-advance). This is the simplest correct behavior for v1.

3. **Mobile responsiveness of bottom bar**
   - What we know: The bottom bar needs to fit controls, waveform, track info, and cover art.
   - What's unclear: Whether all elements fit on small screens.
   - Recommendation: On mobile, hide the mini waveform and volume slider; show only cover art (tiny), title (truncated), and play/pause + skip buttons. Use Tailwind responsive classes (`hidden md:block`).

## Sources

### Primary (HIGH confidence)
- [wavesurfer.js v7 TypeScript source - WaveSurferOptions, including `media` option](https://raw.githubusercontent.com/katspaugh/wavesurfer.js/main/src/wavesurfer.ts) - `media?: HTMLMediaElement` constructor option confirmed; `load()` method signature verified
- [Svelte 5 official docs - $state](https://svelte.dev/docs/svelte/$state) - `.svelte.ts` file extension requirement confirmed; deep reactivity on objects confirmed
- [Svelte 5 official docs - $effect](https://svelte.dev/docs/svelte/$effect) - Effect cleanup patterns and dependency tracking confirmed
- [SvelteKit docs - State Management](https://svelte.dev/docs/kit/state-management) - Server-side state isolation guidance; context vs module state tradeoffs
- [SvelteKit docs - Layouts](https://svelte.dev/tutorial/kit/layouts) - Layout components persist across navigations confirmed
- Existing codebase: `+layout.svelte`, `WaveformPlayer.svelte`, `TrackCard.svelte`, `schema.ts`, `package.json` -- all read and analyzed

### Secondary (MEDIUM confidence)
- [Mainmatter - Runes and Global state: do's and don'ts](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/) - Class-based `$state` pattern, SSR safety guidance
- [Joy of Code - Different Ways To Share State In Svelte 5](https://joyofcode.xyz/how-to-share-state-in-svelte-5) - Object wrapper pattern, getter/setter pattern for module-level state
- [wavesurfer.js Discussion #3190 - Global player implementation](https://github.com/katspaugh/wavesurfer.js/discussions/3190) - Shared `HTMLMediaElement` pattern; persistent player architecture guidance
- [wavesurfer.js Discussion #3523 - Global player bug](https://github.com/katspaugh/wavesurfer.js/discussions/3523) - `destroy()` interaction with shared media; maintainer-recommended example
- [wavesurfer.js official React global player example](https://wavesurfer.xyz/examples/?react-global-player.js) - Instance reuse via `load()` pattern confirmed; `media` sharing approach

### Tertiary (LOW confidence)
- [GitHub - austincrim/react-podcast-sveltekit](https://github.com/austincrim/react-podcast-sveltekit) - SvelteKit persistent audio player concept (not examined in detail)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and proven in earlier phases; no new dependencies
- Architecture (layout persistence): HIGH - SvelteKit layout preservation is fundamental framework behavior, confirmed by official docs and tutorials
- Architecture (state management): HIGH - Svelte 5 `$state` in `.svelte.ts` is well-documented by official docs and multiple high-quality community sources
- wavesurfer.js `load()` for track switching: HIGH - Confirmed from source code TypeScript types and official examples
- Queue advancement: HIGH - Simple state machine; `finish` event on wavesurfer.js is well-documented
- Pitfalls: HIGH - All sourced from real issues and official documentation

**Research date:** 2026-02-09
**Valid until:** 2026-04-09 (stable -- Svelte 5 API is settled; wavesurfer.js v7 is mature)
