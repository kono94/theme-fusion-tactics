# Theme Fusion Tactics (TFT)

**Theme Fusion Tactics (TFT)** is a browser-based **auto-battler game** inspired by Teamfight Tactics, featuring a theme-swappable engine with lobby-selectable One Piece (default) and Pokemon modes and real-time multiplayer via WebSockets.

![Java 25](https://img.shields.io/badge/Java-25-orange) ![Spring Boot 4](https://img.shields.io/badge/Spring%20Boot-4.1.0-green) ![Vue 3](https://img.shields.io/badge/Vue.js-3.5-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)

![Theme Fusion Tactics Board](docs/board_preview.jpg)

---

## 📖 Documentation

For detailed architectural information, refer to the context documents:

| Document | Description |
|----------|-------------|
| **[Backend Context](backend/BACKEND_CONTEXT.md)** | Game engine, combat system, WebSocket API, state management |
| **[Frontend Context](frontend/FRONTEND_CONTEXT.md)** | Vue.js architecture, component hierarchy, animation system |
| **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)** | Docker Compose setup, GitOps deployment to production |

---

## ✨ Features

### Core Gameplay
- **Up to 8 players** per game room (human + economy-based bots with persistent teams)
- **Real-time state sync** via STOMP WebSockets (100ms tick rate)
- **Theme-agnostic core engine** — hosts choose One Piece or Pokemon per room in the lobby
- **Auto-battler mechanics**: Shop, XP, Gold (with interest), Trait Synergies, Unit Combinations
- **Grid-based combat** with BFS pathfinding, ability casting, and directional attack animations
- **Star-level progression** — combine 3 matching 1★ units into 1 2★, then 2 matching 2★ units into 1 3★, including Pokemon evolution forms
- **Round-based augment choices** — players choose team-wide economy or combat bonuses on rounds 3, 6, and 11
- **Advanced ability system** — Damage, Stun, Shield, Heal, Buff with modifiers (Lifesteal, Execute, Scaling, Conditional, Knockback)
- **Data-driven trait system** — Trait definitions and values are loaded from mode data; providers register their runtime effects
- **TFT-style shop odds** — Level-based probability distribution for unit costs (1-5 gold)
- **In-memory game state** — live matches remain memory-only; SQLite analytics persist production outcomes

### Combat & Progression
- **Ghost/clone matchmaking** — Odd player count creates AI clones for balanced combat
- **Player elimination** — Ranked placement system with game-ending logic
- **Loot orbs** — Gold and unit rewards spawn after combat rounds, with a one-time emergency drop when a surviving human first falls to 20 health or lower
- **Data-loaded elemental combat** — Pokemon auto attacks and damage abilities derive their offensive element from traits using the best-attacker-trait rule and mode-owned affinity data; One Piece remains neutral
- **Role-based unit identity** — Every form is labeled Damage, Tank, or Support; Pokemon evolutions can change roles
- **Unified DEF combat stat** — DEF mitigates attacks, abilities, and damage-over-time and can be buffed or shredded
- **Tabbed damage report** — Post-combat tracking for your units vs opponent with visual damage bars
- **Per-unit attack animations** — Punch, slash, projectile with directional orientation
- **Ability patterns** — Single-target, line, and AoE effects with range-based targeting

