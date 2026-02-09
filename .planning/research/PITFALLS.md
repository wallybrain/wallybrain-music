# Domain Pitfalls: Visual Polish for an Existing Dark-Themed Music Platform

**Domain:** Adding visual polish to a working SvelteKit music platform
**Researched:** 2026-02-09
**Context:** The app works. All audio playback, waveform interaction, filtering, admin features, and persistent player are functional. The risk is making things worse while trying to make them better.

---

## Critical Pitfalls

Mistakes that break existing functionality or create worse UX than the current "bland" design.

### Pitfall 1: Animations That Interfere with Waveform Interaction

**What goes wrong:** CSS transitions or animations are added to elements near or containing the wavesurfer.js waveform. The waveform canvas stops receiving click/drag events correctly, drag-to-seek becomes erratic, or the waveform visually jitters during interaction.

**Why it happens:** wavesurfer.js v7 renders into a Shadow DOM, which creates its own stacking context. CSS `transform`, `will-change`, or `filter` properties on parent elements create new stacking contexts and containing blocks that can interfere with the Shadow DOM's internal coordinate calculations. When a user drags to seek, wavesurfer calculates click position relative to the container -- if the container has a CSS transform applied (even `scale(1)` for GPU acceleration), the coordinate mapping breaks. Additionally, `transition` on the parent container causes the waveform to be re-composited every frame during the transition, which on mobile causes visible jank and dropped frames during audio playback.

**THIS PROJECT specifically:** The `PersistentPlayer.svelte` bottom bar has `backdrop-blur` and sits in a `fixed` position. Adding entrance/exit animations (slide-up/slide-down) to this bar will cause the waveform inside it to miscalculate seek positions during the animation. The `WaveformPlayer.svelte` on track detail pages is inside a flex layout -- adding animated layout shifts to sibling elements will cause the waveform container to resize, triggering expensive canvas redraws.

**Consequences:**
- Drag-to-seek jumps to wrong positions during or after animations
- Waveform canvas redraws cause audio stuttering on low-end mobile devices
- Users click play and nothing happens because the click hit an animated overlay instead of the canvas
- The feature that makes this a music site (the waveform player) becomes the worst part of the experience

