# Requirements: wallybrain-music

**Defined:** 2026-02-07
**Core Value:** Visitors can discover and listen to wallybrain's music through an immersive, visually engaging waveform player

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Playback

- [ ] **PLAY-01**: Visitor can play/pause audio tracks with a waveform visualization
- [ ] **PLAY-02**: Visitor can scrub (seek) to any position by clicking/dragging the waveform
- [ ] **PLAY-03**: Waveform renders instantly using pre-generated server-side peak data
- [ ] **PLAY-04**: Audio player persists in a bottom bar while navigating between pages
- [ ] **PLAY-05**: Next track auto-plays when current track ends (continuous queue)
- [ ] **PLAY-06**: Visitor can see current playback time and total duration
- [ ] **PLAY-07**: Visitor can adjust volume via a volume control

### Track Display

- [ ] **DISP-01**: Visitor can browse a track listing page showing all published tracks
- [ ] **DISP-02**: Each track displays cover art, title, duration, and play count
- [ ] **DISP-03**: Visitor can view a track detail page with description/liner notes
- [ ] **DISP-04**: Visitor can filter tracks by content type (finished, experiment, set, export)
- [ ] **DISP-05**: Visitor can filter tracks by genre tags (ambient, techno, modular, etc.)
- [ ] **DISP-06**: Track play counts increment and display (debounced, anonymous)

### Visual Design

- [ ] **UI-01**: Dark/moody aesthetic appropriate for electronic music
- [ ] **UI-02**: Responsive design works on mobile, tablet, and desktop
- [ ] **UI-03**: Loading states and buffering indicators for audio content

### Sharing

- [ ] **SHARE-01**: Each track has a unique permalink URL (/music/track/slug)
- [ ] **SHARE-02**: Track pages include Open Graph meta tags for rich previews on social platforms

### Admin

- [ ] **ADMIN-01**: Admin can upload audio files via drag-and-drop interface
- [ ] **ADMIN-02**: Admin can set/edit track metadata (title, description, cover art, tags, category)
- [ ] **ADMIN-03**: Admin can see processing status for uploaded tracks (transcoding, peaks, art)
- [ ] **ADMIN-04**: Admin upload UI is protected behind Authelia 2FA

### Infrastructure

- [ ] **INFRA-01**: Platform serves at wallyblanchard.com/music via Caddy reverse proxy
- [ ] **INFRA-02**: Audio files stored on server filesystem with proper organization
- [ ] **INFRA-03**: Upload processing pipeline transcodes audio, generates peaks, extracts metadata, resizes art
- [ ] **INFRA-04**: Audio streaming supports HTTP range requests for seeking
- [ ] **INFRA-05**: Application runs in Docker container with health checks

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Social Interaction

- **SOCL-01**: Visitor can create an account to interact with tracks
- **SOCL-02**: Registered user can leave comments on tracks
- **SOCL-03**: Registered user can like/favorite tracks
- **SOCL-04**: Timed comments on waveform (SoundCloud-style)

### Content Delivery

- **CDN-01**: Audio files served via CDN for global performance
- **DL-01**: Visitor can download tracks (gated behind email or account)

### Curation

- **CUR-01**: Admin can create curated playlists/collections
- **CUR-02**: Invite-only interaction mode for selected users

## Out of Scope

| Feature | Reason |
|---------|--------|
| User registration / accounts | v1 is display-only; massive scope increase for auth, sessions, GDPR |
| Comments / likes / reposts | Requires user accounts; deferred to v2 |
| Download buttons | No distribution strategy for v1; revisit later |
| Monetization / payments | Not a commercial platform; use Bandcamp if needed |
| Video content | Different encoding pipeline and player; audio-only |
| Mobile app | Web-first; responsive design covers mobile |
| Music recommendation engine | Irrelevant for small personal catalog |
| Federation / ActivityPub | No multi-instance use case |
| On-the-fly transcoding | Pre-transcode on upload instead |
| Lyrics / timed lyrics | Electronic music is largely instrumental |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAY-01 | — | Pending |
| PLAY-02 | — | Pending |
| PLAY-03 | — | Pending |
| PLAY-04 | — | Pending |
| PLAY-05 | — | Pending |
| PLAY-06 | — | Pending |
| PLAY-07 | — | Pending |
| DISP-01 | — | Pending |
| DISP-02 | — | Pending |
| DISP-03 | — | Pending |
| DISP-04 | — | Pending |
| DISP-05 | — | Pending |
| DISP-06 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |
| SHARE-01 | — | Pending |
| SHARE-02 | — | Pending |
| ADMIN-01 | — | Pending |
| ADMIN-02 | — | Pending |
| ADMIN-03 | — | Pending |
| ADMIN-04 | — | Pending |
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| INFRA-04 | — | Pending |
| INFRA-05 | — | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 0
- Unmapped: 27

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after initial definition*
