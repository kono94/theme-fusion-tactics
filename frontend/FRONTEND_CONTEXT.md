# Frontend Context

> Last verified: 2026-07-31
>
> Scope: the current Vue application, backend contracts, animation pipeline, analytics UI, and test/build workflow.
>
> Coding conventions live in the repository `AGENTS.md`. This document records current architecture and contracts, not
> historical implementation notes; verify the referenced code when changing a boundary.

## 1. Responsibility boundary

The frontend is a rendering and command client for the backend-authoritative game. It may derive presentation state such
as visible units, trait counts, animation parameters, and labels. It must not decide whether a purchase, movement,
upgrade, augment, or combat result is valid.

The application supports One Piece and Pokemon rooms. The host can change mode while the room is in `LOBBY`.

## 2. Stack

| Area | Current implementation |
|---|---|
| Vue | Vue 3.5 with Composition API and `<script setup>` |
| Language | TypeScript 6.0 |
| Build | Vite 8.2, `vue-tsc` 3.3 |
| Realtime | `@stomp/stompjs` 7.3 over native WebSocket |
| Styling | Global and scoped vanilla CSS; no Tailwind or component framework |
| Tests | Vitest 4, Vue Test Utils, jsdom, V8 coverage |
| Routing | Manual view state plus hash routes for admin and the development gallery |

Supported Node versions are encoded in `package.json`: Node 26+.

## 3. Source map

```text
src/
├── App.vue                         root transport, identity, views, room subscriptions
├── components/
│   ├── Lobby.vue                   room create/join form
│   ├── WaitingRoom.vue             players, host controls, mode selection
│   ├── GameInterface.vue           in-match orchestration, shop/bench/actions
│   ├── GameCanvas.vue              board projection and combat event normalization
│   ├── PlayerList.vue              player navigation/spectating
│   ├── TraitSidebar.vue            derived trait display
│   ├── AugmentSelectionOverlay.vue augment choices
│   ├── PhaseAnnouncement.vue       phase/ready/emergency messaging
│   ├── EndScreen.vue               placement and exit controls
│   ├── Changelog.vue               in-app release notes
│   ├── admin/AdminAnalytics.vue    protected analytics dashboard
│   └── game/
│       ├── CombatEffectsCanvas.vue layered animation renderer
│       ├── DamageReport.vue        combat statistics
│       ├── OutcomeOverlay.vue      short win/loss/draw overlay
│       └── UltimateGallery.vue     development-only animation gallery
├── animations/                     shared animation render policy and gallery registry
├── data/                           mode metadata, shop odds, trait cache, gallery rosters
├── services/analyticsClient.ts     admin REST client/token handling
├── types/                          backend DTO mirrors and render-only types
└── utils/
    ├── clientIdentity.ts           analytics id and per-tab reconnect session
    ├── combatAnimationConfig.ts    live shared animation lookup
    ├── economy.ts                  backend-aligned sell preview
    ├── dragPreview.ts              drag image support
    └── iconUtils.ts                mode-aware asset paths
```

## 4. Root data flow

`App.vue` owns the STOMP client and high-level views:

```text
connect
  → subscribe /user/queue/room-result
  → optionally restore a per-tab room session
  → subscribe /topic/room/{id} and /topic/room/{id}/event
  → publish create/join
  → receive private player-id acknowledgement
  → replace GameState on each room snapshot
  → pass state and currentPlayerId to child components
  → publish child GameAction events
```

The current player is identified only by the server-generated player ID returned on the private room-result queue.
Display names are not unique and are never an authority boundary.

`GameState` replacement is intentionally simple: incoming snapshots replace the previous object. `GameCanvas` keeps a
small amount of render history for movement/death transitions and deduplicates recent combat events by timestamp.

## 5. Connection, room, and reconnect behavior

The WebSocket URL is `VITE_WS_URL` when provided; otherwise it is derived as `/ws` on the current host. Vite and nginx
rewrite `/ws` to the backend's `/tft-websocket` endpoint.

The client reconnect delay is five seconds. On connection:

- `App.vue` subscribes to `/user/queue/room-result` before publishing create/join.
- Create/join trims the room ID once and uses that canonical value for subscriptions, payloads, acknowledgement
  correlation, timeout tracking, and the reconnect session.
- New create/join requests store a random reconnect token in `sessionStorage` for the active tab.
- Successful acknowledgement stores the returned `playerId` in the same session object.
- A rejected request returns immediately to the lobby with the backend message.
- A five-second acknowledgement timeout handles unavailable servers or stale restored sessions.
- A restored active-match player presents the reconnect token; the backend rebinds the new STOMP session.
- `leave` preserves the active-match player for reconnect grace; `abandon` permanently gives up the match.

