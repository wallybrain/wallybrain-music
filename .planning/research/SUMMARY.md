# Research Summary: Visual Polish Milestone

**Project:** wallybrain-music
**Milestone:** Visual Polish & Design Identity
**Research Date:** 2026-02-09
**Overall Confidence:** HIGH

---

## Executive Summary

This research covers the visual transformation of a functional dark electronic music platform built with SvelteKit 2, Svelte 5, Tailwind CSS v4, and wavesurfer.js. The platform's core functionality (audio playback, waveform interaction, filtering, persistent player, admin tools) is complete and working. The visual polish milestone focuses exclusively on CSS, typography, color, and animation improvements with zero feature additions.

The recommended approach is minimalist and performance-conscious. The existing stack (Tailwind v4.1.18, Svelte 5, wavesurfer.js 7.12.1) already contains 90% of what's needed — gradients, animations, transitions, and design tokens are built-in. Only two new dependencies are required: custom fonts (Space Grotesk variable + Space Mono). The entire design system can be implemented through Tailwind v4's `@theme` directive in a single CSS file, generating semantic tokens without config files or design token libraries.

The key risks are performance-related: wavesurfer.js interaction is fragile under CSS transforms, backdrop-blur kills mobile performance, and the existing dark theme already has contrast failures that visual polish could worsen. The mitigation strategy is to test every CSS change against the functional experience (waveform seeking, scrolling, playback) and enforce minimum contrast ratios (zinc-400 or lighter for all text on zinc-950 backgrounds). Visual polish that degrades the core music listening experience is damage, not improvement.

---

## Key Findings

### From STACK.md

**Existing Capabilities (Zero New Dependencies):**
- Tailwind CSS v4.1.18 includes OKLCH gradients, text shadows, mask utilities, radial/conic gradients, and angled gradients — everything needed for atmospheric design
- Svelte 5 built-in transitions (fade, fly, slide, scale, blur) and animate:flip for list reordering
- Native CSS @property for gradient animations, color-mix() for hover states
- wavesurfer.js supports gradient colors via arrays (no library additions needed)

**New Dependencies (Only 2 Packages):**
- `@fontsource-variable/space-grotesk` — Geometric display font with electronic music heritage (designed for Moogfest)
- `@fontsource/space-mono` — Monospace companion for timestamps/durations
- Total addition: ~60KB for variable font + 2 monospace weights

**Design Token Architecture:**
- Use Tailwind v4's `@theme` directive in app.css to define semantic tokens (surface, accent, waveform colors)
- OKLCH color format for perceptually uniform palette (93%+ browser support)
- Custom @keyframes inside @theme block for animations
- Zero config files, zero design token libraries — CSS-first approach

**What NOT to Add:**
- UI component libraries (Skeleton, shadcn-svelte) — imposes design opinions for tiny component surface
- CSS animation libraries (Motion One, Framer Motion) — Svelte transitions cover all needs
- Full icon libraries — only 8 icons needed, use inline SVG
- CSS preprocessors (SASS, Less) — Tailwind v4 uses Lightning CSS, @theme replaces variables

### From FEATURES.md

**Table Stakes (8 Features, ~4 hours total):**
1. Gradient waveform colors — wavesurfer.js natively supports color arrays
2. Custom web fonts with pairing — Google Fonts or Fontsource, zero restructuring
3. Typography hierarchy — Tailwind utility classes only
4. Skeleton loading placeholders — Pure CSS shimmer with @theme keyframes
5. Cover art shadow/depth — Single class addition (shadow-xl)
6. Player bar icon buttons — Replace text with inline SVGs
7. Card hover micro-interactions — Subtle lift/scale transitions
8. Smooth page transitions — View Transitions API or Svelte fade

**Differentiators (9 Features, ~6-8 hours total):**
1. Art-directed color theming — Extract dominant colors from cover art using Sharp.stats() (already a dependency)
2. Cover art ambient glow — CSS blur/opacity technique (YouTube ambient mode pattern)
3. Track card grid layout — 2-3 column grid with localStorage toggle
4. Waveform visual upgrade — Wider bars (3px), rounded ends, 100px height for detail page
5. Atmospheric page background — Radial gradient overlay on zinc-950
6. Now-playing equalizer indicator — Pure CSS animated bars
7. Cover art hover zoom — CSS scale within clipped container
8. Glassmorphism player bar — Upgrade existing backdrop-blur values
9. Staggered entrance animations — Svelte transition:fly with delay

