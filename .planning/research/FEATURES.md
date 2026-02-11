# Feature Landscape: Revenue-Generating Music Platform

**Domain:** Music marketplace / direct-to-fan sales platform
**Researched:** 2026-02-10

## Competitor Feature Matrix

Before defining features, here is what the market looks like:

| Feature | Bandcamp | Mirlo | Ampwall | Artcore | AC55id | Subvert (upcoming) |
|---------|----------|-------|---------|---------|--------|---------------------|
| Digital sales | Yes | Yes | Yes | Yes | Yes | Planned |
| Name-your-price | Yes | Yes | No | No | No | Unknown |
| Streaming preview | Full tracks | Full tracks | Full tracks | Full tracks | Full tracks | Unknown |
| Artist pages | Yes | Yes | Yes | Yes | Yes | Yes |
| Physical merch | Yes | No | No | No | No | Unknown |
| Waveform player | No | No | No | No | No | Unknown |
| Artist analytics | Basic | Basic | Minimal | Basic | Basic | Unknown |
| Platform fee | 15% (10% after $5K) | 7% | 5% | 15-20% | $0 (flat monthly) | Unknown |
| Fan accounts | Yes | Yes | Yes | Yes | No | Yes |
| Wishlist/collection | Yes | No | No | No | No | Unknown |
| Discovery/browse | Yes (tags, genres) | Limited | Limited | Limited | Limited | Unknown |
| Mobile app | No (web only) | No | No | No | No | Unknown |
| Pay what you want | Yes | Yes | No | No | No | Unknown |

**Key observation:** NO existing platform has waveform-based audio previews. This is wallybrain-music's differentiator.

---

## Table Stakes

Features users (both artists and fans) expect. Missing = product feels incomplete or untrustworthy.

### For Artists

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Artist profile page (bio, avatar, links) | Every platform has this. Artists need a "home" to send fans to. | Medium | Slug-based routing: /artist-name |
| Track/release upload with metadata | Core functionality. Artists must upload audio, cover art, set title/description/tags/price. | Medium | Port processing pipeline from wallybrain-music |
| Pricing control (fixed price + name-your-price) | Bandcamp proved NYOP generates higher average sales. Artists expect pricing flexibility. | Medium | Minimum price + optional NYOP toggle |
| Sales dashboard | Artists need to see what sold, when, and how much they earned. | Medium | Aggregate views, per-release breakdowns |
| Stripe Connect onboarding | Artists must connect a payment account to receive money. | Medium | Stripe Connect Standard flow |
| Release management (albums, singles, EPs) | Music is organized into releases, not just individual tracks. A release groups tracks with shared art, description, pricing. | Medium | Release has many tracks; tracks can also be sold individually |
| Download delivery after purchase | When a fan buys, they must be able to download the files (MP3, FLAC, WAV). | Medium | Generate download links from R2, time-limited signed URLs |

### For Fans

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Browse/search music | Fans need to discover music. Tag-based browsing and text search are minimum. | Medium | PostgreSQL full-text search + tag filtering |
| Listen before buying (full track preview) | Bandcamp plays full tracks. Fans expect to hear what they are buying. This is the norm for direct-to-fan. | Low | Already built -- waveform player |
| Purchase flow | Add to cart or buy now, pay via Stripe, receive download link. | High | Stripe Checkout session integration |
| Fan account with purchase history | Fans need to re-download purchases. Account with "My Collection" page. | Medium | Link purchases to authenticated user |
| Email receipt | Standard e-commerce expectation. | Low | Resend transactional email |

### For the Platform

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Admin dashboard | Platform operator needs to see total sales, active artists, content moderation. | Medium | Separate from artist dashboard |
| DMCA takedown process | Legal requirement for safe harbor protection. | Low | Form submission + manual review workflow |
| Terms of Service + Privacy Policy | Legal requirement before accepting payments. | Low | Template-based, lawyer review recommended |

---

## Differentiators

