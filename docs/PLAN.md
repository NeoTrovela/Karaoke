# Build Plan

This is the original MVP plan, kept as a living checklist so any future session can see at a
glance what's done and what's next without re-deriving it from git history. For the *how it's
laid out* and *why these technologies*, see [`ARCHITECTURE.md`](ARCHITECTURE.md) and
[`TECH_STACK.md`](TECH_STACK.md) — this file is the *what's left to build*.

## Context

A party karaoke app: a computer (hooked to a TV/speakers) hosts a session, and a group of people
join from their own phones over the web — no app installs. Each phone acts as a wireless mic,
streaming live audio to the computer so it plays out loud, while the computer's screen shows a
YouTube karaoke video (instrumental + lyrics baked in) full-screen. Multiple people can sing at
once, each phone runs a local "fun" score (Just Dance-style, not pitch-perfect grading), and the
computer shows a live leaderboard.

Four decisions were locked in before building, and shouldn't be revisited without good reason:

- **Content**: YouTube karaoke videos only. No uploads, no lyrics API, no separate audio hosting —
  YouTube gives both the backing track and on-screen lyrics for free.
- **Scoring**: no reference melody is available from YouTube, so scoring is a "fun"/relative
  heuristic (pitch steadiness, volume/energy, participation) computed client-side — not true
  pitch-accuracy grading.
- **Platform**: fully web-based (no native apps) — computer opens a browser page, phones join via
  QR code/room code in their own mobile browser.
- **Mics**: multiple simultaneous phones can be live at once (group/competitive singing), each
  with its own score, feeding a shared leaderboard.

## Build steps

- [x] **Scaffold** — npm-workspaces monorepo, server boots (Express + Socket.io), client builds
      (Vite + React + Tailwind), pushed to GitHub.
- [x] **M1 — Room lifecycle + signaling skeleton**: create/join a room, QR + code display, live
      waiting-room player list. No audio/video yet.
  - Verify: player list updates live as phones join/leave; test a bad/unknown room code.
- [ ] **M2 — Single phone mic → host playback (WebRTC)**: the offer/answer/ICE handshake between
      one phone and the host, host plays the incoming stream. The riskiest plumbing in the app.
  - Verify: test with phone muted/headphones first to confirm connectivity without feedback, then
    live; try one phone on cellular data to gauge whether STUN alone is enough.
- [ ] **M3 — YouTube embed + playback control**: paste-a-URL video ID parsing, fullscreen stage,
      room-code overlay.
  - Verify: test a known-embeddable and a known-non-embeddable video to confirm error handling;
    confirm fullscreen requires the manual button (browser gesture requirement).
- [ ] **M4 — Multiple simultaneous mics**: extend the host's peer-connection manager to cleanly
      handle N concurrent connections with cleanup on disconnect.
  - Verify: 2-3 phones singing simultaneously, confirm all are audible and one disconnecting
    cleans up properly.
- [ ] **M5 — Client-side scoring engine**: pitch/volume analysis (`pitchy` + `AnalyserNode`),
      composite score, live visualizer.
  - Verify: deliberately test contrasting inputs (sustained note, silence, shouting, normal
    singing) and sanity-check the score reacts in the right direction — this is subjective tuning,
    not exact-value testing.
- [ ] **M6 — Leaderboard UI polish**: sorted/animated leaderboard, final-results screen, full
      end-to-end run.
  - Verify: full run-through — create room, 2+ phones join, pick a real karaoke video, sing
    together, watch the leaderboard update live, confirm final-results screen on video end, and
    test a late joiner mid-song.
- [ ] **Post-MVP** (documented, not yet planned in detail): TURN server for cross-network
      reliability, per-player host-side gain control, in-app YouTube search, reconnect handling,
      duet-mode visuals.

## Known limitations (accepted, not oversights)

These inform decisions at every milestone above, not just one — see
[`ARCHITECTURE.md`](ARCHITECTURE.md#known-limitations-accepted-not-oversights) for full detail.

- **Acoustic feedback**: phone mics will pick up the host's speaker output. WebRTC's
  `echoCancellation: true` helps but won't eliminate it.
- **No server-side audio access**: YouTube's IFrame API exposes playback control only, never raw
  audio — this is why scoring must be heuristic and why mixing is acoustic, not digital.
- **STUN-only NAT traversal**: will fail for some phones on cellular data or behind strict/
  symmetric NATs. TURN is the documented fix, deferred unless testing shows it's a frequent
  blocker.
- **Mobile browser quirks**: iOS Safari requires `getUserMedia` triggered by a direct tap, and
  `AudioContext` may start `suspended` until a user gesture resumes it.
- **In-memory server state**: a server restart drops all active rooms — acceptable for a single
  live party session.

## General verification approach

Test with 1 laptop (host, real speakers if possible) + 2 real mobile phones (not devtools
device-mode — `getUserMedia`/WebRTC/AudioContext behave differently on real mobile) on the same
wifi. Use `chrome://inspect` (Android) or Safari Web Inspector (iOS via Mac) to see phone console
logs during testing.

---

As each milestone is completed, update its checkbox to `[x]` so this file stays trustworthy as a
progress tracker.