**Anti-Features (Do Not Build):**
- Real-time audio visualizer (CPU-intensive, fights waveform for attention)
- Animated/particle backgrounds (poor mobile performance, motion hazard)
- Light mode toggle (doubles design surface for zero audience demand in electronic music)
- Parallax scrolling (disorienting on functional list)
- Autoplay background audio (violates browser policies, universally disliked)
- Infinite scroll (catalog under 100 tracks, pagination unnecessary)

**MVP Phasing Recommendation:**
- Phase 1 (Foundation): T2+T3 (fonts/hierarchy), T1+D4 (waveform), T5 (shadow), T7 (hover) — ~2 hours
- Phase 2 (Atmosphere): D5 (background), D8 (glassmorphism), T4 (skeleton), T6 (icons) — ~2 hours
- Phase 3 (Signature): D1 (dominant color), D2 (ambient glow), D6 (equalizer), D9 (stagger) — ~4-5 hours
- Phase 4 (Refinement): D3 (grid), T8 (page transitions), D7 (zoom) — ~2-3 hours

### From ARCHITECTURE.md

**Current State:**
- 100% inline Tailwind utilities, zero component `<style>` blocks
- Hardcoded colors in WaveformPlayer (`#4a4a5a`, `#8b5cf6`)
- No design tokens, no CSS custom properties, no animations
- Minimal app.css (Tailwind import + dark base + scrollbar)

