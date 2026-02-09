# Feature Landscape: Visual Polish for wallybrain-music

**Domain:** Self-hosted dark electronic music platform -- visual presentation layer
**Researched:** 2026-02-09
**Overall Confidence:** HIGH
**Scope:** Visual improvements only. All functional features (player, upload, filtering, queue) are already built and working.

---

## Current State Assessment

The platform is functional but visually flat. Here is what exists and what is missing:

| Element | Current State | Gap |
|---------|--------------|-----|
| **Color** | Monochromatic zinc-950/900/800 + violet-600 accent | No gradients, no per-track color, no atmospheric depth |
| **Typography** | System fonts, minimal hierarchy (font-weight only) | No custom fonts, no size/tracking distinctions between content types |
| **Track cards** | Horizontal flex rows, 64px cover art, text + play button | No visual weight, no grid option, minimal hover feedback |
| **Waveform** | Flat single-color bars (#4a4a5a / #8b5cf6), 40px persistent / 80px detail | No gradients, thin bars, no visual signature |
| **Player bar** | bg-zinc-900/95 + backdrop-blur, text buttons ("Play"/"Pause"), native range input | Plain text controls, no icons, thin glass effect |
| **Cover art** | Plain rounded-lg images, music-note placeholder, no shadow | No depth, no glow, no visual treatment |
| **Loading** | Plain text "Loading waveform..." | No skeleton, no shimmer, no visual placeholder |
| **Layout** | Single-column max-w-3xl list only | No grid view, no visual rhythm |
| **Animation** | transition-colors on hover only | No entrance animations, no micro-interactions, no playing indicator |
| **Background** | Flat zinc-950 | No atmospheric gradient, no texture, no per-track tinting |

---

## Table Stakes

Visual features that any polished music site has. Without these, the site reads as "developer prototype" rather than "designed platform."

| # | Feature | Why Expected | Complexity | Dependencies |
|---|---------|--------------|------------|--------------|
| T1 | **Gradient waveform colors** | Every modern music player (SoundCloud, Apple Music, Spotify) uses multi-tone or gradient waveforms. Single flat-color bars are the default wavesurfer.js output and immediately signal "unconfigured library." | **Low** | wavesurfer.js natively supports `waveColor` and `progressColor` as arrays of color stops. Change config in `WaveformPlayer.svelte` and `PersistentPlayer.svelte`. Verified via [official gradient example](https://wavesurfer.xyz/example/gradient-fill-styles/). |
| T2 | **Custom web fonts with pairing** | System fonts (the browser default sans-serif) communicate "no design decisions were made." A deliberate font pairing creates brand identity instantly. | **Low** | Add Google Fonts `<link>` in `app.html` or `+layout.svelte` head. No component restructuring. Recommend **Space Grotesk** (headings -- geometric, slightly futuristic) + **Inter** (body text -- optimized for screens) + **JetBrains Mono** (timestamps/durations -- developer aesthetic that fits electronic music). All three are free, variable-weight Google Fonts. |
| T3 | **Typography hierarchy** | Track titles, metadata, timestamps, page headings, and tags are all similarly weighted. Without clear size/weight/tracking distinctions, the eye cannot scan. | **Low** | Tailwind utility classes only. Requires T2 first so font-family distinctions are visible. Define conventions: headings get `font-display tracking-tight`, metadata gets `uppercase tracking-wider text-xs`, timestamps get `font-mono tabular-nums`. |
| T4 | **Skeleton loading placeholders** | "Loading waveform..." as plain text is jarring. Skeleton placeholders (gray shapes that shimmer where content will appear) are the standard loading pattern across all modern web applications. | **Low** | Pure CSS with Tailwind v4 `@theme` block for shimmer keyframes. Replace text in `WaveformPlayer.svelte` with a `<div>` matching waveform dimensions. Add skeleton cards for track list during navigation. |
| T5 | **Cover art shadow and depth** | Flat images with no shadow look pasted onto the page. A drop shadow with a dark spread creates the illusion that the artwork is a physical object sitting on the surface. Standard on Bandcamp, Spotify, Apple Music. | **Low** | Single class addition to `CoverArt.svelte`: `shadow-xl shadow-black/50`. For the large (detail page) variant, consider `shadow-2xl shadow-black/60`. |
| T6 | **Player bar icon buttons** | Text-only "Play" / "Pause" / "<<" / ">>" buttons read as debug UI. Every music player uses universally recognized icons. | **Medium** | Replace HTML entities with inline SVGs (play triangle, pause bars, skip-back, skip-forward, volume). Style the native `<input type="range">` for volume with `appearance: none` + custom track/thumb CSS, or keep `accent-violet-500` and just upgrade the buttons. |
| T7 | **Card hover micro-interactions** | Cards currently only change background-color on hover. Users need tactile feedback: a subtle lift (translateY + shadow), brightness shift, or scale increase communicates "this is clickable." | **Low** | Add to `TrackCard.svelte`: `hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200`. The play button opacity transition is already partially implemented. |
| T8 | **Smooth page transitions** | Hard cuts between the track list and track detail feel like separate websites. A fade or crossfade creates continuity and signals "this is one cohesive application." | **Medium** | Use the View Transitions API via SvelteKit's `onNavigate` lifecycle hook. In 2026, View Transitions are supported in all major browsers. Fallback is instant navigation (current behavior). Alternatively, use Svelte `transition:fade` on page content. |

---

## Differentiators

Features that transform the site from "polished" to "this feels like a real music platform with its own identity." Not expected by users, but immediately noticed and valued.

| # | Feature | Value Proposition | Complexity | Dependencies |
|---|---------|-------------------|------------|--------------|
| D1 | **Art-directed color theming from cover art** | The signature move of Spotify (now-playing), Apple Music (background tint), and YouTube Music (ambient mode). Extract dominant colors from each track's cover art at upload time using Sharp's `stats()` method (already a project dependency), store as a hex value in the database, then apply as CSS custom properties on the track detail page. Each track gets its own color atmosphere -- the background subtly glows with the artwork's palette, the waveform progress tint shifts to match, the accent color adapts. Transforms a generic dark page into something that feels curated per track. | **Medium-High** | Requires: (1) New `dominantColor` column in `tracks` table via Drizzle migration. (2) Color extraction in `artwork.ts` using `sharp(buffer).stats()` which returns `{ dominant: { r, g, b } }` -- verified in Sharp docs. (3) CSS custom property `--track-accent` set as inline style in track detail page. (4) Background gradient, waveform progressColor, and accent elements reference the custom property. |
| D2 | **Cover art ambient glow** | A blurred, enlarged, low-opacity copy of the cover art positioned behind the real image creates a colored "halo" (YouTube ambient mode pattern). The artwork appears to emit light. Transforms a flat image into an atmospheric focal point. Most effective on the track detail page with the large cover art. | **Medium** | CSS-only technique: a sibling or `::before` element with `filter: blur(60px) saturate(1.5); opacity: 0.25; scale: 1.3` using the same image source, positioned absolutely behind the real cover art. No JavaScript needed. Can be enhanced by combining with D1 (glow color matches dominant color). |
| D3 | **Track card grid layout** | The current list layout is space-efficient for scanning but visually monotonous. A grid layout with larger cover art (2-3 columns, art-on-top, title below) creates the Bandcamp/YouTube Music browsing experience where artwork is the hero. Offer both views with a toggle. | **Medium** | New grid variant in `+page.svelte`: `grid grid-cols-2 sm:grid-cols-3 gap-4` with a vertical card component. Store view preference in `localStorage`. List view remains the current layout with polish applied. |
| D4 | **Waveform visual upgrade (sizing + bar geometry)** | Current config (`barWidth: 2, barGap: 1, height: 80`) produces thin, dense bars that feel generic. Wider bars with more gap and rounded ends create the signature SoundCloud aesthetic and give the waveform visual weight as the primary UI element on the track detail page. | **Low** | wavesurfer.js config only. Track detail: `barWidth: 3, barGap: 2, barRadius: 2, height: 100`. Persistent player: keep compact but match bar style. Pair with T1 gradient colors. Verified via [rounded bars example](https://wavesurfer.xyz/example/rounded-bars/). |
| D5 | **Atmospheric page background** | Flat `zinc-950` reads as "CSS default dark." A subtle radial gradient -- slightly lighter at the center, darkening toward the edges -- adds perceived depth to the entire page. For track detail pages, the gradient can incorporate D1's dominant color for per-track atmosphere. | **Low-Medium** | CSS only. Base: `background: radial-gradient(ellipse at 50% 0%, rgba(39,39,42,0.4) 0%, rgb(9,9,11) 70%)`. Track detail: overlay a second gradient tinted with `--track-accent`. Optional: add a faint noise texture via inline SVG `url("data:image/svg+xml,...")` for grain. |
| D6 | **"Now playing" equalizer indicator** | When a track is actively playing, its card in the list should show animated equalizer bars (3-4 vertical bars bouncing at different rates) instead of a static icon. This is universally recognized as "audio is playing" across SoundCloud, Spotify, Apple Music, and every music app. | **Low-Medium** | Pure CSS animation. 3-4 `<span>` elements with `animation: equalize 0.8s ease-in-out infinite` and staggered `animation-delay`. Define `@keyframes equalize` in the Tailwind v4 `@theme` block. Replace the current pause button icon in `TrackCard.svelte` when `isPlaying` is true. |
| D7 | **Cover art hover zoom** | On the track detail page, cover art subtly scales on hover. On track cards, the image zooms slightly within its clipped container. A small detail that communicates craftsmanship and invites interaction. | **Low** | CSS only. Container: `overflow-hidden rounded-lg`. Image: `transition-transform duration-500 hover:scale-105`. For track cards: `group-hover:scale-110 transition-transform duration-700`. |
| D8 | **Glassmorphism player bar** | Upgrade the bottom persistent player from opaque `bg-zinc-900/95` to a more refined frosted glass effect with stronger blur and reduced opacity. Content scrolling beneath the player becomes subtly visible, creating layered depth. | **Low** | Adjust existing classes in `PersistentPlayer.svelte`. Current: `bg-zinc-900/95 backdrop-blur`. Recommended: `bg-zinc-950/70 backdrop-blur-xl border-t border-white/[0.06]`. Already uses backdrop-blur; this is tuning values. |
| D9 | **Staggered entrance animations** | Track cards fade and slide in with a slight stagger when the page loads or filters change. Each card appears 40-60ms after the previous, creating a cascade effect that makes the interface feel alive. | **Low-Medium** | Svelte transitions: `transition:fly={{ y: 12, delay: i * 50, duration: 300 }}` on each card in the `{#each}` block. Use `easing: cubicOut` for natural deceleration. Cap delay at ~400ms (8 items) to avoid sluggishness. |

---

## Anti-Features

Features that seem visually appealing but actively hurt the experience. Do not build these.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time audio visualizer (frequency bars, circular spectrum, canvas animation)** | CPU-intensive canvas rendering runs at 60fps, drains mobile battery, fights the waveform for visual attention, and ages poorly. These work for DJ software (Traktor, Serato), not a listening platform. The waveform IS the visualization. | Polish the waveform itself: gradient colors, proper sizing, rounded bars. The waveform provides both visualization and navigation. |
| **Animated/particle backgrounds (three.js, particles.js, WebGL shaders)** | Heavy JavaScript, poor mobile performance, accessibility hazard (motion sensitivity/prefers-reduced-motion), fights the music content for attention, and ages rapidly. SoundCloud and Bandcamp both use static backgrounds. | Subtle CSS radial gradients (D5) and per-track color tinting (D1) create atmosphere without animation overhead. These are paint-once, not per-frame. |
| **Light mode toggle** | Electronic music culture is overwhelmingly dark-themed. A light mode doubles the entire design surface area (every color, shadow, border, and gradient needs a light variant) for functionally zero audience demand. Bandcamp offers light because it spans all genres; a personal electronic music portfolio should commit to dark. | Commit fully to dark. Invest effort in making the dark theme excellent (atmospheric backgrounds, proper contrast, refined shadows) rather than splitting attention across two modes. |
| **Custom mouse cursor** | Gimmicky, breaks accessibility expectations, interferes with OS-level cursor settings, and communicates "style over substance." | Standard cursor with well-designed hover states and transitions. |
| **Parallax scrolling on the track list** | Disorienting on a functional list, creates jank on mobile, conflicts with the sticky bottom player bar, and adds no informational value. | Reserve subtle scale effects for cover art on hover (D7) only. Keep scrolling behavior native and predictable. |
| **Overly elaborate scrollbar styling** | Already has subtle custom scrollbar CSS. Going further (bright colors, wide tracks, custom thumb shapes) creates inconsistency across browsers and annoys trackpad users. | Keep current scrollbar styling (zinc-700 thumb, zinc-900 track). It is already refined enough. |
| **Autoplay background audio** | Violates browser autoplay policies, startles users, wastes mobile data, and is universally disliked. | User-initiated play only. Already correctly implemented -- do not regress. |
| **Infinite scroll for track list** | With a personal catalog of fewer than 100 tracks, pagination and infinite scroll add complexity for no benefit. The full list fits on one screen or two. | Keep the current flat list. If the catalog ever grows past 50 tracks, consider pagination. |

---

## Feature Dependencies

```
T2 (Custom web fonts)
  +---> T3 (Typography hierarchy)
          Hierarchy only matters visually once fonts are loaded.

T1 (Gradient waveform colors)
  +---> D4 (Waveform sizing + bar geometry)
          Design gradient colors and bar shape together as one visual unit.

D1 (Dominant color extraction)
  +---> D2 (Ambient glow)
  |       Glow behind cover art is most effective with extracted color, not just blurred image.
  +---> D5 (Atmospheric background)
  |       Page background gradient uses dominant color for per-track tinting.
  +---> T1 (Gradient waveform)
          Waveform progressColor can incorporate the track's dominant color.

T6 (Player bar icons)
  +---> D8 (Glassmorphism player bar)
          Replace the text buttons before upgrading the visual container.

T7 (Card hover interactions)
  +---> D9 (Staggered entrance animations)
          Polish the static hover state before adding entrance motion.

T5 (Cover art shadow) is independent -- no dependencies.
T4 (Skeleton loading) is independent -- no dependencies.
D6 (Equalizer indicator) is independent -- no dependencies.
D7 (Cover art hover zoom) is independent -- no dependencies.
T8 (Page transitions) is independent -- works alongside or without other features.
```

---

## MVP Visual Polish Recommendation

### Phase 1: Foundation (~2 hours)
*Changes the entire feel with minimal code. Everything else builds on this.*

1. **T2 + T3** -- Custom fonts + typography hierarchy. Biggest bang-for-effort ratio. Every text element on the site improves.
2. **T1 + D4** -- Gradient waveform + rounded bars + sizing. The waveform is the most prominent UI element; upgrading it has outsized visual impact.
3. **T5** -- Cover art shadow/depth. One class addition per size variant.
4. **T7** -- Card hover micro-interactions. A few Tailwind classes per card.

### Phase 2: Atmosphere (~2 hours)
*Creates the immersive feeling. The site starts to feel "designed."*

5. **D5** -- Atmospheric page background gradient.
6. **D8** -- Glassmorphism player bar (tuning existing backdrop-blur values).
7. **T4** -- Skeleton loading states for waveform and cards.
8. **T6** -- Player bar SVG icon buttons replacing text.

### Phase 3: Signature (~4-5 hours)
*What makes wallybrain visually distinctive. The "wow" features.*

9. **D1** -- Dominant color extraction + art-directed theming. The centerpiece feature. Requires DB migration, server-side processing, and CSS custom property integration.
10. **D2** -- Cover art ambient glow. Pairs with D1 for maximum effect.
11. **D6** -- Now-playing equalizer animation.
12. **D9** -- Staggered entrance animations on track list.

### Phase 4: Refinement (~2-3 hours)
*Optional polish. Can be deferred without the site feeling incomplete.*

13. **D3** -- Grid/list layout toggle for track list.
14. **T8** -- View Transitions API for page navigation.
15. **D7** -- Cover art hover zoom effect.

---

## Specific Design Recommendations

### Color Palette

Extend the existing zinc + violet palette. Do not replace the base -- it is already appropriate for dark electronic music.

| Role | Current | Recommended | Rationale |
|------|---------|-------------|-----------|
| Page background | `zinc-950` (#09090b) | Keep base, add `radial-gradient` overlay | Correct for dark electronic. Gradient adds depth. |
| Surface/cards | `zinc-900/50` | `zinc-900/40` or `zinc-800/30` with `backdrop-blur-sm` | Slight transparency creates layering. |
| Primary accent | `violet-600` (#7c3aed) | Keep as global default; override per-track via D1 | Violet is the brand identity. |
| Waveform unplayed | `#4a4a5a` (flat) | `['#3f3f50', '#52525b', '#3f3f50']` (gradient) | Subtle top-to-bottom gradient adds dimension. |
| Waveform played | `#8b5cf6` (flat) | `['#7c3aed', '#a78bfa', '#7c3aed']` (gradient) | violet-700 through violet-400 creates luminous feel. |
| Text primary | `zinc-200` (#e4e4e7) | Keep | Proper contrast on dark backgrounds. |
| Text secondary | `zinc-500` (#71717a) | Keep | Metadata and labels. |
| Text tertiary | `zinc-600` (#52525b) | Keep | Timestamps, dates, de-emphasized content. |
| Border/divider | `zinc-800` (#27272a) | Lighten to `zinc-800/50` or `white/[0.06]` | Softer dividers feel less "wireframe." |

### Typography Pairing

| Element | Font | Weight | Size | Tracking | CSS/Tailwind |
|---------|------|--------|------|----------|-------------|
| Site name ("wallybrain") | Space Grotesk | 700 | 1.25rem | -0.025em | `font-display text-xl font-bold tracking-tight` |
| Page headings | Space Grotesk | 700 | 1.875rem-2.25rem | -0.025em | `font-display text-3xl font-bold tracking-tight` |
| Track title (card) | Inter | 500 | 0.875rem | normal | `font-sans text-sm font-medium` |
| Track title (detail page) | Space Grotesk | 700 | 1.5rem-1.875rem | -0.025em | `font-display text-2xl md:text-3xl font-bold tracking-tight` |
| Body text / descriptions | Inter | 400 | 0.875rem-1rem | normal | `font-sans text-sm leading-relaxed` |
| Metadata (plays, category) | Inter | 400 | 0.75rem | 0.05em | `font-sans text-xs uppercase tracking-wider` |
| Timestamps / durations | JetBrains Mono | 400 | 0.75rem | normal | `font-mono text-xs tabular-nums` |
| Tags / filter pills | Inter | 500 | 0.75rem | normal | `font-sans text-xs font-medium` |

### Waveform Configuration

```javascript
// Track detail page -- hero waveform, the visual centerpiece
{
  height: 100,
  waveColor: ['#3f3f50', '#52525b', '#3f3f50'],
  progressColor: ['#7c3aed', '#a78bfa', '#7c3aed'],
  cursorColor: '#a78bfa',
  cursorWidth: 2,
  barWidth: 3,
  barGap: 2,
  barRadius: 2,
  normalize: false,
  interact: true,
  dragToSeek: true,
}

// Persistent player bar -- compact, functional
{
  height: 40,
  waveColor: ['#3f3f50', '#52525b', '#3f3f50'],
  progressColor: ['#7c3aed', '#a78bfa'],
  cursorColor: 'transparent',
  barWidth: 2,
  barGap: 1,
  barRadius: 1,
}
```

### Dominant Color Extraction (D1) -- Implementation Notes

Sharp is already a project dependency (v0.34.5). Its `stats()` method returns dominant color without any additional packages:

```typescript
// In artwork.ts, during upload processing:
const { dominant } = await sharp(coverBuffer).stats();
const hex = '#' + [dominant.r, dominant.g, dominant.b]
  .map(c => c.toString(16).padStart(2, '0')).join('');
// Store hex in tracks.dominantColor column
```

Apply in track detail page as an inline CSS custom property:
```svelte
<div style="--track-accent: {track.dominantColor ?? '#7c3aed'}">
```

Use in background gradient:
```css
background: radial-gradient(
  ellipse at 30% 20%,
  color-mix(in oklch, var(--track-accent), transparent 88%) 0%,
  transparent 55%
);
```

**Confidence: HIGH** -- Sharp `stats()` is documented at [sharp.pixelplumbing.com/api-input](https://sharp.pixelplumbing.com/api-input/) and the library is already installed.

### Equalizer Animation (D6) -- CSS Pattern

```css
@theme {
  --animate-equalize: equalize 1.2s ease-in-out infinite;

  @keyframes equalize {
    0%, 100% { height: 20%; }
    50% { height: 80%; }
  }
}
```

Three `<span>` elements with `animation-delay: 0s, 0.2s, 0.4s`, each `w-[3px] bg-violet-500 rounded-full`, inside a flex container `h-4 items-end gap-[2px]`.

---

## Confidence Assessment

| Feature | Confidence | Reasoning |
|---------|------------|-----------|
| Waveform gradients (T1, D4) | **HIGH** | Verified via wavesurfer.js official examples -- color arrays and bar options are documented and tested |
| Typography (T2, T3) | **HIGH** | Google Fonts with Tailwind is a well-established pattern |
| Skeleton loading (T4) | **HIGH** | Standard CSS technique, many Tailwind examples available |
| Cover art shadow (T5) | **HIGH** | Single Tailwind class addition |
| Player icons (T6) | **HIGH** | Standard SVG icon replacement |
| Card interactions (T7) | **HIGH** | Tailwind transition/transform utilities |
| Glassmorphism (D8) | **HIGH** | Already partially implemented; tuning existing values |
| Dominant color (D1) | **HIGH** | Sharp `stats()` documented, already in project dependencies |
| Ambient glow (D2) | **MEDIUM** | CSS technique is proven, but visual tuning requires iteration to avoid looking cheap or heavy |
| Grid layout (D3) | **MEDIUM** | Implementation is clear; design challenge is making both views feel polished without doubling work |
| Page transitions (T8) | **MEDIUM** | View Transitions API is broadly supported in 2026, but SvelteKit integration via `onNavigate` may need testing |
| Entrance animations (D9) | **MEDIUM** | Svelte transitions are well-documented; stagger timing and easing require testing to feel natural vs sluggish |
| Equalizer bars (D6) | **HIGH** | Pure CSS, well-documented pattern |
| Cover art zoom (D7) | **HIGH** | CSS transform, trivial to implement |
| Background atmosphere (D5) | **HIGH** | Pure CSS radial-gradient, no dependencies |

---

## Sources

- [wavesurfer.js Gradient Fill Styles](https://wavesurfer.xyz/example/gradient-fill-styles/) -- Official demo of waveColor/progressColor as arrays
- [wavesurfer.js Rounded Bars](https://wavesurfer.xyz/example/rounded-bars/) -- Official demo of barWidth, barGap, barRadius
- [Sharp API -- Input/Stats](https://sharp.pixelplumbing.com/api-input/) -- stats() method for dominant color
- [Sharp API -- Colour](https://sharp.pixelplumbing.com/api-colour/) -- Color manipulation capabilities
- [SoundCloud Waveform Rendering Blog](https://developers.soundcloud.com/blog/ios-waveform-rendering/) -- Gradient mask technique
- [Recreating YouTube Ambient Mode Glow (Smashing Magazine)](https://www.smashingmagazine.com/2023/07/recreating-youtube-ambient-mode-glow-effect/) -- CSS ambient glow technique
- [Glassmorphism with Tailwind CSS (Epic Web Dev)](https://www.epicweb.dev/tips/creating-glassmorphism-effects-with-tailwind-css) -- backdrop-blur-xl + semi-transparent bg
- [Next-level Frosted Glass (Josh W. Comeau)](https://www.joshwcomeau.com/css/backdrop-filter/) -- backdrop-filter deep dive
- [Tailwind v4 Animation Docs](https://tailwindcss.com/docs/animation) -- @theme block custom keyframes
- [Space Grotesk (Google Fonts)](https://fonts.google.com/specimen/Space+Grotesk) -- Geometric sans-serif
- [JetBrains Mono (Google Fonts)](https://fonts.google.com/specimen/JetBrains+Mono) -- Developer monospace
- [CSS Skeleton Loading with Shimmer (Sling Academy)](https://www.kindacode.com/snippet/tailwind-css-creating-shimmer-loading-placeholder-skeleton/) -- Tailwind shimmer pattern
- [Music Website Design (99designs)](https://99designs.com/inspiration/websites/music) -- Current design inspiration gallery
- [CSS Glow Effects (Coder's Block)](https://codersblock.com/blog/creating-glow-effects-with-css/) -- Box-shadow and radial-gradient techniques
- [Bandcamp Design Tutorial](https://get.bandcamp.help/hc/en-us/articles/23020690818199-Bandcamp-design-tutorial) -- Color coordination from artwork
- [Advanced CSS Glows (WeAreIDA)](https://medium.com/ida-mediafoundry/advanced-glows-in-css-371a6d1cb1f) -- Layered radial gradient technique
- [Micro-Interaction Best Practices (PixelFree Studio)](https://blog.pixelfreestudio.com/best-practices-for-animating-micro-interactions-with-css/) -- 150-300ms timing guidance
