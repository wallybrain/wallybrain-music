# Phase 10: Signature Identity - Research

**Researched:** 2026-02-10
**Domain:** Color extraction (sharp), CSS ambient effects (OKLCH glow/tint), CSS keyframe equalizer animation, Svelte 5 staggered entrance transitions
**Confidence:** HIGH

## Summary

Phase 10 gives each track a unique visual identity by extracting dominant colors from cover art and using them to tint the track detail page, create ambient glow effects around cover art, show an animated equalizer indicator on the currently-playing track, and stagger the entrance of track cards on the listing page.

The project already has sharp v0.34.5 installed (used in the artwork processing pipeline at `src/lib/server/processors/artwork.ts`). Sharp's `stats()` method returns the dominant sRGB color as `{ r, g, b }` values via a 4096-bin 3D histogram -- this is the correct tool for server-side color extraction. The dominant color should be extracted during track processing (alongside the existing art resize step) and stored in the database. This avoids any client-side CORS issues with canvas-based extraction and ensures the color is available instantly on page load via SSR.

For the CSS effects, the extracted RGB color can be set as a CSS custom property using `oklch()` notation (after server-side conversion) or simply as `rgb()` notation -- browsers handle both natively in `box-shadow`, `background`, and `color` properties. Since the existing design tokens use OKLCH, converting the dominant color to OKLCH on the server side keeps the system consistent. The ambient tint uses a low-opacity background gradient; the ambient glow uses a multi-layer `box-shadow` with the dominant color. The equalizer animation is pure CSS keyframes on 3-4 `<span>` elements using `scaleY()` transforms. Staggered entrance uses Svelte's built-in `fly` or `fade` transition with `delay: index * N` milliseconds.

**Primary recommendation:** Extract dominant color server-side with `sharp(buffer).stats()` during track processing, store as `dominantColor` (hex string) in the tracks table, convert to OKLCH at render time, and apply via CSS custom properties scoped to each track page. All visual effects are CSS-only (no JS animation libraries needed).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | ^0.34.5 | Dominant color extraction via `stats()` | Already installed; provides `dominant.r/g/b` from 4096-bin histogram |
| svelte/transition | (bundled with svelte ^5.50.0) | Staggered entrance animations | Built-in, no extra dependency; `fly`/`fade` accept `delay` parameter |
| CSS @keyframes | (native) | Equalizer bar animation | Pure CSS, zero runtime cost, works everywhere |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | ^0.45.1 | Schema migration to add `dominantColor` column | Already installed; need one ALTER TABLE |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp `stats()` server-side | Canvas `getImageData()` client-side | CORS issues with same-origin images served via API route; requires image to load first (FOUC); canvas approach slower |
| sharp `stats()` server-side | color-thief / node-vibrant | Extra dependency; sharp is already installed and `stats()` is sufficient for single dominant color |
| CSS @keyframes equalizer | JS animation (GSAP, anime.js) | Overkill for 3-4 bars bouncing; CSS is simpler, cheaper, no bundle size |
| svelte/transition stagger | svelte-motion / motion library | Extra dependency; built-in `fly` with `delay` achieves the same result |
| RGB hex stored in DB | OKLCH stored in DB | OKLCH is harder to generate server-side; RGB hex is universal and trivially converts to any CSS format at render time |

**Installation:**
```bash
# No new dependencies needed -- everything uses existing stack
```

## Architecture Patterns

