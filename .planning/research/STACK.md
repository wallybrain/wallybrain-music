# Technology Stack: Visual Polish

**Project:** wallybrain-music
**Milestone:** Visual Polish & Design Identity
**Researched:** 2026-02-09
**Scope:** Additions to the existing validated stack for design system, animations, typography, and visual identity.

> The core stack (SvelteKit 2, Svelte 5, Tailwind CSS 4, wavesurfer.js, SQLite + Drizzle, Docker + Caddy) is validated and NOT re-researched here. This document covers only what is needed for visual transformation.

---

## What Is Already Available (No New Dependencies)

The existing stack has significant untapped design capability. Most of the visual polish work requires zero new npm packages.

### Tailwind CSS 4.1.18 (already installed)

The installed version already includes everything needed for a design system:

| Capability | Syntax | Why It Matters |
|------------|--------|----------------|
| Design tokens via `@theme` | `@theme { --color-brand: oklch(...); }` | Define the entire color palette, fonts, shadows, animations as CSS-first tokens. No config file needed. |
| OKLCH gradients | `bg-linear-to-r/oklch from-violet-600 to-fuchsia-500` | Perceptually uniform gradients that stay vibrant. No muddy midpoints. Default interpolation is oklab; `/oklch` modifier gives hue-arc interpolation for more vivid results. |
| Angled gradients | `bg-linear-45` | Arbitrary angle gradients without custom CSS. |
| Radial/conic gradients | `bg-radial`, `bg-conic` | Cover art glow effects, circular progress indicators. |
| Text shadows (v4.1+) | `text-shadow-lg text-shadow-violet-500/30` | Subtle glow on headings. Available since v4.1.0. Already in our v4.1.18. |
| Mask utilities (v4.1+) | `mask-*` | Fade edges of cover art, create gradient overlays without extra elements. |
| Color interpolation | `/oklch`, `/srgb`, `/hsl` modifiers on gradients | Control exactly how gradient colors blend. |
| Custom animations via `@theme` | `--animate-*` with `@keyframes` inside `@theme` | Define named animations that generate `animate-*` utility classes. |
| Backdrop blur | `backdrop-blur-sm` through `backdrop-blur-xl` | Glassmorphic player bar (already partially used: `bg-zinc-900/95 backdrop-blur`). |

