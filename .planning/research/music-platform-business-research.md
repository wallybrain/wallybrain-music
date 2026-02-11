# Strategic Research: Turning wallybrain-music into a Revenue-Generating Music Platform

**Researched:** 2026-02-10
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

The indie music platform landscape is in upheaval. Bandcamp -- the dominant direct-to-fan music sales platform since 2008 -- was acquired by Epic Games in 2022, then sold to Songtradr in 2023. Songtradr immediately laid off 50% of Bandcamp's staff, including the entire union bargaining team. While Bandcamp continues to operate (generating $19M via Bandcamp Fridays in 2025 alone, $154M total since 2020), artist trust has eroded significantly. Multiple alternatives have emerged -- Subvert (cooperative model, 5000+ pre-launch members, backed by Warp Records and Thrill Jockey), Mirlo (7% fee, community-led), Ampwall (5% fee), Artcore (15-20%, electronic-focused), AC55id ($10/month flat fee) -- but none have achieved critical mass. This is a genuine market window.

The recommendation is to build a **Bandcamp-style fan-pays-artist sales platform** (not a streaming service, not a distribution platform) as a **new project** that inherits wallybrain-music's distinctive UI/UX. The waveform player with gradient colors, per-track dominant color theming, and glassmorphism design system are genuine differentiators -- no existing Bandcamp alternative offers waveform-based audio previews. A 10% platform fee on digital sales, with Stripe Connect Standard handling payments and tax reporting, creates a sustainable revenue model that breaks even at approximately 20 sales per month.

The critical success factors are: (1) recruit 5-10 founding artists before building, (2) launch MVP in 8 weeks with only core commerce features, (3) focus exclusively on electronic music as a niche, and (4) ensure DMCA compliance before accepting any user uploads.

---

## Market Landscape

### The Bandcamp Situation (HIGH confidence)

Bandcamp's trajectory:
- **2008-2022:** Dominant independent music sales platform. Artists keep 82-85% of revenue. $1B+ paid to artists over lifetime.
- **March 2022:** Epic Games acquires Bandcamp.
- **September 2023:** Epic sells Bandcamp to Songtradr amid Epic layoffs of 16% of workforce (830 employees).
- **October 2023:** Songtradr lays off approximately 50% of Bandcamp staff. All 8 members of Bandcamp United's union bargaining team are fired. Unfair labor practice complaints filed.
- **2024-2025:** Bandcamp continues operating under Songtradr. Bandcamp Fridays continue ($19M generated in 2025). Support quality has degraded. Artist sentiment is mixed-to-negative.
- **Current state:** Functional but diminished. Artists are wary of future changes under Songtradr ownership. Many are looking for alternatives but have not found one that matches Bandcamp's reach.

### Competitor Analysis

| Platform | Fee Structure | Status | Strengths | Weaknesses |
|----------|--------------|--------|-----------|------------|
| **Bandcamp** | 15% digital (10% after $5K), 10% physical + payment fees | Operating (Songtradr-owned) | Massive existing audience, editorial (Bandcamp Daily), Bandcamp Fridays, 15+ years of trust | Ownership instability, degraded support, artist anxiety |
| **Subvert** | Unknown (cooperative model, artist/supporter memberships) | Private testing, Q1 2026 public launch | Co-op ownership (artists govern), backed by Warp/Polyvinyl/Thrill Jockey, 5000+ pre-launch members | Not yet live, complex governance model, no proven revenue engine |
| **Mirlo** | 7% + Stripe fees | Live, open access | Lowest percentage fee, community-led open source | Small catalog, minimal discovery, basic UI |
| **Ampwall** | 5% + PayPal fees ($10/yr per 5hrs upload) | Live, open beta | Very low fees | PayPal-only payments, limited features, basic design |
| **Artcore** | 15-20% + Stripe fees | Live | Electronic music focus, established since 2022 | Higher fees than alternatives, limited audience |
| **AC55id** | $10/mo artists, $30/mo labels (Stripe fees only) | Live | Subscription model means predictable costs for artists | Monthly fee deters artists with low sales, electronic-only |
| **Coda Music** | Streaming subscription ($10.99/mo) | Live (US/Canada) | Licensed by all three majors, FanDirect payment model | Streaming model (not sales), institutional scale, not indie-dev viable |

