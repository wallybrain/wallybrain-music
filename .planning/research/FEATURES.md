# Feature Landscape

**Domain:** Self-hosted single-artist music platform (SoundCloud-like portfolio)
**Researched:** 2026-02-07
**Overall Confidence:** HIGH

---

## Table Stakes

Features visitors expect from any music platform. Missing these and the site feels broken or amateur.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Waveform audio player with scrubbing** | This IS the SoundCloud experience. A plain `<audio>` tag screams "2008 blog." Clicking/dragging on a waveform to seek is the minimum bar for a modern music player. | High | Use wavesurfer.js. Pre-generate peak data server-side (via `audiowaveform` CLI) to avoid downloading entire files for waveform rendering. Critical for long tracks (60min sets). |
| **Cover art per track** | Every music platform shows artwork. Without it, the page is a wall of text. | Low | Store as optimized images. Generate thumbnails on upload. |
| **Track title and artist name** | Basic metadata. Users need to know what they are listening to. | Low | Artist is always "wallybrain" in v1, but store per-track for flexibility. |
| **Play/pause controls** | Fundamental audio interaction. | Low | Part of the waveform player component. |
| **Volume control** | Users need to adjust loudness. | Low | Slider or knob integrated into player. |
| **Current time / duration display** | Users need temporal context while listening. | Low | Display as `MM:SS / MM:SS`. |
| **Track listing page** | The main page showing all available tracks. Without this, there is no browsing. | Medium | Needs sorting, filtering, and responsive grid/list layout. |
| **Responsive design (mobile-friendly)** | Over 50% of web traffic is mobile. A music page that breaks on phones is unusable. | Medium | Waveform player must work on touch. Test scrubbing on mobile. |
| **Dark/moody aesthetic** | Electronic music audiences expect dark UIs. Light themes feel wrong for this genre. SoundCloud, Spotify, Ableton -- all dark. | Medium | Not just dark mode toggle; the entire brand identity. Deep blacks, accent colors (neon, amber, violet). |
| **Loading states / buffering indicator** | Audio takes time to load. Without feedback, users think the site is broken. | Low | Skeleton waveform or progress indicator while audio loads. |
| **Basic metadata display** | Genre, duration, upload date at minimum. Users scan this when deciding what to play. | Low | Show inline on track cards and detail views. |

## Differentiators

Features that elevate wallybrain-music beyond a basic file listing. Not expected, but they make visitors stay and return.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Persistent bottom-bar player** | Visitors can browse the site while audio continues playing. SoundCloud does this; most portfolio sites do not. This is the single biggest UX upgrade over a simple page. | High | Requires SPA-like behavior (AJAX page loading or full SPA framework). Player component lives outside routed content. Music should not restart on navigation. |
| **Pre-generated waveform peaks** | Instant waveform rendering without downloading the full audio file. Critical for 60-minute sets. Most DIY music pages skip this entirely. | Medium | Server-side: run `audiowaveform` (BBC tool) on upload to generate JSON peaks. Client-side: pass peaks to wavesurfer.js. Dramatically improves perceived performance. |
| **Content type categories** | Organize tracks into "Finished," "Experiments," "Live Sets," "Ableton Exports." This lets visitors filter by what interests them and sets expectations about polish level. Most artist sites dump everything in one list. | Medium | Tag-based or category-based. Filterable on the listing page. |
| **Track descriptions / liner notes** | Process notes, gear used, inspiration -- this is what makes an artist portfolio different from a streaming service. Fans of electronic music care about the "how." | Low | Markdown or rich text per track. Expandable on track detail view. |
| **Play count tracking** | Social proof. Even without user accounts, seeing "played 247 times" gives credibility and helps visitors find popular tracks. | Low | Server-side counter incremented on play. Debounce to prevent inflation (count once per session/IP, or after N seconds of playback). |
| **Continuous queue / auto-play next** | After a track ends, the next one plays automatically. Turns the site into a listening session, not a series of clicks. Increases time-on-site significantly. | Medium | Requires a queue data structure in the client. The persistent player manages the queue. User should be able to see and reorder it. |
| **Drag-and-drop admin upload** | The admin experience matters because the artist will use it constantly. Drag a WAV/MP3 onto a drop zone, fill in metadata, and publish. Friction here means tracks never get uploaded. | Medium | Behind Authelia auth. Accept multiple formats. Trigger waveform generation on upload. Show upload progress. |
| **Admin metadata editor** | Edit title, description, cover art, tags, and category after upload. Mistakes happen; re-uploading the entire track to fix a typo is unacceptable. | Medium | Form-based editor. Preview changes before saving. |
| **Genre/tag system** | Beyond categories, tags like "ambient," "techno," "modular," "live" let visitors explore by style. | Low | Free-form tags with autocomplete from existing tags. Filter/search by tag on listing page. |
| **Share link per track** | Direct URL to a specific track that loads with that track ready to play. Essential for sharing on social media. | Low | Each track gets a permalink (e.g., `/music/track/slug`). Open Graph meta tags for rich previews when shared. |
| **Open Graph / social meta tags** | When someone shares a track link on Discord, Twitter, or iMessage, it should show the track title, cover art, and description as a rich preview. | Low | Dynamic `<meta>` tags per track page. Include `og:image`, `og:title`, `og:description`, `og:audio`. |
| **Keyboard shortcuts** | Space to play/pause, arrow keys to seek. Power users (and the artist themselves) expect this. | Low | Global key listeners. Standard conventions (space = play/pause, left/right = seek 5-10s). |
| **Waveform hover time preview** | Show timestamp on hover over the waveform before clicking. SoundCloud does this and it significantly improves the scrubbing experience. | Low | Wavesurfer.js hover plugin. Tooltip showing time at cursor position. |