Features that set this platform apart from Bandcamp and its alternatives.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Waveform audio player with gradient colors** | No competitor has this. SoundCloud-style waveform seeking is objectively better UX than a plain progress bar. Visual signature of the platform. | Already built | Port from wallybrain-music |
| **Per-track dominant color theming** | Each track/release has its own color atmosphere extracted from cover art. Creates a visually immersive, art-directed experience. Spotify does this for now-playing; no sales platform does it. | Already built | Port from wallybrain-music |
| **Glassmorphism + OKLCH design system** | Visually distinctive dark theme with depth and atmosphere. Most Bandcamp alternatives look like basic web apps. This looks like a premium product. | Already built | Port design tokens from wallybrain-music |
| **Electronic music focus** | Niche positioning. Electronic music fans (techno, ambient, experimental, live sets) are heavy Bandcamp users and underserved by generic platforms. Curated discovery for a specific audience. | Low | Category/tag taxonomy, editorial curation |
| **"Sets" and "experiments" as first-class content** | DJ sets, live recordings, and experimental pieces do not fit the traditional album/single model. Categories like "set," "experiment," "export" (from wallybrain-music) acknowledge these formats. | Low | Already in the wallybrain-music schema |
| **Embeddable player widget** | Artists can embed a waveform player on their own website that links back to the platform for purchase. Like Bandcamp's embed but with the waveform. | Medium | iframe or web component with restricted API |

---

## Anti-Features

Features to explicitly NOT build. These are traps that waste development time or create unsustainable obligations.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Streaming subscription model** | Requires licensing deals with all three major labels (Sony, Universal, Warner) costing millions. Per-stream payouts are fractions of a cent. Coda Music (launched 2025) needed institutional backing to get licensed. Not viable for solo dev. | Sell downloads. Full-track previews for discovery. No subscription fee for listeners. |
| **Music distribution to Spotify/Apple** | This is DistroKid/TuneCore territory. They charge $20-30/year per artist and take 0-15%. Commoditized, race-to-bottom pricing. Building DSP integration is enormously complex. | Focus on direct sales. Artists can use DistroKid separately for streaming distribution. |
| **Physical merch fulfillment** | Shipping logistics, inventory management, returns -- massive operational burden. Bandcamp does this but has a team. | Link to artist's own merch store (Shopify, Big Cartel) from their profile page. |
| **Mobile native app** | iOS/Android development doubles the work. App Store review process adds friction. 30% Apple/Google tax on in-app purchases makes the revenue model unworkable. | Responsive web app. PWA if needed for home screen installation. |
| **Social features (comments, likes, follows, feeds)** | Social features require content moderation, spam prevention, notification systems, and ongoing community management. Massive surface area for a solo dev. | Email notifications for purchases. Artist can link to their social media. |
| **AI-generated music detection** | Content ID / audio fingerprinting systems are enormously complex. Google's Content ID cost $100M+ to build. | DMCA takedown process. React to complaints, do not proactively scan. |
| **Real-time chat or messaging** | WebSocket infrastructure, moderation, harassment prevention. Enormous maintenance burden for minimal value. | Email-based communication. Fans see artist's contact/social links. |
| **Cryptocurrency payments** | Audius tried this (blockchain-based music platform). Adds enormous complexity, regulatory uncertainty, and alienates 95%+ of potential users. | Stripe only. Add PayPal as a second option if demand warrants it later. |
| **Light mode** | Doubles the design surface. Electronic music culture is overwhelmingly dark-themed. Already made this decision in wallybrain-music v1.1. | Commit to dark mode. Invest in making it excellent. |

---

## Feature Dependencies

```
Auth System (artists + fans)
  |
  +--> Artist Profile Pages
  |      |
  |      +--> Release/Track Upload
  |      |      |
  |      |      +--> Audio Processing Pipeline (port from wallybrain-music)
  |      |      |      |
  |      |      |      +--> R2 Storage Integration
  |      |      |
  |      |      +--> Release Management (albums, singles)
  |      |
  |      +--> Stripe Connect Onboarding
  |             |
  |             +--> Purchase Flow (requires connected artist account)
  |             |      |
  |             |      +--> Download Delivery (signed R2 URLs)
  |             |      |
  |             |      +--> Email Receipts
  |             |
  |             +--> Sales Dashboard / Analytics
  |
  +--> Fan Accounts
  |      |
  |      +--> Purchase History / My Collection
  |      |
  |      +--> Browse / Search / Discovery
  |
  +--> Waveform Player (independent -- does not require auth)
  |
  +--> DMCA / Legal Pages (independent)
```