### The Gap (MEDIUM-HIGH confidence)

None of the existing Bandcamp alternatives offer:
1. **Waveform-based audio player** -- all use basic progress bars
2. **Art-directed visual experience** -- per-track color theming, atmospheric design
3. **Premium visual design** -- most look like basic web apps
4. **Electronic music niche focus** with proper content types (sets, experiments, live recordings)

The opportunity is: **a visually distinctive, electronic-music-focused sales platform that feels like a premium product rather than a utilitarian tool.**

### Market Window Assessment (MEDIUM confidence)

The window is open now but narrowing:
- Subvert is the biggest threat -- cooperative model, label backing, 5000+ members. If they launch successfully in Q1 2026 and deliver on promises, they could capture the "Bandcamp alternative" narrative.
- However, Subvert is genre-agnostic and governance-heavy. A focused electronic music platform with a superior listening experience occupies a different niche.
- Mirlo, Ampwall, and Artcore have been live for 1-2 years without breaking out. The market has not consolidated around any alternative.

---

## Revenue Models Analysis

### Comparison Table

| Model | How It Works | Revenue at 100 Artists | Pros | Cons | Viability for Solo Dev |
|-------|-------------|----------------------|------|------|----------------------|
| **Fan-pays-artist (% cut)** | Fans buy music, platform takes 10-15% | $400-2,000/mo (varies with artist engagement) | Revenue scales with success; aligned incentives; proven by Bandcamp | Requires artist + fan acquisition; chicken-and-egg | HIGH |
| **Artist subscription** | Artists pay monthly to host/sell | $1,000-3,000/mo (at $10-30/artist) | Predictable revenue; no fan acquisition needed | Artists resent paying without sales; AC55id uses this model with limited success | MEDIUM |
| **Hybrid (free + premium)** | Free tier with limits, paid tier with features | Depends on conversion rate | Lower barrier to entry; upsell path | Complexity of two tiers; free tier attracts non-payers | MEDIUM |
| **Streaming royalties** | Per-stream payouts from subscription pool | Negligible (<$100/mo) | Passive income per play | Requires massive scale (millions of streams); licensing required | NOT VIABLE |
| **Distribution** | Charge per release to distribute to Spotify/Apple | $500-1,500/mo (at $5-15/release) | Existing demand from artists | Commoditized (DistroKid at $22/yr); complex DSP integrations | LOW |
| **Tips/donations** | Fans tip artists, platform takes a cut | Unpredictable, likely <$200/mo | Easy to implement | Unreliable; feels unserious | LOW |

### Recommendation: Fan-Pays-Artist at 10%

**10% platform fee on digital sales.** This is the clear winner because:

1. **Proven model** -- Bandcamp built a profitable business on 15% digital fees. 10% is more competitive.
2. **Aligned incentives** -- The platform only makes money when artists make money. No resentment about paying for unused features.
3. **Low barrier** -- Artists pay nothing to join. They list their music for free. The platform takes a cut only when a sale happens.
4. **Competitive positioning** -- 10% is lower than Bandcamp (15%), Artcore (15-20%), but higher than Mirlo (7%) and Ampwall (5%). This positions the platform as "fairer than Bandcamp but sustainable."
5. **Stripe Connect Standard makes this feasible** -- Stripe handles all payment splitting, tax reporting (1099-K), and payouts. The platform never touches artist money directly.

