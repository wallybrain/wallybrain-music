# Phase 8: Design Foundation - Research

**Researched:** 2026-02-09
**Domain:** Tailwind CSS v4 design tokens (OKLCH), custom typography (Space Grotesk / Space Mono), WCAG AA accessibility
**Confidence:** HIGH

## Summary

Phase 8 transforms the v1.0 app from generic Tailwind zinc styling into a coherent design system using OKLCH semantic tokens, custom typography, and WCAG AA-compliant contrast. The existing codebase uses hardcoded Tailwind zinc/violet color classes (100+ references across 13 files) and two hardcoded hex values (#4a4a5a, #8b5cf6) in wavesurfer configurations. The current text-zinc-500 on zinc-950 combination has a contrast ratio of only 4.12:1, which fails WCAG AA (requires 4.5:1).

Tailwind CSS v4's `@theme` directive is purpose-built for this task. It replaces the old tailwind.config.js approach with CSS-first design tokens that generate both utility classes and CSS custom properties. The project already uses Tailwind v4.1.18 with the Vite plugin, so no infrastructure changes are needed -- only additions to `src/app.css`. For fonts, Fontsource provides npm packages for both Space Grotesk (variable font, 300-700 weights) and Space Mono (400/700), which self-host through Vite's bundler with zero external requests.

**Primary recommendation:** Define all design tokens in a single `@theme` block in `src/app.css`, use Fontsource for self-hosted fonts, and systematically replace zinc/violet class references with semantic token classes across all 13 source files.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | ^4.1.18 | CSS framework with @theme design tokens | Already installed; v4 @theme is the official way to define design tokens |
| @tailwindcss/vite | ^4.1.18 | Vite integration | Already installed |
| @fontsource-variable/space-grotesk | latest | Heading font (variable, 300-700) | Self-hosted, zero external requests, variable font reduces file count |
| @fontsource/space-mono | latest | Monospace font for timestamps/durations | Self-hosted, 400 weight only needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All requirements met by core stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fontsource | Google Fonts CDN | External dependency, GDPR concerns, extra DNS lookup; Fontsource is better for self-hosting |
| Fontsource | Manual @font-face with downloaded .woff2 | More manual work, same result; Fontsource automates this |
| @fontsource-variable/space-grotesk | @fontsource/space-grotesk (static) | Static loads one weight per import; variable font covers 300-700 in one file |

**Installation:**
```bash
npm install @fontsource-variable/space-grotesk @fontsource/space-mono
```

## Architecture Patterns

### Recommended File Changes
```
src/
├── app.css              # @theme tokens, @font-face imports, base styles (PRIMARY CHANGE)
├── app.html             # No changes needed (fonts load via CSS, not <link>)
├── routes/
│   ├── +layout.svelte   # Replace zinc-* with semantic token classes
│   ├── +page.svelte     # Replace zinc-* with semantic token classes
│   ├── +error.svelte    # Replace zinc-* with semantic token classes
│   └── track/[slug]/+page.svelte  # Replace zinc-*, font classes
├── lib/components/
│   ├── CoverArt.svelte       # Replace zinc-* with semantic tokens
│   ├── FilterBar.svelte       # Replace zinc-*, violet-* with semantic tokens
│   ├── PersistentPlayer.svelte # Replace zinc-*, violet-*, hex colors
│   ├── TrackCard.svelte       # Replace zinc-*, violet-* with semantic tokens
│   └── WaveformPlayer.svelte  # Replace zinc-*, violet-*, hex colors
└── routes/admin/
    ├── +layout.svelte         # Replace zinc-* with semantic tokens
    ├── +page.svelte           # Replace zinc-*, status colors
    ├── upload/+page.svelte    # Replace zinc-*, status colors
    └── tracks/[id]/+page.svelte # Replace zinc-*, status colors
```

### Pattern 1: Design Token Architecture in app.css

**What:** Single @theme block defines all semantic tokens; @layer base applies typography defaults
**When to use:** Always -- this is the entire token system

```css
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

/* Font imports (before @theme) */
@import "@fontsource-variable/space-grotesk";
@import "@fontsource/space-mono";

@theme {
  /* === Typography === */
  --font-heading: "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-body: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
               Roboto, "Helvetica Neue", Arial, sans-serif;

  /* === Surface Colors (backgrounds) === */
  --color-surface-base: oklch(0.145 0.005 286);      /* ~zinc-950 */
  --color-surface-raised: oklch(0.21 0.006 286);      /* between zinc-900/800 */
  --color-surface-overlay: oklch(0.274 0.006 286);     /* ~zinc-800 */
  --color-surface-hover: oklch(0.335 0.008 286);       /* between zinc-800/700 */

  /* === Text Colors === */
  --color-text-primary: oklch(0.985 0 0);              /* near-white, 19.6:1 on base */
  --color-text-secondary: oklch(0.871 0.006 286);      /* ~zinc-300, 13.5:1 on base */
  --color-text-tertiary: oklch(0.705 0.015 286);       /* ~zinc-400, 7.8:1 on base */
  --color-text-muted: oklch(0.60 0.012 286);           /* between zinc-500/400, ~5.0:1 on base */

  /* === Accent Colors (interactive) === */
  --color-accent: oklch(0.585 0.233 293);              /* ~violet-500, primary accent */
  --color-accent-hover: oklch(0.65 0.22 293);          /* lighter violet for hover */
  --color-accent-muted: oklch(0.716 0.175 293);        /* ~violet-400, links */
  --color-accent-muted-hover: oklch(0.78 0.15 293);    /* lighter for hover */

  /* === Border Colors === */
  --color-border-default: oklch(0.335 0.008 286);      /* ~zinc-700 */
  --color-border-subtle: oklch(0.274 0.006 286) / 50%; /* zinc-800 at 50% */

  /* === Status Colors (admin) === */
  --color-status-success: oklch(0.765 0.177 163);      /* ~emerald-400 */
  --color-status-warning: oklch(0.774 0.154 85);       /* ~amber-400 */
  --color-status-error: oklch(0.704 0.191 22);         /* ~red-400 */

  /* === Waveform Colors (for JS config) === */
  --color-waveform-idle: oklch(0.40 0.01 286);         /* muted gray */
  --color-waveform-progress: oklch(0.585 0.233 293);   /* matches accent */
  --color-waveform-cursor: oklch(0.585 0.233 293);     /* matches accent */
}

@layer base {
  html {
    background-color: var(--color-surface-base);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    scroll-behavior: smooth;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    color: var(--color-text-primary);
  }
}
```

### Pattern 2: Using Semantic Tokens in Component Markup

**What:** Replace hardcoded zinc/violet classes with semantic token utility classes
**When to use:** Every component file

```svelte
<!-- BEFORE (hardcoded zinc) -->
<h2 class="text-zinc-200 font-medium truncate">Track Title</h2>
<span class="text-xs text-zinc-500">3:42</span>
<div class="bg-zinc-900/50 hover:bg-zinc-800/70">card</div>

<!-- AFTER (semantic tokens) -->
<h2 class="text-text-primary font-heading font-medium truncate">Track Title</h2>
<span class="text-xs text-text-muted font-mono tabular-nums">3:42</span>
<div class="bg-surface-raised hover:bg-surface-hover">card</div>
```

### Pattern 3: Wavesurfer Hex Colors to CSS Variables

**What:** Read CSS custom properties at runtime for wavesurfer configuration
**When to use:** WaveformPlayer.svelte and PersistentPlayer.svelte

```typescript
// Source: verified pattern from Tailwind v4 docs on CSS variable access
const styles = getComputedStyle(document.documentElement);

ws = WaveSurfer.create({
  container,
  waveColor: styles.getPropertyValue('--color-waveform-idle').trim(),
  progressColor: styles.getPropertyValue('--color-waveform-progress').trim(),
  cursorColor: styles.getPropertyValue('--color-waveform-cursor').trim(),
  // ... other config
});
```

**Important caveat:** WaveSurfer.js may or may not support OKLCH color strings directly. If it does not, fall back to hex values in CSS custom properties, or use `oklch()` with a `color()` conversion. Test this during implementation. If OKLCH strings work (modern browsers support them natively), the approach above is clean. If not, define waveform colors as hex in a `:root` block instead of `@theme`.

### Pattern 4: Typography Scale for Music Platform

**What:** Clear visual hierarchy through font size, weight, and tracking
**When to use:** Applied globally via base styles and utility classes

```
Page titles (h1):     font-heading text-2xl md:text-3xl font-bold
Section headings (h2): font-heading text-lg font-semibold
Track titles:          font-heading font-medium text-base
Body text:             font-body text-sm (default, no class needed)
Metadata/timestamps:   font-mono text-xs tabular-nums
Captions/labels:       font-body text-xs uppercase tracking-wider
Muted helpers:         font-body text-xs text-text-muted
```

### Anti-Patterns to Avoid

- **Mixing old and new color references:** Never have `text-zinc-500` alongside `text-text-muted` in the same codebase -- migration must be complete
- **CSS transforms on waveform ancestors:** Never apply `transform`, `filter`, or `will-change: transform` to elements containing wavesurfer containers -- this breaks `dragToSeek` (fixed positioning math fails)
- **Multiple backdrop-blur elements on mobile:** Limit to ONE backdrop-blur element (the persistent player bar) -- more causes audio stuttering on mobile WebKit
- **Using @apply in Svelte <style> blocks without @reference:** In Tailwind v4, you must add `@reference "../app.css"` in component `<style>` blocks if using `@apply`. Prefer utility classes in markup instead.
- **Clearing the default color namespace:** Do NOT use `--color-*: initial` -- this removes ALL Tailwind color utilities including violet, emerald, amber, red which are used for status indicators. Only ADD semantic tokens alongside defaults.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading/subsetting | Custom @font-face with manual woff2 files | Fontsource npm packages | Handles subsetting, font-display, format negotiation automatically |
| Contrast ratio checking | Custom JS contrast calculator | Browser DevTools + OddContrast.com | Verified tools; manual calc is error-prone with OKLCH |
| Design token system | Custom CSS variable architecture | Tailwind v4 @theme directive | @theme generates utility classes AND CSS variables automatically |
| Typography reset | Custom base typography CSS | @layer base with @theme font variables | Integrates with Tailwind's cascade properly |

**Key insight:** Tailwind v4's @theme directive IS the design token system -- it generates both CSS custom properties and utility classes from a single source of truth. Building a separate token system alongside it creates redundancy and conflicts.

## Common Pitfalls

### Pitfall 1: zinc-500 Text Fails WCAG AA on Dark Backgrounds
**What goes wrong:** text-zinc-500 (#71717a) on zinc-950 (#09090b) has only 4.12:1 contrast ratio, failing WCAG AA's 4.5:1 minimum for normal text.
**Why it happens:** Zinc-500 looks "readable enough" visually but is below the mathematical threshold.
**How to avoid:** Use text-text-muted (L=0.60) for the lightest allowable muted text, which achieves ~5.0:1 ratio. For secondary text, use text-text-tertiary (~zinc-400, 7.8:1 ratio).
**Warning signs:** Any text using zinc-500 or zinc-600 on zinc-950 or zinc-900 backgrounds.

**Measured contrast ratios against zinc-950 (#09090b):**
| Color | Hex | Ratio | AA Normal | AA Large |
|-------|-----|-------|-----------|----------|
| zinc-600 | #52525b | 2.57:1 | FAIL | FAIL |
| zinc-500 | #71717a | 4.12:1 | FAIL | PASS |
| zinc-400 | #a1a1aa | 7.76:1 | PASS | PASS |
| zinc-300 | #d4d4d8 | 13.46:1 | PASS | PASS |
| zinc-200 | #e4e4e7 | 15.68:1 | PASS | PASS |
| white | #ffffff | 19.90:1 | PASS | PASS |
| violet-600 | #7c3aed | 3.49:1 | FAIL | PASS |
| violet-500 | #8b5cf6 | 4.70:1 | PASS | PASS |
| violet-400 | #a78bfa | 7.31:1 | PASS | PASS |

### Pitfall 2: Fontsource Import Order in app.css
**What goes wrong:** `@import "tailwindcss"` must come before `@theme`, but Fontsource CSS imports may need to be before or alongside Tailwind.
**Why it happens:** CSS `@import` rules must come before all other rules except `@charset`.
**How to avoid:** Use this exact order in app.css:
```css
@import "tailwindcss";
@import "@fontsource-variable/space-grotesk";
@import "@fontsource/space-mono";

@theme {
  /* tokens */
}
```
Since `@import "tailwindcss"` is handled by the Vite plugin (not a true CSS import), Fontsource imports can safely follow it.
**Warning signs:** Fonts not loading, "failed to resolve import" errors.

### Pitfall 3: @theme Tokens Don't Clear Default Zinc Palette
**What goes wrong:** Adding semantic color tokens alongside Tailwind's default palette means BOTH old zinc-* utilities AND new semantic utilities are available, enabling inconsistent usage.
**Why it happens:** @theme extends the default theme by default; clearing with `--color-*: initial` removes ALL colors.
**How to avoid:** Keep default palette available (needed for status colors like emerald-400, amber-400, red-400) but adopt a team convention to use ONLY semantic tokens for new code. The migration task should replace all zinc/violet references in existing files.
**Warning signs:** PRs that mix `text-zinc-400` with `text-text-tertiary`.

### Pitfall 4: WaveSurfer OKLCH String Compatibility
**What goes wrong:** WaveSurfer.js may not accept OKLCH color strings like `oklch(0.585 0.233 293)` -- it may expect hex or rgb.
**Why it happens:** WaveSurfer uses HTML canvas, which may have different color parsing than CSS.
**How to avoid:** Test OKLCH strings with wavesurfer at implementation time. If they fail, define waveform colors separately as hex in a `:root` block, or use `getComputedStyle` to read the resolved color (which will be in rgb format in most browsers).
**Warning signs:** Gray or missing waveform rendering after switching to OKLCH values.

### Pitfall 5: Variable Font CSS Name
**What goes wrong:** Using `"Space Grotesk"` instead of `"Space Grotesk Variable"` as the font-family name when using the variable font package.
**Why it happens:** The static and variable font packages use different font-family names in their @font-face declarations.
**How to avoid:** If using `@fontsource-variable/space-grotesk`, the CSS font-family name is `"Space Grotesk Variable"`. If using `@fontsource/space-grotesk`, it's `"Space Grotesk"`.
**Warning signs:** Font not rendering, browser falling back to system sans-serif.

### Pitfall 6: Status Color Contrast in Admin
**What goes wrong:** Status badge colors (emerald-400, amber-400, red-400) on their semi-transparent backgrounds may fail contrast.
**Why it happens:** The current pattern uses `bg-emerald-500/20 text-emerald-400` -- the effective background depends on what's behind the 20% opacity layer.
**How to avoid:** Verify status badge contrast with the actual stacked background (likely surface-raised). These are admin-only so lower priority, but still should pass AA.
**Warning signs:** Colored status text that is hard to read.

## Code Examples

### Complete app.css Token Definition
```css
/* Source: https://tailwindcss.com/docs/theme + verified OKLCH values */
@import "tailwindcss";
@import "@fontsource-variable/space-grotesk";
@import "@fontsource/space-mono";

@theme {
  --font-heading: "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-body: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
               Roboto, "Helvetica Neue", Arial, sans-serif;

  --color-surface-base: oklch(0.145 0.005 286);
  --color-surface-raised: oklch(0.21 0.006 286);
  --color-surface-overlay: oklch(0.274 0.006 286);
  --color-surface-hover: oklch(0.335 0.008 286);

  --color-text-primary: oklch(0.985 0 0);
  --color-text-secondary: oklch(0.871 0.006 286);
  --color-text-tertiary: oklch(0.705 0.015 286);
  --color-text-muted: oklch(0.60 0.012 286);

  --color-accent: oklch(0.585 0.233 293);
  --color-accent-hover: oklch(0.65 0.22 293);
  --color-accent-muted: oklch(0.716 0.175 293);
  --color-accent-muted-hover: oklch(0.78 0.15 293);

  --color-border-default: oklch(0.335 0.008 286);
  --color-border-subtle: oklch(0.274 0.006 286);

  --color-status-success: oklch(0.765 0.177 163);
  --color-status-warning: oklch(0.774 0.154 85);
  --color-status-error: oklch(0.704 0.191 22);

  --color-waveform-idle: oklch(0.40 0.01 286);
  --color-waveform-progress: oklch(0.585 0.233 293);
  --color-waveform-cursor: oklch(0.585 0.233 293);
}

@layer base {
  html {
    background-color: var(--color-surface-base);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    scroll-behavior: smooth;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    color: var(--color-text-primary);
  }
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--color-surface-raised); }
::-webkit-scrollbar-thumb { background: var(--color-border-default); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
```

### Utility Class Mapping (Old to New)
```
COLOR MAPPING (Tailwind classes):
text-white             -> text-text-primary
text-zinc-200          -> text-text-secondary
text-zinc-300          -> text-text-secondary
text-zinc-400          -> text-text-tertiary
text-zinc-500          -> text-text-muted     (CRITICAL: fixes WCAG AA failure)
text-zinc-600          -> text-text-muted     (CRITICAL: was 2.57:1 ratio!)
bg-zinc-950            -> bg-surface-base     (via html base style)
bg-zinc-900/50         -> bg-surface-raised
bg-zinc-900/95         -> bg-surface-raised/95
bg-zinc-800            -> bg-surface-overlay
bg-zinc-800/50         -> bg-surface-overlay/50
bg-zinc-800/70         -> bg-surface-overlay/70
bg-zinc-700            -> bg-surface-hover
hover:bg-zinc-800/70   -> hover:bg-surface-hover
hover:bg-zinc-700      -> hover:bg-surface-hover
hover:bg-zinc-600      -> hover:bg-surface-hover
border-zinc-800        -> border-border-subtle
border-zinc-700        -> border-border-default
bg-violet-600          -> bg-accent
hover:bg-violet-500    -> hover:bg-accent-hover
text-violet-400        -> text-accent-muted
hover:text-violet-300  -> hover:text-accent-muted-hover
ring-violet-500        -> ring-accent
accent-violet-500      -> accent-accent
focus:border-violet-500 -> focus:border-accent

FONT MAPPING:
font-semibold (on headings) -> font-heading font-semibold
font-bold (on headings)     -> font-heading font-bold
font-mono tabular-nums      -> font-mono tabular-nums (already correct name)

STATUS COLORS (admin only -- keep as-is using default palette):
text-emerald-400, text-amber-400, text-red-400  -> keep using default Tailwind palette
bg-emerald-500/20, bg-amber-500/20, bg-red-500/20 -> keep using default Tailwind palette
```

### WaveSurfer Color Integration
```typescript
// In WaveformPlayer.svelte and PersistentPlayer.svelte
// Read resolved CSS values at runtime
const styles = getComputedStyle(document.documentElement);
const waveColor = styles.getPropertyValue('--color-waveform-idle').trim();
const progressColor = styles.getPropertyValue('--color-waveform-progress').trim();

ws = WaveSurfer.create({
  container,
  waveColor,
  progressColor,
  cursorColor: progressColor,
  // ... rest of config unchanged
});
```

### Typography Classes in Practice
```svelte
<!-- Page title -->
<h1 class="text-2xl md:text-3xl font-heading font-bold">Track Title</h1>

<!-- Section heading -->
<h2 class="text-lg font-heading font-semibold text-text-secondary">About this track</h2>

<!-- Body text (inherits from html base style) -->
<p class="text-text-tertiary leading-relaxed">Track description...</p>

<!-- Timestamp/duration (monospace) -->
<span class="text-xs font-mono tabular-nums text-text-muted">3:42 / 7:15</span>

<!-- Category label -->
<span class="text-xs uppercase tracking-wider text-text-tertiary">Experiment</span>

<!-- Tag pill -->
<span class="text-xs bg-surface-overlay text-text-muted px-2 py-0.5 rounded">ambient</span>
```

## Current Codebase Audit

### Files Requiring Changes (13 files total)

| File | Changes Needed |
|------|----------------|
| `src/app.css` | Complete rewrite: add @theme tokens, font imports, base styles |
| `src/routes/+layout.svelte` | Replace zinc-300, hover:text-white with semantic tokens |
| `src/routes/+page.svelte` | Replace text-white, text-zinc-500, text-violet-400 |
| `src/routes/+error.svelte` | Replace text-zinc-300, text-zinc-500, text-violet-400 |
| `src/routes/track/[slug]/+page.svelte` | Heavy changes: 15+ color class replacements, add font-heading/font-mono |
| `src/lib/components/TrackCard.svelte` | Replace zinc-*, violet-* classes, add font-heading |
| `src/lib/components/FilterBar.svelte` | Replace zinc-*, violet-* classes |
| `src/lib/components/PersistentPlayer.svelte` | Replace zinc-*, violet-*, hex waveform colors, add font-mono |
| `src/lib/components/WaveformPlayer.svelte` | Replace zinc-*, hex waveform colors, add font-mono |
| `src/lib/components/CoverArt.svelte` | Replace bg-zinc-800, text-zinc-600 |
| `src/routes/admin/+layout.svelte` | Replace zinc-300, zinc-500 |
| `src/routes/admin/+page.svelte` | Replace zinc-* classes (keep status colors as-is) |
| `src/routes/admin/upload/+page.svelte` | Replace zinc-* classes (keep status colors as-is) |
| `src/routes/admin/tracks/[id]/+page.svelte` | Replace zinc-*, input classes, keep status colors |

### Hardcoded Hex Values to Replace
| File | Value | Semantic Replacement |
|------|-------|---------------------|
| WaveformPlayer.svelte | `'#4a4a5a'` (waveColor) | `var(--color-waveform-idle)` via getComputedStyle |
| WaveformPlayer.svelte | `'#8b5cf6'` (progressColor, cursorColor) | `var(--color-waveform-progress)` via getComputedStyle |
| PersistentPlayer.svelte | `'#4a4a5a'` (waveColor) | `var(--color-waveform-idle)` via getComputedStyle |
| PersistentPlayer.svelte | `'#8b5cf6'` (progressColor) | `var(--color-waveform-progress)` via getComputedStyle |

### WCAG AA Violations in Current Code
| Location | Current | Ratio | Fix |
|----------|---------|-------|-----|
| +page.svelte line 26 | text-zinc-500 on zinc-950 | 4.12:1 | Use text-text-muted (L=0.60, ~5.0:1) |
| TrackCard.svelte line 61 | text-zinc-500 on zinc-900/50 | ~3.67:1 | Use text-text-muted |
| FilterBar.svelte line 75 | text-zinc-500 on zinc-800/70 | ~3.67:1 | Use text-text-muted |
| FilterBar.svelte line 88 | text-zinc-500 (clear link) | 4.12:1 | Use text-text-muted |
| PersistentPlayer.svelte line 107 | text-zinc-500 (timestamp) | 4.12:1 | Use text-text-muted + font-mono |
| PersistentPlayer.svelte line 139 | text-zinc-500 (vol label) | 4.12:1 | Use text-text-muted |
| track/[slug] line 70 | text-zinc-500 (play count) | 4.12:1 | Use text-text-muted |
| track/[slug] line 107 | text-zinc-600 (date) | 2.57:1 | Use text-text-muted (severe!) |
| admin/+layout line 11 | text-zinc-500 (back link) | 4.12:1 | Use text-text-muted |
| CoverArt.svelte line 33 | text-zinc-600 (placeholder) | 2.57:1 | Use text-text-muted |

## State of the Art

| Old Approach (Tailwind v3) | Current Approach (Tailwind v4) | When Changed | Impact |
|---------------------------|-------------------------------|--------------|--------|
| tailwind.config.js extend: { colors: {} } | @theme { --color-*: oklch(...) } | v4.0 (Jan 2025) | All config is CSS-first |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | v4.0 | Single import replaces three directives |
| `theme.extend.fontFamily` in JS | `--font-*` in @theme block | v4.0 | Font families defined in CSS |
| hex/rgb colors | OKLCH by default | v4.0 | Perceptually uniform, wider gamut |
| PostCSS plugin | Vite plugin (@tailwindcss/vite) | v4.0 | Faster builds, better integration |

**Deprecated/outdated:**
- `tailwind.config.js` / `tailwind.config.ts`: Still supported via `@config` directive but not recommended for new projects
- `@tailwind base/components/utilities`: Removed in v4; use `@import "tailwindcss"`
- PostCSS-based Tailwind: Replaced by Vite plugin for Vite-based projects

## Open Questions

1. **WaveSurfer OKLCH String Support**
   - What we know: Modern browsers support OKLCH in CSS. WaveSurfer uses HTML Canvas internally.
   - What's unclear: Whether canvas `fillStyle` accepts OKLCH strings or only hex/rgb/hsl.
   - Recommendation: Test during implementation. If OKLCH fails, use `getComputedStyle()` which returns resolved rgb() values.

2. **Fontsource Import Syntax with Tailwind Vite Plugin**
   - What we know: `@import "@fontsource-variable/space-grotesk"` should work because Vite resolves bare specifiers from node_modules.
   - What's unclear: Whether the Tailwind Vite plugin processes these imports correctly or if they need to be in a specific position.
   - Recommendation: Test during implementation. If CSS @import fails, use JS import in +layout.svelte instead (proven pattern from Fontsource docs).

3. **Exact text-text-muted OKLCH Lightness**
   - What we know: L=0.552 (zinc-500) gives 4.12:1 (FAIL); L=0.705 (zinc-400) gives 7.76:1 (PASS); need minimum L for exactly 4.5:1.
   - What's unclear: The precise lightness threshold for 4.5:1 on the specific surface-base background.
   - Recommendation: Use L=0.60 (~5.0:1 ratio) for comfortable margin above 4.5:1. Verify with browser DevTools during implementation.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) - @theme syntax, namespaces, OKLCH examples
- [Tailwind CSS v4 Functions and Directives](https://tailwindcss.com/docs/functions-and-directives) - @theme, @reference, @layer syntax
- [Tailwind CSS v4 Font Family](https://tailwindcss.com/docs/font-family) - --font-* theme variables, @font-face integration
- [Tailwind CSS v4 Adding Custom Styles](https://tailwindcss.com/docs/adding-custom-styles) - @layer base, @theme, font integration
- [Fontsource SvelteKit Guide](https://fontsource.org/docs/guides/svelte) - Integration patterns for SvelteKit
- [Fontsource Space Grotesk](https://fontsource.org/fonts/space-grotesk/install) - Variable font, weights 300-700
- [Fontsource Space Mono](https://fontsource.org/fonts/space-mono/install) - Static font, weights 400/700
- Contrast ratio calculations - Computed locally using WCAG 2.0 relative luminance formula against actual hex values

### Secondary (MEDIUM confidence)
- [OKLCH in CSS: Consistent, accessible color palettes - LogRocket](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes) - Dark mode lightness ranges, OKLCH contrast strategies
- [OddContrast](https://www.oddcontrast.com/) - OKLCH-aware contrast checker tool
- [Tailwind v4 Zinc OKLCH Values](https://tailwindcolor.com/zinc) - OKLCH equivalents for zinc palette
- [Space Grotesk GitHub](https://github.com/floriankarsten/space-grotesk) - Font design context, proportional variant of Space Mono

### Tertiary (LOW confidence)
- WaveSurfer.js OKLCH support - Not verified; needs testing during implementation
- Exact Fontsource CSS import behavior with Tailwind Vite plugin - Not verified with this specific stack combination

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Tailwind v4 @theme is official, Fontsource is the standard self-hosting solution
- Architecture: HIGH - @theme pattern verified from official docs; token naming follows industry conventions
- Pitfalls: HIGH - Contrast ratios calculated from actual hex values; font naming verified from Fontsource docs
- OKLCH token values: MEDIUM - Based on mapping from verified zinc/violet hex values; exact perceptual appearance needs visual verification
- WaveSurfer integration: LOW - OKLCH string compatibility unverified

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable domain; Tailwind v4 API is settled)
