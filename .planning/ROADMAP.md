# Roadmap: wallybrain-music

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-7 (shipped 2026-02-09)
- 🚧 **v1.1 Visual Polish** -- Phases 8-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) -- SHIPPED 2026-02-09</summary>

- [x] Phase 1: Foundation (2/2 plans) -- completed 2026-02-08
- [x] Phase 2: Processing Pipeline (2/2 plans) -- completed 2026-02-08
- [x] Phase 3: Waveform Player (2/2 plans) -- completed 2026-02-08
- [x] Phase 4: Track Pages (2/2 plans) -- completed 2026-02-08
- [x] Phase 5: Admin Interface (2/2 plans) -- completed 2026-02-09
- [x] Phase 6: Discovery and Engagement (2/2 plans) -- completed 2026-02-09
- [x] Phase 7: Persistent Player and Queue (2/2 plans) -- completed 2026-02-09

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Visual Polish (In Progress)

**Milestone Goal:** Transform the bland, template-looking site into a visually distinctive music platform that blends SoundCloud's functional clarity with Bandcamp's artistic presentation.

**Phase Numbering:**
- Integer phases (8, 9, 10, 11): Planned milestone work
- Decimal phases (8.1, 9.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 8: Design Foundation** - Custom typography, OKLCH design tokens, contrast fixes, typographic hierarchy ✅ 2026-02-10
- [x] **Phase 9: Visual Richness** - Waveform gradients, cover art depth, hover interactions, glassmorphism, background atmosphere, skeleton loading ✅ 2026-02-10
- [x] **Phase 10: Signature Identity** - Dominant color extraction, ambient glow, equalizer animation, staggered entrance ✅ 2026-02-10
- [ ] **Phase 11: Refinement** - Grid/list toggle, page transitions, cover art hover zoom

## Phase Details

### Phase 8: Design Foundation
**Goal**: The site has a coherent, accessible design system with custom typography that replaces the generic Tailwind look
**Depends on**: Nothing (first phase of v1.1; builds on shipped v1.0)
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04
**Success Criteria** (what must be TRUE):
  1. Headings render in Space Grotesk and timestamps/durations render in Space Mono, with system fonts for body text -- visually distinct from default Tailwind typography
  2. All colors reference semantic OKLCH design tokens (surface, accent, text-primary) defined via Tailwind v4 @theme, replacing hardcoded zinc/hex values
  3. Every text element on every page passes WCAG AA contrast (4.5:1 minimum) against its background -- verifiable with browser dev tools
  4. Headings, body text, captions, and metadata are visually distinct from each other through clear size, weight, and tracking differences
**Plans:** 2 plans

Plans:
- [x] 08-01-PLAN.md -- Design token system, font installation, and public page migration ✅
- [x] 08-02-PLAN.md -- Waveform player, track detail, and admin page migration + visual verification ✅

### Phase 9: Visual Richness
**Goal**: The site feels immersive and designed -- depth, motion, and texture replace flat, static elements
**Depends on**: Phase 8 (uses design tokens for colors/gradients)
**Requirements**: ATMO-01, ATMO-02, ATMO-03, ATMO-04, ATMO-05, ATMO-06
**Success Criteria** (what must be TRUE):
  1. Waveform displays a purple-to-violet gradient progression instead of flat single colors, visible in both track cards and detail page
  2. Cover art appears elevated from the background with shadow, border, or glow -- not flat against the surface
  3. Track cards respond to hover with a visible micro-interaction (scale, shadow lift, or background shift) that feels responsive without being distracting
  4. The persistent player bar has a translucent glassmorphism effect (background blur visible when content scrolls behind it)
  5. Page background uses a subtle gradient or texture instead of flat zinc-950, creating visual depth without competing with content
  6. When tracks are loading, skeleton placeholders appear instead of blank space or layout jumps
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

### Phase 10: Signature Identity
**Goal**: The site has a distinctive visual identity that no other music platform has -- per-track color theming and signature animations
**Depends on**: Phase 8 (uses design tokens); independent of Phase 9
**Requirements**: SIGN-01, SIGN-02, SIGN-03, SIGN-04
**Success Criteria** (what must be TRUE):
  1. Opening a track detail page shows an ambient color accent (tinted background, glow) derived from that track's cover art -- each track feels visually unique
  2. The currently-playing track shows an animated equalizer bar indicator that distinguishes it from other tracks at a glance
  3. When the track listing loads, tracks appear with a staggered entrance animation (not all at once), creating a polished reveal effect
  4. On the track detail page, cover art has an ambient glow effect matching the extracted dominant color, creating visual depth around the artwork
**Plans:** 2 plans

Plans:
- [x] 10-01-PLAN.md -- Schema, color extraction pipeline, backfill, color utilities, EqIndicator component ✅
- [x] 10-02-PLAN.md -- Ambient tint, cover art glow, equalizer indicator, staggered entrance animations ✅

### Phase 11: Refinement
**Goal**: Layout flexibility and navigation polish complete the visual experience
**Depends on**: Phase 8 (uses design tokens); independent of Phases 9-10
**Requirements**: REFI-01, REFI-02, REFI-03
**Success Criteria** (what must be TRUE):
  1. Track listing offers a grid/list layout toggle that persists across page loads, with both views looking polished and responsive
  2. Navigating between pages uses smooth transitions (fade, slide, or cross-fade) instead of hard page swaps
  3. Hovering over cover art on track cards triggers a subtle zoom effect within the card boundary (no overflow)
**Plans**: TBD

Plans:
- [ ] 11-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11
(Phases 9, 10, 11 all depend on Phase 8 but are largely independent of each other.)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-02-08 |
| 2. Processing Pipeline | v1.0 | 2/2 | Complete | 2026-02-08 |
| 3. Waveform Player | v1.0 | 2/2 | Complete | 2026-02-08 |
| 4. Track Pages | v1.0 | 2/2 | Complete | 2026-02-08 |
| 5. Admin Interface | v1.0 | 2/2 | Complete | 2026-02-09 |
| 6. Discovery & Engagement | v1.0 | 2/2 | Complete | 2026-02-09 |
| 7. Persistent Player & Queue | v1.0 | 2/2 | Complete | 2026-02-09 |
| 8. Design Foundation | v1.1 | 2/2 | Complete | 2026-02-10 |
| 9. Visual Richness | v1.1 | 1/1 | Complete | 2026-02-10 |
| 10. Signature Identity | v1.1 | 2/2 | Complete | 2026-02-10 |
| 11. Refinement | v1.1 | 0/TBD | Not started | - |