## Anti-Features

Features to explicitly NOT build. Each one adds complexity without serving the core mission of a single-artist portfolio.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User registration / accounts** | v1 is display-only. Adding auth for visitors means session management, password resets, email verification, GDPR compliance, abuse moderation. Massive scope increase for zero v1 value. | Track play counts anonymously. Defer accounts to a future version if social features are ever needed. |
| **Comments system** | Without user accounts, comments require either anonymous posting (spam magnet) or a third-party auth integration. SoundCloud's timed comments are iconic but require a full social layer. Not worth the complexity for a personal portfolio. | Add a "Contact" link or social media links. If the artist wants feedback, direct people to Discord or email. |
| **Likes / favorites / reposts** | Social features without a user base are empty vanity metrics. They require accounts, and a single-artist site does not have the network effects to make them meaningful. | Play counts provide sufficient social proof. |
| **Download buttons** | Giving away audio files in v1 removes incentive to return to the site. Also raises concerns about unauthorized redistribution. | If downloads are ever offered, gate them behind email capture or accounts in a future version. |
| **Monetization / payments** | Stripe integration, tax compliance, refund handling, regional pricing -- this is an entire product vertical. wallybrain-music is a portfolio, not a store. | Link to Bandcamp if the artist ever sells music commercially. |
| **Playlists (user-created)** | Requires user accounts. Even artist-curated playlists add admin complexity for minimal v1 value beyond categories. | Use content type categories (Finished, Experiments, Sets) as the organizational primitive. Consider artist-curated playlists as a v2 feature. |
| **Music recommendation engine** | Collaborative filtering, content-based analysis, ML models -- this is what Spotify spends billions on. Irrelevant for a catalog of fewer than 100 tracks by one artist. | Sort by popularity (play count), recency, or category. Let users discover organically. |
| **Video support** | Different encoding pipeline, different player, much larger storage requirements. Completely different technical domain. | Audio only. If video is ever needed, embed YouTube/Vimeo links. |
| **Mobile app** | Native apps require app store accounts, separate codebases (or React Native), review processes, and ongoing maintenance. The web player should work well on mobile browsers. | Build a responsive web app. Add a web app manifest for "Add to Home Screen" if desired. |
| **Federation / ActivityPub** | Funkwhale does this, but it is an enormous protocol to implement and wallybrain-music has no multi-instance use case. | Keep it a standalone site. Share links manually. |
| **On-the-fly transcoding** | Navidrome transcodes FLAC to MP3 for bandwidth savings, but this requires ffmpeg running on every request. For a personal portfolio with moderate traffic, serve pre-encoded files. | Transcode to web-friendly formats (MP3/AAC/OGG) at upload time. Store the web-ready version alongside the original. |
| **Lyrics / timed lyrics** | Electronic music is largely instrumental. Even when there are vocals, synced lyrics add significant complexity for a niche use case. | If track has notable vocal content, mention it in the description/liner notes. |