### UI/UX Enhancements
- **Cost-based visual styling** — Dynamic borders and glows based on unit cost (1-cost gray → 5-cost gold)
- **Star-level visual effects** — Enhanced borders and top glows for 2★ and 3★ units
- **Shop probability tooltip** — Hover over player level to see current unit cost distribution
- **Git-based version display** — Build metadata (tag, commit, timestamp) in bottom-left corner
- **Smart unit tooltips** — Role, melee/ranged, trait-color, and DEF badges with star-level ability highlighting
- **Player board spectating** — Click alive players in the right panel to view their board and combat from their perspective
- **Keyboard shortcuts** — Enter key support for room creation/joining
- **Bench reordering** — Swap and rearrange units during planning
- **Team-colored health bars** — Emerald for allies, red for opponents

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Java 25 + Spring Boot 4)            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐ │
│  │ GameEngine │──│  GameRoom  │──│   Player   │──│   GameUnit     │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘ │
│        │                │                                           │
│  ┌─────┴──────┐  ┌──────┴───────┐  ┌──────────────────────────────┐ │
│  │ DataLoader │  │ CombatSystem │  │ TraitManager                 │ │
│  └────────────┘  └──────────────┘  └──────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ WebSocket (STOMP)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vue 3 + TypeScript)                  │
│  ┌───────────┐  ┌───────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  App.vue  │──│ GameInterface │──│ GameCanvas │──│ Animations   │ │
│  └───────────┘  └───────────────┘  └────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Design Principles:**
- **Backend Authority** — All game logic runs on the server; frontend is a rendering layer
- **Theme-Agnostic Core** — `GameUnit`, `Trait`, combat strategies, and room lifecycle are generic; themes are loaded via `GameModeProvider`
- **Serialized Room Commands** — Tick and client commands use the same per-room lock, and broadcasts serialize while holding it
- **Testability** — Time and randomness are abstracted (`Clock`, `RandomProvider`) for deterministic testing
- **Strategy Pattern** — Combat behaviors (`TargetSelector`, `UnitMover`, `AbilityCaster`) are injectable

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 25 (Preview) | Core language |
| Spring Boot | 4.1.0 | Application framework |
| WebSocket (STOMP) | — | Real-time communication |
| Maven | — | Build tool |
| Lombok | — | Boilerplate reduction |
| Jackson | — | JSON serialization |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Vue.js | 3.5 | UI framework |
| TypeScript | 6.0 | Type-safe JavaScript |
| Vite | 8.2 | Build tool & dev server |
| @stomp/stompjs | 7.3 | WebSocket client |
| Vanilla CSS | — | Scoped component styling |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker & Docker Compose | Containerization |
| Nginx | Reverse proxy |
| SQLite | Production gameplay analytics |

---

## 🚀 Quick Start

### Prerequisites
- Java 25
- Node.js 26+ & npm
- Docker (optional, for containerized deployment)

### Run Backend
```bash
cd backend

# New rooms begin with One Piece; the host selects the room mode in the lobby
mvn spring-boot:run
```
Backend runs on `http://localhost:8080`

### Run Frontend
```bash
cd frontend
npm ci
npm run dev
```
Frontend runs on `http://localhost:5173` with WebSocket proxy to backend

### Run with Docker
```bash
docker compose --profile dev up --build
```

---

## 🎮 Game Modes

Rooms start in One Piece mode, then the host can switch to Pokemon in the lobby before starting the match. Mode selection is
part of the room lifecycle, not a deployment setting. Changing the room mode swaps the unit set, traits, visuals, and
mode-specific combat rules for that room.

| Mode | Mode ID | Data Files |
|------|----------------|------------|
| One Piece | `onepiece` | `units_onepiece.json`, `traits_onepiece.json`, `augments_onepiece.json` |
| Pokemon | `pokemon` | `units_pokemon.json`, `traits_pokemon.json`, `augments_pokemon.json`, `affinities_pokemon.json` |