---

## MVP Recommendation

**The Minimum Viable Product that can generate revenue:**

### Must Have (MVP -- Phase 1-3):
1. Artist accounts with profile pages
2. Release upload (audio + cover art + metadata + pricing)
3. Waveform player with full-track preview
4. Stripe Connect for artist payouts
5. Fan purchase flow (buy + download)
6. Basic browse page (newest releases, tag filtering)

### Defer to Post-MVP (Phase 4+):
- **Fan accounts with purchase history**: MVP can use email-based download links (no account required to buy). Add accounts later for re-download and collection features.
- **Sales analytics dashboard**: Artists can see sales in their Stripe dashboard initially. Build the in-platform dashboard after validating sales work.
- **Search**: Tag browsing is sufficient with <500 releases. Full-text search comes later.
- **Embeddable player widget**: Nice differentiator but not revenue-generating. Build after core commerce works.
- **Name-your-price**: Fixed pricing first. NYOP adds checkout complexity. Add in Phase 4.

### Never Build:
- Streaming subscriptions, distribution, physical merch, mobile app, social features, crypto

---

## Revenue Model Recommendation

Based on competitive analysis, the recommended fee structure:

| Component | Rate | Rationale |
|-----------|------|-----------|
| Platform fee on digital sales | **10%** | Lower than Bandcamp (15%), higher than Mirlo (7%) and Ampwall (5%). Competitive enough to attract artists, high enough to generate meaningful revenue. |
| Stripe processing fee | ~2.9% + $0.30 (paid by fan or absorbed) | Industry standard, unavoidable |
| Artist subscription fee | **$0** | Do not charge artists to join. The platform makes money when artists make money. Eliminates the "I'm paying but not selling" complaint. |
| Fan account fee | **$0** | Fans buy music, not subscriptions. |

**Artist take-home: ~84-87%** depending on sale price (Stripe's fixed $0.30 fee hits harder on small purchases).

**Revenue projections:**

| Scale | Avg Sale | Monthly Sales | Platform Revenue (10%) | Monthly Hosting Cost | Net |
|-------|----------|---------------|----------------------|---------------------|-----|
| 10 artists | $8 | 50 | $40 | ~$15 | $25 |
| 50 artists | $8 | 300 | $240 | ~$20 | $220 |
| 200 artists | $8 | 1,500 | $1,200 | ~$30 | $1,170 |
| 1000 artists | $8 | 10,000 | $8,000 | ~$60 | $7,940 |

**Break-even analysis:** With VPS ($10/month) + domain ($12/year) + R2 (free tier initially), monthly costs are ~$12-15. You break even at roughly 20 sales/month ($160 in sales volume, $16 platform revenue). This is achievable with 5-10 artists who have any fanbase at all.

## Sources

- [Bandcamp fee structure](https://get.bandcamp.help/hc/en-us/articles/23020665520663-What-are-Bandcamp-s-fees) -- 15% digital, 10% after $5K, 10% physical
- [Bandcamp Fridays 2025 payouts](https://www.musicbusinessworldwide.com/bandcamp-fridays-hit-154m-in-payouts-since-2020-with-19m-paid-in-2025-alone/) -- $154M total, $19M in 2025
- [Mirlo](https://mirlo.space) -- 7% + Stripe fees, community-led development
- [Ampwall](https://ampwall.com) -- 5% + PayPal fees, $10/year per 5 hours of uploads
- [Artcore](https://artcore.community) -- 15-20% + Stripe fees, electronic music focused
- [AC55id](https://ac55id.com) -- $10/month artists, $30/month labels, Stripe fees only
- [Subvert](https://subvert.fm/) -- Cooperative model, 5000+ pre-launch members, Q1 2026 public launch
- [bandcampalternative.com](https://bandcampalternative.com/) -- Comprehensive comparison of live alternatives
