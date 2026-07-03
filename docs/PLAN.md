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
  - Implementation: root `package.json` sets up npm workspaces (`server`, `client`). `server/`
    is Express + `http` + Socket.io bootstrapped in `src/index.ts`, with `src/config.ts` reading
    `PORT` and detecting the host's LAN IP (`getLocalIp()`) so the QR code is reachable from
    phones; a `/health` endpoint returns `{ok:true}`. `client/` is Vite + React 19 + TypeScript +
    Tailwind v4, with `react-router-dom` routes for `/`, `/host`, `/play/:code` and stub pages.
    Commit `7af9fb3`.
- [x] **M1 — Room lifecycle + signaling skeleton**: create/join a room, QR + code display, live
      waiting-room player list. No audio/video yet.
  - Verify: player list updates live as phones join/leave; test a bad/unknown room code.
  - Implementation: built as two parallel PRs, merged in this order:
    - **WebRTC signaling skeleton** (PR [#1](https://github.com/NeoTrovela/Karaoke/pull/1),
      commit `ddb8e1b`): `server/src/sockets/signalingHandlers.ts` is a pure Socket.io relay for
      `webrtc:offer`/`webrtc:answer`/`webrtc:ice-candidate`, forwarded by target socket id with
      no room-membership validation yet. Client side, `client/src/lib/webrtc/HostPeerManager.ts`
      (host: one recvonly `RTCPeerConnection` per phone) and `PlayerPeerConnection.ts` (player:
      one connection to the host, with a `setLocalStream()` hook left for M2's mic capture) both
      take an already-connected `Socket` via constructor injection rather than owning a socket
      singleton, so they wouldn't collide with the room-lifecycle branch's socket setup.
    - **Room lifecycle** (PR [#2](https://github.com/NeoTrovela/Karaoke/pull/2), commit
      `9f49bfd`, fixed in `b4c7db0`): `server/src/rooms/{RoomStore,roomCode,types}.ts` hold an
      in-memory `Map<code, Room>`, with 5-char codes excluding visually ambiguous characters
      (`0/O`, `1/I/L`). `server/src/sockets/{hostHandlers,playerHandlers}.ts` add the
      `host:create-room` / `player:join-room` handlers and broadcast `room:players` on join/leave.
      Client side, `client/src/lib/socket.ts` is a lazy Socket.io-client singleton;
      `components/host/{RoomCodeQr,WaitingRoom}.tsx` and `components/player/JoinForm.tsx` render
      the QR/code display, live player list, and join form, wired into `pages/HostPage.tsx` and
      `pages/PlayerPage.tsx`. A follow-up fix (`b4c7db0`) added a `room:closed` listener in
      `PlayerPage` (the host disconnecting wasn't surfaced to players before this) and made
      `RoomStore.createRoom` idempotent per host socket id (a `HostPage` remount was otherwise
      leaking an orphaned room each time).
    - Merging PR #2 into `main` after PR #1 required resolving a small conflict in
      `server/src/index.ts`, where both PRs added an import and a handler-registration call
      (commit `4bb07fa`); both sets were kept.
- [x] **CI pipeline** — lint + typecheck/build checks on every PR and push to `main`, no
      deployment yet (the app has no hosting target — added once the MVP is feature-complete and
      a host is chosen).
  - Verify: push the branch, confirm the Actions tab runs and passes; deliberately break a check
    on a throwaway commit to confirm it goes red, then revert.
  - Implementation: `server/package.json` gained an `oxlint` dev dependency, `lint` script, and
    `.oxlintrc.json` (mirroring `client/`) so both workspaces are lint-covered, not just the
    client. `.github/workflows/ci.yml` originally pinned Node 20 (the local dev machine's Node
    v21.7.3 was unsupported by `oxlint`/`vite`, confirmed during M1); once the dev machine was
    upgraded to Node 22 via `nvm` (and `server/package.json`'s `@types/node` bumped to match),
    CI was moved to Node 22 too so local and CI stay aligned. Steps: `npm ci`, `lint` for both
    workspaces, then `build` for both (the `build` scripts already run a full `tsc` typecheck).
    No test step yet — no test framework is installed in either workspace, so a placeholder test
    step would just be theater; add one once a framework (e.g. Vitest) is introduced. A CI status
    badge was added to the root `README.md`. Branch protection requiring this check on `main` is
    a manual GitHub Settings step, not something committed to the repo.
- [x] **M2 — Single phone mic → host playback (WebRTC)**: the offer/answer/ICE handshake between
      one phone and the host, host plays the incoming stream. The riskiest plumbing in the app.
  - Verify: test with phone muted/headphones first to confirm connectivity without feedback, then
    live; try one phone on cellular data to gauge whether STUN alone is enough.
  - Implementation: the offer/answer/ICE exchange itself already existed from M1's signaling
    skeleton (`HostPeerManager`/`PlayerPeerConnection`), so this milestone was mostly wiring it to
    real mic capture and real playback:
    - **Local HTTPS** (`scripts/setup-https.sh`, new): `getUserMedia` requires a secure context,
      which phones don't get over bare LAN HTTP. The script runs `mkcert` for `localhost`,
      `127.0.0.1`, and the machine's LAN IP, writing to a gitignored `certs/` dir. `npm run
      setup:https` wraps it. `client/vite.config.ts` and `server/src/index.ts` both check for
      `certs/cert.pem`/`key.pem` and use HTTPS/`https.createServer` when present, otherwise fall
      back to plain HTTP so `npm run dev` still works untouched. `client/src/lib/socket.ts` now
      derives the Socket.io URL's scheme from `window.location.protocol` instead of hardcoding
      `http://`. Note: `mkcert -install` (trusting the CA system-wide) needs an interactive sudo
      prompt, so the script treats that step as best-effort — without it, anyone loading the app
      (including the host) sees one "not private" browser warning to click through, same as a
      guest phone would; this matches the plan already recorded under Post-MVP deployment notes.
    - **Player mic capture** (`client/src/pages/PlayerPage.tsx`): calls `getUserMedia` from inside
      the join button's submit handler (must originate from a user gesture for iOS Safari), then
      constructs a `PlayerPeerConnection` and calls its pre-existing `setLocalStream()` hook. Mic
      tracks and the peer connection are torn down on room-closed or unmount.
    - **Host wiring** (`client/src/pages/HostPage.tsx`): instantiates `HostPeerManager` once and
      diffs each `room:players` update against the previous player-id set, calling
      `connectToPlayer()`/`disconnectPlayer()` for joins/leaves — this is what actually drives the
      offer creation that already existed in `HostPeerManager`.
    - **Host playback** (`HostPage.tsx`'s `onPlayerStream` callback): the one genuinely new piece
      of logic — keeps a `Map<playerId, HTMLAudioElement>`, creates an `Audio()` per incoming
      stream and sets `.srcObject`, cleaning up on disconnect. `WaitingRoom.tsx` also gained a 🎤
      badge per player once their stream is live, purely as a manual-testing/verification aid.
    - **Socket.io same-origin proxy** (`client/vite.config.ts`, `client/src/lib/socket.ts`):
      discovered during real-phone testing, not the earlier localhost pass — a phone that accepts
      the self-signed cert warning for the page (port 5173) does *not* thereby trust the same cert
      served on the backend's own port (3001). Browsers only offer a click-through warning for
      page navigations, never for background WebSocket/XHR requests, so the phone's Socket.io
      connection to port 3001 failed silently and joining hung forever on "Joining...". Fixed by
      adding a Vite dev proxy (`server.proxy['/socket.io']`, `ws: true`, `secure: false`) that
      forwards to the backend over loopback, and pointing the client at `window.location.origin`
      instead of a hardcoded `:3001` — now there's only ever one origin/cert for a phone to accept.
    - Verified live in two ways: (1) two browser tabs on `http://localhost:5173` (a secure context
      regardless of HTTPS) — join flow → mic-permission prompt → host's waiting-room list shows
      the 🎤 badge (proving a real track arrived over the peer connection) → disconnecting the
      player tab correctly clears both the roster entry and the host's audio element; (2) a real
      phone on the same wifi joining the HTTPS/LAN-IP host over the QR code, which is what
      surfaced the same-origin proxy bug above — after the fix, the phone's mic reached the host
      exactly like the two-tab test. Browser automation can't click through the OS-level
      mic-permission dialog or the HTTPS cert warning (by design, not a bug), so those clicks were
      done manually during both verification passes.
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
  - Deployment: split into two deploys — static client build to Vercel/Netlify/Cloudflare Pages,
    and a small always-on Node process for the Express+Socket.io signaling server on a platform
    with real persistent WebSocket support (Render/Fly.io/Railway/a VPS — not typical serverless
    functions). A real deployment gets automatic HTTPS/WSS from the platform, which removes the
    need for the local `mkcert` self-signed-cert workaround required for phone `getUserMedia`
    access on bare LAN/HTTP. Before deploying: lock down Socket.io's CORS (currently `origin: "*"`
    in `server/src/index.ts`) to the real domain, and note `RoomStore`'s in-memory `Map` means any
    restart/redeploy wipes all live rooms (already an accepted known limitation, but matters more
    on platforms that spin down idle instances than on a laptop). STUN-only WebRTC should still
    work fine since phones typically share the same room's wifi even with cloud-hosted signaling —
    TURN stays deferred as already planned. Recommendation: don't deploy until M2–M6 are done and
    tested on LAN, since deploying only changes where signaling runs, not the app logic, and local
    iteration is faster.

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

As each milestone is completed, update its checkbox to `[x]` and add an "Implementation" note
(files touched, key commits/PRs, any deviation from the original plan) so this file stays
trustworthy as both a progress tracker and a changelog.