**Revenue math:**
- Average album sale: ~$8 (Bandcamp's published data suggests $7-10 average)
- Platform revenue per sale: $0.80 (10%)
- Break-even: ~20 sales/month to cover hosting costs (~$15/month)
- Goal at 50 artists: ~300 sales/month = $240/month platform revenue
- Goal at 200 artists: ~1,500 sales/month = $1,200/month platform revenue

---

## Technical Architecture

### What Changes from wallybrain-music

| Layer | Current (wallybrain-music) | Needed (marketplace) | Effort |
|-------|---------------------------|---------------------|--------|
| **Database** | SQLite (better-sqlite3), single file | PostgreSQL 16 (Docker), multi-tenant schema | HIGH -- complete schema redesign |
| **Auth** | None (open admin routes) | Better Auth: artist + fan accounts, sessions, roles | HIGH -- new system from scratch |
| **Storage** | Local filesystem (`/data/`) | Cloudflare R2 (S3-compatible), CDN | MEDIUM -- swap storage layer |
| **Payments** | None | Stripe Connect Standard, webhooks, checkout | HIGH -- new system from scratch |
| **Routing** | Single-artist pages | Multi-tenant: `/[artist-slug]/[release-slug]` | MEDIUM -- restructure routes |
| **UI Components** | WaveformPlayer, TrackCard, CoverArt, etc. | Port and adapt existing components | LOW -- mostly reusable |
| **Design System** | OKLCH tokens, Space Grotesk, glassmorphism | Port directly | NONE -- fully reusable |
| **Audio Processing** | transcode.ts, peaks.ts, metadata.ts, artwork.ts | Port, change output to R2 instead of local fs | LOW -- mostly reusable |
| **Email** | None | Resend (purchase receipts, notifications) | LOW -- new but simple |

### What Can Be Reused (directly or with minor adaptation)

- `WaveformPlayer.svelte` -- add artist context, purchase state
- `PersistentPlayer.svelte` -- add "Buy" button, artist attribution
- `CoverArt.svelte` -- change image source from local to R2 URL
- `TrackCard.svelte` -- add artist name, price, purchase indicator
- `EqIndicator.svelte` -- no changes
- `colorUtils.ts`, `formatTime.ts` -- no changes
- Design tokens in `app.css` (@theme block) -- no changes
- Audio processors (transcode, peaks, metadata, artwork) -- change output destination
- Upload validators (magicBytes, ffprobe) -- no changes

### Cost Estimates

| Component | Monthly Cost (10 Artists) | Monthly Cost (100 Artists) | Monthly Cost (1000 Artists) |
|-----------|--------------------------|---------------------------|----------------------------|
| VPS (existing) | $10 | $10 | $20-40 (may need upgrade) |
| PostgreSQL (Docker) | $0 (runs on VPS) | $0 | $0 (or managed DB ~$15/mo) |
| Cloudflare R2 Storage | $0 (free tier: 10GB) | ~$0.75 (50GB) | ~$7.50 (500GB) |
| R2 Egress | $0 (always free) | $0 | $0 |
| Stripe Fees | Paid by fans (2.9% + $0.30/tx) | Same | Same |
| Stripe Connect (Standard) | $0 | $0 | $0 |
| Resend Email | $0 (free tier: 100/day) | $0 | $20/mo |
| Domain | ~$1/mo | ~$1/mo | ~$1/mo |
| **Total** | **~$11/mo** | **~$12/mo** | **~$30-70/mo** |

R2's zero-egress pricing is the key insight. Audio streaming is bandwidth-heavy; on AWS S3, 1000 daily streams of 5MB tracks would cost $13.50/month in egress alone. On R2, it costs $0.

---

## Legal & Compliance Requirements

### Must-Have Before Launch (HIGH confidence)

1. **DMCA Agent Registration**
   - Register with US Copyright Office ($6 one-time fee)
   - Post agent contact info on the platform (public DMCA policy page)
   - Implement a takedown request form (email-based is sufficient)
   - Enforce a repeat infringer policy (three strikes)

2. **Terms of Service**
   - Required before accepting payments or user-generated content
   - Must include: acceptable use policy, content ownership, platform's right to remove content, liability limitations
   - Template from a legal generator (e.g., Termly, TermsFeed) is acceptable for MVP
   - Lawyer review recommended before reaching significant user count

3. **Privacy Policy**
   - Required by GDPR (if serving EU users), CCPA (California), and Stripe's own requirements
   - Must disclose: what data is collected, why, how long retained, who has access
   - Must provide: right to data export, right to deletion, cookie consent

4. **Stripe Connect Compliance**
   - Stripe handles PCI DSS compliance (the platform never sees card numbers)
   - Stripe handles 1099-K tax reporting for Standard connected accounts
   - Platform must verify that artists agree to Stripe's Connected Account Agreement during onboarding

### Nice-to-Have for Scale (MEDIUM confidence)

5. **GDPR Full Compliance** -- Cookie consent banner, data portability endpoint, data deletion workflow, DPO designation if processing significant EU data
6. **State Money Transmitter Licenses** -- Using Stripe Connect Standard likely exempts the platform from money transmitter classification, but this should be verified by a lawyer if operating at scale
7. **Business Entity Formation** -- Sole proprietor works for early stage; LLC or Corp provides liability protection as revenue grows

### Tax Implications (HIGH confidence)

- **As platform operator:** Report platform fee revenue as business income. Standard self-employment tax applies.
- **1099-K for artists:** Stripe handles this for Standard connected accounts. The platform does NOT need to issue 1099s.
- **Sales tax on digital goods:** Varies by state. Stripe Tax can handle collection and remittance if enabled. Not required for MVP but should be addressed before significant interstate sales volume.

---

## Solo Developer Feasibility Assessment

### What Is Realistic

**YES -- buildable and operable alone:**
- Core marketplace (artist pages, uploads, player, purchases, downloads)
- Payment processing via Stripe Connect (Stripe handles the hard parts)
- Audio processing pipeline (port from wallybrain-music)
- Basic content moderation (manual review at <100 artists)
- Customer support via email (at <100 artists)

**MAYBE -- buildable but time-intensive:**
- Full GDPR compliance (data export, deletion workflows, cookie consent)
- Comprehensive artist analytics dashboard
- Embeddable player widget
- Advanced search and discovery

**NO -- do not attempt alone:**
- Music streaming with licensing (requires legal team and millions in licensing fees)
- Automated copyright detection (Content ID cost $100M+)
- Physical merch fulfillment (requires logistics infrastructure)
- Native mobile apps (doubles development and maintenance)
- Real-time social features (moderation burden is unsustainable)

### Timeline Estimate

| Phase | Duration | Output |
|-------|----------|--------|
| Phase 1: Foundation & Auth | 2-3 weeks | PostgreSQL schema, auth system, artist profiles |
| Phase 2: Upload & Player | 2-3 weeks | Ported waveform player, R2 storage, upload pipeline |
| Phase 3: Commerce | 2-3 weeks | Stripe Connect, purchase flow, download delivery |
| Phase 4: Discovery & Polish | 1-2 weeks | Browse page, tags, SEO, testing |
| Phase 5: Legal & Launch | 1 week | DMCA, ToS, Privacy Policy, beta launch |
| **Total** | **8-12 weeks** | **Revenue-generating MVP** |

### Operational Costs Summary

**Minimum viable monthly costs: ~$11-15/month** (VPS + domain). R2 free tier covers early storage. Stripe has no monthly fees. Resend free tier covers early email volume.

**At 100 artists: ~$12-15/month** with R2 storage under $1/month and everything else on free tiers.

**At 1000 artists: ~$30-70/month** depending on VPS needs and email volume.

The platform becomes cash-flow positive from approximately the 20th sale per month, assuming $8 average sale price and 10% platform fee = $0.80 per sale = $16/month revenue vs. $12-15/month costs.

---

## Differentiation Strategy

### Primary Differentiator: The Listening Experience

No Bandcamp alternative offers a waveform-based audio player. This is wallybrain-music's signature feature. The combination of:
- **Gradient waveform colors** (violet-to-fuchsia progress, animated seeking)
- **Per-track dominant color theming** (cover art extracts ambient color, tints the entire page)
- **Glassmorphism + OKLCH design tokens** (dark theme with atmospheric depth)
- **Space Grotesk typography** (electronic music heritage, designed for Moogfest)

...creates a visual experience that is immediately distinguishable from every competitor. When an artist shares a link to their release page, it looks like a premium product, not a generic storefront.

### Secondary Differentiator: Electronic Music Focus

General-purpose platforms (Bandcamp, Subvert) serve all genres equally. By focusing on electronic music:
- Content types like "sets," "experiments," and "live recordings" are first-class citizens
- Tag taxonomy reflects electronic subgenres (techno, ambient, experimental, breakbeat, etc.)
- Community culture aligns with dark theme, waveform aesthetics, and minimal UI
- The niche is large enough to sustain a platform (electronic music is one of Bandcamp's top categories) but small enough that a focused platform can serve it better than a generalist

### Tertiary Differentiator: Fair and Transparent Fees

At 10%, the platform takes less than Bandcamp (15%) and Artcore (15-20%), while being transparent about exactly how much goes to the artist, the platform, and Stripe. Publish the fee breakdown on every purchase confirmation. Artists appreciate transparency.

### What Is NOT a Differentiator

- **Feature completeness** -- Bandcamp will always have more features. Do not compete on features.
- **Scale/catalog size** -- Bandcamp has millions of releases. Do not compete on volume.
- **Price** -- Racing to 0% fee is unsustainable. Mirlo at 7% and Ampwall at 5% are already lower.

---

## Same Project vs New Project Recommendation

### Recommendation: NEW PROJECT

wallybrain-music should remain as your personal music site at wallyblanchard.com/music. The revenue platform should be a separate project with its own:
- Repository
- Domain name
- Docker stack (port 8801, separate from 8800)
- Database (PostgreSQL, not SQLite)
- Brand identity (not "wallybrain" -- a marketplace needs its own name)

### Rationale

1. **Scope difference is too large.** wallybrain-music has ~2.5k LOC, no auth, no payments, no multi-tenancy, SQLite. The marketplace needs all of these. Incrementally adding them to the existing codebase would be a rewrite disguised as refactoring.

2. **Different audiences.** wallybrain-music serves one artist (you) and their fans. The marketplace serves many artists and their fans. The routing, data model, and permissions are fundamentally different.

3. **Risk isolation.** If the marketplace fails or has legal issues, wallybrain-music is unaffected. Your personal music page continues working.

4. **Brand separation.** "wallybrain" is a personal brand. A marketplace needs a neutral, trustworthy brand that other artists feel comfortable putting their name next to. No artist wants to sell on "someone else's personal website."

### What to Reuse

Port these directly from wallybrain-music (as code, not as npm packages):
- All Svelte UI components (WaveformPlayer, PersistentPlayer, CoverArt, TrackCard, EqIndicator, FilterBar)
- Design tokens (app.css @theme block with OKLCH palette, Space Grotesk/Mono fonts)
- Audio processing pipeline (transcode.ts, peaks.ts, metadata.ts, artwork.ts)
- Upload validators (magicBytes.ts, ffprobe.ts)
- Utility functions (formatTime.ts, colorUtils.ts)
- Tailwind configuration patterns

### What to Build Fresh

- PostgreSQL database schema (users, artist_profiles, releases, tracks, purchases, tags)
- Authentication system (Better Auth with artist/fan roles)
- Stripe Connect integration (account onboarding, checkout, webhooks)
- R2 storage layer (replacing local filesystem)
- All route handlers (+page.server.ts, +server.ts)
- Artist dashboard (replacing admin pages)
- Browse/discovery pages
- Legal pages (ToS, Privacy, DMCA)
- Email templates (purchase receipts, notifications)

---

## Recommended Next Steps

### Before Writing Any Code

1. **Validate demand.** Talk to 5-10 electronic music artists. Show them wallybrain-music. Ask: "If this was a platform where you could sell your music, would you use it? What would you need?" Their answers shape the MVP feature set.

2. **Choose a name and domain.** The marketplace needs its own identity. Check domain availability. The name should be neutral, memorable, and evoke music without being "wallybrain."

3. **Create a Cloudflare account** and set up an R2 bucket (free, takes 5 minutes). Test S3-compatible API access.

4. **Create a Stripe account** with Connect enabled (requires identity verification, takes 1-2 days). Get API keys for development.

### Phase 1: Foundation (Weeks 1-3)

- New SvelteKit project with PostgreSQL + Drizzle
- Auth system (Better Auth or Lucia-pattern)
- Artist registration with profile pages
- Fan registration
- Basic layout with ported design system

### Phase 2: Upload & Player (Weeks 3-5)

- Port audio processing pipeline to use R2
- Port waveform player components
- Artist upload flow (audio + cover art + metadata)
- Release creation and management

### Phase 3: Commerce (Weeks 5-7)

- Stripe Connect Standard artist onboarding
- Purchase flow (Stripe Checkout Session)
- Webhook handler for payment confirmation
- Download delivery (signed R2 URLs)
- Email receipts (Resend)

### Phase 4: Discovery & Polish (Weeks 7-8)

- Browse page with tag filtering
- SEO (meta tags, Open Graph, structured data)
- Error handling, edge cases, mobile testing

### Phase 5: Launch Prep (Week 8-9)

- Register DMCA agent with US Copyright Office
- Write Terms of Service and Privacy Policy
- Set up monitoring and error alerting
- Invite founding artists
- Beta launch

---

## Sources

### Market Research
- [Bandcamp Fee Structure](https://get.bandcamp.help/hc/en-us/articles/23020665520663-What-are-Bandcamp-s-fees)
- [Bandcamp Fridays $154M Total Payouts](https://www.musicbusinessworldwide.com/bandcamp-fridays-hit-154m-in-payouts-since-2020-with-19m-paid-in-2025-alone/)
- [Bandcamp Sold Amid Epic Games Layoffs (Exclaim)](https://exclaim.ca/music/article/bandcamp_sold_amid_layoffs_at_epic_games)
- [Bandcamp Lays Off 50% After Songtradr Acquisition (Exclaim)](https://exclaim.ca/music/article/bandcamp_lays_off_50_percent_of_employees_following_songtradr_acquisition_report)
- [Bandcamp Was Supposed to Be Dead by Now (First Floor)](https://firstfloor.substack.com/p/bandcamp-was-supposed-to-be-dead)
- [Subvert: The Artist-Owned Platform (The FADER)](https://www.thefader.com/2025/10/14/subvert-fm-bandcamp-interview)
- [Subvert Signs 1000+ Labels Pre-Launch](https://aidjsets.com/blog/subvert-fm-co-op-music-platform-signs-1-000-labels-pre-launch)
- [Bandcamp Alternatives Comparison](https://bandcampalternative.com/)
- [Coda Music Streaming Launch (Digital Music News)](https://www.digitalmusicnews.com/2025/09/02/coda-massivemusic-artist-friendly-model/)
- [Best Platforms for Indie Artists 2025](https://pitch-us.com/blogs/marketing/8-best-music-platforms-for-independent-artists-in-2025)
- [Independent Music Streaming Alternatives 2026](https://www.whathifi.com/streaming-entertainment/music-streaming/down-with-spotify-these-6-independent-music-streaming-services-want-a-better-experience-for-musicians-and-listeners-alike)

### Technical
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 vs Backblaze B2 Comparison](https://themedev.net/blog/cloudflare-r2-vs-backblaze-b2/)
- [Stripe Connect Pricing](https://stripe.com/connect/pricing)
- [Stripe Connect Documentation](https://docs.stripe.com/connect)
- [Stripe Fees Explained 2025](https://www.swipesum.com/insights/guide-to-stripe-fees-rates-for-2025)
- [SvelteKit Multi-Tenant Discussion](https://github.com/sveltejs/kit/discussions/8699)
- [SvelteKit Auth Documentation](https://svelte.dev/docs/kit/auth)
- [Better Auth for Svelte 5](https://awingender.com/blog/better-auth-svelte-5-authentication/)
- [Lucia Auth Deprecation Discussion](https://github.com/lucia-auth/lucia/discussions/1707)
- [Drizzle ORM with SvelteKit](https://sveltekit.io/blog/drizzle-sveltekit-integration)
- [PostgreSQL vs SQLite for Production 2025](https://medium.com/@aayush71727/postgresql-vs-sqlite-in-2025-which-one-belongs-in-production-ddb9815ca5d5)

### Legal & Compliance
- [DMCA Compliance Checklist for Online Platforms 2025](https://patentpc.com/blog/the-complete-dmca-compliance-checklist-for-online-platforms-in-2025)
- [IRS: Understanding Form 1099-K](https://www.irs.gov/businesses/understanding-your-form-1099-k)
- [IRS: OBBBA New Reporting Thresholds](https://rsmus.com/insights/services/business-tax/irs-updates-obbba-new-reporting-thresholds.html)
- [GDPR Requirements](https://gdpr.eu/what-is-gdpr/)
- [Music Royalties and Tax Implications](https://royaltyexchange.com/blog/music-royalties-and-tax-implications)
