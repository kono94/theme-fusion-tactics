# TFT Roadmap

Status: approved direction  
Planning snapshot: 2026-09-26 (after release 2.5.3)  
Supersedes: `archive/2026-08-03_NEXT_PRODUCT_INITIATIVES.md`

## 1. Where we are

Delivered from the previous roadmap:

| Previous initiative | Status |
|---|---|
| Final-composition analytics | Done: final-board snapshot per human run, admin dashboard, public solo match history |
| Lobby invitations | Done: generated room codes, invite links, remembered names. Share sheet, QR, host lock/kick, and rematch links are still open (not scheduled) |
| Mobile support | Not started: board interaction relies on HTML5 drag-and-drop, which does not work on touch devices |
| Item system | Placeholder only: `GameItem` interface and an unused `items` list on units; loot orbs drop only `GOLD`/`UNIT` |
| Distinct mode identities | Replaced by Match Rules (initiative 1 below) |

## 2. Priorities

| Order | Initiative | Player outcome |
|---|---|---|
| 1 | Match Rules | Every match can have a distinct flavor chosen by the host |
| 2 | Item system | Strong, meaningful unit customization from loot orbs |
| 3 | Mobile support | Full matches playable on tablets and landscape phones |
| 4 | Bot improvements | Bots use Match Rules and items credibly and position better |
| Side track | 3D combat view | Combat watched in 3D with portrait billboards in every mode (spike done, direction chosen) |

Each initiative ships separately and is playtested before the next one grows its scope.

## 3. Initiative 1: Match Rules

### Goal

A match-wide rule gives each game its own flavor, similar to TFT's portals. Examples include "units explode on death",
"start with 20 gold", and "melee units deal double damage". This replaces the earlier "one signature rule per mode" idea
and keeps the core theme-agnostic.

### Decisions

- **Host picks in the lobby.** The waiting room shows a Match Rule selector next to mode selection. It offers "None",
  "Random", or a specific rule. Non-hosts see the choice read-only. The choice is locked when the match starts.
- **Shared and mode-specific pool.** Generic rules are available in every mode. Each mode can add a few themed rules in
  its mode data, for example `match_rules_<mode>.json`, following the existing augment pattern.
- **One active rule per match.** The active rule stays visible in the match UI and has a one-sentence tooltip.

### Engine shape

- Rules are data definitions (id, name, description, icon, effect type, parameters) that use a small, generic effect
  vocabulary. Theme names never appear in core code.
- Rule effects attach at existing hook points instead of adding scattered conditionals:
  - **Economy/setup:** starting gold, starting level, interest cap, XP cost, shop size, reroll cost.
  - **Combat modifiers:** damage multipliers by role or range (melee, ranged, tank), starting mana, attack speed.
  - **Combat triggers:** on death (area explosion), on combat start (shield), periodic effects.
  - **Loot:** orb frequency and contents. Item-related rules follow after initiative 2.
- The active rule appears on `GameState`, in final-composition analytics, and in public match history, so balance can be
  split by rule.
- `frontend/src/types/game.ts` stays aligned with the new wire fields.

### First rule set (to be refined)

Six to eight shared rules and one or two themed rules per mode, for example:

| Rule | Effect idea |
|---|---|
| Treasure Chest | +20 starting gold |
| Glass Cannons | All units deal +50% damage and have −25% HP |
| Close Quarters | Melee units deal +100% damage |
| Volatile | Units explode on death for area damage based on their max HP |
| Fast Forward | Start at level 4, and XP costs less |
| Loot Rain | Loot orbs spawn every round |
| Big Shop | The shop shows 6 units |

Values are placeholders until playtests confirm them.

### Done when

- The host can select a rule, and every player sees it before and during the match.
- Each rule has backend tests for its effect and a readable tooltip.
- Analytics and match history record the rule.
- The in-app changelog explains the feature and lists each rule.

## 4. Initiative 2: Item system