`localStorage` contains only the anonymous analytics client ID. Room/reconnect identity uses `sessionStorage`, so it is
tab-scoped.

## 6. STOMP contracts

### Published destinations

| Destination | Body |
|---|---|
| `/app/create` | `{ roomId, playerName, analyticsClientId, reconnectToken }` |
| `/app/join` | same as create |
| `/app/leave` | `{ roomId, playerName }` |
| `/app/abandon` | `{ roomId, playerName }` |
| `/app/start` | `{ roomId, playerName }` |
| `/app/room/{id}/mode` | `{ playerName, gameMode }` |
| `/app/room/{id}/action` | `GameAction` |

Host authority for start/mode/add-bot and action authority are enforced by the backend's session binding. `playerName`
remains in some command payloads for logging/backward compatibility; it is not trusted.

### Subscriptions

| Destination | Body |
|---|---|
| `/user/queue/room-result` | `RoomRequestResult` |
| `/topic/room/{id}` | full `GameState` |
| `/topic/room/{id}/event` | combat-result or emergency-drop `RoomGameEvent` |

`RoomRequestResult` has `accepted`, `roomId`, nullable `playerId`, nullable `code`, and nullable `message`.

## 7. DTO alignment

`src/types/game.ts` mirrors the Java wire contract.

`GameState`:

```ts
interface GameState {
  roomId: string
  hostId: string | null
  phase: 'LOBBY' | 'PLANNING' | 'COMBAT' | 'END_CELEBRATION' | 'END'
  round: number
  timeRemainingMs: number
  totalPhaseDuration: number
  players: Record<string, PlayerState>
  matchups: Record<string, string>
  recentEvents: CombatEvent[]
  damageLog: Record<string, DamageEntry>
  gameMode: 'onepiece' | 'pokemon'
  planningTimerPaused: boolean
  planningReadyPlayerId: string | null
  planningPauseReason: 'AUGMENT_SELECTION' | 'SOLO_READY' | null
}
```

The backend currently emits `SOLO_READY` or null; `AUGMENT_SELECTION` remains in the union for compatibility but augment
offers do not pause the timer. Unanswered offers are auto-selected when combat begins.

`PlayerState` contains player/economy fields, `bench`, `board`, `shop`, `lootOrbs`, `augmentChoices`,
`selectedAugments`, `isGhost`, `isBot`, and nullable `botPersonality`. The player list presents the server-assigned bot
personality. There is no `activeTraits` wire field. Trait display is derived from board units plus metadata loaded from
`/api/traits?mode=...`.

Current combat event types are `DAMAGE`, `SKILL`, `DEATH`, `HEAL`, and `SHIELD`. Events contain only timestamp, type,
source ID, target ID, value, and optional skill name. Do not add cast/status/zone/coordinate assumptions without first
extending the backend record.

For `MOVE`, `targetX` is a board column from `0-8`. When `targetY` is `-1`, the same `targetX` instead identifies the
target bench slot from `0-8`; otherwise `targetY` is a planning-board row from `0-2`. The 9×3 planning board is projected
onto one half of the 9×6 combat canvas.

## 8. Component responsibilities

### `WaitingRoom.vue`

- Uses `currentPlayerId === gameState.hostId` for host controls.
- Marks the current user by player ID, not name.
- Shows backend-configured mode choices in stable One Piece/Pokemon order.
- Emits mode selection, start, and leave; it does not publish STOMP directly.

### `GameInterface.vue`

- Resolves the authoritative local player through `state.players[currentPlayerId]`.
- Owns shop, bench, drag/drop, sell, XP, reroll, lock, augment, ready, and spectating presentation.
- Keeps shop controls and bench-only drag/sell interactions available during combat while board movement and orb
  collection remain planning-only.
- Emits `GameAction` objects upward to `App.vue`.
- Uses `utils/economy.ts` for refund previews. Refund copies are 1/3/6 at stars 1/2/3, matching the backend's
  two-copy second upgrade.
- Shows the end screen as soon as `END_CELEBRATION` arrives, including for an already eliminated player.

The backend accepts shop/economy commands during planning and combat. Combat movement and selling are restricted to the
bench; board movement and orb collection remain planning-only. The UI mirrors those rules, but backend rejection remains
the safety boundary.

### `GameCanvas.vue`

- Projects a 9×3 planning board into the local half of a 9×6 arena.
- During combat, renders the viewed player and current opponent and flips top-side coordinates as needed.
- Rejects invalid authoritative board coordinates and reconciles transient render history after the page returns to the
  foreground so stale unit positions cannot survive a suspended layout.
- Renders only the acting player's loot orbs and disables interaction while spectating.
- Normalizes backend events into `NormalizedCombatVisualEvent` objects consumed by `CombatEffectsCanvas`.
- Preserves short-lived previous/dying unit state so final events can animate after a unit leaves the snapshot.

