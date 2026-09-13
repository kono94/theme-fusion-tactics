# Backend Context

> Last verified: 2026-09-13
>
> Scope: the current Java backend, transport contracts, mode data, analytics, and test/build workflow.
>
> Coding conventions live in the repository `AGENTS.md`. This document records current architecture and contracts, not
> historical implementation notes; verify the referenced code when changing a boundary.

## 1. What the backend owns

The backend is authoritative for every live-match decision: rooms, players, economy, shop rolls, movement, upgrades,
traits, augments, loot, matchmaking, combat, placement, reconnect state, and game completion. The frontend publishes
commands and renders snapshots; it must not reproduce authoritative rules.

Live `GameState` is held in memory. SQLite stores anonymous gameplay analytics, not recoverable match state.

## 2. Stack and build

| Area | Current implementation |
|---|---|
| Java | Java 25 with preview enabled for compile, tests, and the runtime container |
| Framework | Spring Boot 4.1, Spring MVC, Spring Security, scheduling, STOMP WebSockets |
| JSON | Jackson 3 `JsonMapper` |
| Storage | SQLite + Flyway for analytics |
| Build | Maven; Spotless 3.9 formats Java and the POM |
| Tests | JUnit 5, Mockito as an explicit Java agent, JaCoCo report during `verify` |

Useful commands:

```bash
cd backend
mvn spotless:apply
mvn test
mvn verify
```

`mvn verify` is the release-oriented backend gate. It compiles with preview enabled, runs tests with the Mockito agent,
checks formatting, packages the application, and writes JaCoCo output under `target/site/jacoco`.

## 3. Architecture map

```text
BackendApplication
├── config/WebSocketConfig          STOMP endpoint, broker prefixes, origin policy
├── api/InfoController              public mode/config REST data
├── core/GameController             STOMP boundary, session binding, scheduled broadcast
├── core/GameEngine                 atomic room registry and room cleanup
├── core/engine/GameRoom            room lifecycle and serialized command boundary
│   ├── Player                      economy, shop, bench, board, upgrades, loot
│   ├── CombatSystem                combat tick and combat statistics/events
│   ├── TraitManager                registered mode trait effects
│   └── AugmentManager              offers, selection, and effects
├── core/combat                     generic targeting, movement, ability, affinity logic
├── core/model                      command, state, event, and data records
├── game/{mode}                     mode providers and trait registration
└── analytics                       async recorder, public history, protected REST API, bearer sessions
```

Core code does not import a franchise package. `GameModeProvider` supplies resource paths, trait registration, optional
affinity data. Bot strategies are shared across modes. One Piece and Pokemon are provider/data configurations.

## 4. Ownership and concurrency

`GameEngine` stores rooms in a `ConcurrentHashMap`. `tryCreateRoom(id)` uses `putIfAbsent`, so a duplicate client room ID
cannot replace an active room.

Each `GameRoom` is the synchronization boundary:

- Scheduled ticks and public room mutations synchronize on the room instance.
- `GameRoom.applyAction(boundPlayerId, action)` validates identity, payload requirements, and phase before mutation.
- `GameController` serializes a room snapshot while holding the same lock before publishing it.
- The current snapshot is volatile for safe visibility.
- `getPlayers()` returns a copied collection rather than the live map view.

This is deliberately a coarse per-room lock. Different rooms progress independently. The lock avoids races between STOMP
handler threads and the scheduled game loop without introducing a command queue. If room CPU cost grows substantially,
a per-room actor/executor is the natural successor.

Analytics writes are isolated from match authority. `SqliteGameplayAnalyticsRecorder` uses one bounded executor backed by
a named virtual-thread factory; failures are logged and do not change match outcomes.

## 5. Room lifecycle

The phase sequence is:

```text
LOBBY → PLANNING ⇄ COMBAT → END_CELEBRATION → END
```

- A room starts in `LOBBY` with no running timer.
- Starting fills vacant positions with bots and enters round 1 planning.
- Planning grants income/interest and XP, refreshes unlocked shops, restores units, upgrades pending copies, spawns
  scheduled loot, and generates augment offers on rounds 3, 6, and 11.
- Augment offers do not pause normal multiplayer planning. Unanswered offers are selected randomly when combat begins.
- Solo-human training against bots uses `planningTimerPaused=true`, `planningPauseReason=SOLO_READY`, and
  `READY_FOR_COMBAT`.