### Decisions

- **Two strong items per unit by default.** The slot count is a config value, not hardcoded, so a Match Rule
  (for example "Armory: 3 slots and more item drops") can raise it.
- **Complete items only, no combining.** Items are individually strong. Getting one should feel like an event, and
  equipping it should be a real decision.
- **Fewer drops.** Loot orbs gain an `ITEM` loot type. Roughly 3–5 items per player per game is the starting target,
  to be tuned with analytics.
- **Mode-themed items on a shared effect vocabulary.** Effects such as stat bonuses, lifesteal, shields on combat
  start, mana on hit, or on-kill triggers are generic engine mechanics. Each mode supplies its own item list, names,
  and icons (for example `items_<mode>.json`), like augments do today. One Piece could use Devil Fruit and treasure
  flavor, and Pokemon could use Held Items.

### Rules to lock during design

- Whether equipped items are fixed until the unit is sold or can be moved during planning. The recommended start is
  fixed, with items returning to the inventory when the unit is sold.
- What happens to items when units combine. The recommended start is that the upgraded unit keeps items up to its slot
  limit and the rest go back to the inventory.
- Where the item inventory lives in the UI. It must work with the tap interaction from initiative 3.
- How unwanted or duplicate items are handled without inventory clutter.

### Done when

- Items drop, can be inspected, and can be equipped without outside explanation.
- Unit tiles show equipped item icons. Tooltips describe the exact backend effect.
- Final-composition analytics already store item ids per unit, and the admin view shows them.
- No single item or item/unit pairing dominates in either mode.

## 5. Initiative 3: Mobile support (tablets and landscape phones)

- **Tap-to-select and tap-to-place** as an alternative to every drag. This covers the board, bench, selling, buying,
  and equipping items. Drag-and-drop stays for desktop.
- Nothing required depends on hover. Tooltips open on tap or long-press and can be dismissed.
- A responsive landscape match layout keeps the board, bench, phase, and economy actions always visible. Traits,
  opponents, the damage report, and the Match Rule details move into drawers or tabs.
- Portrait orientation must fully work for the landing page, invite join, lobby, and waiting room. Portrait gameplay is
  out of scope.
- Touch targets, safe areas, browser chrome, and orientation changes are handled. Reduced-motion settings still apply.
- Done when a full match is completable on a representative tablet and landscape phone, with no game logic duplicated
  in layout code.

## 6. Initiative 4: Bot improvements

- Bots equip items sensibly, putting offensive items on carries and defensive items on tanks.
- Bot strategies adapt to the active Match Rule, for example favoring melee under "Close Quarters" and leveling
  aggressively under "Fast Forward".
- Positioning improves: tanks in front, carries protected, and ranged units in the back rows.
- Done when bots stay competitive under every Match Rule and use items without obvious mistakes.

## 7. Side track: 3D combat view

### Spike result (2026-09-26)

A throwaway spike replayed a recorded fight in Three.js and compared downloaded third-party 3D models with portrait
billboards. The spike code has been removed. The models varied widely in quality and animation coverage, and as
copyrighted game rips they could never ship, so they were discarded as well.

### Decision: portrait billboards in a 3D arena

The portrait style looked better than the 3D models and is the chosen direction. Units are the existing circular
unit portraits (team-colored ring, always facing the camera) standing in a lit 3D arena. Procedural motion (hops,
lunges, casts, hit flashes, faints) and 3D effects make them feel alive.

Why this works:

- **It works for every mode.** The only per-unit asset is the portrait that every mode already has. No models,
  rigging, or animation work is needed per unit, and new units and modes get 3D combat for free.
- **It stays theme-agnostic.** The renderer only needs a portrait URL and a type/trait color per unit.
- **The art style stays consistent** with the rest of the game, and there are no licensing concerns beyond the
  existing portraits.

### Two supported combat views

Both views are supported permanently. The 3D view is an addition, not a replacement:

- **Classic (2D):** the existing `GameCanvas` and `CombatEffectsCanvas` rendering, unchanged.
- **3D:** the Three.js arena with portrait billboards from the demo.

Rules:

- The player picks the view in a visible toggle (in the match UI and in settings). The choice is remembered per
  device in local storage.
- Both views render the same backend `GameState`. Neither view contains game logic, and a wire-contract change must
  work in both.
- 2D is the default while the 3D view is marked as beta. Making 3D the default is a separate decision after
  playtests.
- 3D falls back to 2D automatically when WebGL is unavailable or the context is lost. Reduced-motion settings apply
  in both views.
- Switching views mid-combat must work without desync, because both views are driven by the same state stream.

### Preview shipped (2026-09-27)

- A Settings button (lobby dock and match top bar) has a "3D battle view — Preview" toggle, remembered per device.
  Combat renders in `frontend/src/combat3d/`, which is lazy-loaded. Planning stays 2D, and WebGL failure falls back to
  Classic.
- Arenas rotate per room from a mode pool. One Piece uses story stages (Foosha Village, Baratie, Sabaody,
  Marineford, Wano). Pokemon uses Battle Stadium and Rock Gym.
- Signature 3D ultimates exist for Luffy, Zoro, Sanji, Ace, Whitebeard, Kizaru, Akainu, and Mihawk, plus the
  Fire/Electric/Water/Psychic/Dragon/Ghost Pokemon element styles. Everything else uses family fallbacks.
- Still open: the remaining One Piece signatures, per-unit Pokemon polish, a quick view toggle inside the match UI,
  hover tooltips in 3D, label collisions, a mobile performance budget, and more stages per mode.

### Next steps (not scheduled; after the main initiatives or when there is room)

1. **3D view for live combat.** Render the combat phase from the live `GameState` stream in a Three.js view, reusing
   the demo's replay logic (per-tick positions, HP, mana, `recentEvents`). The planning phase and all board
   interaction stay in the existing `GameCanvas` 2D view in both modes. Lazy-load Three.js so players who use the
   2D view do not download it.
2. **Reuse the existing effects first, port them later.** `CombatEffectsCanvas` (about 2,600 lines) and
   `AttackAnimation` hold the current per-ability 2D effects and `animationConfig`. First, draw them as a transparent
   screen-space overlay on top of the 3D view, fed with the units' projected screen positions. Then port only the
   highest-impact effects (ultimates, projectiles) to Three.js, where depth actually helps. Reduced-motion and
   crowding rules from `renderPolicy` still apply.
3. **Polish.** Camera framing per combat side (the player's own board toward the camera), arena theming per mode,
   performance on mobile and tablets (initiative 3), and overlay labels that do not collide in crowded fights.
4. **Seeded fight endpoint (optional).** The original step 3, a dev endpoint that runs a seeded fight between two
   boards, is only needed if replays outside a live match become useful (for example, for match history).

Done when combat in both game modes (One Piece and Pokemon) can be watched in either view, players can switch
between Classic and 3D at any time, every existing ability has a visible effect in both views, and 3D falls back
to Classic cleanly.

## 8. Guardrails

- The core engine stays theme-agnostic. Match Rules and items use generic effect vocabularies, and modes supply only
  data and names.
- The backend stays authoritative for rule effects, item effects, and drops. The frontend only renders and sends
  actions.
- New mechanics appear in final-composition analytics so balance can be checked by rule and item.
- Every player-facing change updates `frontend/src/components/Changelog.vue` under a temporary `Version X.X.X` heading.
- README and the backend and frontend context docs are updated alongside the runtime changes.

## 9. Open questions

- Should "Random" be the default Match Rule for new rooms, or "None"?
- Should the public match history be filterable by Match Rule?
- Is invite polish (share sheet, QR, host lock/kick, rematch link) worth scheduling alongside mobile support?