**Prevention:**
- Never apply `transform`, `filter`, or `will-change` to any ancestor of a wavesurfer container
- If animating the persistent player bar, complete the animation before initializing/displaying the waveform (use Svelte's `on:introend` or an `animationend` listener)
- Use `opacity` transitions (compositor-only, no layout impact) instead of `transform: translateY()` for showing/hiding the player bar
- Test drag-to-seek on mobile after every CSS change to the player area
- Keep waveform containers in a stable layout context -- no parent animations, no dynamic sizing

**Detection:** After adding any animation near the player, open the track detail page, start playback, and drag-to-seek back and forth rapidly. If the playback position does not match where you clicked, coordinate mapping is broken. Test on both Chrome and Safari.

**Confidence:** HIGH -- documented in wavesurfer.js issues (#2364: CSS scale breaks interaction, #1863: interact option problems with CSS transforms). Shadow DOM stacking context behavior is per W3C spec.

**Sources:**
- [wavesurfer.js #2364: bug when using CSS scale](https://github.com/katspaugh/wavesurfer.js/issues/2364)
- [wavesurfer.js #1863: interact option problems](https://github.com/katspaugh/wavesurfer.js/issues/1863)
- [wavesurfer.js v7 Shadow DOM discussion](https://github.com/katspaugh/wavesurfer.js/discussions/2798)

---

### Pitfall 2: Backdrop-Blur Performance on Mobile

**What goes wrong:** The persistent player bar (already using `bg-zinc-900/95 backdrop-blur`) becomes the source of dropped frames and choppy scrolling on mobile devices, especially when additional blur or filter effects are added elsewhere on the page.

**Why it happens:** `backdrop-filter: blur()` requires the GPU to continuously sample and blur the pixels behind the element. On mobile GPUs, this is expensive -- particularly when the element is `position: fixed` and the content behind it scrolls. Each scroll frame requires re-blurring. Adding more `backdrop-blur` elements (e.g., modal overlays, header bars, toast notifications) multiplies the GPU workload. Firefox on Android has documented performance issues with `backdrop-filter` (Mozilla bug #1718471). Low-end Android devices (which are the majority of Android users) can drop to 15-20fps with even a single large `backdrop-blur` element during scroll.

**THIS PROJECT specifically:** The `PersistentPlayer.svelte` already uses `backdrop-blur` on a fixed-position bar. This is the one element on the page that must never cause frame drops because the user interacts with it while music is playing. Adding blur effects to the track listing, cover art overlays, or modal dialogs will compound the GPU load with this existing blur.

**Consequences:**
- Choppy scrolling on mobile while music is playing
- Audio playback stuttering on low-end devices (GPU contention can affect audio thread scheduling)
- Battery drain from continuous GPU compositing
- Users perceive the site as "laggy" even though it was smooth before the visual polish

**Prevention:**
- Limit `backdrop-blur` to exactly one element on the page at a time (the persistent player bar)
- Use `bg-zinc-900/95` or `bg-zinc-900/98` without `backdrop-blur` as a visually similar but performant alternative -- on a dark theme, the visual difference between a semi-transparent solid and a blur is minimal
- If blur is kept, use a small radius (`blur-sm` = 4px, not `blur-lg` = 16px)
- Never stack multiple `backdrop-blur` elements (e.g., player bar + modal overlay)
- Test on a mid-range Android phone (not just iPhone or desktop Chrome)
- Profile with Chrome DevTools Performance tab: look for long "Composite Layers" times

**Detection:** Open the site on a phone, start a track playing, and scroll the track listing. If scrolling feels different (heavier/choppier) than before the visual changes, `backdrop-filter` is likely the cause. Check with `backdrop-blur` removed to confirm.

**Confidence:** HIGH -- documented in Mozilla Bugzilla (#1718471), Chrome issues, and shadcn-ui (#327).

**Sources:**
- [Mozilla bug #1718471: backdrop-filter blur is laggy](https://bugzilla.mozilla.org/show_bug.cgi?id=1718471)
- [shadcn-ui #327: CSS backdrop filter causing performance issues](https://github.com/shadcn-ui/ui/issues/327)
- [Chrome #7896: CSS blur filter seriously impacts performance](https://github.com/nextcloud/spreed/issues/7896)

---

### Pitfall 3: Accessibility Regression -- Contrast Ratios on Dark Theme

**What goes wrong:** Visual polish reduces already-marginal contrast ratios below WCAG thresholds, making text unreadable for users with any visual impairment. Text becomes decorative rather than functional.

**Why it happens:** Dark theme polish tends to push text colors toward the background to achieve a "muted," "elegant," or "moody" aesthetic. The app already has this problem: `text-zinc-500` (#71717a) on `zinc-950` (#09090b) has a contrast ratio of 4.12:1, which FAILS WCAG AA for normal text (requires 4.5:1). During visual polish, designers often push secondary text even darker (`text-zinc-600`, which is 2.57:1 -- catastrophically failing). The instinct to make things look "subtle" directly conflicts with readability.

**THIS PROJECT specifically -- current contrast audit:**

| Text Class | Hex | Ratio vs zinc-950 | WCAG AA Normal | Status |
|-----------|-----|-------------------|----------------|--------|
| `text-white` | #ffffff | 19.47:1 | PASS | Good |
| `text-zinc-200` | #e4e4e7 | 15.68:1 | PASS | Good |
| `text-zinc-300` | #d4d4d8 | 13.46:1 | PASS | Good |
| `text-zinc-400` | #a1a1aa | 7.76:1 | PASS | Good |
| **`text-zinc-500`** | **#71717a** | **4.12:1** | **FAIL** | **Already failing** |
| `text-zinc-600` | #52525b | 2.57:1 | FAIL | Very bad |
| `text-zinc-700` | #3f3f46 | 1.91:1 | FAIL | Nearly invisible |

The app currently uses `text-zinc-500` for: play counts, duration on track cards, "electronic music" subtitle, filter tag text, volume label, timestamps, "Added [date]" text, and the "Clear all filters" link. All of these fail WCAG AA.

It uses `text-zinc-600` for: the music note placeholder, the "edit" link on track detail pages. These are nearly invisible.

**Consequences:**
- Users with low vision, aging eyes, or who are in bright environments cannot read secondary information
- Legal risk in jurisdictions with digital accessibility requirements (ADA, EAA)
- The information that is hardest to read is often the most useful (play counts, durations, dates)

**Prevention:**
- Establish a minimum contrast floor: no text on zinc-950 below `text-zinc-400` (#a1a1aa, 7.76:1)
- For secondary/meta text, use `text-zinc-400` instead of `text-zinc-500`
- For truly decorative elements (borders, separators), `text-zinc-600` or `text-zinc-700` is acceptable because these are not text content
- If adding gradient text effects, check contrast at the darkest point of the gradient, not the average
- Run contrast checks on every text color during implementation, not as a post-hoc audit
- Use the WebAIM contrast checker: https://webaim.org/resources/contrastchecker/

**Detection:** Use browser dev tools accessibility audit (Lighthouse, axe). Or visually: view the page at arm's length in a bright room. If you cannot read the secondary text, it fails.

**Confidence:** HIGH -- WCAG 2.1 SC 1.4.3 is a formal standard. Contrast ratios computed mathematically from the actual hex values in the codebase.

**Sources:**
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [W3C WCAG 2.2 Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Smashing Magazine: Inclusive Dark Mode](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/)

---

### Pitfall 4: Custom Fonts Breaking Page Load Performance

**What goes wrong:** Adding a custom display font (e.g., for the "wallybrain" header or track titles) causes Flash of Invisible Text (FOIT), Flash of Unstyled Text (FOUT), Cumulative Layout Shift (CLS), and slower First Contentful Paint (FCP).

**Why it happens:** The current app uses no custom fonts -- it relies on the system font stack via Tailwind's defaults, which means zero font loading delay. Adding even one custom font introduces a network request that blocks or delays text rendering. FOIT (text invisible until font loads) makes the site appear broken for 100-500ms. FOUT (text renders in fallback then swaps) causes visible layout shifts as the new font has different metrics (height, width, spacing). On slow connections (mobile on cellular), font loading can take 2-3 seconds, during which the header says nothing or says the wrong thing.

**THIS PROJECT specifically:** The site title "wallybrain" in the header is the first thing users see. If a custom font is applied to it, FOIT means the header is blank for the first render. The "Tracks" heading on the main page and track titles use `font-bold` -- switching to a custom bold font with different metrics will shift the layout of every track card, causing CLS.

**Consequences:**
- LCP (Largest Contentful Paint) increases by 200-800ms depending on font file size and connection speed
- CLS score degrades from layout shifts during font swap
- On slow connections, the page appears blank or broken until fonts load
- Users see text "jump" as fonts swap in, which feels unpolished -- the opposite of the intended effect

**Prevention:**
- Limit custom fonts to one family, one or two weights maximum
- Use `font-display: swap` at minimum (shows fallback immediately, swaps when ready)
- Better: use `font-display: optional` for non-critical text (if font loads instantly, great; otherwise fallback stays -- zero CLS)
- Self-host fonts as WOFF2 files (smallest format, no third-party dependency)
- Preload the font in `app.html`: `<link rel="preload" href="/fonts/font.woff2" as="font" type="font/woff2" crossorigin>`
- Use Fontaine or `@font-face` `size-adjust` to match fallback font metrics to the custom font, eliminating layout shift
- For Tailwind CSS v4, define custom fonts via `@theme` in app.css: `--font-display: "YourFont", system-ui, sans-serif;`
- Consider variable fonts (one file for all weights) to reduce total download size

**Detection:** Open Chrome DevTools, go to the Performance tab, reload the page. Look for a gap between FCP and the text becoming visible, or a layout shift at the time fonts load. Run Lighthouse and check CLS score before and after adding fonts.

**Confidence:** HIGH -- font performance is extensively documented by web.dev, DebugBear, and zachleat.com.

**Sources:**
- [DebugBear: Fixing Layout Shifts Caused by Web Fonts](https://www.debugbear.com/blog/web-font-layout-shift)
- [zachleat.com: Comprehensive Guide to Font Loading Strategies](https://www.zachleat.com/web/comprehensive-webfonts)
- [JVP Design: Self-Hosting a Font with Tailwind and SvelteKit](https://www.jvp.design/blog/self-hosting-a-font-with-tailwind-and-sveltekit)

---

## Moderate Pitfalls

### Pitfall 5: Breaking Responsive Layout During Polish

**What goes wrong:** CSS changes that look great on desktop break the mobile layout. The persistent player bar overflows, track cards lose their truncation, the waveform disappears, or horizontal scrolling appears.

**Why it happens:** Tailwind's mobile-first breakpoint system means unprefixed classes apply to all screen sizes and `md:` prefixed classes apply at 768px+. During visual polish, adding width/height/padding changes without testing at mobile sizes creates overflow. Common mistakes:
1. Adding `w-[400px]` or other fixed widths that exceed mobile viewport
2. Changing `gap-3` to `gap-6` without checking it compresses content on small screens
3. Adding decorative elements (icons, badges, labels) that push content off-screen at narrow widths
4. Using `hidden md:block` for the waveform in the persistent player (already done correctly) but then adding new elements without the same responsive hiding

**THIS PROJECT specifically:** The persistent player bar is already carefully responsive -- the waveform is `hidden md:block` (hidden on mobile, shown on desktop), and the volume slider is `hidden md:flex`. This works because there is not enough horizontal space on mobile for all elements. Adding ANY new visual elements to this bar (e.g., a now-playing animation, an equalizer icon, a progress ring) without hiding them on mobile will break the layout. The track card has `min-w-0` and `truncate` on the title -- changing these during polish will cause titles to overflow.

**Consequences:**
- Horizontal scrollbar appears on mobile (the cardinal sin of mobile web)
- Player controls become unreachable or too small to tap
- Content overlaps or gets clipped
- The polish milestone creates a bug that was not there before

**Prevention:**
- Test every CSS change at 320px viewport width (iPhone SE) before committing
- Never add fixed pixel widths inside flex containers without responsive alternatives
- When adding new elements to the persistent player bar, always include `hidden md:block` or `hidden md:flex` if they are not essential on mobile
- Keep the `min-w-0` on flex children -- removing it allows content to overflow
- Keep `truncate` on text that could be long (track titles, descriptions)
- Use Chrome DevTools responsive mode, but also test on a real phone (viewport rendering differs)

**Detection:** After any CSS change, resize the browser to 320px wide. If anything overflows, disappears, or overlaps, the change is not mobile-safe.

**Confidence:** HIGH -- standard responsive design practice, verified against the actual responsive patterns already in the codebase.

---

### Pitfall 6: Over-Animation -- Adding Motion That Adds Friction

**What goes wrong:** The site gains entrance animations, hover effects, loading transitions, and micro-interactions that slow down the user experience. Every action now takes 300-500ms longer because of animation delays. The site feels "slower" even though it is technically the same speed.

**Why it happens:** Visual polish is often conflated with "more animation." Designers and developers add transitions because they can, not because they should. A 300ms fade-in on every track card means the track listing takes 300ms longer to appear. A 200ms scale-up on hover means every button click has a 200ms delay before the action feels acknowledged. For a music platform where the primary action is "click play," any delay between click and playback is felt.

**THIS PROJECT specifically:** The app currently uses `transition-colors` on hover states (which is correct and fast -- color transitions do not cause layout or paint). Adding `transition-all` instead would animate layout properties (padding, margin, width, height), causing jank. Adding `transition: transform 300ms` to track cards for a hover scale effect would mean 300ms of GPU compositing per card, with no benefit to the user.

**Consequences:**
- The site feels slower than before the visual polish
- Audio playback start is delayed by entrance animations
- Scroll performance degrades from animating many elements
- Users with motion sensitivity (`prefers-reduced-motion`) experience discomfort
- Mobile users see janky animations that were smooth on desktop

**Prevention:**
- Use `transition-colors` and `transition-opacity` instead of `transition-all` -- these are compositor-only and do not cause layout recalculation
- Keep transitions under 200ms for interactive elements (buttons, hovers)
- Do not animate entrance/exit of content that the user is waiting to interact with (track list should appear instantly)
- Respect `prefers-reduced-motion`: wrap animations in `@media (prefers-reduced-motion: no-preference)` or use Tailwind's `motion-safe:` prefix
- The play button must have zero animation delay -- click to play must be instant
- One subtle animation done well (e.g., a now-playing indicator pulse) is better than ten mediocre ones

**Detection:** Time the perceived interval between clicking "Play" and hearing audio. If it is noticeably longer after adding animations, remove them. Also: use the site for 5 minutes. If you start noticing the animations (rather than the content), there are too many.

**Confidence:** HIGH -- animation performance principles are well-established (web.dev, MDN, Motion Magazine).

**Sources:**
- [MDN: CSS and JavaScript animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance)
- [Motion Magazine: Web Animation Performance Tier List](https://motion.dev/magazine/web-animation-performance-tier-list)

---

### Pitfall 7: Gradient and Glow Effects Hurting Text Readability

**What goes wrong:** Gradient text, glowing text effects, or gradient backgrounds make text harder to read rather than more visually appealing. Text that was clearly readable as solid `text-zinc-200` becomes partially unreadable when a gradient passes through low-contrast colors.

**Why it happens:** CSS gradient text (using `background-clip: text` and `text-fill-color: transparent`) creates visually striking headings, but the gradient's contrast varies across the text. If the gradient goes from violet-400 to violet-600, the violet-600 portion (3.49:1 contrast on zinc-950) fails WCAG AA. Glow effects (`text-shadow` with colored blur) look impressive in mockups but cause a "halo" effect that reduces letter definition, especially for users with astigmatism (approximately 30% of the population). On dark backgrounds, glowing text bleeds into surrounding elements.

**THIS PROJECT specifically:** The temptation to add a violet gradient to "wallybrain" or track titles is strong -- it matches the existing violet accent color. But violet-600 on zinc-950 is only 3.49:1 contrast (fails AA for normal text). A gradient from white to violet would pass at the white end but fail at the violet end. Glow effects on the "Now playing" text in the persistent player bar would reduce readability of the track title at the exact moment it matters most.

**Consequences:**
- Section of gradient text becomes unreadable
- Glow effects cause "fuzzy" text that is tiring to read
- Users with astigmatism see haloed, blurred text
- The visual effect draws attention to the styling instead of the content

**Prevention:**
- If using gradient text, ensure the minimum contrast color in the gradient passes WCAG AA (4.5:1 for normal text, 3:1 for large text >= 24px)
- For this project's zinc-950 background, gradient text should not go darker than `violet-400` (#a78bfa, 7.31:1) or `zinc-400` (#a1a1aa, 7.76:1)
- Use gradient text only on large headings (>= 24px / `text-2xl`) where the 3:1 large-text threshold applies
- Avoid `text-shadow` glow effects on body text or small text
- If using glow on headings, keep the blur radius small (1-2px) and use a color close to the text color
- Test gradient text readability by squinting -- if it becomes unreadable, the low-contrast sections are too prominent

**Detection:** Take a screenshot of gradient text, convert to grayscale. If any portion of the text blends into the background in grayscale, contrast is insufficient.

**Confidence:** HIGH -- WCAG contrast requirements are mathematical, and the specific hex values in this project have been computed.

---

### Pitfall 8: Scope Creep -- "While We're At It" Feature Additions

**What goes wrong:** The visual polish milestone expands to include new features disguised as design work. "Let's add a now-playing animation" becomes "Let's build a visualizer." "Let's improve the filter UI" becomes "Let's add search." "Let's make the admin page look better" becomes "Let's rebuild the admin with a new component library."

**Why it happens:** Visual polish touches every page and component. While working on the TrackCard styling, the developer notices the filtering could be improved. While working on typography, they think "we should add a footer." While working on the player bar, they think "we should add a visualizer." Each addition seems small, but together they transform a visual-polish milestone into a feature-development milestone with no defined scope.

**THIS PROJECT specifically:** The biggest scope creep risks are:
1. **Visualizer/equalizer**: "The player needs a visual equalizer" -- this is a new feature requiring Web Audio API integration, not visual polish
2. **Search**: "The filter bar needs a search box" -- this is a new backend feature requiring full-text search infrastructure
3. **Social sharing buttons**: "The track page needs sharing" -- this is a new feature with its own UX/behavior
4. **Theme switcher**: "We should offer light mode too" -- this doubles the CSS work and introduces state management
5. **Admin redesign**: "While we're touching the CSS, let's redo the admin" -- the admin has one user (you), polish there has near-zero ROI

**Consequences:**
- The milestone takes 5x longer than planned
- New features are half-baked because they were not properly scoped
- The visual consistency that was the original goal never gets achieved
- Regression bugs from feature changes, not just CSS changes

**Prevention:**
- Define the scope rigidly: "This milestone changes CSS, fonts, colors, spacing, and adds static visual elements only. No new JavaScript behavior, no new API endpoints, no new database queries."
- Keep a "v1.2 ideas" list -- when scope creep urges arise, write them down and move on
- The test: if a change requires modifying a `.ts` file or a `+server.ts` endpoint, it is not visual polish
- Admin pages are explicitly out of scope -- they work, they have one user, polish them later (or never)

**Detection:** If the PR diff includes changes to server-side code, API routes, or database schema, scope has crept.

**Confidence:** HIGH -- scope creep is the most common project management pitfall, and visual polish milestones are particularly susceptible because they touch everything.

**Sources:**
- [Speckyboy: How to Handle Scope Creep in Web Design](https://speckyboy.com/scope-creep-web-design/)

---

### Pitfall 9: Inconsistent Design Language After Partial Polish

**What goes wrong:** Some pages get polished while others do not, creating an inconsistent experience that feels worse than uniformly "bland." The track listing page has smooth animations and a custom font, but the track detail page still looks like the old design. The filter bar has new styling but the persistent player does not.

**Why it happens:** Visual polish is applied page-by-page or component-by-component. The developer finishes the track listing page and it looks great. Then they move to the track detail page, but time runs out or motivation fades. The result is a site that looks like two different sites stitched together. Users notice inconsistency more than they notice blandness.

**THIS PROJECT specifically:** The app has these distinct visual zones:
1. Header ("wallybrain" text link)
2. Track listing page (FilterBar + TrackCards)
3. Track detail page (CoverArt + WaveformPlayer + metadata)
4. Persistent player bar
5. Error page
6. Admin pages (out of scope, but still exist)

If the track listing gets new card designs but the track detail page still uses the old layout, clicking a track will feel like navigating to a different website.

**Consequences:**
- Users perceive the site as "buggy" or "unfinished" -- worse than consistently simple
- Design decisions made for one page conflict with another (e.g., different heading sizes)
- Future maintenance is harder because there is no single design system

**Prevention:**
- Define a design token set FIRST (colors, spacing scale, border radii, shadows, font sizes) before touching any component
- Apply tokens globally via `app.css` `@theme` definitions and Tailwind CSS v4's CSS-first configuration
- Polish in layers, not pages: first update all colors everywhere, then all typography everywhere, then all spacing everywhere
- Each layer is a complete pass across all pages, ensuring consistency at every step
- Do the persistent player bar and track cards in the same pass -- they share visual language (both use violet accents, zinc backgrounds, similar spacing)

**Detection:** After polishing one page, navigate to every other page. If any page feels visually disconnected, the design language is inconsistent.

**Confidence:** HIGH -- design consistency is a fundamental UX principle.

---

## Minor Pitfalls

### Pitfall 10: Dark Theme Color Perception Issues

**What goes wrong:** Colors that look distinct on a calibrated desktop monitor are indistinguishable on mobile screens in bright ambient light. The difference between `zinc-800` and `zinc-900` (used for card backgrounds vs. page background) disappears, making the UI look flat and undifferentiated.

**Why it happens:** Dark themes have very little luminance range to work with. The entire zinc scale from 700 to 950 spans a luminance range of only about 1.8:1. On a phone screen in sunlight, these become a single dark blob. Subtle borders (`border-zinc-800/50`) vanish entirely.

**Prevention:**
- Use more contrast between surface levels: zinc-950 (page) vs zinc-800 (cards) rather than zinc-900/50 (current card background)
- Do not rely solely on subtle background differences to define structure -- use borders or subtle shadows
- Test on a phone in a bright room, not just in a dark IDE environment
- Consider a subtle `shadow-lg` or `ring-1 ring-zinc-800` on cards instead of relying on background color alone

**Detection:** Take the site outside (or turn up screen brightness to maximum) and try to identify where cards begin and end.

**Confidence:** MEDIUM -- visual perception varies by device and environment, but the principle is well-established.

---

### Pitfall 11: Svelte Transition Conflicts with Existing State

**What goes wrong:** Adding Svelte `transition:` directives to elements that are conditionally rendered based on reactive state causes the transitions to fight with state updates. A track card with `transition:fly` starts its entrance animation, but the user clicks play during the animation, and the click is either missed or causes a visual glitch.

**Why it happens:** Svelte transitions are tied to the mount/unmount lifecycle. If an element is re-created due to a reactive state change (e.g., the track list re-renders because `data.tracks` changes during a filter update), all transition:fly animations restart. With Svelte 5's `$effect` and `$derived`, reactive updates can trigger more frequently than expected, causing repeated entrance animations.

**THIS PROJECT specifically:** The `{#each data.tracks as track, i (track.id)}` loop in `+page.svelte` uses a keyed each block. Adding `transition:fly` to TrackCard would cause all cards to animate in on initial page load (nice) but also re-animate on every filter change (annoying). The `{#if playerState.currentTrack}` in `+layout.svelte` controls the persistent player -- adding a transition here means the player slides in when a track starts and slides out when playback ends, which could be jarring.

**Prevention:**
- Use `in:` (intro only) transitions for initial page load, not `transition:` (which also animates removal)
- Do not add transitions to elements inside `{#each}` blocks that re-render on filter/state changes
- For the persistent player, if a transition is desired, use `in:fly` only (not `transition:fly`) so it animates in but does not animate out
- Test transitions with rapid state changes (quick filter clicks, rapid play/pause)

**Detection:** Click a filter button rapidly 5 times. If track cards are visibly re-animating on each click, the transition is attached to a re-rendering element.

**Confidence:** HIGH -- Svelte 5 transition behavior is documented in the official tutorial.

**Sources:**
- [Svelte docs: transition directive](https://svelte.dev/docs/svelte/transition)
- [Svelte tutorial: in and out](https://svelte.dev/tutorial/svelte/in-and-out)

---

### Pitfall 12: Cover Art Aspect Ratio and Object-Fit Issues

**What goes wrong:** Cover art images become stretched, squished, or cropped incorrectly when CSS changes are applied. The existing `object-cover` class gets accidentally removed or overridden, or new sizing classes change the aspect ratio container.

**Why it happens:** The `CoverArt.svelte` component uses fixed size classes (`w-16 h-16`, `w-24 h-24 md:w-32 md:h-32`) with `object-cover`. During polish, changing these to percentage-based widths, adding border-radius changes, or wrapping in a new container can break the aspect ratio. The `lg` size uses `w-full max-w-md aspect-square`, which is correct but fragile -- removing `aspect-square` or changing the parent flex layout causes the image to stretch.

**Prevention:**
- Always keep `aspect-square` on cover art containers (or `aspect-ratio: 1/1` in custom CSS)
- Always keep `object-cover` on `<img>` elements for cover art
- If changing cover art sizes, test with both square and non-square source images
- If adding rounded corners, ensure they match on both the `<img>` and the placeholder `<div>`

**Detection:** Upload a non-square image as cover art. Check that it displays as a square crop, not stretched.

**Confidence:** HIGH -- basic CSS, but easy to accidentally break when refactoring class lists.

---

### Pitfall 13: CSS Specificity Wars with Tailwind v4

**What goes wrong:** Custom CSS in `app.css` is overridden by Tailwind utilities, or vice versa. The `@layer base` styles conflict with utility classes. Adding custom component styles creates unexpected cascade behavior.

**Why it happens:** Tailwind CSS v4 uses CSS cascade layers (`@layer base`, `@layer components`, `@layer utilities`). Utilities in the `utilities` layer have higher specificity than anything in `base` or `components`. If custom polish styles are written in the wrong layer, they will either override everything (if too specific) or be overridden by everything (if in a lower layer). Adding `!important` to fight specificity creates an unmaintainable cascade.

**THIS PROJECT specifically:** The `app.css` file uses `@layer base` for the html background color and text color. If new visual polish styles are added outside a `@layer` directive, they will have higher specificity than both base and utility styles, potentially breaking existing Tailwind classes. Conversely, styles inside `@layer base` will be overridden by any Tailwind utility.

**Prevention:**
- Put global styles in `@layer base` (background, body text color, scrollbar styles -- already done correctly)
- Put component-level custom styles in `@layer components`
- Never use `!important` -- fix the layer instead
- Prefer Tailwind utilities over custom CSS whenever possible (the current codebase does this well)
- If adding custom animations (`@keyframes`), define them outside `@layer` blocks (keyframes are not affected by layers)

**Detection:** If a Tailwind class stops working after adding custom CSS, check whether the custom CSS is in the wrong layer.

**Confidence:** HIGH -- Tailwind v4 layer behavior is documented in official docs.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Typography (custom fonts) | Font loading FOIT/FOUT and CLS (Pitfall 4) | Self-host WOFF2, preload, font-display: optional |
| Typography (custom fonts) | Layout shifts from different font metrics (Pitfall 4) | Use size-adjust or Fontaine to match fallback metrics |
| Color system updates | Contrast regression below WCAG AA (Pitfall 3) | Enforce zinc-400 minimum for text on zinc-950 |
| Color system updates | Gradient text with low-contrast sections (Pitfall 7) | Check contrast at the darkest point of gradient |
| Player bar polish | Animation breaking waveform seek (Pitfall 1) | No transforms on waveform ancestors; opacity only |
| Player bar polish | Backdrop-blur mobile performance (Pitfall 2) | Consider removing blur or limiting to one element |
| Track card redesign | Breaking responsive layout (Pitfall 5) | Test at 320px width after every change |
| Track card redesign | Over-animation slowing perceived load (Pitfall 6) | transition-colors only, no entrance delays |
| Global visual pass | Inconsistent design language (Pitfall 9) | Polish in layers (colors, then type, then spacing), not pages |
| Global visual pass | Scope creep into features (Pitfall 8) | No new .ts files or API endpoints in this milestone |
| Cover art styling | Aspect ratio breakage (Pitfall 12) | Keep object-cover and aspect-square always |
| Custom CSS additions | Specificity conflicts with Tailwind v4 (Pitfall 13) | Use @layer components for custom styles |
| Svelte transitions | Transition conflicts with reactive state (Pitfall 11) | Use in: not transition:, avoid on {#each} blocks |

---

## Dark-Theme-Specific Pitfall Summary

These pitfalls are unique to or exacerbated by the dark zinc-950 theme:

1. **Contrast cliff**: The jump from "readable" to "unreadable" is much steeper on dark backgrounds. On white backgrounds, even low-contrast text (gray on white) is somewhat readable. On near-black backgrounds, low-contrast text (dark gray on near-black) is invisible. There is no graceful degradation -- text either reads or it does not.

2. **Pure black vs. dark gray halo effect**: The zinc-950 (#09090b) background is very close to pure black. Light text on near-black backgrounds causes a "haloing" effect for users with astigmatism (~30% of population), where the edges of characters appear to glow or blur. Using slightly heavier font weights (medium instead of normal for body text) mitigates this.

3. **Dark-on-dark surface differentiation**: The current card background (`bg-zinc-900/50`) is barely distinguishable from the page background (`zinc-950`). Adding more surface layers (modals, dropdowns, tooltips) requires a clear elevation system. The Tailwind zinc scale does not have enough steps between 800 and 950 for this. Consider using subtle `ring-1 ring-white/5` or `shadow` instead of relying only on background color differences.

4. **Colored elements look more saturated on dark backgrounds**: The violet-600 accent buttons look more vivid on zinc-950 than they would on white. This is generally good for a music platform (vibrant, energetic) but means adding more accent colors risks visual noise. Stick to one accent color (violet) with one complementary (already using red-400 for errors).

5. **Images need careful handling**: Cover art designed for light backgrounds (white album covers) can appear to "float" on dark backgrounds without a border or shadow. The current `rounded-lg` provides some containment, but adding a subtle `ring-1 ring-white/10` to cover art images prevents them from blending into the background.

---

## Key Takeaway

The single most important principle for this milestone: **every visual change must be tested against the functional experience.** Play a track. Seek in the waveform. Scroll the track list. Switch tracks. Do this after every CSS change. Visual polish that degrades the core music listening experience is not polish -- it is damage.

The second most important principle: **contrast is king on dark themes.** The current site already has contrast failures (text-zinc-500 on zinc-950). The polish milestone must fix these, not make them worse. When in doubt, use a lighter shade.

**Sources:**
- [Smashing Magazine: Inclusive Dark Mode](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/)
- [Digital Silk: Dark Mode Design Guide 2026](https://www.digitalsilk.com/digital-trends/dark-mode-design-guide/)
- [The Accessibility Checker: Designer's Guide to Dark Mode Accessibility](https://www.accessibilitychecker.org/blog/dark-mode-accessibility/)