**Confidence:** HIGH -- verified against [Tailwind CSS v4 theme docs](https://tailwindcss.com/docs/theme) and [v4.1 release notes](https://tailwindcss.com/blog/tailwindcss-v4-1).

### Svelte 5 Transitions & Animations (built-in)

| Capability | Import | Parameters | Best Use |
|------------|--------|------------|----------|
| `transition:fade` | `svelte/transition` | `duration`, `delay`, `easing` | Track cards entering/leaving on filter |
| `transition:fly` | `svelte/transition` | `x`, `y`, `duration`, `easing`, `opacity` | Page-level content sliding in |
| `transition:slide` | `svelte/transition` | `axis`, `duration`, `easing` | Expanding sections, persistent player reveal |
| `transition:scale` | `svelte/transition` | `start`, `duration`, `easing`, `opacity` | Cover art loading, play button feedback |
| `transition:blur` | `svelte/transition` | `amount`, `duration`, `easing`, `opacity` | Subtle content transitions |
| `animate:flip` | `svelte/animate` | `duration`, `delay`, `easing` | List reordering when filters change. **Must be immediate child of keyed `{#each}`.** |
| `in:`/`out:` directives | Same module | Same params | Separate enter/exit animations (e.g., fade in, slide out) |
| Custom CSS transitions | Return `{ css: (t, u) => string }` | Any | Combined effects (scale + fade + translate). Runs off main thread. |

**Key easing functions from `svelte/easing`:**
- `cubicOut` -- natural deceleration for most UI interactions
- `quintOut` -- stronger deceleration for page transitions
- `backOut` -- slight overshoot for playful micro-interactions
- `linear` -- progress bars, continuous animations

**Confidence:** HIGH -- verified against [Svelte 5 transition docs](https://svelte.dev/docs/svelte/transition) and [svelte/transition module docs](https://svelte.dev/docs/svelte/svelte-transition).

### Native CSS Capabilities (no library needed)

| Technique | Why | Browser Support |
|-----------|-----|-----------------|
| OKLCH color functions | Perceptually uniform palette. Adjust lightness/chroma independently. Define one hue, derive entire scale. | 93%+ (Chrome 111+, Firefox 113+, Safari 15.4+) |
| `color-mix()` in oklch | Mix brand color with black/white for hover/active states without manual hex values | 95%+ |
| CSS `@property` | Animate gradient stops and custom properties for hue shifts, pulsing glows | 94.6% (Firefox 128+, Chrome 85+, Safari 15.4+) |
| `prefers-reduced-motion` | Disable animations for accessibility | Universal |
| CSS `transition` property | Smooth hover states. Already used (`transition-colors`) but can extend to `transition-all`. | Universal |

**Confidence:** HIGH -- browser support verified via [Can I Use](https://caniuse.com/?search=@property).

---

## New Dependencies: Typography (2 packages)

Typography is the one area where new packages are genuinely needed. The current app uses only the browser default system font stack.

### Recommended Font Pairing

| Role | Font | Package | Weight Range | Why This Font |
|------|------|---------|-------------|---------------|
| **Headings** | Space Grotesk | `@fontsource-variable/space-grotesk` | 300-700 (variable) | Geometric sans-serif originally derived from Space Mono. Has a technical/electronic feel with rounded terminals and diagonal cuts. Open Font License. Designed by Florian Karsten (2018). Widely used in tech/music contexts. Variable font = one file covers all weights. |
| **Monospace / metadata** | Space Mono | `@fontsource/space-mono` | 400, 700 | Fixed-width companion to Space Grotesk. Perfect for timestamps, durations, play counts, technical metadata. Designed for Moogfest (music technology festival). Same design DNA as Space Grotesk. |

**Why Space Grotesk + Space Mono:**
- They are literally from the same type family. Space Grotesk is the proportional variant of Space Mono. Visual harmony is built-in.
- The Moogfest/electronic music connection is not superficial -- the font was designed for a synthesizer festival. It signals "electronic music" without being gimmicky.
- Geometric terminals and diagonal cuts echo waveform aesthetics.
- Space Grotesk as a variable font means a single ~30KB file replaces multiple weight files.

**Why NOT other fonts:**
- Inter: Too generic/corporate. Used by every SaaS product. No character for a music site.
- JetBrains Mono: Excellent monospace but no proportional companion. Pairing it with another font family creates visual friction.
- Roobert: Good alternative but not free/open-source for self-hosting.
- Display/pixel fonts: Too niche. Readable body text matters more than novelty.

**Body text:** Keep the Tailwind default `font-sans` (system font stack) for body text. Space Grotesk is for headings and brand identity only. System fonts for body text = fastest rendering, best readability, zero CLS.

### Installation

```bash
npm install @fontsource-variable/space-grotesk @fontsource/space-mono
```

### Integration Pattern

In `src/routes/+layout.svelte` (or `src/app.css`):

```css
/* In app.css, before @import "tailwindcss" */
@import '@fontsource-variable/space-grotesk/wght.css';
@import '@fontsource/space-mono/400.css';
@import '@fontsource/space-mono/700.css';
```

In `src/app.css` with Tailwind v4 `@theme`:

```css
@import '@fontsource-variable/space-grotesk/wght.css';
@import '@fontsource/space-mono/400.css';
@import '@fontsource/space-mono/700.css';
@import "tailwindcss";

@theme {
  --font-display: 'Space Grotesk Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, monospace;
}
```

Usage: `font-display` for headings, `font-mono` for timestamps/durations.

**Confidence:** HIGH -- verified via [Fontsource SvelteKit guide](https://fontsource.org/docs/guides/svelte), [@fontsource-variable/space-grotesk npm](https://www.npmjs.com/package/@fontsource-variable/space-grotesk), and [Space Grotesk on Google Fonts](https://fonts.google.com/specimen/Space+Grotesk).

---

## No New Dependencies Needed: Design System via @theme

The entire color palette, spacing scale, shadows, and animations should be defined through Tailwind v4's `@theme` directive in `app.css`. No design token library, no theme package, no CSS-in-JS needed.

### Recommended @theme Structure

```css
@import "tailwindcss";

@theme {
  /* === TYPOGRAPHY === */
  --font-display: 'Space Grotesk Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, monospace;

  /* === BRAND COLORS (OKLCH) === */
  /* Primary: violet/purple hue ~280 */
  --color-brand-50: oklch(0.97 0.01 280);
  --color-brand-100: oklch(0.93 0.03 280);
  --color-brand-200: oklch(0.85 0.06 280);
  --color-brand-300: oklch(0.75 0.10 280);
  --color-brand-400: oklch(0.65 0.16 280);
  --color-brand-500: oklch(0.55 0.20 280);   /* primary accent */
  --color-brand-600: oklch(0.48 0.20 280);
  --color-brand-700: oklch(0.40 0.18 280);
  --color-brand-800: oklch(0.32 0.14 280);
  --color-brand-900: oklch(0.24 0.10 280);
  --color-brand-950: oklch(0.16 0.06 280);

  /* Surface: cool-tinted dark neutrals (slight blue undertone, hue ~260) */
  --color-surface-50: oklch(0.97 0.005 260);
  --color-surface-100: oklch(0.93 0.005 260);
  --color-surface-200: oklch(0.85 0.008 260);
  --color-surface-300: oklch(0.70 0.010 260);
  --color-surface-400: oklch(0.55 0.012 260);
  --color-surface-500: oklch(0.40 0.012 260);
  --color-surface-600: oklch(0.28 0.012 260);
  --color-surface-700: oklch(0.22 0.012 260);
  --color-surface-800: oklch(0.17 0.012 260);
  --color-surface-900: oklch(0.13 0.010 260);
  --color-surface-950: oklch(0.09 0.008 260);

  /* Accent: warm secondary for contrast (fuchsia/magenta hue ~320) */
  --color-accent-400: oklch(0.72 0.18 320);
  --color-accent-500: oklch(0.62 0.22 320);
  --color-accent-600: oklch(0.52 0.20 320);

  /* === CUSTOM SHADOWS === */
  --shadow-glow: 0 0 20px oklch(0.55 0.20 280 / 0.3);
  --shadow-glow-lg: 0 0 40px oklch(0.55 0.20 280 / 0.4);

  /* === CUSTOM ANIMATIONS === */
  --animate-fade-in: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-fade-in-up: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-pulse-glow: pulse-glow 2s ease-in-out infinite;
  --animate-slide-up: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px oklch(0.55 0.20 280 / 0.2); }
    50% { box-shadow: 0 0 30px oklch(0.55 0.20 280 / 0.4); }
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
}
```

**Why OKLCH for the entire palette:**
- Perceptually uniform: changing lightness by 0.1 looks like the same step at every level. HSL/RGB scales are uneven.
- Vibrant gradients: `bg-linear-to-r/oklch from-brand-500 to-accent-500` stays vivid. sRGB gradients go muddy in the middle.
- Single-hue consistency: the entire brand scale shares hue 280. Adjusting only L and C creates a coherent scale.
- Future-proof: OKLCH is the CSS Working Group's recommended color space for gamut mapping.

**Why surface colors instead of just zinc:**
- Zinc is pure neutral (no hue). Surface colors with a slight blue/violet undertone (hue ~260, very low chroma ~0.01) feel warmer and more cohesive with the violet brand.
- The existing zinc-* utilities still work for truly neutral elements. Surface is for backgrounds and cards.

**Confidence:** HIGH for the approach. MEDIUM for the specific OKLCH values -- these will need visual tuning during implementation but the structure is correct.

---

## wavesurfer.js Styling (No New Dependencies)

wavesurfer.js already supports gradient colors via arrays. The current config uses flat colors:

```js
// Current (flat)
waveColor: '#4a4a5a',
progressColor: '#8b5cf6',

// Upgraded (gradient arrays)
waveColor: ['oklch(0.35 0.02 260)', 'oklch(0.45 0.04 260)'],
progressColor: ['oklch(0.55 0.20 280)', 'oklch(0.62 0.22 320)'],
```

wavesurfer.js accepts `string | string[] | CanvasGradient` for both `waveColor` and `progressColor`. Passing an array creates a vertical gradient automatically. This creates a violet-to-fuchsia gradient on the played portion that matches the brand palette.

**Confidence:** HIGH -- verified via [wavesurfer.js gradient fill example](https://wavesurfer.xyz/example/gradient-fill-styles/).

---

## What NOT to Add

| Category | Temptation | Why Avoid |
|----------|-----------|-----------|
| UI component library | Skeleton UI, shadcn-svelte, DaisyUI | Imposes design opinions. This project needs bespoke aesthetic, not a kit. The component surface is tiny (6 components). |
| CSS animation library | Motion One, Framer Motion, AutoAnimate | Svelte transitions + CSS `@keyframes` cover every needed animation. Extra JS = extra bundle for zero benefit. |
| Icon library (full) | Heroicons, Lucide (full install) | Only ~8 icons needed (play, pause, skip, volume, filter). Inline SVG or copy individual icon SVGs. No 200KB icon bundle. |
| CSS preprocessor | SASS, Less, PostCSS plugins | Tailwind v4 uses Lightning CSS internally. `@theme` replaces variables. Nesting is native CSS. Nothing SASS provides is needed. |
| Design token library | Style Dictionary, Theo | `@theme` IS the design token system. Tailwind v4 made these libraries redundant for projects using Tailwind. |
| Color palette generator | Tailwind color generator packages | OKLCH math replaces palette generators. Same hue, adjust L and C. Done. |
| Font loading optimizer | fontaine, font-display swap libraries | Fontsource bundles handle `font-display: swap` automatically. System font fallback for body text eliminates CLS concern. |
| Lottie / Rive | Complex animation runtimes | Overkill. This is a music catalog, not a motion graphics showcase. |

---

## Complete New Dependencies

```bash
# Only 2 new packages needed
npm install @fontsource-variable/space-grotesk @fontsource/space-mono
```

That is the entire addition to `package.json`. Everything else -- colors, animations, gradients, transitions, design tokens -- comes from Tailwind v4.1 `@theme` and Svelte 5 built-ins that are already installed.

---

## Specific Techniques Reference

### Cover Art Glow Effect

```html
<!-- Radial gradient glow behind cover art -->
<div class="relative">
  <div class="absolute inset-0 bg-radial from-brand-500/20 to-transparent blur-2xl scale-110"></div>
  <img src="..." class="relative rounded-lg shadow-glow" />
</div>
```

### Persistent Player Glassmorphism Enhancement

```html
<!-- Current: bg-zinc-900/95 backdrop-blur -->
<!-- Enhanced: surface color + stronger blur + subtle border -->
<div class="fixed bottom-0 left-0 right-0 bg-surface-950/90 backdrop-blur-lg
            border-t border-brand-500/10 shadow-glow z-50">
```

### Track Card Hover with Gradient Border

```html
<div class="group relative rounded-lg bg-surface-900/50 p-px
            hover:bg-linear-to-br/oklch hover:from-brand-500/20 hover:to-accent-500/20
            transition-all duration-300">
  <div class="rounded-lg bg-surface-900 p-3">
    <!-- card content -->
  </div>
</div>
```

### Staggered List Animation (Svelte)

```svelte
<script>
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
</script>

{#each tracks as track, i (track.id)}
  <div
    in:fly={{ y: 20, duration: 300, delay: i * 50, easing: cubicOut }}
    animate:flip={{ duration: 200 }}
  >
    <TrackCard {track} />
  </div>
{/each}
```

### Now-Playing Pulse Animation

```css
@theme {
  --animate-now-playing: now-playing 1.4s ease-in-out infinite;

  @keyframes now-playing {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
}
```

```html
<span class="animate-now-playing text-brand-400">Now playing</span>
```

### Accessible Motion Preference

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

In Svelte, the `transition:` directive can also check this:

```svelte
<script>
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

{#if visible}
  <div transition:fade={{ duration: prefersReducedMotion ? 0 : 300 }}>...</div>
{/if}
```

---

## Version Verification

| Package | Version | Verified | Method |
|---------|---------|----------|--------|
| tailwindcss | 4.1.18 | 2026-02-09 | `npm list tailwindcss` in project |
| @tailwindcss/vite | 4.1.18 | 2026-02-09 | `npm list` in project |
| svelte | 5.50.0 | 2026-02-09 | `package.json` in project |
| wavesurfer.js | 7.12.1 | 2026-02-09 | `package.json` in project |
| @fontsource-variable/space-grotesk | latest | 2026-02-09 | [npm registry](https://www.npmjs.com/package/@fontsource-variable/space-grotesk) |
| @fontsource/space-mono | latest | 2026-02-09 | [npm registry](https://www.npmjs.com/package/@fontsource/space-mono) |

## Sources

- [Tailwind CSS v4 @theme docs](https://tailwindcss.com/docs/theme) -- Design token syntax, namespaces, @keyframes inside @theme
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4) -- OKLCH default palette, gradient interpolation modifiers
- [Tailwind CSS v4.1 release](https://tailwindcss.com/blog/tailwindcss-v4-1) -- Text shadow, mask utilities
- [Svelte 5 transition docs](https://svelte.dev/docs/svelte/transition) -- Directive syntax, local vs global, custom transitions
- [Svelte svelte/transition module](https://svelte.dev/docs/svelte/svelte-transition) -- Built-in transition functions and parameters
- [Svelte animate docs](https://svelte.dev/docs/svelte/animate) -- FLIP animation for keyed each blocks
- [Svelte svelte/easing reference](https://svelte.dev/docs/svelte/svelte-easing) -- 31 easing functions
- [Fontsource SvelteKit guide](https://fontsource.org/docs/guides/svelte) -- Installation and import patterns
- [Space Grotesk on Fontsource](https://fontsource.org/fonts/space-grotesk) -- Variable font axis range 300-700
- [Space Mono on Fontsource](https://fontsource.org/fonts/space-mono) -- Weights 400, 700
- [Space Grotesk on Google Fonts](https://fonts.google.com/specimen/Space+Grotesk) -- Font origins, design rationale
- [wavesurfer.js gradient fill examples](https://wavesurfer.xyz/example/gradient-fill-styles/) -- Array and CanvasGradient color support
- [OKLCH in CSS (Evil Martians)](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) -- Why OKLCH over HSL/RGB
- [CSS @property support (Can I Use)](https://caniuse.com/?search=@property) -- 94.6% support, Firefox 128+
- [Tailwind CSS adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) -- @layer, @utility, custom CSS patterns