- Combat auto-fills boards, shuffles alive players into pairs, creates a donor ghost for an odd player, applies traits and
  combat augments, and advances on completion or timeout. Once every human-involved pairing resolves, any remaining
  bot-only pairings are simulated through the remaining combat window immediately.
- `END_CELEBRATION` exposes final placement before `END`; ended rooms are removed by the same engine tick that observes
  them.

Bots keep their units, gold, and XP across rounds. `BotController` runs once per living bot after planning income,
paid shop refresh, loot, and augment offers, including round 1. It collects loot, chooses a random offered augment,
and uses normal purchase, sale, XP, reroll, upgrade, and movement operations. Lobby bots have no generated army or
hidden economy/stat grants. Each bot is initialized with an economy, reroll, fast-level, or trait-focused `BotStrategy`.
Strategies vary reserve, reroll, leveling, and team-scoring policy while sharing the same authoritative player actions.
All bots favor immediate upgrades and legal board improvements, act at most 40 times per planning pass, and position
tanks/melee in front with ranged units behind. The existing human-only emergency drop remains unchanged.

## 6. Modes and data loading

`GameModeRegistry` discovers all `GameModeProvider` beans. Production registers both modes, and new rooms begin in
One Piece mode. The host can change the room mode only while it is in `LOBBY`; deployment does not select or restrict the
mode. Focused tests that register only one provider use that available provider as their initial mode.

| Mode | Units | Traits | Augments | Affinities |
|---|---|---|---|---|
| One Piece | `units_onepiece.json` | `traits_onepiece.json` | `augments_onepiece.json` | neutral |
| Pokemon | `units_pokemon.json` | `traits_pokemon.json` | `augments_pokemon.json` | `affinities_pokemon.json` |

`DataLoader.loadData()` preloads every registered mode at startup. Missing resources, malformed JSON, duplicate unit IDs,
or an empty required units/traits/augments dataset fail startup. A provider that declares an affinity file must supply a
valid one. One Piece intentionally has no affinity file and receives a neutral resolver.

`UnitDefinition.lineId` is the combination identity. Optional `forms` can change definition ID, name, role, traits,
range, and ability at higher stars while preserving the line used for upgrades.

## 7. Transport and identity

### STOMP setup

- Native WebSocket endpoint: `/tft-websocket`
- Application prefix: `/app`
- Simple broker prefixes: `/topic` and `/queue`
- Private user queues use Spring's `/user` destination convention.
- Allowed origins come from `app.websocket.allowed-origin-patterns`, mapped from
  `WEBSOCKET_ALLOWED_ORIGIN_PATTERNS`. Development defaults permit localhost only; production setup writes the HTTPS
  deployment origin.

### Client-to-server destinations

| Destination | Payload | Behavior |
|---|---|---|
| `/app/create` | `RoomRequest` | Validates and atomically creates a room, adds/binds creator |
| `/app/join` | `RoomRequest` | Idempotent same-session join, reconnect, or new lobby join |
| `/app/leave` | `RoomRequest` | Removes lobby player or starts active-match reconnect grace |
| `/app/abandon` | `RoomRequest` | Permanently eliminates and unbinds a human player |
| `/app/start` | `RoomRequest` | Session-bound host starts the room |
| `/app/room/{id}/add-bot` | none | Session-bound host adds one lobby bot |
| `/app/room/{id}/mode` | `ModeChangeRequest` | Session-bound host changes lobby mode |
| `/app/room/{id}/action` | `GameAction` | Applies one validated session-bound command |

`RoomRequest` contains `roomId`, `playerName`, optional `analyticsClientId`, and optional `reconnectToken`. Room IDs accept
1-32 ASCII letters, numbers, underscores, or hyphens. Leading and trailing whitespace is removed before validation, and
the result acknowledgement returns that canonical ID. Player names are nonblank and at most 32 characters.

Create and join return a private `/user/queue/room-result` message:

```json
{
  "accepted": true,
  "roomId": "example-room",
  "playerId": "server-generated-id",
  "code": null,
  "message": null
}
```

Rejections use `accepted=false`, a stable code (`INVALID_REQUEST`, `ROOM_EXISTS`, `ROOM_NOT_FOUND`, or
`ROOM_UNAVAILABLE`), and a displayable message. The returned player ID—not the display name—is the client identity.

### Actions and phase policy

`GameAction.playerId` must equal the player bound to the sender's STOMP session. Null actions, null action types, missing
required fields, dead players, and spoofed IDs are rejected.