### Recommended Changes
```
src/
├── lib/
│   ├── server/
│   │   └── processors/
│   │       └── artwork.ts          # ADD: extractDominantColor() using sharp stats()
│   │       └── processTrack.ts     # MODIFY: call extractDominantColor, store result
│   ├── utils/
│   │   └── colorUtils.ts           # NEW: rgbToOklch(), formatOklchCss(), color math
│   ├── components/
│   │   ├── TrackCard.svelte        # MODIFY: add staggered entrance transition, equalizer indicator
│   │   ├── CoverArt.svelte         # MODIFY: accept dominantColor prop, apply ambient glow on lg size
│   │   └── EqIndicator.svelte      # NEW: pure CSS equalizer bar animation component
│   └── server/
│       └── db/
│           └── schema.ts           # MODIFY: add dominantColor column to tracks table
├── routes/
│   ├── +page.svelte                # MODIFY: add staggered entrance to track list
│   ├── +page.server.ts             # MODIFY: include dominantColor in track query
│   └── track/[slug]/
│       ├── +page.svelte            # MODIFY: apply ambient background tint, ambient glow on cover art
│       └── +page.server.ts         # MODIFY: include dominantColor in track query
└── app.css                         # MODIFY: add @keyframes for equalizer, track-color CSS variables
```

### Pattern 1: Server-Side Dominant Color Extraction

**What:** Extract dominant color from cover art during track processing using sharp's `stats()` method, store as hex string in the database.
**When to use:** During the track processing pipeline, immediately after cover art is resized.

```typescript
// Source: https://sharp.pixelplumbing.com/api-input/ (stats method documentation)
import sharp from 'sharp';

export async function extractDominantColor(imagePath: string): Promise<string> {
  const { dominant } = await sharp(imagePath).stats();
  const { r, g, b } = dominant;
  // Convert to hex string for storage
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
```

**Integration in processTrack.ts:**
```typescript
let artSucceeded = false;
let dominantColor: string | null = null;

if (metadata.coverArt) {
  try {
    await extractAndResizeArt(metadata.coverArt, artPath);
    artSucceeded = true;
    dominantColor = await extractDominantColor(artPath);
  } catch (err) {
    console.error(`Cover art extraction failed for track ${trackId}:`, err);
  }
}

db.update(tracks)
  .set({
    status: 'ready',
    ...(artSucceeded ? { artPath } : {}),
    ...(dominantColor ? { dominantColor } : {}),
    // ... other fields
  })
  .where(eq(tracks.id, trackId))
  .run();
```

### Pattern 2: RGB to OKLCH Conversion Utility

**What:** Convert hex RGB color to OKLCH components for use with the existing OKLCH token system.
**When to use:** In the Svelte component (client-side or SSR) when applying the color as CSS custom properties.

```typescript
// Source: https://gist.github.com/dkaraush/65d19d61396f5f3cd8ba7d1b4b3c9432
// Simplified RGB -> OKLCH conversion (no external dependency)

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbHexToOklch(hex: string): { l: number; c: number; h: number } {
  const [r, g, b] = hexToRgb(hex).map(linearize);

  // Linear RGB to LMS (via XYZ-like intermediate)
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l1 = Math.cbrt(l_);
  const m1 = Math.cbrt(m_);
  const s1 = Math.cbrt(s_);

  const L = 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1;
  const bVal = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = Math.atan2(bVal, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return { l: L, c: C, h: isNaN(H) ? 0 : H };
}

export function formatOklch(oklch: { l: number; c: number; h: number }, alpha?: number): string {
  const { l, c, h } = oklch;
  if (alpha !== undefined && alpha < 1) {
    return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)} / ${alpha})`;
  }
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}
```

**Note:** An alternative approach that avoids the OKLCH conversion entirely is to use CSS `color-mix()` or simply set the dominant color as `rgb()` directly in CSS custom properties. Modern browsers handle `rgb()` in `box-shadow` and `background` without issues. The OKLCH conversion is recommended for consistency with the design token system but is not strictly required for visual correctness.

### Pattern 3: Ambient Background Tint on Track Detail

**What:** Apply a low-opacity tint of the dominant color to the track detail page background.
**When to use:** Track detail page (`track/[slug]/+page.svelte`) when a dominant color is available.

```svelte
<script lang="ts">
  import { rgbHexToOklch, formatOklch } from '$lib/utils/colorUtils';

  let { data } = $props();
  let track = $derived(data.track);

  let trackColorStyle = $derived.by(() => {
    if (!track.dominantColor) return '';
    const oklch = rgbHexToOklch(track.dominantColor);
    // Low-chroma, low-opacity version for background tint
    const tint = formatOklch({ l: oklch.l * 0.3, c: oklch.c * 0.4, h: oklch.h }, 0.15);
    // Full color for glow
    const glow = formatOklch({ l: oklch.l * 0.6, c: oklch.c * 0.7, h: oklch.h }, 0.3);
    return `--track-tint: ${tint}; --track-glow: ${glow}; --track-color: ${formatOklch(oklch)};`;
  });
