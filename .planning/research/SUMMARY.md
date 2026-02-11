# Research Summary: Revenue-Generating Music Platform

**Domain:** Music marketplace / direct-to-fan sales platform
**Researched:** 2026-02-10
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

The indie music platform landscape is in a rare moment of upheaval. Bandcamp -- the dominant direct-to-fan music sales platform for 15+ years -- was sold to Epic Games (2022), then to Songtradr (2023), which immediately laid off 50% of staff including the entire union bargaining team. While Bandcamp continues operating and generated $19M via Bandcamp Fridays in 2025 alone, artist trust has eroded significantly. Multiple alternatives are emerging (Subvert, Mirlo, Ampwall, Artcore, AC55id) but none have achieved critical mass yet. Subvert has 5,000+ pre-launch members and backing from labels like Warp and Thrill Jockey, but is not yet publicly live. Mirlo (7% + Stripe fees), Ampwall (5% + PayPal fees), and Artcore (15-20% + Stripe fees) are live but small. This is a genuine window of opportunity for a differentiated entrant.

The recommended path is a **Bandcamp-style fan-pays-artist marketplace model**, not a streaming or distribution platform. The reason is simple: streaming requires massive licensing deals and scale to generate revenue, while distribution (DistroKid model) is a commoditized race to the bottom. Direct sales with a platform percentage (10-15%) is the only model that generates meaningful revenue at small scale, aligns platform incentives with artist success, and is technically feasible for a solo developer. The existing alternatives prove this model works -- Bandcamp takes 15% on digital and has been profitable since its early years.

The existing wallybrain-music codebase provides a strong UI/UX foundation -- the waveform player, per-track color theming, and glassmorphism design are genuine differentiators in a space where most alternatives (Mirlo, Ampwall, Artcore) look utilitarian. However, the backend needs fundamental changes: SQLite to PostgreSQL, local storage to Cloudflare R2, and the addition of multi-tenant auth, payments (Stripe Connect), and a proper artist/fan account system.

**Verdict:** This is feasible as a solo developer project, but it should be a **NEW project** that inherits design DNA and reusable components from wallybrain-music rather than an in-place evolution of it. The scope difference between "personal music page" and "multi-tenant marketplace" is too large for incremental migration. wallybrain-music continues as the personal site; the new platform is a separate product.

## Key Findings

**Stack:** Keep SvelteKit 2 + Svelte 5 + Drizzle + Tailwind 4 + wavesurfer.js. Replace SQLite with PostgreSQL, add Cloudflare R2 for storage, Stripe Connect Standard for payments, Better Auth (or Lucia-pattern auth) for authentication.

**Architecture:** Multi-tenant marketplace with artist slugs (/artist-name), fan accounts, Stripe Connect Standard for artist payouts, R2 for audio/art CDN, PostgreSQL for relational multi-tenant data.

**Critical pitfall:** Do NOT attempt to build a streaming platform. Build a sales platform. Streaming requires licensing deals with all three major labels and generates fractions of a cent per play. Bandcamp succeeded by being a store, not a streamer.

**Market window:** Bandcamp's Songtradr acquisition has created artist distrust. Subvert (the most promising competitor) is still in closed testing. The window exists now but will narrow as Subvert launches publicly in Q1 2026.

**Revenue reality check:** At 10% platform fee with $10 average sale, you need 1,000 sales/month to generate $1,000/month platform revenue. This requires ~50-100 active artists with engaged fanbases. Reaching this takes 12-18 months minimum.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation & Auth** - New project scaffolding, PostgreSQL schema, auth system (artist + fan accounts), artist profiles with slug routing
   - Addresses: Multi-tenancy, user accounts (FEATURES.md table stakes)
   - Avoids: Premature payment integration before core works

2. **Upload Pipeline & Player** - Port the waveform player, upload processing pipeline, and UI components from wallybrain-music. Connect storage to Cloudflare R2.
   - Addresses: Core product experience (listening + artist uploads)
   - Avoids: Over-engineering storage before validating the concept

3. **Commerce & Payments** - Stripe Connect Standard integration, "name your price" and fixed-price sales, digital downloads, purchase flow
   - Addresses: Revenue generation -- the whole point of the project
   - Avoids: Legal pitfalls by using Stripe Connect Standard (Stripe handles 1099 tax forms for connected accounts)

4. **Artist Dashboard & Fan Discovery** - Sales analytics, earnings/payout reporting, browse/search, tagging, genre filtering
   - Addresses: Artist retention (they need to see sales data), fan discovery (they need to find music)
   - Avoids: Building features nobody uses before validating that sales actually work

5. **Legal, Compliance & Launch Prep** - Terms of Service, Privacy Policy, DMCA agent registration, transactional emails, beta launch
   - Addresses: Legal requirements that gate public launch
   - Avoids: Launching without safe harbor protections

**Phase ordering rationale:**
- Auth and multi-tenancy must exist before anything else works
- Upload/player is the core value proposition and must be solid before money touches it
- Commerce depends on both auth and content existing
- Discovery only matters once there is content to discover
- Legal/compliance is the gatekeeper before public launch

**Research flags for phases:**
- Phase 3: Needs deeper research on Stripe Connect Standard vs Express onboarding flows, and on handling international payments/VAT
- Phase 5: Needs legal review of Terms of Service template and DMCA agent registration ($6 filing fee with US Copyright Office)
- Phase 1-2: Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | SvelteKit + Drizzle + PostgreSQL is well-proven; R2 pricing verified via official Cloudflare docs |
| Market Opportunity | MEDIUM-HIGH | Post-Bandcamp upheaval is real and documented; whether a solo dev can capture it is uncertain |
| Features | HIGH | Bandcamp's feature set is the proven template; table stakes are clear from 15+ years of iteration |
| Architecture | MEDIUM | Multi-tenant SvelteKit is documented but less battle-tested than Next.js equivalents; PostgreSQL multi-tenancy is rock-solid |
| Revenue Model | MEDIUM | Fan-pays-artist with platform % is proven at Bandcamp scale; unproven at indie platform scale; requires critical mass of artists |
| Legal/Compliance | MEDIUM | Requirements are clear from DMCA/GDPR documentation; execution complexity for a solo dev without legal counsel is uncertain |
| Pitfalls | HIGH | Well-documented from Bandcamp's history, failed platforms (Resonate is "dead or sleeping"), and marketplace startup patterns |

## Gaps to Address

- Stripe Connect onboarding UX for artists (Standard vs Express -- Standard is free but requires artist to have/create a Stripe account)
- Music rights verification workflow (how to handle disputes without a legal team -- likely: DMCA takedown process only, no proactive scanning)
- Marketing/launch strategy (how to get first 10-20 artists -- likely: personal network + electronic music communities)
- Mobile experience (responsive web is sufficient for MVP; native apps are far-future)
- International payment complications (VAT, currency conversion -- Stripe handles most of this but needs configuration)
- Content moderation at scale (manual review is feasible at <100 artists, not at 1000+)
