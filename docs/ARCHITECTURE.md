# Architecture

## High-level layout

```
Node.js server (Express + Socket.io)          Host browser (laptop → TV)         Player browser (phone)
- in-memory room registry                     - React app, /host route          - React app, /play/:code route
- WebRTC signaling relay (offer/answer/ICE)   - YouTube IFrame Player API        - getUserMedia mic capture
- score/leaderboard broadcast                 - N RTCPeerConnections (1/phone)   - Web Audio pitch/volume analysis
                                               - plays each incoming stream       - 1 RTCPeerConnection to host
                                                 via <audio> element              - emits throttled score updates
```

One React single-page app serves two roles via routing (`/host` and `/play/:code`), backed by
one lightweight Node/Socket.io server. There is no database — room state lives in memory on the
server for the duration of a party session, which is intentional (see [Design decisions](#design-decisions)).

Audio mixing of multiple singers happens **acoustically**, through the host computer's
speakers — the app never digitally mixes microphone streams together. Each phone's audio is
just played out of its own `<audio>` element on the host, and the browser's audio output mixes
them naturally.

## Project structure

```
karaoke/
├── package.json                # npm workspaces root
├── server/src/
│   ├── index.ts                # Express + http + Socket.io bootstrap
│   ├── config.ts                # PORT, getLocalIp() (for the QR/join URL)
│   ├── rooms/RoomStore.ts      # in-memory Map<code, Room>
│   ├── rooms/roomCode.ts       # generateRoomCode()
│   ├── rooms/types.ts          # Room, Player shapes
│   └── sockets/
│       ├── hostHandlers.ts
│       ├── playerHandlers.ts
│       └── signalingHandlers.ts  # WebRTC offer/answer/ICE relay
└── client/src/
    ├── App.tsx                 # routes: /, /host, /play/:code
    ├── pages/LandingPage.tsx   # choose "Host" or "Join"
    ├── pages/HostPage.tsx      # orchestrates the full host lifecycle
    ├── pages/PlayerPage.tsx    # orchestrates the full player lifecycle
    ├── lib/webrtc/HostPeerManager.ts      # host: Map<playerId, RTCPeerConnection>
    ├── lib/webrtc/PlayerPeerConnection.ts # player: single RTCPeerConnection
    ├── lib/audio/PitchAnalyzer.ts         # AnalyserNode + pitchy
    ├── lib/audio/scoreEngine.ts           # composite "fun score"
    └── components/
        ├── host/{RoomCodeQr,WaitingRoom,VideoSearchBar,YoutubeStage,Leaderboard}.tsx
        └── player/{JoinForm,MicPermissionGate,LiveMicPanel}.tsx
```

Some of these files exist only as stubs today; the [build roadmap](#build-roadmap) below tracks
what's implemented vs. planned.

## Core mechanics

### Room / session model

Held entirely in server memory (a `Map<roomCode, Room>`), not a database:

```ts
Room {
  code: string;                 // 5-char alphanumeric, ambiguous chars excluded (0/O/1/I/L)
  hostSocketId: string;
  players: Map<socketId, {
    displayName: string;
    connected: boolean;
    score: number;
  }>;
  currentVideoId: string | null;  // YouTube video id
  videoState: 'idle' | 'playing' | 'paused' | 'ended';
}
```

The **join URL/QR code** is just `${origin}/play/${roomCode}`, generated client-side on the
host. Because of this, the host must open the app via its **LAN IP**, not `localhost` — otherwise
the QR code encodes an address phones can't reach.

### WebRTC mic streaming

Topology: a **host-centric star**. The host holds one `RTCPeerConnection` per connected phone
(`recvonly` audio); each phone holds exactly one connection (to the host). No phone-to-phone
connections. The server's only involvement is relaying signaling messages
(`webrtc:offer` / `webrtc:answer` / `webrtc:ice-candidate`) between host and phone over
Socket.io — it never touches the actual audio.

```
Player                          Server                          Host
  join(roomCode, name)  ───────►│                                 │
                                 │──── playerJoined(player) ─────►│
  ready-to-connect ─────────────►│──── player-ready(playerId) ───►│  creates RTCPeerConnection
                                 │◄──── offer(playerId, sdp) ──────│
  offer(sdp) ◄─────────────────│
  answer(sdp) ───────────────────►│──── answer(playerId, sdp) ─────►│
  ice ⇄ ice ────────────────────────────────────────────────────────
                                                                      ontrack → <audio> element
```

NAT traversal uses a public **STUN** server for MVP (works for most home/venue wifi). A **TURN**
server (e.g. self-hosted coturn, or a hosted provider) is a documented but not-yet-built fallback
for cellular-data phones or strict/symmetric NATs — architecturally it's a one-line addition to
the `iceServers` list on both sides when it becomes necessary.

### Client-side "fun" scoring

Runs entirely inside each phone's browser tab, reusing the same mic `MediaStream` used for
WebRTC (no double mic capture). Every ~250–500ms it computes a composite score from:

1. **Vocal energy** — rolling RMS volume.
2. **Pitch steadiness** — variance of detected pitch (converted to semitones so octave jumps
   aren't over/under-weighted) over a rolling window, only counting high-confidence pitch
   samples.
3. **Participation** — fraction of recent frames actually voiced (not silent).

This is explicitly **not** true melody-accuracy scoring — see [Design decisions](#design-decisions)
for why. The score is emitted to the server (throttled, not every frame) and rebroadcast to the
host as a sorted leaderboard.

## Design decisions

- **Why YouTube instead of file uploads or a lyrics API**: YouTube karaoke videos already bundle
  a synced instrumental track *and* baked-in lyrics in one place, with no licensing/API-key setup
  and no upload friction for users. The trade-off: the app can only control playback (play/pause/
  seek/fullscreen) via the YouTube IFrame API — it can never access YouTube's raw decoded audio.
  That's fine for playback, but it's *why* true melody-accuracy scoring isn't possible (there's no
  reference pitch data to compare against) and *why* multi-singer audio mixing has to happen
  acoustically through speakers rather than digitally in code.
- **Why "fun" scoring instead of pitch-accuracy grading**: without a reference melody, the
  honest options were (a) a relative/heuristic score based on measurable signal properties, or
  (b) sourcing a separate reference-melody dataset (e.g. MIDI lookups), which reintroduces a
  content-coverage problem for very little payoff on an MVP. Option (a) was chosen deliberately.
- **Why a host-centric WebRTC star instead of full mesh**: only the host ever needs to *play*
  audio; phones never need each other's streams. A star with N connections on the host and 1 on
  each phone is simpler to reason about and build than a full mesh, and scales fine at party size.
- **Why in-memory room state, no database**: rooms only need to exist for the duration of a live
  party session. A server restart losing active rooms is an acceptable trade-off for the
  simplicity of not standing up persistence infrastructure.

## Known limitations (accepted, not oversights)

- **Acoustic feedback**: phone mics sit near the host's speakers, so they'll pick up the backing
  track and other singers' voices along with the intended singer. WebRTC's built-in echo
  cancellation (`echoCancellation: true`) helps but won't eliminate this — it's a real-world
  constraint of any wireless-mic-near-speakers setup, not a bug to "fix" in software.
- **No server-side audio access**: confirmed above — this shapes both the scoring approach and
  the acoustic (not digital) mixing approach.
- **STUN-only NAT traversal (for now)**: will fail for some phones on cellular data or behind
  strict/symmetric NATs. Symptom: the phone joins the room fine (that's just Socket.io/HTTP) but
  its WebRTC connection never reaches `connected` and no audio arrives at the host. TURN is the
  documented fix, deferred until real usage shows it's a frequent blocker.
- **Mobile browser quirks**: iOS Safari requires `getUserMedia` to be triggered by a direct user
  tap, and `AudioContext` can start `suspended` until a user gesture resumes it. The mic
  permission UI is designed around this from the start rather than retrofitted.
- **Single Node process, in-memory state**: a server restart drops all active rooms — acceptable
  for a single live party session, not meant to be long-running/persistent infrastructure.

## Build roadmap

1. ~~**Scaffold**~~ — monorepo, server boots, client builds. ✅ done
2. **M1 — Room lifecycle + signaling skeleton**: create/join a room, QR + code display, live
   waiting-room player list. No audio/video yet.
3. **M2 — Single phone mic → host playback**: the WebRTC offer/answer/ICE handshake, host plays
   the incoming stream. The riskiest plumbing in the whole app.
4. **M3 — YouTube embed + playback control**: paste-a-URL video selection, full-screen stage,
   room-code overlay.
5. **M4 — Multiple simultaneous mics**: extend the host's peer-connection manager to cleanly
   handle N concurrent connections with cleanup on disconnect.
6. **M5 — Client-side scoring engine**: pitch/volume analysis, composite score, live visualizer.
7. **M6 — Leaderboard UI polish**: sorted/animated leaderboard, final-results screen, full
   end-to-end run with real phones singing along to a real video.
8. **Post-MVP (documented, not built)**: TURN server integration, per-player host-side gain
   control, in-app YouTube search, reconnect handling, duet-mode visuals.