</script>

<div class="max-w-3xl mx-auto px-4 py-8" style={trackColorStyle}>
  <!-- Ambient tint overlay -->
  <div class="absolute inset-0 -z-10 bg-[var(--track-tint)]
    [mask-image:radial-gradient(ellipse_at_top,black_0%,transparent_70%)]">
  </div>
  <!-- rest of content -->
</div>
```

### Pattern 4: Ambient Glow on Cover Art

**What:** Multi-layer box-shadow using the dominant color creates a soft glow behind the cover art.
**When to use:** Track detail page cover art (`CoverArt.svelte` at size "lg").

```svelte
<!-- In CoverArt.svelte, when size === 'lg' and dominantColor is provided -->
<img
  src="{base}/api/tracks/{trackId}/art"
  alt="Cover art for {title}"
  class="{sizeClasses[size]} rounded-lg object-cover"
  style={dominantColor && size === 'lg'
    ? `box-shadow: 0 0 40px ${dominantColor}66, 0 0 80px ${dominantColor}33, 0 4px 16px rgba(0,0,0,0.4);`
    : 'box-shadow: 0 4px 16px rgba(0,0,0,0.4);'}
/>
```

**Approach:** Use the hex color directly with alpha suffixes (`66` = 40% opacity, `33` = 20% opacity) in box-shadow. This is simpler than OKLCH conversion and produces the same visual result. The glow uses multiple shadow layers at increasing blur radii for a natural falloff.

### Pattern 5: CSS Equalizer Bar Animation

**What:** Pure CSS animated equalizer indicator using `scaleY()` transforms with staggered keyframes.
**When to use:** Inside TrackCard.svelte when `isPlaying` is true for the current track.

```svelte
<!-- EqIndicator.svelte -->
<div class="flex items-end gap-[2px] h-4 w-4">
  <span class="eq-bar w-[3px] bg-accent origin-bottom animate-eq1"></span>
  <span class="eq-bar w-[3px] bg-accent origin-bottom animate-eq2"></span>
  <span class="eq-bar w-[3px] bg-accent origin-bottom animate-eq3"></span>
</div>
```

```css
/* In app.css */
@keyframes eq1 {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}
@keyframes eq2 {
  0%, 100% { transform: scaleY(0.5); }
  30% { transform: scaleY(0.2); }
  70% { transform: scaleY(1); }
}
@keyframes eq3 {
  0%, 100% { transform: scaleY(0.6); }
  40% { transform: scaleY(0.3); }
  80% { transform: scaleY(0.8); }
}