- `BUY`, `REROLL`, `EXP`, `MOVE`, `SELL`, `LOCK`, and `COLLECT_ORB` are planning-only.
- `SELECT_AUGMENT` is planning-only and requires `augmentId`.
- `READY_FOR_COMBAT` succeeds only for the eligible solo-training human.
- The backend remains authoritative even if the UI incorrectly enables a control.

For `MOVE`, `targetX` is `0-8`. A `targetY` of `0-2` selects a planning-board row; `targetY=-1` instead interprets
`targetX` as the target bench slot. Other coordinates are rejected at the room boundary.

### Server-to-client destinations

| Destination | Payload |
|---|---|
| `/topic/room/{id}` | Full `GameState` snapshot |
| `/topic/room/{id}/event` | `RoomEvent<CombatResultPayload>` or `RoomEvent<EmergencyDropPayload>` |
| `/user/queue/room-result` | Private `RoomRequestResult` |

## 8. State contract

`GameState` contains:

```text
roomId, hostId, phase, round, timeRemainingMs, totalPhaseDuration,
players, matchups, recentEvents, damageLog, gameMode,
planningTimerPaused, planningReadyPlayerId, planningPauseReason
```

`hostId` is null before the first player or after the final lobby player leaves. `players` is keyed by player ID.

`PlayerState` contains:

```text
playerId, name, health, gold, level, xp, nextLevelXp, place, combatSide,
bench, board, shop, lootOrbs, augmentChoices, selectedAugments, isGhost, isBot, botPersonality, matchStats
```

`matchStats` is an in-memory, per-player summary of total damage, healing, and shielding plus win/loss/draw counts and
round results. It records each real participant once when combat resolves and ignores donor-ghost contributions.

There is no `activeTraits` field in the wire contract. Trait effects are applied by `TraitManager`; trait display metadata
comes from `/api/traits` and the board is used to derive display counts. Each trait response also includes a cost-ordered
`units` roster with one entry per purchasable line, resolved to the earliest star-level form that has that trait. This
keeps evolution-only membership, icons, and tooltip data backend-derived without expanding `GameState`.

`CombatEvent` has exactly six fields: `timestamp`, `type`, `sourceId`, `targetId`, `value`, and `skillName`. Current types
are `DAMAGE`, `SKILL`, `DEATH`, `HEAL`, and `SHIELD`. The decisive combat tick retains its final events.

`DamageEntry` is:

```java
record DamageEntry(
    String unitName,
    String definitionId,
    String lineId,
    int starLevel,
    String ownerId,
    int damage,
    int damageTaken,
    int healing,
    int shielding
)
```

Combat result `winnerId` and `loserId` are nullable for draws; they are not encoded as empty strings.

## 9. Combat model

`CombatSystem` composes generic strategies:

- `NearestEnemyTargetSelector`
- `BfsUnitMover`
- `DefaultAbilityCaster`
- `DamageResolver`
- `TraitManager`

The grid is 9×6 in combat, with each player planning on a 9×3 half. Combat pairing order is shuffled. The first member
of each generated pair is placed on `TOP`; the second is placed on `BOTTOM`. It is not lexicographic.

Abilities support `DAMAGE`, `STUN`, `HEAL`, `SHIELD`, `BUFF_ATK`, and `BUFF_SPD`; patterns are `SINGLE`, `LINE`, and
`SURROUND`. Implemented modifiers include stun, lifesteal, execute, conditional/scaling damage, damage-over-time, and
knockback. `DamageResolver` applies mode affinity to basic attacks, direct damage abilities, and DOT damage. Pokemon
derives the offensive element from the caster's traits and uses the best attacking trait against each target when a unit
has two traits. Each mode resolves its own data-loaded affinity graph; One Piece remains neutral.

Movement uses its own cooldown and falls back to the shortest reachable enemy approach when the nearest enemy is
blocked. Stun and cast recovery still prevent movement. Enemy spells resolve living in-range targets before committing;
an empty cast preserves mana, and a full-mana unit outside its offensive ability range paths toward the target using the
ability range rather than its basic-attack range. Target-dependent damage modifiers are evaluated per hit.
Stuns refresh the longer remaining duration rather than stacking; repeated applications within four seconds use
100%/80%/60% duration before resetting. `AbilityCaster` returns whether the cast executed; only executed casts consume
mana and start recovery.

## 10. REST and analytics

Public endpoints:

- `GET /api/config`
- `GET /api/mode`
- `GET /api/traits?mode={mode}` returns trait metadata plus the resolved unit roster for each trait
- `GET /api/match-history` returns at most 20 completed solo matches. A row is included only when exactly one human
  run completed without abandonment, has a valid placement and captured final board, and its match has a completion
  timestamp and final round. The response exposes an opaque history ID, mode, completion time, final round, placement,
  and final board units; a malformed stored board is represented as an unavailable composition so one bad row does not
  break the feed. Room IDs, run IDs, player names/IDs, analytics client IDs, and build metadata are never serialized.

Admin endpoints:

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/analytics/summary`
- `GET /api/admin/analytics/runs`
- `GET /api/admin/analytics/runs/{runId}`
- `GET /api/admin/analytics/unit-presence`

Admin login issues an opaque eight-hour bearer token and rate-limits failed attempts by source address. A blank admin
password safely disables login in development. A production-scoped startup validator rejects a missing or blank
`ANALYTICS_ADMIN_PASSWORD`, including an empty value supplied by Docker Compose. Build tag, commit, and timestamp are
constructor-injected into analytics rows.

The recorder stores match/run/round snapshots asynchronously in SQLite. Combat resolution also stores one per-round
row per participating unit line with damage dealt, post-mitigation damage taken, healing, and shielding. Match state
accumulates those rows by unit line for the end screen while retaining the highest-star form used. Each human run has one first-wins final-board
snapshot of deployed `definitionId`, `lineId`, `starLevel`, and `itemIds`; captured `[]` is distinct from a null legacy
snapshot. Placement finalization is routed through `GameRoom` for combat elimination, explicit abandonment,
last-player resolution, and winner placement; disconnect grace records abandonment without finalizing placement.
Completion supplies a non-overwriting fallback and interruption recovery retains any snapshot. Flyway V3 backfills the
last recorded round where available and corrects player final rounds to their last recorded round.

The unit-presence endpoint filters to completed, non-abandoned human runs with a final board, then groups independently
by canonical mode, backend version, and commit. It deduplicates definitions within each board, compares placements 1–4
against 5–8, and uses low-sample frequency ordering until both groups reach 20 runs.
The summary response also returns all distinct build cohorts and anonymous player IDs in the requested date range,
independently of active mode/version/commit filters, so the dashboard can keep complete filter selections available.

## 11. Test strategy

`BotProgressionSimulationTest` writes seeded 25-round progression reports for both modes under
`target/simulation-reports/economy-bots-*.csv`, including gold, level, stars, action counts, and results against a fixed
buy-first/level-above-20 baseline. These controlled comparisons are not estimates of human win rates.

The normal suite covers room lifecycle and authorization, economy/upgrades, grid and movement, combat strategies,
abilities/modifiers, traits, affinities, augments, loot/emergency drops, reconnect/abandonment, analytics persistence,
mode data validation, and deterministic simulation helpers.

Important regression coverage includes:

- duplicate room IDs do not replace an existing room;
- malformed/spoofed commands and combat-time board mutations are rejected while shop and bench management remains
  available;
- augment offers are read on the actual round-3 boundary;
- final-tick damage/death events reach the result;
- One Piece and Pokemon are registered in shared simulation fixtures;
- admin login can be disabled safely and tokens are revocable/rate-limited.

Expensive reports remain opt-in:

```bash
mvn -Dtest=RoleBalanceSimulationTest \
  -Dsimulation.role-report=true \
  -Dsimulation.runs=100000 test
```

## 12. Operational boundaries

- Match state is not durable across backend restarts or horizontal replicas.
- State sync is a full-snapshot broadcast every scheduled tick, not a delta protocol.
- The per-room lock favors correctness and simplicity over maximum throughput.
- Balance simulations are intentionally not part of the normal fast suite.
- Analytics is best-effort and non-authoritative; a saturated/stopping writer can reject records without affecting play.

These are explicit architecture boundaries, not undocumented behavior. Revisit them before horizontal scaling or large
room-count targets.

## 13. Backend change checklist

When changing backend behavior:

1. Keep authoritative validation and mutation inside the room/backend boundary.
2. Keep `core` theme-agnostic; put theme resources and behavior behind `GameModeProvider`.
3. Synchronize room commands with the tick path and do not expose live mutable collections.
4. Keep Java records and `frontend/src/types/game.ts` aligned, including nullability and coordinates.
5. Add focused regression coverage for changed rules or transport contracts.
6. Run `mvn spotless:apply` and `mvn verify`.
7. Update the changelog and this document only when behavior, contracts, or architecture changed.
