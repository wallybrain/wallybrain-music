# wallybrain.icu Store Feature — Planning Notes

> Captured from conversation on 2026-02-14. Not yet implemented.

## Decision

Add a **single-artist store** to wallybrain.icu to sell music directly. This is NOT the multi-artist marketplace (separate project). Primary motivation is learning and independence, not revenue.

## Approach: Stripe Checkout Overlay (Option 2)

Stripe Checkout handles the payment UI. No user accounts for buyers — just email + purchase token. Keeps it simple.

## Architecture

- Add `price` (nullable, cents) to tracks and collections
- Stripe Checkout Sessions API for payment
- Webhook handler for `checkout.session.completed`
- `purchases` table (email, track/collection ID, stripe session ID, timestamp)
- `download_tokens` table (token, purchase ID, expiry, download count)
- Secure `/download/[token]` route with time-limited links
- Email purchase confirmation + download link via transactional email service

## Monthly Cost: $0

- Stripe: No monthly fee, only per-transaction (2.9% + $0.30)
- Email: Free tier (Resend/SendGrid) covers low volume
- Storage: Lossless files fit on existing VPS disk (~4-7GB for 95 tracks)
- No new infrastructure required

## Per-Transaction Economics

| Price | Stripe Takes | You Keep |
|-------|-------------|----------|
| $1    | $0.33 (33%) | $0.67    |
| $3    | $0.39 (13%) | $2.61    |
| $5    | $0.45 (9%)  | $4.55    |
| $10   | $0.59 (6%)  | $9.41    |

Minimum viable price point: ~$3/track to keep Stripe's cut reasonable.

## Implementation Phases (est. 20-25 hours total)

### Phase 1: Schema + Stripe Integration (~8 hours)
- Schema migration: `price` on tracks/collections, `purchases` + `download_tokens` tables
- Admin UI: price field + "for sale" toggle on track/collection edit forms
- `/api/checkout` — creates Stripe Checkout Session
- `/api/webhooks/stripe` — handles payment confirmation (signature verification, idempotency)
- Caddy config: public webhook endpoint that bypasses Authelia

### Phase 2: Store UI + Downloads (~8 hours)
- "Buy" button on track/collection pages (only shows when price is set)
- Price display styling consistent with existing design
- Success/confirmation page post-purchase
- `/download/[token]` route — secure, time-limited file delivery
- Lossless file storage (keep original WAV/FLAC alongside transcoded AAC)
- Upload pipeline change: preserve original uploads

### Phase 3: Email + Polish (~6 hours)
- Transactional email service setup (Resend or SendGrid)
- Purchase confirmation email template with download link
- Download expiry handling + re-request flow
- Edge cases: failed payments, duplicate purchases, expired links
- Terms of sale page

## Key Technical Decisions (Not Yet Made)

1. **Email service**: Resend vs SendGrid vs self-hosted SMTP
2. **Lossless format**: WAV vs FLAC vs both (offer choice?)
3. **Download limits**: How many times can a buyer re-download?
4. **Pricing model**: Per-track only, or album discounts?
5. **Free tracks**: Some tracks free to stream + download, others paid?
6. **Preview behavior**: Full stream free, pay for download? Or preview clip only?

## What This Does NOT Build Toward

This is a single-artist store. It does NOT evolve into the multi-artist marketplace because:
- Stripe Checkout (your account) vs Stripe Connect (artist sub-accounts) — different API entirely
- No user accounts vs full auth with roles
- SQLite vs PostgreSQL
- Authelia vs Better Auth

The marketplace remains a separate project if/when that happens. This store serves wallybrain.icu as a personal artist site.

## Prerequisites Before Starting

1. Create Stripe account + complete identity verification
2. Get Stripe API keys (test + live)
3. Choose transactional email service
4. Decide on lossless format offering
5. Have original/lossless source files for tracks you want to sell