/* Tailwind v4 custom animation utilities via @theme */
@theme {
  --animate-eq1: eq1 1.2s ease-in-out infinite;
  --animate-eq2: eq2 1.4s ease-in-out infinite;
  --animate-eq3: eq3 1.0s ease-in-out infinite;
}
```

**Key:** Each bar has a different keyframe timing and duration to create organic-looking movement. The `origin-bottom` (transform-origin: bottom) makes bars scale upward from their base. Using `scaleY` instead of `height` enables GPU-accelerated animation.

### Pattern 6: Staggered Entrance Animation

**What:** Svelte `fly` or `fade` transition with index-based delay on each track card.
**When to use:** Track listing page (`+page.svelte`) in the `{#each}` block.

```svelte
<!-- Source: https://svelte.dev/docs/svelte/svelte-transition -->
<script>
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
</script>

{#each data.tracks as track, i (track.id)}
  <div in:fly={{ y: 20, duration: 300, delay: i * 50, easing: cubicOut }}>
    <TrackCard {track} allTracks={queueTracks} index={i} />
  </div>
{/each}
```

**Tuning notes:**
- `delay: i * 50` means 50ms between each card; 10 tracks = 500ms total stagger. Increase for more dramatic effect, decrease for subtlety.
- `y: 20` means each card slides up 20px while fading in. Small values feel polished; large values feel bouncy.
- Use `in:` (not `transition:`) to only animate entrance, not exit (page navigation should be instant).
- Consider capping the delay for large lists: `delay: Math.min(i * 50, 500)` prevents excessive total animation time.

### Anti-Patterns to Avoid

- **CSS transforms on waveform ancestors:** NEVER apply `transform` to elements containing wavesurfer containers. The equalizer indicator goes on the TrackCard (which does NOT contain wavesurfer), so this is safe. The ambient tint on the track detail page must NOT wrap the WaveformPlayer in a transformed element.
- **Client-side color extraction:** Avoid using canvas `getImageData()` on images served from API routes -- same-origin policy complications with the `/api/tracks/[id]/art` endpoint, and it causes a flash of unstyled content before the color loads.
- **Animating with transform on cover art in track detail:** The cover art on the track detail page is above the WaveformPlayer. If the waveform is a sibling (not child) of the glow element, transforms are safe. But ensure the glow element is NOT an ancestor of the waveform.
- **Backdrop-blur for glow effect:** Do NOT use backdrop-blur for the ambient glow. The player bar is already the single permitted backdrop-blur element (mobile audio stutter constraint).
- **Over-saturated dominant colors:** Raw dominant colors from album art can be very saturated. Reduce chroma for background tints (use `c * 0.3-0.4`) and reduce lightness to avoid washing out the page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dominant color from image | Canvas pixel sampling, k-means clustering | `sharp(buffer).stats().dominant` | Already installed; fast C++ implementation; no CORS issues |
| RGB to OKLCH conversion | Full color science library (chroma.js, culori, color.js) | ~30 lines of inline math (see Pattern 2) | Avoid adding a dependency for one conversion function |
| Equalizer animation | JS animation loop, requestAnimationFrame | CSS @keyframes with scaleY | GPU-accelerated, zero JS runtime, simpler code |
| Staggered entrance | Animation library (GSAP, anime.js, svelte-motion) | Svelte built-in `fly`/`fade` with `delay: i * N` | Built-in, zero extra dependencies, SSR-compatible |
| Color palette extraction | node-vibrant, color-thief-node | `sharp.stats().dominant` (single color) | We only need ONE dominant color, not a full palette |

**Key insight:** Every visual effect in this phase can be achieved with CSS-only techniques (keyframes, box-shadow, gradients) plus Svelte's built-in transition system. No animation or color libraries are needed. The only server-side addition is one call to `sharp.stats()` and storing a hex string.

## Common Pitfalls

### Pitfall 1: Dominant Color Too Dark or Too Saturated for Ambient Effects
**What goes wrong:** The dominant color from dark album art (common in electronic music) produces an invisible tint, or a highly saturated color overwhelms the page.
**Why it happens:** Electronic music cover art often uses deep blues, purples, and blacks. The raw dominant color from `sharp.stats()` reflects this.
**How to avoid:** Always adjust the dominant color before using it: (1) increase lightness for background tints, (2) reduce chroma/opacity to prevent overwhelming the page, (3) test with actual cover art from the existing tracks. A good starting formula: tint uses `L * 0.3, C * 0.4, alpha 0.15`; glow uses `L * 0.6, C * 0.7, alpha 0.3`.
**Warning signs:** Track detail pages that all look the same (tint invisible) or that look garish (tint too strong).

### Pitfall 2: Existing Tracks Missing dominantColor After Schema Migration
**What goes wrong:** Adding a `dominantColor` column to the tracks table leaves all existing tracks with `null` values, so no ambient effects appear until tracks are re-processed.
**Why it happens:** The color extraction only runs during `processTrack()`, which only fires on upload.
**How to avoid:** Write a one-time migration script that iterates over all tracks with `artPath`, runs `sharp(artPath).stats()`, and populates `dominantColor`. Run this as part of the plan execution.
**Warning signs:** Ambient effects only work on newly uploaded tracks.

### Pitfall 3: Staggered Animation Replays on Every Navigation
**What goes wrong:** The stagger animation fires every time the user navigates back to the track listing, making the page feel slow/annoying on repeat visits.
**Why it happens:** SvelteKit re-renders the page component on navigation, triggering `in:` transitions.
**How to avoid:** Use Svelte's `in:` directive (entrance only, not bidirectional `transition:`). Consider wrapping the transition in a flag: only animate on initial mount, not on back-navigation. Alternatively, keep animation subtle enough (short duration, small offset) that replaying feels polished rather than annoying.
**Warning signs:** Users clicking "Back to tracks" and waiting for animations to replay.

### Pitfall 4: Equalizer Bars Inside a Transform-Ancestored Element
**What goes wrong:** If the equalizer indicator is placed inside an element with `transform` and the TrackCard also somehow contains a waveform, it could break drag-to-seek.
**Why it happens:** CSS `transform` creates a new stacking context and containing block that breaks `position: fixed` calculations.
**How to avoid:** The equalizer goes in TrackCard, which does NOT contain any WaveformPlayer instance. The WaveformPlayer only exists on the track detail page and in the PersistentPlayer. The TrackCard's `hover:scale-[1.01]` from Phase 9 is safe because TrackCard has no waveform child. Verify this remains true.
**Warning signs:** Drag-to-seek stops working on the persistent player (would indicate a transform ancestor was added).

### Pitfall 5: Flash of Unstyled Content Before Color Loads
**What goes wrong:** The track detail page initially renders without the ambient color, then "pops in" the tint after JavaScript hydrates.
**Why it happens:** If the dominant color is fetched client-side or set via `$effect`, the SSR HTML won't include the color styles.
**How to avoid:** Store `dominantColor` in the database and load it via the `+page.server.ts` load function. This way the color is available during SSR, and the ambient tint renders in the initial HTML. No flash.
**Warning signs:** Brief flash of uncolored page on track detail load.

### Pitfall 6: Box-Shadow Glow Renders Incorrectly with OKLCH
**What goes wrong:** Older browsers or certain rendering engines might not handle OKLCH in `box-shadow` properly.
**Why it happens:** While `oklch()` is widely supported in CSS properties, `box-shadow` color values go through a different rendering path in some browsers.
**How to avoid:** Use hex color with alpha suffix in `box-shadow` (e.g., `#7c3aed66`) as a safe fallback, or use `rgb()` with `/` alpha notation. OKLCH conversion is for consistency with design tokens in `background` and `color` properties, but `box-shadow` glow is simpler with hex+alpha.
**Warning signs:** Glow effect missing on certain browsers while background tint works fine.

## Code Examples

### Complete Color Extraction in Processing Pipeline

```typescript
// src/lib/server/processors/artwork.ts
import sharp from 'sharp';

export async function extractAndResizeArt(
  coverBuffer: Buffer,
  outputPath: string
): Promise<void> {
  await sharp(coverBuffer)
    .resize(500, 500, { fit: 'cover' })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

export async function extractDominantColor(imagePath: string): Promise<string> {
  const { dominant } = await sharp(imagePath).stats();
  const { r, g, b } = dominant;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
```

### Database Schema Change

```typescript
// In schema.ts -- add to tracks table
dominantColor: text('dominant_color'), // hex string like "#7c3aed"
```

### Migration Script for Existing Tracks

```typescript
// One-time script to backfill dominantColor for existing tracks
import sharp from 'sharp';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { isNotNull, isNull } from 'drizzle-orm';

const tracksWithArt = db.select({ id: tracks.id, artPath: tracks.artPath })
  .from(tracks)
  .where(isNotNull(tracks.artPath))
  .all();

for (const track of tracksWithArt) {
  if (!track.artPath) continue;
  try {
    const { dominant } = await sharp(track.artPath).stats();
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    const color = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
    db.update(tracks)
      .set({ dominantColor: color })
      .where(eq(tracks.id, track.id))
      .run();
    console.log(`Track ${track.id}: ${color}`);
  } catch (err) {
    console.error(`Failed for track ${track.id}:`, err);
  }
}
```

### Complete EqIndicator Component

```svelte
<!-- src/lib/components/EqIndicator.svelte -->
<div class="flex items-end gap-[2px] h-4 w-4" aria-label="Now playing">
  <span class="w-[3px] bg-accent rounded-full origin-bottom animate-eq1"></span>
  <span class="w-[3px] bg-accent rounded-full origin-bottom animate-eq2"></span>
  <span class="w-[3px] bg-accent rounded-full origin-bottom animate-eq3"></span>
</div>
```

### Staggered Entrance in Track Listing

```svelte
<!-- In +page.svelte -->
<script>
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
</script>

<div class="space-y-3">
  {#each data.tracks as track, i (track.id)}
    <div in:fly={{ y: 15, duration: 250, delay: Math.min(i * 60, 600), easing: cubicOut }}>
      <TrackCard {track} allTracks={queueTracks} index={i} />
    </div>
  {/each}
</div>
```

### Track Detail Page with Ambient Color

```svelte
<!-- In track/[slug]/+page.svelte -->
<script lang="ts">
  import { rgbHexToOklch, formatOklch } from '$lib/utils/colorUtils';

  let { data } = $props();
  let track = $derived(data.track);

  let ambientStyle = $derived.by(() => {
    if (!track.dominantColor) return '';
    const oklch = rgbHexToOklch(track.dominantColor);
    // Muted version for background tint
    const tintL = Math.max(0.15, oklch.l * 0.35);
    const tintC = oklch.c * 0.4;
    return `--track-tint: oklch(${tintL.toFixed(3)} ${tintC.toFixed(3)} ${oklch.h.toFixed(1)} / 0.15);`
      + ` --track-glow: ${track.dominantColor};`;
  });
</script>

<div class="relative max-w-3xl mx-auto px-4 py-8" style={ambientStyle}>
  {#if track.dominantColor}
    <div class="absolute inset-0 -z-10 rounded-xl bg-[var(--track-tint)]"
      style="mask-image: radial-gradient(ellipse at top, black 0%, transparent 70%);
             -webkit-mask-image: radial-gradient(ellipse at top, black 0%, transparent 70%);">
    </div>
  {/if}
  <!-- ... rest of page content ... -->
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side canvas color extraction | Server-side extraction during processing | Best practice by 2024+ | No CORS, no FOUC, works with SSR |
| JS animation for equalizer bars | CSS @keyframes with GPU-accelerated transforms | Always been better for simple loops | Zero JS overhead |
| Height-based bar animation | scaleY-based bar animation | CSS transforms for animation (years) | GPU-accelerated, no layout thrashing |
| External animation libraries for entrance | Svelte built-in transitions | Svelte 3+ (2019) | No dependency, SSR-aware |
| Hex/RGB color system | OKLCH with perceptual uniformity | CSS Color Level 4 (2023+) | Better color manipulation, wider gamut |

**Deprecated/outdated:**
- `colorthief` (client-side): Uses canvas which has CORS restrictions for cross-origin or API-served images
- `node-vibrant`: Works but adds a dependency when `sharp.stats()` already provides the needed data
- JavaScript `requestAnimationFrame` for simple looping animations: CSS @keyframes is more efficient

## Open Questions

1. **Exact Ambient Tint Opacity/Strength**
   - What we know: The dominant color needs to be significantly dimmed (low lightness, low chroma, low alpha) to work as a background tint on dark surfaces.
   - What's unclear: The exact L/C/alpha values that look good across diverse cover art (bright art, dark art, monochrome art, colorful art).
   - Recommendation: Start with `L * 0.35, C * 0.4, alpha 0.15` for tint and `opacity 0.3-0.4` for glow. Tune visually during implementation with actual track cover art.

2. **Stagger Animation on Return Navigation**
   - What we know: Svelte's `in:` transition fires on each component mount, which happens on every page navigation.
   - What's unclear: Whether re-playing the stagger on "Back to tracks" navigation feels good or annoying.
   - Recommendation: Implement with `in:` first. If it feels bad on back-navigation, add a boolean flag (`hasAnimated`) using a module-level `$state` that persists across navigations (since the `+page.svelte` module stays loaded in SvelteKit's client-side router).

3. **Tracks Without Cover Art**
   - What we know: Some tracks may not have cover art (`artPath: null`), so `dominantColor` will also be null.
   - What's unclear: How the track detail page should look without ambient effects.
   - Recommendation: Fall back to the default accent color (`--color-accent`) for any ambient effects when no dominant color exists. This maintains the page's visual richness even for art-less tracks.

## Sources

### Primary (HIGH confidence)
- [sharp API - stats() method](https://sharp.pixelplumbing.com/api-input/) - Dominant color via `stats().dominant` returning `{ r, g, b }`
- [Svelte transition directive docs](https://svelte.dev/docs/svelte/transition) - `in:`, `out:`, `transition:` directives with delay parameter
- [Svelte built-in transitions (svelte/transition)](https://svelte.dev/docs/svelte/svelte-transition) - `fly`, `fade`, `scale` with delay/duration/easing params
- [Svelte staggered animation playground](https://svelte.dev/playground/37aea47e1e874b659746fdaa80ad0dfc) - Index-based delay pattern
- [CSS oklch() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch) - Full browser support, syntax

### Secondary (MEDIUM confidence)
- [Animated music bars with CSS - Samuel Kraft](https://samuelkraft.com/blog/animated-music-bars) - scaleY keyframes, 3 bars, staggered timing
- [OKLCH conversion gist](https://gist.github.com/dkaraush/65d19d61396f5f3cd8ba7d1b4b3c9432) - RGB to OKLCH math, verified against multiple sources
- [CSS custom properties with oklch - Damian Walsh](https://damianwalsh.co.uk/posts/dynamic-colour-palettes-with-oklch-and-css-custom-properties/) - Dynamic OKLCH via setProperty
- [sharp issue #640 - dominant color](https://github.com/lovell/sharp/issues/640) - Community confirmation of `stats().dominant` usage

### Tertiary (LOW confidence)
- Exact tint/glow opacity values - Need visual tuning with actual cover art
- Stagger animation replay behavior - Need UX testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - sharp `stats()` verified in official docs; Svelte transitions are core framework feature; CSS keyframes are universal
- Architecture: HIGH - Server-side extraction + DB storage is proven pattern (avoids CORS, enables SSR); CSS custom properties for dynamic theming is well-documented
- Pitfalls: HIGH - Waveform transform constraint carried from Phase 8/9 research; FOUC prevention through SSR is standard
- Color conversion math: MEDIUM - OKLCH conversion verified against multiple sources but hand-rolled (no library); hex fallback for box-shadow avoids edge cases
- Visual tuning values: LOW - Opacity/chroma reduction factors are starting points that need real-world tuning

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain; no fast-moving dependencies)
