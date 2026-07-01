# Tech Stack

## Overview

Fully web-based: no native apps, no app-store installs. One monorepo (npm workspaces) with two
packages, `server` and `client`.

| Layer | Choice |
|---|---|
| Backend runtime | Node.js + TypeScript |
| Backend framework | Express |
| Realtime/signaling | Socket.io |
| Frontend framework | React 19 + TypeScript |
| Frontend build tool | Vite 6 |
| Routing | react-router-dom |
| Styling | Tailwind CSS v4 |
| Realtime client | socket.io-client |
| Mic-to-speaker streaming | WebRTC (native `RTCPeerConnection`, no wrapper library) |
| NAT traversal | Public STUN (Google's); TURN documented as a post-MVP fallback |
| QR codes | `qrcode.react` |
| Pitch detection | `pitchy` |
| Song/lyrics playback | YouTube IFrame Player API, via `react-youtube` |
| Package management | npm workspaces (no Turborepo/Nx — the repo is small enough not to need it) |

## Why each piece

**Express** — only needed to serve the built client and a health-check endpoint; Socket.io
attaches to the same HTTP server. Nothing heavier is warranted for an app with no REST API and
no database.

**Socket.io** (over raw `ws`) — handles reconnection and room/namespace grouping
(`socket.join(roomCode)`) out of the box, and falls back to other transports if WebSockets get
blocked on flaky venue wifi. That resilience matters more here than raw `ws`'s smaller footprint,
given phones will be joining from varied, sometimes-flaky networks at a party.

**Vite** (currently pinned to v6, not the newest v8) — Vite 8 ships a Rolldown-based bundler
that requires a native binary; that binary failed to install under this project's Node version
(v21.7.3, a non-LTS release), so the stack is pinned to the stable, pure-JS Vite 6 line instead
of forcing a Node upgrade. Worth revisiting if/when the dev machine moves to an LTS Node version.

**Tailwind CSS v4** — fast to build both a "big screen" host layout (legible from across a room)
and a mobile-first phone layout without hand-rolling CSS, using the official `@tailwindcss/vite`
plugin (no separate PostCSS config needed).

**Raw `RTCPeerConnection`** (instead of a library like `simple-peer`) — the app's WebRTC topology
is asymmetric: the host manages *N* peer connections (one per phone) while each phone manages
exactly *one* (to the host). A thin custom wrapper around the native API
(`HostPeerManager`/`PlayerPeerConnection`) fits that shape more directly than forcing a
library built around symmetric 1:1 connections.

**Public STUN only, no TURN yet** — STUN (`stun:stun.l.google.com:19302`) is free, zero-config,
and sufficient for the common case of a phone and laptop on the same wifi. TURN
(e.g. self-hosted `coturn`, or a hosted provider like Metered.ca) becomes necessary if a phone is
on cellular data or behind a strict/symmetric NAT — deferred until real usage shows it's actually
needed, since it requires standing up or paying for relay infrastructure.

**`pitchy`** — a small (~3kB), dependency-free pitch detection library (McLeod Pitch Method) that
takes the raw time-domain audio buffer from a Web Audio `AnalyserNode` and returns a frequency +
confidence value. More robust against noisy phone-mic input than a hand-rolled autocorrelation
implementation, without pulling in a heavy audio-ML library.

**`react-youtube`** — a thin, maintained wrapper around the official YouTube IFrame Player API.
Used only for playback control (play/pause/fullscreen/state events) — the app has no access to
YouTube's raw decoded audio, which is why scoring can't be true melody-accuracy grading (see
`docs/ARCHITECTURE.md`).

**`qrcode.react`** — renders a QR code directly from the join URL client-side; no server
round-trip or external QR-generation service needed.

**npm workspaces, no Turborepo/Nx** — with just two packages (`server`, `client`), a dedicated
monorepo build tool would add ceremony without solving a real problem yet.

## Notable environment note

The development machine runs Node v21.7.3, an odd-numbered (non-LTS) release. Several newer
package versions (Vite 8, latest `oxlint`) declare engine requirements that exclude it, which is
why Vite is pinned to v6. If Node is ever upgraded to an LTS release (20.x or 22.x), it's worth
revisiting whether newer tool versions can be adopted.