To add a new theme, implement `GameModeProvider` and add corresponding JSON data files. See
[Backend Context](backend/BACKEND_CONTEXT.md#6-modes-and-data-loading) for details.


---

## 📡 API Reference

### WebSocket Endpoints
| Destination | Direction | Description |
|-------------|-----------|-------------|
| `/app/create` | Client → Server | Create a new game room |
| `/app/join` | Client → Server | Join an existing room |
| `/app/leave` | Client → Server | Disconnect from a room; active-match players enter reconnect grace |
| `/app/abandon` | Client → Server | Permanently abandon the active match |
| `/app/start` | Client → Server | Host starts the match |
| `/app/room/{id}/add-bot` | Client → Server | Host adds a lobby bot |
| `/app/room/{id}/mode` | Client → Server | Host changes the room game mode during lobby |
| `/app/room/{id}/action` | Client → Server | Player action (BUY, MOVE, REROLL, EXP, SELL, LOCK, COLLECT_ORB, READY_FOR_COMBAT, SELECT_AUGMENT) |
| `/topic/room/{id}` | Server → Client | Game state broadcast (100ms) |
| `/topic/room/{id}/event` | Server → Client | Typed combat-result and emergency-drop events |
| `/user/queue/room-result` | Server → Client | Private create/join acknowledgement with player id or rejection code |

Client actions are bound to the STOMP session that joined the room. The backend rejects actions, start requests, and mode changes that attempt to act as a different player id. Shop/economy controls and bench-only selling or reordering remain available during combat, while board mutations and orb collection are planning-only. Create/join failures are returned privately instead of leaving the client waiting.
Augment choices are included in each player's `GameState` snapshot as `augmentChoices`; selected augments are exposed as `selectedAugments`.

### REST Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Default game mode and available lobby modes |
| `/api/mode` | GET | Default game mode |
| `/api/traits?mode={mode}` | GET | Trait definitions for the selected mode |
| `/api/admin/auth/login` | POST | Exchange the configured admin password for an eight-hour bearer token |
| `/api/admin/auth/logout` | POST | Revoke the current bearer token |
| `/api/admin/analytics/summary` | GET | Protected aggregate gameplay analytics |
| `/api/admin/analytics/runs` | GET | Protected, paginated player runs |
| `/api/admin/analytics/runs/{runId}` | GET | Protected round-level detail for one player run |

The production analytics dashboard is available at `/#/admin/analytics`. Match state remains backend-authoritative and
in memory; only anonymous analytics snapshots are written to SQLite. See the deployment guide for password and storage
configuration.

---

## 🧪 Development

### Code Formatting
```bash
# Backend: Run Spotless formatter
cd backend && mvn spotless:apply

# Full backend verification and coverage report
cd backend && mvn verify

# Frontend tests and V8 coverage report
cd frontend && npm run test:coverage
```

### Balance Simulation Reports
```bash
cd backend

# Existing same-star board simulation
mvn -Dtest=BalanceSimulationReportTest -Dsimulation.report=true -Dsimulation.runs=1000000 -Dsimulation.threads=8 test

# One piece
mvn -Dtest=BalanceSimulationReportTest -Dsimulation.mode=onepiece -Dsimulation.report=true -Dsimulation.runs=1000000 -Dsimulation.threads=8 test

# Keep the same board-building rules, but randomize every unit's star level
mvn -Dtest=BalanceSimulationReportTest -Dsimulation.report=true -Dsimulation.runs=1000000 -Dsimulation.threads=8 -Dsimulation.style=random-stars test

# Randomize board sizes, units, star levels, and positions
mvn -Dtest=BalanceSimulationReportTest -Dsimulation.report=true -Dsimulation.runs=1000000 -Dsimulation.threads=8 -Dsimulation.style=random-boards test

# Compare equal-value balanced role boards against Damage-only boards
mvn -Dtest=RoleBalanceSimulationTest -Dsimulation.role-report=true -Dsimulation.runs=100000 -Dsimulation.seed=42 test
```

Reports are written to `backend/target/simulation-reports`. Every style also writes unit and trait rankings for board
sizes 2–7. The role report keeps Damage-only boards viable at size 3, requires a balanced advantage from size 4, and
raises the minimum balanced win-rate target to 65% for sizes 6–7.

### Build for Production
```bash
# Backend
cd backend && mvn package

# Frontend
cd frontend && npm run build
```

---

## 📄 License

This project is for educational purposes.

---

*Last updated: 2026-07-31*