**Recommended Architecture:**
- Single-file token architecture in app.css via @theme
- Semantic naming (surface, accent, text-primary) for intent-based styling
- Separate waveform-* tokens for CSS-to-JS bridge (wavesurfer config)
- Progressive token adoption — old zinc-* classes continue working alongside new semantic tokens
- Svelte transitions on conditional elements only ({#if}, {#each}), CSS animations for always-present content

**Integration Points (Zero New Files):**
- app.css: Add @theme block with semantic tokens, easings, @keyframes
- WaveformPlayer/PersistentPlayer: Read CSS vars via getComputedStyle for wavesurfer colors
- TrackCard/CoverArt: Add hover micro-interactions via utility classes
- +layout.svelte: Wrap PersistentPlayer with transition:fly
- +page.svelte: Add animate:flip to track list {#each}

**Build Order (Dependency-Aware):**
1. Phase 1: Token Foundation (app.css @theme) — MUST be first
2. Phase 2: WaveSurfer Token Integration — depends on Phase 1
3. Phase 3: Component Transitions — depends on Phase 1, independent of Phase 2
4. Phase 4: Hover & Micro-interactions — depends on Phase 1, independent of 2-3
5. Phase 5: List & Page Animations — depends on Phase 1, independent of 2-4

**Patterns to Follow:**
- Gradual token adoption (component-by-component, not all-at-once)
- CSS variables for JS-consumed values (getComputedStyle bridge)
- Svelte transitions on conditional elements only
- Motion-safe by default (motion-safe: prefix or prefers-reduced-motion check)

**Anti-Patterns to Avoid:**
- Token overload (semantic tokens for every possible combination)
- Wholesale class replacement (bulk find-replace zinc-* to surface-*)
- Component `<style>` blocks for animations (requires @reference boilerplate, breaks utility pattern)
- Global page transitions (high complexity, low payoff for 3-page app)
- Using @apply extensively (defeats utility-first CSS)

### From PITFALLS.md

**Critical Pitfalls (Break Functionality):**

1. **Animations interfering with waveform interaction** — CSS transform/filter on wavesurfer ancestors breaks drag-to-seek coordinate mapping. Shadow DOM stacking context issues. **Prevention:** Never apply transform/filter/will-change to waveform ancestors, use opacity transitions only.

2. **Backdrop-blur performance on mobile** — Existing backdrop-blur on persistent player bar. Adding more blur elements compounds GPU load, causes dropped frames, audio stuttering on low-end Android. **Prevention:** Limit backdrop-blur to one element (player bar), use semi-transparent solid as alternative.

3. **Accessibility regression — contrast ratios** — Current app already fails WCAG AA (text-zinc-500 on zinc-950 = 4.12:1, needs 4.5:1). Visual polish risks pushing text darker. **Prevention:** Enforce minimum contrast floor of text-zinc-400 (7.76:1) for all text on zinc-950.

4. **Custom fonts breaking page load performance** — Adding fonts introduces FOIT/FOUT, CLS, slower FCP. Current app uses system fonts (zero delay). **Prevention:** Self-host WOFF2, use font-display: swap or optional, preload fonts, match fallback metrics with size-adjust.

**Moderate Pitfalls (Degrade Experience):**

5. **Breaking responsive layout** — Player bar already carefully responsive (waveform hidden on mobile). Adding elements without responsive hiding breaks layout at 320px. **Prevention:** Test every change at 320px width, use hidden md:block for new player bar elements.

6. **Over-animation adding friction** — 300ms fade-in per card = 300ms slower perceived load. Every action delayed by animation feels slower. **Prevention:** Use transition-colors/opacity (compositor-only), keep transitions under 200ms, play button must be instant.

7. **Gradient/glow effects hurting text readability** — Gradient text with low-contrast sections fails WCAG. Glow effects reduce letter definition for astigmatism (~30% of population). **Prevention:** Check gradient contrast at darkest point, only use on large headings (>=24px), avoid text-shadow glow on small text.

8. **Scope creep** — "Visual polish" expands to features (visualizer, search, sharing, theme switcher, admin redesign). **Prevention:** Rigid scope: CSS, fonts, colors, spacing, animations only. No new .ts files, no API endpoints, no database changes.

9. **Inconsistent design language** — Some pages polished, others not. Feels like two different sites. **Prevention:** Define tokens FIRST, polish in layers (colors everywhere, then typography everywhere), not page-by-page.

**Minor Pitfalls (Polish Issues):**

10. Dark theme color perception — zinc-800 vs zinc-900 indistinguishable on mobile in bright light
11. Svelte transition conflicts with reactive state — transition:fly on {#each} re-animates on filter changes
12. Cover art aspect ratio issues — Removing object-cover or aspect-square breaks square crop
13. CSS specificity wars with Tailwind v4 — Wrong @layer placement causes cascade issues

**Dark-Theme-Specific Risks:**
- Contrast cliff: no graceful degradation, text either reads or doesn't
- Pure black haloing effect for astigmatism users on near-black backgrounds
- Dark-on-dark surface differentiation requires shadows/rings, not just background color
- Colored accents look more saturated on dark backgrounds
- Images (white album covers) need borders/shadows to not float on dark background

---

## Implications for Roadmap

### Recommended Phase Structure

Based on dependencies, performance constraints, and visual impact, the roadmap should follow this structure:

**Phase 1: Foundation (MUST be first, ~2 hours)**
- **What it delivers:** Design system foundation, immediate visual transformation
- **Features:** Custom fonts (T2), typography hierarchy (T3), gradient waveforms (T1), waveform sizing (D4), cover art shadows (T5), card hover interactions (T7)
- **Rationale:** Token foundation and font loading are prerequisites for all other work. Waveform is the most prominent UI element — upgrading it has outsized impact. Every text element improves with font hierarchy. Hover states are pure CSS additions.
- **Pitfalls to avoid:** Font loading performance (Pitfall 4), contrast regression (Pitfall 3)
- **Research needed:** None — standard patterns, high confidence

**Phase 2: Atmosphere (~2 hours)**
- **What it delivers:** Immersive feeling, "designed" appearance
- **Features:** Atmospheric background gradient (D5), glassmorphism player bar refinement (D8), skeleton loading (T4), player bar icon buttons (T6)
- **Rationale:** Builds on Phase 1 tokens. Background gradient and glassmorphism create depth. Skeleton states polish loading. Icon buttons replace debug UI.
- **Pitfalls to avoid:** Backdrop-blur mobile performance (Pitfall 2), breaking responsive layout (Pitfall 5)
- **Research needed:** None — tuning existing backdrop-blur values

**Phase 3: Signature (~4-5 hours)**
- **What it delivers:** Visual distinctiveness, "wow" features
- **Features:** Dominant color extraction (D1), cover art ambient glow (D2), now-playing equalizer (D6), staggered entrance animations (D9)
- **Rationale:** D1 is the centerpiece — per-track color theming. Requires DB migration, Sharp.stats() extraction, CSS custom property integration. D2 amplifies D1's effect. Equalizer is universally recognized. Stagger adds polish without friction.
- **Pitfalls to avoid:** Scope creep (Pitfall 8 — visualizer is out of scope), over-animation (Pitfall 6), animation interfering with waveform (Pitfall 1)
- **Research needed:** Sharp.stats() implementation pattern (documented, high confidence)

**Phase 4: Refinement (Optional, ~2-3 hours)**
- **What it delivers:** Layout flexibility, subtle polish
- **Features:** Grid/list layout toggle (D3), View Transitions API (T8), cover art hover zoom (D7)
- **Rationale:** Can be deferred without feeling incomplete. Grid layout adds browsing mode. Page transitions polish navigation. Zoom adds micro-interaction.
- **Pitfalls to avoid:** Inconsistent design language (Pitfall 9 — both views must be polished), breaking responsive layout (Pitfall 5 — grid must work at 320px)
- **Research needed:** None for D7/T8. D3 needs grid design iteration but no technical unknowns.

### Research Flags

**Phases that need deeper research:**
- **None for implementation** — all technical patterns are documented and verified
- **Phase 3 design decisions** — Dominant color extraction math and color mixing ratios may need iteration during implementation

**Phases with well-documented patterns (skip research):**
- Phase 1: Typography, Tailwind utilities, Svelte transitions — standard web development
- Phase 2: CSS gradients, backdrop-filter tuning — documented browser features
- Phase 4: Grid layout, View Transitions API — standard SvelteKit patterns

### Dependencies and Ordering Constraints

```
Phase 1 (Foundation)
  |
  +---> Phase 2 (Atmosphere) — depends on tokens from Phase 1
  |       |
  |       +---> Phase 3 (Signature) — depends on tokens, can run parallel with Phase 4
  |       |
  |       +---> Phase 4 (Refinement) — depends on tokens, can run parallel with Phase 3
  |
  +---> All phases depend on Phase 1 token foundation
```

**Critical path:** Phase 1 must complete before anything else. Phases 2-4 are largely independent after Phase 1.

**Parallelization opportunities:**
- Within Phase 1: Fonts and waveform work are independent
- Within Phase 2: Background gradient and skeleton loading are independent
- Phase 3 and Phase 4 can run in parallel if resources allow

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | Tailwind v4 @theme, Svelte 5 transitions, wavesurfer.js gradients — all verified against official documentation. OKLCH browser support confirmed at 93%+. |
| **Features** | **HIGH** | Table stakes features (waveform gradients, typography, shadows) are standard techniques. Differentiators (dominant color extraction, ambient glow) have documented implementation patterns. |
| **Architecture** | **HIGH** | Single-file token architecture is recommended pattern per Tailwind v4 docs. Integration points clearly defined. Build order is dependency-aware. |
| **Pitfalls** | **HIGH** | Critical pitfalls documented via wavesurfer.js GitHub issues, Mozilla Bugzilla, WCAG 2.1 spec. Contrast ratios computed mathematically. Dark theme risks specific to this project's zinc-950 background. |

### Specific Confidence Levels

**HIGHEST confidence (official documentation, mathematical certainty):**
- Tailwind v4 @theme syntax and CSS-first configuration
- Svelte 5 transition/animation directives
- WCAG contrast ratios (computed from actual hex values)
- Browser support for OKLCH, @property, backdrop-filter

**HIGH confidence (documented patterns, verified examples):**
- wavesurfer.js gradient colors and bar configuration
- Sharp.stats() for dominant color extraction (already a dependency)
- Font loading strategies (font-display, preload, WOFF2)
- CSS glassmorphism and ambient glow techniques

**MEDIUM confidence (requires visual tuning during implementation):**
- OKLCH color scale values (structure is correct, exact L/C values need iteration)
- Ambient glow blur radius and opacity (documented technique, visual tuning needed)
- Grid layout design (implementation clear, design balance between list/grid needs testing)
- Stagger animation timing (Svelte pattern is documented, easing/delay need tuning)

### Gaps Identified

**No critical gaps.** All technical implementation patterns are documented. The following areas require design iteration during development (not research):

1. **OKLCH color palette tuning** — The @theme structure is correct, but specific lightness/chroma values should be adjusted visually to ensure the violet/surface/accent scales feel harmonious. This is design work, not research.

2. **Contrast validation** — The current app has known contrast failures (text-zinc-500 on zinc-950). Visual polish must fix these, not worsen them. Requires manual audit of every text color during implementation.

3. **Mobile performance testing** — Backdrop-blur performance varies by device. Must test on mid-range Android phone, not just desktop Chrome or iPhone. This is validation, not research.

4. **Waveform interaction testing** — After every CSS change near the player, test drag-to-seek on desktop and mobile to ensure coordinate mapping is not broken. This is functional validation.

5. **Dominant color extraction fallbacks** — D1 requires handling cases where cover art is missing or extraction fails. The technical pattern is clear (Sharp.stats()), but fallback UX needs definition during implementation.

---

## Sources

### Stack Research
- [Tailwind CSS v4 @theme documentation](https://tailwindcss.com/docs/theme)
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4.1 release notes](https://tailwindcss.com/blog/tailwindcss-v4-1)
- [Svelte 5 transition docs](https://svelte.dev/docs/svelte/transition)
- [Svelte svelte/transition module](https://svelte.dev/docs/svelte/svelte-transition)
- [Svelte animate docs](https://svelte.dev/docs/svelte/animate)
- [Fontsource SvelteKit guide](https://fontsource.org/docs/guides/svelte)
- [Space Grotesk on Google Fonts](https://fonts.google.com/specimen/Space+Grotesk)
- [wavesurfer.js gradient fill examples](https://wavesurfer.xyz/example/gradient-fill-styles/)
- [OKLCH in CSS (Evil Martians)](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [CSS @property support (Can I Use)](https://caniuse.com/?search=@property)

### Features Research
- [wavesurfer.js rounded bars example](https://wavesurfer.xyz/example/rounded-bars/)
- [Sharp API — Input/Stats](https://sharp.pixelplumbing.com/api-input/)
- [YouTube Ambient Mode glow (Smashing Magazine)](https://www.smashingmagazine.com/2023/07/recreating-youtube-ambient-mode-glow-effect/)
- [Glassmorphism with Tailwind (Epic Web Dev)](https://www.epicweb.dev/tips/creating-glassmorphism-effects-with-tailwind-css)
- [Tailwind v4 Animation Docs](https://tailwindcss.com/docs/animation)
- [CSS Skeleton Loading (Sling Academy)](https://www.kindacode.com/snippet/tailwind-css-creating-shimmer-loading-placeholder-skeleton/)

### Architecture Research
- [Tailwind CSS v4 Functions and Directives](https://tailwindcss.com/docs/functions-and-directives)
- [Tailwind CSS v4 Adding Custom Styles](https://tailwindcss.com/docs/adding-custom-styles)
- [Tailwind CSS v4 Compatibility (Svelte)](https://tailwindcss.com/docs/compatibility)
- [Svelte 5 Transition Directive](https://svelte.dev/docs/svelte/transition)
- [Svelte 5 Animate Directive](https://svelte.dev/docs/svelte/animate)

### Pitfalls Research
- [wavesurfer.js #2364: CSS scale breaks interaction](https://github.com/katspaugh/wavesurfer.js/issues/2364)
- [Mozilla bug #1718471: backdrop-filter blur laggy](https://bugzilla.mozilla.org/show_bug.cgi?id=1718471)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [W3C WCAG 2.2 Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [DebugBear: Fixing Web Font Layout Shifts](https://www.debugbear.com/blog/web-font-layout-shift)
- [zachleat.com: Font Loading Strategies](https://www.zachleat.com/web/comprehensive-webfonts)
- [MDN: CSS and JavaScript animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance)
- [Smashing Magazine: Inclusive Dark Mode](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/)

---

## Ready for Requirements Definition

This research summary provides:

1. **Clear technology choices** — Only 2 new packages, @theme-based token architecture, zero new files
2. **Defined feature scope** — 8 table stakes + 9 differentiators, with clear anti-features to avoid
3. **Risk-aware architecture** — Critical pitfalls identified with prevention strategies
4. **Dependency-ordered phases** — 4 phases with clear build order and parallelization opportunities
5. **Honest confidence assessment** — HIGH confidence across all domains, minimal gaps, no critical unknowns

The orchestrator can proceed to requirements definition with high confidence. All technical patterns are documented and verified. The primary risks are performance-related and have clear mitigation strategies. The recommended approach is minimalist (only 2 new dependencies), performance-conscious (compositor-only animations, limited backdrop-blur), and accessibility-aware (enforced contrast minimums, motion-safe defaults).