### Player navigation and reports

`PlayerList` emits a viewed player ID. `GameInterface` treats a different viewed ID as read-only spectating.
`DamageReport` receives the selected participant and opponent IDs and uses backend `damage`, `healing`, and `shielding`
totals.

## 9. Modes, assets, and styling

`data/gameModeMetadata.ts` is the presentation registry for display name, theme class, favicon, document title, and asset
folder. Backend `gameMode` selects the runtime entry.

Unit portrait paths:

- One Piece: `/assets/units/onepiece/{definitionId}.png`
- Pokemon: `/assets/units/pokemon/{definitionId}.png`

The public lobby and waiting room use mode themes. In-match components intentionally use shared generic chrome.

The project uses vanilla CSS. Shared variables/base styles live in `src/style.css` and `App.vue`; most component styles
are scoped. `AGENTS.md` must remain aligned with this and should not describe Tailwind.

## 10. Animation system

`data/animationConfig.ts` owns the shared One Piece/Pokemon attack and ability lookup tables. Animation identity comes
from the stable mode and unit definition ID, never from a display name.

`utils/combatAnimationConfig.ts` resolves the shared animation configuration for live units.

`animations/renderPolicy.ts` reduces particle density and expensive effects for crowded batches and reduced-motion
users. `CombatEffectsCanvas.vue` is the live layered renderer. `AttackAnimation.vue` has no live import and is legacy.
Family configuration controls geometry, duration, projectile and ring counts, trail width, glyphs, and accents rather
than serving as gallery-only metadata.

The `#/ultimate-gallery/{mode}` route is development-only. `UltimateGallery.vue` and some gallery roster files are
excluded from `tsconfig.build.json`; do not document the gallery as a production feature.

## 11. Admin analytics

`#/admin/analytics` renders `AdminAnalytics.vue` without starting the game WebSocket. `analyticsClient.ts` handles login,
bearer token storage for the current tab, summary queries, paginated run queries, final-composition unit-presence
comparisons, run detail, and logout. The dashboard defaults to completed, non-abandoned runs and exposes exact mode,
version, commit, placement, completion, abandonment, and anonymous-player filters. Mode, version, commit, build-cohort,
and anonymous-player selections come from all distinct values in the summary date range. `FinalCompositionStrip.vue` renders
captured empty boards separately from unavailable legacy snapshots, with mode-aware portraits, star/item badges, and a
placeholder when historical assets are missing. The admin REST API is protected by the backend; frontend route hiding
is not security.

## 12. Build, test, and deploy

```bash
cd frontend
npm ci
npm test
npm run test:coverage
npm run lint
npm run build
```

`npm run build` runs `vue-tsc --noEmit -p tsconfig.build.json` before Vite. The Docker build uses `npm ci` and copies
backend mode JSON needed by gallery/data imports before compiling. Nginx serves `dist`.

The CI workflow runs frontend coverage, lint, and production build on pull requests/main and before tagged deployment.
Coverage is currently reported rather than threshold-gated so the baseline can improve incrementally without hiding
untested canvas code.

Current focused tests cover:

- lobby rendering and mode metadata;
- mode bootstrap and stale trait-response rejection;
- restored-room timeout/admin bootstrap;
- player-ID component behavior and end celebration;
- augment/phase presentation;
- shared animation configuration and live mode lookup;
- sell-refund parity;
- client identity persistence;
- analytics client behavior and utility functions.

## 13. Known engineering boundaries

- `App.vue`, `GameInterface.vue`, `GameCanvas.vue`, and especially `CombatEffectsCanvas.vue` are large. Extracting a STOMP
  composable and smaller render systems would reduce change coupling.
- Overall line coverage is low because canvas rendering and drag/drop paths are expensive to exercise in jsdom. The
  coverage command makes this visible; prioritize contract and pure-function extraction when touching these areas.
- Full snapshots arrive every game tick. The client has no delta/revision protocol.
- Hash routing is manual and sufficient for the current two standalone routes, but it will not scale to a larger app.
- Runtime payload parsing uses TypeScript assertions, not a schema validator. Backend/frontend integration tests are the
  primary contract guard today.

These are the remaining explicit debt items. They should be evaluated against actual feature/scale work rather than
silently accumulating in components.

## 14. Change checklist

When changing frontend behavior:

1. Confirm whether the backend already owns the rule.
2. Keep `types/game.ts` aligned with Java records and nullable fields.
3. Use player IDs for identity and authorization-related presentation.
4. Publish commands from `App.vue`; child components emit events.
5. Add a regression test for pure mapping/contract bugs.
6. Run tests, coverage, lint, and production build.
7. Update `Changelog.vue` for commit-worthy behavior and update this file when architecture/contracts move.
