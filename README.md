# Karaoke Party

A party karaoke app that turns a computer (hooked up to a TV/speakers) into a shared karaoke
stage, and everyone's phone into their own wireless mic — no app installs required.

## What it does

1. Someone opens the app on a **computer** and hosts a room. The screen shows a room code and
   a QR code, plus (once a song is picked) a full-screen YouTube karaoke video — instrumental
   backing track and on-screen lyrics, all from the video itself.
2. Everyone else **joins from their own phone's browser** by scanning the QR code or typing the
   room code — no downloads, no accounts.
3. Each phone becomes a live **wireless mic**: audio streams straight from the phone to the
   computer and plays out loud, so people can walk around the room while singing.
4. Multiple people can sing at once. Each phone runs a lightweight, on-device "fun score"
   (think Just Dance, not a strict pitch-perfect grade) based on things like vocal energy and
   pitch steadiness, and the computer shows a live leaderboard.

For the reasoning behind these choices (why YouTube instead of uploads, why scores are "fun"
heuristics instead of true pitch-accuracy grading, etc.), see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md) — the build plan as a step-by-step checklist (what's done, what's
  next).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is laid out: project structure,
  the room/session model, the WebRTC mic-streaming flow, and the build roadmap.
- [`docs/TECH_STACK.md`](docs/TECH_STACK.md) — what technologies are used, where, and why.

## Running it locally

This is an npm-workspaces monorepo with two packages: `server` (Node/Express/Socket.io) and
`client` (Vite/React).

```bash
npm install               # installs both workspaces
npm run dev:server        # starts the signaling server (default port 3001)
npm run dev:client        # starts the Vite dev server (default port 5173)
```

Open the client's **Network** URL (printed by Vite, e.g. `http://192.168.x.x:5173`) on the
host computer — not `localhost` — so the QR code it generates is actually reachable from
phones on the same wifi network.

## Status

Currently at the project-scaffold stage (Node/Express/Socket.io server + Vite/React/Tailwind
client wired up and building). See the build roadmap in `docs/ARCHITECTURE.md` for what's next.