## Feature Dependencies

```
Waveform Player (core)
  +-> Pre-generated Peaks (requires server-side audiowaveform on upload)
  +-> Hover Time Preview (requires waveform player)
  +-> Persistent Bottom Bar Player (requires waveform player + SPA architecture)
       +-> Continuous Queue / Auto-play (requires persistent player)

Admin Upload UI
  +-> Drag-and-Drop Upload (requires upload endpoint)
  +-> Waveform Peak Generation (triggered on upload)
  +-> Cover Art Processing (thumbnails generated on upload)
  +-> Admin Metadata Editor (edit after upload)

Track Listing Page
  +-> Content Type Categories (filtering)
  +-> Genre/Tag System (filtering)
  +-> Play Count Display (requires play tracking)
  +-> Sort by Popularity/Recency (requires play count + date)

Track Detail / Permalink
  +-> Share Link (each track has a URL)
  +-> Open Graph Meta Tags (requires track metadata)
  +-> Track Description / Liner Notes (displayed on detail view)

Play Count Tracking
  +-> Debounce Logic (anti-inflation, per-session or time-based)
  +-> Display on Track Cards (listing page)
```

## MVP Recommendation

**Prioritize (Phase 1 -- Minimum Lovable Product):**

1. **Waveform audio player with scrubbing** -- the core experience; without this it is just a file server
2. **Track listing page with cover art** -- the browsing experience
3. **Dark/moody responsive design** -- brand identity from day one
4. **Admin upload with drag-and-drop** -- the artist needs to add content easily
5. **Pre-generated waveform peaks** -- performance is table stakes for long tracks
6. **Basic metadata** (title, duration, date, description) -- context for listeners
7. **Share links with Open Graph tags** -- ability to share on social media

**Phase 2 -- Engagement:**

8. **Persistent bottom-bar player** -- biggest UX upgrade; requires SPA architecture
9. **Continuous queue / auto-play** -- turns visits into listening sessions
10. **Play count tracking** -- social proof
11. **Content type categories** -- organize growing library
12. **Genre/tag filtering** -- discoverability within catalog
13. **Keyboard shortcuts** -- polish

**Defer:**

- **User accounts, comments, likes** -- only if/when there is a real community to serve
- **Downloads** -- only if there is a distribution strategy
- **Monetization** -- use Bandcamp if needed
- **Artist-curated playlists** -- after categories prove insufficient

## Sources

- [SoundCloud Features for Artists (2026)](https://roboticsandautomationnews.com/2026/01/15/the-new-soundcloud-features-every-artist-should-start-using/98173/)
- [SoundCloud Reviews on G2](https://www.g2.com/products/soundcloud/reviews)
- [SoundCloud Commenting Help Center](https://help.soundcloud.com/hc/en-us/articles/115003569248-Commenting)
- [SoundCloud Embedded Player](https://help.soundcloud.com/hc/en-us/articles/115003566828-The-Visual-embedded-player)
- [Bandcamp for Artists](https://bandcamp.com/artists)
- [Why Bandcamp is Best for Independent Musicians](https://olitunes.com/why-bandcamp-is-the-best-platform-for-independent-musicians/)
- [Navidrome Self-Hosted Music Server](https://www.navidrome.org/)
- [Funkwhale](https://www.funkwhale.audio/)
- [awesome-selfhosted Audio Streaming](https://awesome-selfhosted.net/tags/media-streaming---audio-streaming.html)
- [Self-Hosted Music Overview (GitHub)](https://github.com/basings/selfhosted-music-overview)
- [wavesurfer.js](https://wavesurfer.xyz/)
- [wavesurfer.js FAQ on Pre-decoded Peaks](https://wavesurfer.xyz/faq/)
- [BBC audiowaveform for Peak Generation](https://github.com/katspaugh/wavesurfer.js/discussions/2769)
- [Continuous Audio Playback Techniques (Sonaar)](https://sonaar.io/tips-and-tricks/continuous-audio-player-on-wordpress/)
- [Music Portfolio Best Practices (Bandzoogle)](https://bandzoogle.com/blog/6-things-to-add-to-your-music-portfolio)
- [Music Portfolio Guide (LANDR)](https://blog.landr.com/music-portfolio/)
- [Best Musician Website Designs (Colorlib)](https://colorlib.com/wp/musician-websites/)
