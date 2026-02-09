---
phase: 01-foundation
plan: 02
subsystem: infrastructure-routing
tags: [caddy, docker-network, reverse-proxy]
dependency_graph:
  requires: [01-01-PLAN]
  provides: [caddy-routing, webproxy-network, public-access]
  affects: [05-admin-auth]
tech_stack:
  - caddy (named matcher, handle blocks)
  - docker network (external webproxy)
---

# Plan 01-02 Summary: Caddy Routing and Docker Network

## What Was Built

Connected the wallybrain-music Docker container to the existing Caddy reverse proxy via a shared external Docker network (`webproxy`), enabling public access at wallyblanchard.com/music/ without Authelia authentication.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create shared Docker network and update Caddy configuration | 92c159a, e35e20c, c93c085 | ✓ |
| 2 | Human verification: wallyblanchard.com/music/ loads in browser | — | ✓ Approved |

## Key Files

### Created/Modified
- `/home/user/wallybrain-music/docker-compose.yml` — added webproxy network
- `/home/user/v1be-code-server/docker-compose.yml` — added webproxy network to all 3 services
- `/home/user/v1be-code-server/Caddyfile` — added @music named matcher routing

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Named matcher `@music path /music /music/*` over `handle_path` | `handle_path` strips prefix SvelteKit needs; `forward_auth` runs at higher Caddy priority than `handle` blocks unless isolated; named matcher with explicit `handle @music` cleanly bypasses auth |
| Let SvelteKit handle `/music` → `/music/` redirect | Caddy's `redir` syntax is ambiguous inside handle blocks; SvelteKit's 308 redirect works correctly |
| `docker restart` over `caddy reload` for config changes | Bind-mounted Caddyfile not always reflected by reload; full restart guarantees fresh file read |

## Deviations from Plan

| Rule | Type | Description | Resolution |
|------|------|-------------|------------|
| 1 | Bug | `handle_path /music/*` stripped the `/music` prefix that SvelteKit (with `paths.base: '/music'`) needs | Changed to `handle /music/*` (no stripping) |
| 2 | Bug | `forward_auth` Caddy directive runs at higher priority than `handle` blocks, so `/music/*` requests still hit Authelia | Wrapped auth + code-server in catch-all `handle` block for mutual exclusion |
| 3 | Bug | `redir /music/ 301` inside handle block parsed as matcher=`/music/` destination=`301` | Removed Caddy redirect; used named matcher `@music path /music /music/*` and let SvelteKit handle trailing-slash redirect |
| 4 | Bug | `caddy reload` didn't pick up bind-mounted file changes | Used `docker restart caddy` instead |

## Verification

- [x] wallyblanchard.com/music/ returns SvelteKit landing page (public, no auth)
- [x] wallyblanchard.com/music/health returns "OK"
- [x] wallyblanchard.com/ redirects to Authelia (existing behavior preserved)
- [x] All 4 containers on webproxy network (caddy, authelia, code-server, wallybrain-music)
- [x] Human verified in browser

## Self-Check: PASSED
