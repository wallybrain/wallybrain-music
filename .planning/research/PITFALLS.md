# Domain Pitfalls: Revenue-Generating Music Platform

**Domain:** Music marketplace / direct-to-fan sales platform
**Researched:** 2026-02-10

---

## Critical Pitfalls

Mistakes that cause rewrites, legal liability, or project failure.

### Pitfall 1: Building a Streaming Platform Instead of a Sales Platform

**What goes wrong:** The developer gets excited about building a music streaming service (subscriptions, playlists, recommendations) instead of a direct-to-fan sales marketplace.

**Why it happens:** Spotify, Apple Music, and YouTube Music dominate the cultural conversation about music platforms. It is natural to think "music platform = streaming platform." But streaming requires licensing deals with all three major labels (Sony Music, Universal Music Group, Warner Music Group), which cost millions of dollars and require legal teams. Even Coda Music, which launched in 2025, needed institutional backing from MassiveMusic to secure these licenses.

**Consequences:**
- Without licenses, hosting copyrighted music as a streaming service creates massive legal liability
- Per-stream payouts (fractions of a cent) generate negligible revenue at small scale
- Building streaming infrastructure (adaptive bitrate, offline caching, playlist management) is enormously complex
- The project never launches because it is trying to compete with Spotify

**Prevention:** Build a store, not a streamer. Artists sell downloads. Full-track previews are for discovery (Bandcamp model). No subscriptions. No playlists. No algorithmic recommendations. The platform makes money when artists make money through sales.

**Detection:** If the roadmap includes "subscription tiers," "playlist creation," "music recommendations," or "offline listening," the project has drifted into streaming territory.

**Confidence:** HIGH -- Bandcamp's success for 15+ years proves the sales model works. Multiple streaming startups have failed (Rdio, Google Play Music, Deezer nearly folded).

---

### Pitfall 2: Launching Without DMCA Safe Harbor Protection

**What goes wrong:** A user uploads copyrighted music they do not own. The copyright holder sues the platform directly rather than just requesting a takedown.

**Why it happens:** The DMCA's safe harbor provisions (Section 512) protect platforms from liability for user-uploaded content, BUT only if the platform meets specific requirements. If any requirement is missed, the platform loses safe harbor and is directly liable for copyright infringement, with statutory damages of $750-$150,000 per work.

**Requirements for safe harbor (all mandatory):**
1. Register a designated DMCA agent with the US Copyright Office ($6 fee)
2. Post the agent's contact information on the platform (publicly accessible)
3. Implement and enforce a repeat infringer policy (ban users with multiple strikes)
4. Respond "expeditiously" to valid takedown notices (remove content promptly)
5. Not have actual knowledge of infringing material (cannot knowingly host pirated content)
6. Not receive a financial benefit directly attributable to infringement (cannot profit specifically from pirated content)

**Consequences:**
- Without safe harbor, the platform is directly liable for any copyrighted content uploaded by any user
- A single major label takedown could result in a lawsuit that ends the project
- Even a cease-and-desist letter from a label requires expensive legal response

**Prevention:**
- Register a DMCA agent with the US Copyright Office BEFORE launching publicly
- Create a publicly accessible DMCA policy page with agent contact information
- Build a DMCA takedown request form (email-based is sufficient)
- Implement a "three strikes" repeat infringer policy
- Document every takedown action (date, content, reporter, action taken)
- Respond to valid takedown requests within 24-48 hours

**Detection:** If the platform is publicly accessible and has no DMCA agent registered, it is operating without safe harbor. Check https://www.copyright.gov/dmca-directory/

**Confidence:** HIGH -- DMCA requirements are clearly defined in US law. Verified via official Copyright Office documentation.

