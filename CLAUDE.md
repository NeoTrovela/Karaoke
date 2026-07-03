# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A party karaoke app: a host computer (hooked to a TV/speakers) shows a room code/QR + a
full-screen YouTube karaoke video, and phones join as wireless mics over WebRTC — no app
installs. Full design rationale lives in `docs/ARCHITECTURE.md` and `docs/TECH_STACK.md`; read
those before making non-trivial changes, since several choices here (YouTube instead of file
uploads, "fun" scoring instead of pitch-accuracy grading, acoustic instead of digital audio
mixing, in-memory instead of DB-backed room state) are deliberate trade-offs, not gaps.

## Commands

npm workspaces monorepo with two packages: `server` (Node/Express/Socket.io) and `client`
(Vite/React).

```bash
npm install                       # installs both workspaces

npm run dev:server                # start signaling server (tsx watch, port 3001)
npm run dev:client                # start Vite dev server (port 5173)

npm run build:server              # tsc build -> server/dist
npm run build:client              # tsc -b && vite build -> client/dist

npm run lint --workspace=server   # oxlint
npm run lint --workspace=client   # oxlint
```

There are no tests in the repo yet. CI (`.github/workflows/ci.yml`) runs `npm ci`, lint and
build for both workspaces on every PR and push to `main`.

When running the client locally to test with phones, open Vite's printed **Network** URL (e.g.
`http://192.168.x.x:5173`), not `localhost` — the host page generates its join QR code from
`window.location.origin`, so phones on the same wifi can't reach a `localhost` URL.

The dev machine runs Node v21.7.3 (non-LTS); Vite is intentionally pinned to v6 because v8's
Rolldown bundler fails to install on that Node version. Don't upgrade Vite or reach for the
newest `oxlint` without checking Node compatibility first.

## Architecture

One React SPA serves two roles via routing (`/host` and `/play/:code`), backed by one
Node/Socket.io server that holds **no database** — room state lives entirely in server memory
for the duration of a party (`server/src/rooms/RoomStore.ts`, a `Map<roomCode, Room>`).

```
Node.js server (Express + Socket.io)          Host browser (laptop → TV)         Player browser (phone)
- in-memory room registry                     - React app, /host route          - React app, /play/:code route
- WebRTC signaling relay (offer/answer/ICE)   - YouTube IFrame Player API        - getUserMedia mic capture
- score/leaderboard broadcast                 - N RTCPeerConnections (1/phone)   - Web Audio pitch/volume analysis
                                               - plays each incoming stream       - 1 RTCPeerConnection to host
                                                 via <audio> element              - emits throttled score updates
```

Key source locations:
- `server/src/rooms/` — room state (`RoomStore.ts`), room codes, `Room`/`Player` types
- `server/src/sockets/` — `hostHandlers.ts`, `playerHandlers.ts`,
  `signalingHandlers.ts` (WebRTC offer/answer/ICE relay)
- `client/src/lib/webrtc/` — `HostPeerManager.ts` (host: one `RTCPeerConnection` per phone),
  `PlayerPeerConnection.ts` (player: single connection to host)
- `client/src/lib/audio/` — `PitchAnalyzer.ts` (AnalyserNode + `pitchy`), `scoreEngine.ts`
  (composite "fun score")
- `client/src/pages/HostPage.tsx` / `PlayerPage.tsx` — orchestrate the full host/player
  lifecycles respectively

Some of these files are stubs; check `docs/ARCHITECTURE.md`'s build roadmap for what's
implemented vs. planned before assuming a piece exists.

### WebRTC topology

Host-centric star, not full mesh: the host holds one `RTCPeerConnection` per connected phone
(`recvonly` audio), each phone holds exactly one connection (to the host), and there are no
phone-to-phone connections. The server only relays signaling messages over Socket.io
(`webrtc:offer` / `webrtc:answer` / `webrtc:ice-candidate`) — it never touches audio itself.
NAT traversal is STUN-only for now; TURN is a documented, not-yet-built fallback for cellular
phones / strict NATs (symptom of its absence: player joins the room fine but WebRTC never
reaches `connected` and no audio arrives at the host).

### Audio mixing and scoring

Multiple singers' audio is mixed **acoustically** through the host's speakers — each phone's
stream just plays out of its own `<audio>` element on the host; the app never digitally mixes
streams. Scoring is a client-side "fun" heuristic (rolling RMS volume + pitch steadiness in
semitones + voiced-frame participation), computed on the phone from the same mic `MediaStream`
used for WebRTC, throttled and sent to the server for leaderboard rebroadcast. This is
intentionally not true melody-accuracy grading — there's no reference pitch data available,
since the app only controls YouTube playback via the IFrame API and never gets raw decoded
audio.

## Parallel sessions

Multiple Claude Code sessions may be working on different milestones of this project
simultaneously, each in its own git worktree/branch/PR. Keep changes scoped to the task at hand
to avoid cross-branch conflicts, and check `docs/PLAN.md` for what other milestones may be in
flight.