**Sources:**
- [PatentPC: Complete DMCA Compliance Checklist for Online Platforms in 2025](https://patentpc.com/blog/the-complete-dmca-compliance-checklist-for-online-platforms-in-2025)
- [US Copyright Office DMCA Agent Directory](https://www.copyright.gov/dmca-directory/)

---

### Pitfall 3: Stripe Connect Account Type Lock-In

**What goes wrong:** The platform starts with Stripe Connect Express accounts for simpler artist onboarding, then realizes the $2/month/account fee plus payout fees are unsustainable, and migration to Standard accounts requires re-onboarding every artist.

**Why it happens:** Express accounts have a simpler onboarding flow (Stripe-hosted, fewer fields for the artist), which feels like the right choice for MVP. But Express accounts cost:
- $2/month per active connected account
- 0.25% + $0.25 per payout

At 100 artists, that is $200/month in account fees plus payout fees, before the platform has generated significant revenue.

**Consequences:**
- Ongoing per-account costs that scale linearly with artist count
- Cannot easily migrate from Express to Standard -- artists must re-onboard
- Platform economics become worse as the artist base grows

**Prevention:** Start with Standard accounts from day one. Yes, the onboarding is slightly more work for artists (they create or connect their own Stripe account), but:
- Zero per-account fees
- Zero payout fees beyond standard Stripe rates
- Artists maintain their own Stripe dashboard (they like this)
- Stripe's 2025 "networked onboarding" lets existing Stripe users onboard in 3 clicks

**Confidence:** HIGH -- Stripe Connect pricing is documented and the account type decision is permanent per connected account.

**Sources:**
- [Stripe Connect Pricing](https://stripe.com/connect/pricing)

---

### Pitfall 4: The Chicken-and-Egg Marketplace Problem

**What goes wrong:** No fans come because there are no artists. No artists join because there are no fans. The platform launches to silence.

**Why it happens:** This is the fundamental challenge of every marketplace business. Bandcamp built its initial artist base by personally recruiting bands in 2008 when there were few alternatives. Today's indie platforms face the same problem but in a more crowded space.

**Consequences:**
- Platform generates zero revenue despite being technically complete
- Artists who do join become discouraged by zero sales and leave
- The investment in building the platform produces no return

**Prevention:**
1. **Seed with your own music first.** wallybrain-music already has content. The new platform launches with at least one active artist (you).
2. **Recruit 5-10 artists personally before launch.** Electronic music communities, Bandcamp followers, music forums. Personal outreach, not mass marketing.
3. **Offer founding artist benefits** (lower fee for first year, featured placement, input on features).
4. **Focus on a niche.** "Electronic music platform" is more compelling to electronic musicians than "music platform for everyone." Niche platforms attract passionate early adopters.
5. **Make each artist page independently useful.** Even with zero platform discovery, an artist should be able to use their page as a professional storefront by sending their own fans to it.

**Detection:** If the platform has been live for 3 months with fewer than 5 active artists, the chicken-and-egg problem is active. Consider pivoting to a "white-label storefront" model (artist pays, fans buy) rather than a marketplace (platform attracts both sides).

**Confidence:** HIGH -- marketplace chicken-and-egg is the most documented startup failure mode.

---

### Pitfall 5: Underestimating Payment Intermediary Tax/Legal Obligations

**What goes wrong:** The platform facilitates payments between fans and artists but fails to handle tax reporting requirements, leading to IRS penalties.

**Why it happens:** As a payment intermediary, the platform may be classified as a "third party settlement organization" (TPSO) under IRS rules, which requires issuing 1099-K forms to sellers (artists) who exceed reporting thresholds. The current threshold (reinstated by the One Big Beautiful Bill Act of 2025) is $20,000 AND 200+ transactions per year.

**Consequences:**
- IRS penalties for failure to file required information returns ($310 per form, up to $3.75M/year)
- Artist complaints about missing tax documents
- Potential classification as a money transmitter in some states (requires licenses)

**Prevention:** Use Stripe Connect Standard accounts. This is the single most important architectural decision for a solo developer. With Standard accounts, **Stripe is the TPSO, not the platform.** Stripe handles all 1099-K reporting for connected accounts. The platform never touches artist funds directly -- Stripe splits the payment and pays artists directly. This eliminates the platform's tax reporting obligation entirely.

**Confidence:** HIGH -- IRS 1099-K requirements are documented. Stripe Connect Standard's tax reporting responsibilities are documented in Stripe's own documentation.

**Sources:**
- [IRS: Understanding your Form 1099-K](https://www.irs.gov/businesses/understanding-your-form-1099-k)
- [IRS: OBBBA new reporting thresholds](https://rsmus.com/insights/services/business-tax/irs-updates-obbba-new-reporting-thresholds.html)

---

## Moderate Pitfalls

### Pitfall 6: GDPR Compliance as an Afterthought

**What goes wrong:** The platform collects user data (email, payment info, listening history) from EU users without proper consent, privacy policy, or data handling procedures.

**Why it happens:** If the platform is accessible from the EU (and it will be, because it is on the public internet), GDPR applies. Penalties are up to 4% of global revenue or EUR 20 million, whichever is higher.

**Prevention:**
- Implement cookie consent (analytics cookies, not essential cookies)
- Write a clear privacy policy stating what data is collected, why, and how long it is retained
- Implement data export (user can download their data) and data deletion (user can request account deletion)
- Do not store unnecessary data (do not log IP addresses for analytics unless anonymized)
- Stripe handles PCI compliance for payment data -- do not store card numbers

**Confidence:** MEDIUM -- GDPR requirements are clear in principle but complex in implementation detail. A privacy policy template is likely sufficient for MVP; full GDPR compliance may require legal counsel as the platform scales.

---

### Pitfall 7: Audio Processing as a Bottleneck

**What goes wrong:** Multiple artists upload releases simultaneously. Audio transcoding (FLAC to MP3, waveform peak generation) is CPU-intensive and blocks the Node.js event loop, causing the entire platform to become unresponsive.

**Why it happens:** The current wallybrain-music processes uploads synchronously -- the server transcodes audio during the upload request. This works for a single-user admin uploading one track at a time. It fails catastrophically when 10 artists upload 10 tracks each simultaneously.

**Consequences:**
- Platform becomes unresponsive during upload processing
- Other users experience timeouts
- Upload processes compete for CPU, making all of them slower

**Prevention:**
- Implement a background job queue from the start (BullMQ with Redis, or a simpler in-process queue using p-queue)
- Upload handler: accept files, validate, store in R2, create DB records with status='pending', return immediately
- Background worker: process pending tracks (transcode, peaks, metadata extraction)
- At small scale (<50 artists): in-process queue is fine
- At medium scale (50-500 artists): separate worker process or Docker service
- The existing wallybrain-music `queue.ts` already implements a basic queue pattern -- port and extend it

**Confidence:** HIGH -- audio processing is inherently CPU-bound and Node.js is single-threaded. This is a known scaling bottleneck.

---

### Pitfall 8: Trying to Moderate Content Without Resources

**What goes wrong:** Artists upload problematic content -- pirated music, hate speech in metadata, NSFW cover art, AI-generated music claimed as original -- and the solo developer cannot keep up with moderation.

**Why it happens:** Any platform that accepts user uploads will attract bad actors. At small scale, manual review works. At medium scale (100+ artists uploading weekly), it becomes a part-time job.

**Prevention:**
- Require email verification before artists can upload (basic bot prevention)
- Implement a reporting system (other users can flag content)
- Manual review queue with email notifications
- Clear Terms of Service that give you the right to remove content and ban users
- Do NOT attempt automated content moderation (audio fingerprinting, AI detection) -- the complexity is not justified at this scale
- Accept that some bad content will exist temporarily. The DMCA takedown process handles copyright issues. Community reporting handles everything else.

**Confidence:** HIGH -- content moderation is a documented challenge for every user-generated content platform.

---

### Pitfall 9: Premature Feature Parity with Bandcamp

**What goes wrong:** The developer tries to match Bandcamp's full feature set before launching -- wishlists, fan collections, physical merch, vinyl pre-orders, Bandcamp Daily editorial, fan messaging, artist recommendations, genre taxonomies, label accounts. The project takes 18 months and never launches.

**Why it happens:** Bandcamp has been developing features for 15+ years with a full engineering team. Comparing an MVP to Bandcamp's current state is demoralizing and leads to scope creep.

**Consequences:**
- Launch is perpetually delayed
- No revenue is generated while features are being built
- The market window (post-Songtradr artist distrust) closes before the platform is ready
- Developer burnout from an endlessly growing feature list

**Prevention:**
- MVP has 6 features: artist pages, upload, player, pricing, purchase, download
- Everything else is post-launch
- Set a hard deadline: "launch in 8 weeks, whatever is done is v1"
- Use Bandcamp as inspiration for the DIRECTION, not a checklist for feature completeness
- Remember: Mirlo and Ampwall are live with significantly fewer features than Bandcamp

**Confidence:** HIGH -- scope creep is the most common cause of solo developer project failure.

---

### Pitfall 10: Neglecting SEO for Artist Pages

**What goes wrong:** Artist and release pages are client-side rendered or poorly structured for search engines. Artists cannot share their page on social media with proper previews. Google does not index artist pages.

**Why it happens:** SPA frameworks default to client-side rendering. If SSR is not configured correctly, the page appears blank to crawlers and social media scrapers.

**Prevention:**
- SvelteKit SSR is enabled by default -- do not disable it
- Add proper meta tags for every artist and release page:
  - `<title>`, `<meta name="description">`, Open Graph tags, Twitter Card tags
  - Cover art as `og:image` for social media previews
- Generate a sitemap.xml with all published artist and release URLs
- Structured data (JSON-LD) for music releases (Schema.org MusicRelease)

**Confidence:** HIGH -- SvelteKit's SSR is the default behavior. The risk is accidentally breaking it, not needing to add it.

---

## Minor Pitfalls

### Pitfall 11: R2 Public URL Configuration

**What goes wrong:** Audio files and cover art return CORS errors in the browser, or R2 bucket is accidentally configured as fully public (including private FLAC downloads).

**Prevention:**
- Enable a custom domain or R2 public access for the bucket
- Configure CORS headers to allow requests from the platform's domain
- Use separate R2 bucket prefixes or access policies: public (art, peaks, preview MP3) vs. private (original FLAC/WAV)
- Test audio playback cross-origin before deploying

### Pitfall 12: Slug Collision Between Artists and Reserved Routes

**What goes wrong:** An artist registers the slug "dashboard" or "browse" or "api," breaking platform routing.

**Prevention:** Maintain a reserved words list. Check artist slug registration against it. Include at minimum: browse, dashboard, collection, auth, api, admin, about, terms, privacy, dmca, health, sitemap, robots, static, assets, _app.

### Pitfall 13: Download Link Security

**What goes wrong:** Download links are shared publicly, allowing non-purchasers to download files for free. Or download links expire before the fan can use them.

**Prevention:**
- Signed R2 URLs with 24-hour expiration for initial download
- Purchasers can regenerate download links from their purchase confirmation page (requires purchase ID or email verification)
- Log download counts per purchase to detect abuse
- Accept that some sharing will happen -- this is not DRM, it is inconvenience reduction

### Pitfall 14: Audio Format Compatibility

**What goes wrong:** Artists upload audio in formats the processing pipeline does not support (AIFF, ALAC, DSD, multi-channel WAV), causing processing failures.

**Prevention:**
- Accept: WAV, FLAC, AIFF, MP3, AAC, OGG (common formats)
- Transcode everything to MP3 320kbps for streaming preview
- Offer original format + MP3 as download options
- The existing wallybrain-music validation pipeline (magic bytes + ffprobe) handles format detection -- port it

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth system | Over-engineering roles/permissions for MVP | Two roles only: fan and artist. Admin is hardcoded user ID. Add granular permissions later. |
| Stripe Connect | Choosing Express over Standard | Use Standard from day one. Zero per-account fees. Stripe handles tax reporting. |
| Upload pipeline | Synchronous processing blocking server | Background queue even for MVP. The wallybrain-music queue.ts pattern is a starting point. |
| Commerce | Building a cart for MVP | Single-release "Buy Now" -> Stripe Checkout. No cart until proven necessary. |
| Legal/compliance | Launching without DMCA agent | Register DMCA agent ($6) and post policy BEFORE any user uploads. |
| Discovery/search | Building recommendation engine | Tag-based browsing only. PostgreSQL full-text search. No ML. No algorithms. |
| Scale | Premature optimization | At <100 artists, everything runs on one VPS. Do not over-architect. |
| Marketing | Waiting for the platform to be "ready" | Recruit 5-10 artists during development. Launch when core commerce works, not when every feature exists. |
| Branding | Using wallybrain-music name for marketplace | New project needs its own identity. wallybrain is a personal brand, not a marketplace brand. |

---

## The One Pitfall That Kills Most Solo Dev Marketplace Projects

**Building too much before validating demand.**

The entire platform described in this research could take 3-6 months to build. Before investing that time:

1. Can you personally recruit 5 artists who would use this platform?
2. Would those artists' fans actually buy music through it (vs. Bandcamp)?
3. Is the visual differentiation (waveform player, color theming) enough to make artists choose this over Mirlo or Ampwall?

If the answer to any of these is "I am not sure," validate before building. Create a landing page. Talk to artists. Show them wallybrain-music and ask "Would you sell your music on something that looks like this?" The answers determine whether to build a marketplace or pivot to something else (e.g., a self-hosted storefront tool artists run themselves, which avoids the chicken-and-egg problem entirely).

---

## Sources

- [PatentPC: DMCA Compliance Checklist 2025](https://patentpc.com/blog/the-complete-dmca-compliance-checklist-for-online-platforms-in-2025)
- [US Copyright Office: DMCA Agent Directory](https://www.copyright.gov/dmca-directory/)
- [Stripe Connect Pricing](https://stripe.com/connect/pricing)
- [IRS: Understanding Form 1099-K](https://www.irs.gov/businesses/understanding-your-form-1099-k)
- [IRS: OBBBA new reporting thresholds](https://rsmus.com/insights/services/business-tax/irs-updates-obbba-new-reporting-thresholds.html)
- [GDPR.eu: What is GDPR?](https://gdpr.eu/what-is-gdpr/)
- [Bandcamp Songtradr layoffs](https://variety.com/2023/music/news/bandcamps-layoffs-songtradr-1235758123/)
- [Subvert cooperative model](https://www.thefader.com/2025/10/14/subvert-fm-bandcamp-interview)
- [Bandcamp alternatives comparison](https://bandcampalternative.com/)
