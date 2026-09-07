<script setup lang="ts">
defineOptions({
  name: 'GameChangelog'
})

defineEmits(['back'])

const nextVersionCommits = [
  { hash: 'pending', title: 'Make legendary birds ranged' },
  { hash: 'pending', title: 'Replace free bot armies with persistent teams using normal gold, shops, upgrades, and XP' },
  { hash: 'pending', title: 'Fix blocked melee movement, empty casts, and per-target spell modifiers' },
  { hash: 'pending', title: 'Allow shop economy and bench management during combat' },
  { hash: 'pending', title: 'Add final-composition analytics with selectable build-cohort filters' },
  { hash: 'pending', title: 'Remove retired mode assets, animation paths, and unsupported wire modes' },
  { hash: 'pending', title: 'Replace hosted Renovate with Codex-assisted local dependency maintenance' },
  { hash: 'pending', title: 'Upgrade ESLint 9.39.5 => 10.8.0 and TypeScript 5.9.3 => 6.0.3' },
  { hash: 'pending', title: 'Standardize frontend development and CI on Node.js 26' },
  { hash: '937bfaa', title: 'Upgrade CI actions to Node 24 runtimes' },
  { hash: 'd477638', title: 'Refresh architecture guides and pending release notes' },
  { hash: 'ac1da68', title: 'Use stable player identity in the frontend' },
  { hash: '3724062', title: 'Serialize room authority and accelerate resolved bot combat' },
  { hash: '7545cf4', title: 'Make game mode providers own data and bot policies' },
  { hash: '5529eef', title: 'Harden production configuration and CI verification' },
  { hash: 'ba9706b', title: 'Refine lobby theme selection layout' },
  { hash: '69fc53c', title: 'Fix landing page footer layout' }
]

const version200rc1Commits = [
  { hash: 'bf23b7f', title: 'Fix frontend container builds that consume shared backend unit definitions' },
  { hash: '89a7170', title: 'Externalize Pokemon affinity relationships into the shared data-driven resolver' },
  { hash: '89a7170', title: 'Rename the product to Theme Fusion Tactics (TFT)' }
]

const version180Commits = [
  { hash: '2baa71c', title: 'Retune four-cost area damage and combat-unit outliers across both sets' },
  { hash: '99d9336', title: 'Add emergency drops, combat follow-up balance, and clearer tooltip tags' },
  { hash: '13bdc4d', title: 'Fix end celebration rendering for eliminated and winning players' },
  { hash: 'ce65e88', title: 'Add unit roles and unified DEF while rebalancing both sets' },
  { hash: 'f618d8f', title: 'Update README simulation run counts' },
  { hash: '754a2db', title: 'Rebalance AoE abilities, progression, Pokemon traits, and augments' }
]

const version170Commits = [
  { hash: '87beff9', title: 'Nerf bot star-level scaling' },
  { hash: '843830d', title: 'Nerf three-star Geodude' },
  { hash: 'ff96dae', title: 'Add analytics, SQLite storage, and reconnect recovery' }
]

const version162Commits = [
  { hash: '4a5c569', title: 'Nerf Pokemon bot board size' },
  { hash: 'e7b41c5', title: 'Improve README' },
  { hash: '48fa306', title: 'Rebalance One Piece units from combat simulation results' },
  { hash: '282d2cf', title: 'Rebalance Pokemon units from combat simulation results' },
  { hash: 'f49c6d9', title: 'Add backend combat simulation reports and randomized board modes' },
  { hash: '96a6c5e', title: 'Add deterministic combat simulation reports' },
  { hash: '405a32b', title: 'Upgrade third-party dependencies' }
]

const version161Commits = [
  { hash: '92d4a30', title: 'Prevent completed unit lines from reappearing' },
  { hash: '8833a6f', title: 'Balance augments' },
  { hash: 'f3a35cd', title: 'Balance bot opponent scaling' }
]

const version160Commits = [
  { hash: 'fc426b0', title: 'Fix line abilities silently missing off-axis targets' },
  { hash: '78c7cc3', title: 'Balance One Piece units and augments' },
  { hash: '21e362d', title: 'Add defender mana on direct hits' },
  { hash: '869c746', title: 'Update agent instructions' },
  { hash: 'b771cf4', title: 'Balance Pokemon traits and add changelog' },
  { hash: 'e5dba11', title: 'Fix unit drag preview rendering' },
  { hash: '989c37b', title: 'Prevent joining started games' },
  { hash: '700c520', title: 'Fix ghost unit board state sync' },
  { hash: 'c9fe5e5', title: 'Fix knockback combat grid bounds' }
]
</script>

<template>
  <main class="changelog-page">
    <button class="back-button" type="button" @click="$emit('back')">Back</button>

    <div class="release-history">
      <section class="release-section latest-release">
        <div class="release-header">
          <p class="eyebrow">Next</p>
          <h2>Version 2.0.0-rc5</h2>
          <p>
            Room creation and player identity now use explicit private acknowledgements, all room mutations share one
            serialized authority boundary, invalid phase actions are rejected by the backend, and decisive combat
            events are retained. Room IDs now stay canonical across subscriptions and reconnect state, while production
            fails fast without an analytics admin password. Java 25 test startup, refund
            previews, dependency security, CI release gates, obsolete deployment-time mode selection, and the
            backend/frontend architecture guides were also corrected. Human-involved combats now keep normal pacing;
            once they all resolve, remaining bot-only combats are drained immediately. Renovate now processes one
            routine dependency update each week, automatically merging non-major updates only after all required
            checks pass and leaving failures open for repair. Major updates remain listed in the Dependency Dashboard
            for separate AI-assisted migrations. This maintenance inventory found no compatible non-major updates;
            The frontend toolchain now uses ESLint 9.39.5 => 10.8.0 and TypeScript 5.9.3 => 6.0.3, and frontend
            development, CI, and the production build image now target Node.js 26. Renovate commits use
            repository-owned, privacy-preserving attribution.
            Final deployed boards are now captured once per human run, and the protected analytics dashboard can compare
            unit presence across isolated mode/version/commit cohorts with historical-image fallbacks and filter using
            all distinct modes, versions, commits, build cohorts, and anonymous player IDs in the selected date range.
            Combat now accepts the shop, XP, reroll, lock, and bench-management actions already exposed by the UI while
            continuing to reject board mutations and orb collection.
          </p>
        </div>
        <article class="release-panel">
          <ul class="commit-list">
            <li v-for="commit in nextVersionCommits" :key="`${commit.hash}-${commit.title}`">
              <span class="hash">{{ commit.hash }}</span>
              <span>{{ commit.title }}</span>
            </li>
          </ul>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Articuno</h4>
            </div>
            <p>
              Attack range at all star levels:
              <span class="old-value">1</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">3</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Zapdos</h4>
            </div>
            <p>
              Attack range at all star levels:
              <span class="old-value">1</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">3</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Moltres</h4>
            </div>
            <p>
              Attack range at all star levels:
              <span class="old-value">1</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">3</strong>.
            </p>
          </div>
        </article>
      </section>

      <section class="release-section">
        <div class="release-header">
          <p class="eyebrow">Previous</p>
          <h2>Version 2.0.0-rc1</h2>
          <p>
            Pokemon affinity relationships were externalized into the shared data-driven resolver, while the product
            was renamed to Theme Fusion Tactics (TFT) and frontend container builds were aligned with shared backend
            unit definitions.
          </p>
        </div>
        <article class="release-panel">
          <ul class="commit-list">
            <li v-for="commit in version200rc1Commits" :key="`${commit.hash}-${commit.title}`">
              <span class="hash">{{ commit.hash }}</span>
              <span>{{ commit.title }}</span>
            </li>
          </ul>
        </article>
      </section>

      <section class="release-section">
        <div class="release-header">
          <p class="eyebrow">Previous</p>
          <h2>Version 1.8.0</h2>
          <p>
            Every One Piece and Pokemon unit now has a Damage, Tank, or Support identity. Pokemon evolutions can change
            roles as they upgrade, and the previously unused Armor and Magic Resist fields have been replaced by one
            functional DEF stat. Multi-target abilities are also less capable of erasing entire boards, late levels are
            easier to reach, and combat augments compete more effectively with economy choices. Unit tooltips now label
            melee and ranged attackers and color their trait tags, while low-health emergency loot drops receive a
            dedicated outcome-aware announcement and staggered orb arrival.
          </p>
        </div>
        <article class="release-panel">
          <ul class="commit-list">
            <li v-for="commit in version180Commits" :key="commit.hash">
              <span class="hash">{{ commit.hash }}</span>
              <span>{{ commit.title }}</span>
            </li>
          </ul>
        </article>
        <article class="release-panel">
          <div class="section-heading">
            <span class="marker balance"></span>
            <h3>Balance Changes</h3>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Caterpie</h4>
            </div>
            <p>
              Max HP and String Shot stun at 1★:
              <span class="old-value">570 HP, 1.5 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">630 HP, 2 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Metapod</h4>
            </div>
            <p>
              Harden at 2★:
              <span class="old-value">75 max mana, 400 shield</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">65 max mana, 650 shield</strong>. The additional shield remains self-only;
              area-shield values are unchanged.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Sandshrew and Sandslash</h4>
            </div>
            <p>
              Max mana:
              <span class="old-value">60/60/60</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">45/40/40</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Abra</h4>
            </div>
            <p>
              Kinesis stun at 1★:
              <span class="old-value">1 second</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">2 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Squirtle</h4>
            </div>
            <p>
              Max HP:
              <span class="old-value">962</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">1020</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Blastoise</h4>
            </div>
            <p>
              Max HP:
              <span class="old-value">3118</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">3400</strong>. Hydro Cannon damage at 3★:
              <span class="old-value">315</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">360</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Jigglypuff</h4>
            </div>
            <p>
              Sing stun at 1★:
              <span class="old-value">1 second</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">1.5 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Slowpoke</h4>
            </div>
            <p>
              Yawn stun at 1★:
              <span class="old-value">1 second</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">2 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Jynx</h4>
            </div>
            <p>
              Lovely Kiss stun:
              <span class="old-value">1/1.5/2 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">1.5/2/2 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Porygon</h4>
            </div>
            <p>
              Conversion max mana and DEF:
              <span class="old-value">55/65/65 mana, 14/25/40 DEF</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">45/55/55 mana, 24/42/65 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag nerf">Nerf</span>
              <h4>Articuno</h4>
            </div>
            <p>
              Blizzard stun is pulled back after overshooting:
              <span class="old-value">1.5/1.5/2.5 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">1.25/1.25/2.25 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag nerf">Nerf</span>
              <h4>Boa Hancock</h4>
            </div>
            <p>
              Slave Arrow stun at 3★:
              <span class="old-value">2 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">1.75 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Pokémon Balanced Boards</h4>
            </div>
            <p>
              Fixed-seed Pokémon balanced-board win rate at sizes 3/4:
              <span class="old-value">47.87%/53.17%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">49.78%/55.12%</strong>, clearing the 55% size-4 threshold while keeping the
              three-unit matchup effectively even.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Summary</span>
              <h4>Role, Defense, and Combat Balance</h4>
            </div>
            <p>
              Unit identities changed from unlabeled forms
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value mixed">Damage, Tank, or Support</strong>, with Pokemon evolutions able to change role.
              Armor and Magic Resist were consolidated into functional DEF, role packages were recalibrated, and area
              damage was reduced globally with a selective premium recovery for high-cost damage units. Shielding is part
              of this same next-version balance pass: shield amounts were reduced and capped, while shield-focused forms
              received modest durability compensation.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">New</span>
              <h4>Damage, Tank, and Support Roles</h4>
            </div>
            <p>
              Unit role labels:
              <span class="old-value">none</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">Damage, Tank, or Support on every unit tooltip</strong>. Damage baseline
              Health/DEF/Attack/ability damage:
              <span class="old-value">100%/100%/100%/100%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value mixed">85%/75%/115%/115%</strong>. Tank baseline:
              <span class="old-value">100%/100%/100%/100%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value mixed">125%/140%/75%/65%</strong>. Support Attack/direct damage/utility/max mana:
              <span class="old-value">100%/100%/100%/100%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value mixed">75%/60%/120%/85%</strong>. Whitebeard keeps Tank durability but retains
              <strong>100% Attack and 85% Quake damage</strong>. Fixed 5% primary-package corrections were then
              applied from the deterministic simulation report; Damage output never falls below its pre-role baseline,
              and Tank durability never falls below the 125% HP/140% DEF route.
            </p>
            <p>Pokemon role-changing upgrades:</p>
            <p>
              <span class="character-name">Caterpie</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Support/Tank/Support</strong>.
            </p>
            <p>
              <span class="character-name">Weedle</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Tank/Damage</strong>.
            </p>
            <p>
              <span class="character-name">Pidgey</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Damage/Support</strong>.
            </p>
            <p>
              <span class="character-name">Poliwag</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Support/Damage</strong>.
            </p>
            <p>
              <span class="character-name">Jigglypuff</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Support/Support/Damage</strong>.
            </p>
            <p>
              <span class="character-name">Psyduck</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Support/Damage/Damage</strong>.
            </p>
            <p>
              <span class="character-name">Ponyta</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Support/Damage/Damage</strong>.
            </p>
            <p>
              <span class="character-name">Magnemite</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Damage/Tank</strong>.
            </p>
            <p>
              <span class="character-name">Abra</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Support/Damage/Damage</strong>.
            </p>
            <p>
              <span class="character-name">Machop</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Support/Damage</strong>.
            </p>
            <p>
              <span class="character-name">Doduo</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Damage/Support</strong>.
            </p>
            <p>
              <span class="character-name">Grimer</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Tank/Tank</strong>.
            </p>
            <p>
              <span class="character-name">Gastly</span>
              <span class="old-value">one unlabeled identity per evolution line</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Damage/Support/Damage</strong>.
            </p>
            <p>
              Fixed-seed role simulation, balanced win rate by board size 3/4/5/6/7:
              <span class="old-value">unmeasured</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>One Piece 57.64/57.90/79.00/73.96/70.38%</strong> and
              <strong>Pokemon 52.03/55.56/72.25/71.49/71.19%</strong>. Damage-only remains viable on three-unit boards,
              while Tank/Support coverage becomes increasingly important from four units onward.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">New</span>
              <h4>Unified DEF</h4>
            </div>
            <p>
              Defensive stats:
              <span class="old-value">Armor and Magic Resist displayed but unused</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">one DEF stat reducing attacks, abilities, and damage-over-time</strong>.
              Damage multiplier:
              <span class="old-value">100%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>100 / (100 + DEF)</strong>. Marine bonuses:
              <span class="old-value">25/60/100 unused Armor and MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">15/35/60 DEF</strong>. Ground:
              <span class="old-value">5/18/32/50 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/12/20/35 DEF</strong>. Rock:
              <span class="old-value">6/24 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/18 DEF</strong>. Ice:
              <span class="old-value">4/14/26/42 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/14/25/40 DEF</strong>. Steel:
              <span class="old-value">12 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">8 DEF</strong>. Iron Line:
              <span class="old-value">5/8/12 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">8/14/22 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Sanji</h4>
            </div>
            <p>
              Diable Jambe:
              <span class="old-value">18/31/53% team Attack Speed</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>280/504/907 damage</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Robin</h4>
            </div>
            <p>
              Clutch:
              <span class="old-value">350/630/1134 damage with control</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>1/2/3 second stun</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Moria</h4>
            </div>
            <p>
              Shadow Steal:
              <span class="old-value">220/396/712 damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>10/18/30 DEF shred</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Page One</h4>
            </div>
            <p>
              Spinosaurus Shield:
              <span class="old-value">14/25/39% Attack</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>12/22/35 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Queen</h4>
            </div>
            <p>
              Plague Bullet:
              <span class="old-value">315/567/1021 damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>12/22/35 DEF shred</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Chess Soldiers</h4>
            </div>
            <p>
              Formation:
              <span class="old-value">11/18/28% Attack</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>10/18/30 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Cracker</h4>
            </div>
            <p>
              Biscuit Slash:
              <span class="old-value">224/403/725 damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Biscuit Guard with 20/35/60 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Jozu</h4>
            </div>
            <p>
              Diamond Defense:
              <span class="old-value">300/540/972 healing</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>18/32/55 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Bulbasaur</h4>
            </div>
            <p>
              Vine Whip:
              <span class="old-value">126/284/609 damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>1/1/2 second line stun</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Ivysaur</h4>
            </div>
            <p>
              Razor Leaf:
              <span class="old-value">112/252/543 damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>8/16/28 DEF shred</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Oddish</h4>
            </div>
            <p>
              Absorb:
              <span class="old-value">220/495/1060 damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>healing</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Vileplume</h4>
            </div>
            <p>
              Petal Dance:
              <span class="old-value">112/252/560 damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>Sleep Powder with 1/1/2 second stun</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Tentacool and Tentacruel</h4>
            </div>
            <p>
              Acid Spray and Sludge Wave:
              <span class="old-value">Acid Spray and Sludge Wave damage</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>8/18/30 DEF shred</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Rework</span>
              <h4>Porygon</h4>
            </div>
            <p>
              Conversion:
              <span class="old-value">15/24/35% Attack Speed</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong>12/22/36 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag nerf">Nerf</span>
              <h4>Area Effects</h4>
            </div>
            <p>
              LINE and SURROUND ability strength:
              <span class="old-value">100%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">70%</strong>. This applies to damage, healing, shielding, buffs, and control in
              both modes.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag nerf">Nerf</span>
              <h4>Golem</h4>
            </div>
            <p>
              Stealth Rock:
              <span class="old-value">146/329/800</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">102/230/560</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Premium Area Damage</h4>
            </div>
            <p>
              Five-cost DAMAGE abilities with LINE or SURROUND patterns retain their premium recovery after the global
              area-effect nerf:
              <span class="old-value">70%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">80.5% effective damage</strong>. Direct damage values and their damage-over-time
              ticks remain 15% above the post-area-nerf baseline. The equivalent four-cost recovery was reduced after
              follow-up simulation:
              <span class="old-value">80.5% effective damage, +15%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">77% effective damage, +10%</strong>. SINGLE abilities and lower-cost units are
              unchanged.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Akainu</h4>
            </div>
            <p>
              Five-cost magma damage remains
              <span class="old-value">564/1014/1826</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">649/1166/2100</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Mixed</span>
              <h4>Shielding and Late-Game Durability</h4>
            </div>
            <p>
              Shield ability values on shield-bearing forms:
              <span class="old-value">100%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">80% / 70% / 60% at 1★ / 2★ / 3★</strong>. A runtime cap now limits total shield to
              <span class="old-value">uncapped</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">min(50% max HP, current HP)</strong>. Active shield forms receive a small
              compensation of
              <span class="old-value">0% max HP and 0 DEF</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">+5% max HP and +3 DEF</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Caterpie</h4>
            </div>
            <p>
              String Shot at 1★:
              <span class="old-value">1 second</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">1.5 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Metapod</h4>
            </div>
            <p>
              Self-only Harden shield at 2★:
              <span class="old-value">245</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">400</strong>; area shields keep their reduced values.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Jynx</h4>
            </div>
            <p>
              Lovely Kiss stun:
              <span class="old-value">1/1/1 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">1/1.5/2 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Porygon</h4>
            </div>
            <p>
              Conversion DEF:
              <span class="old-value">12/22/36</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">14/25/40</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Tentacruel</h4>
            </div>
            <p>
              Sludge Wave DEF shred:
              <span class="old-value">8/18/30</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">10/22/36</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Articuno</h4>
            </div>
            <p>
              Blizzard stun:
              <span class="old-value">1/1/2 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">1.5/1.5/2.5 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag nerf">Nerf</span>
              <h4>Gengar</h4>
            </div>
            <p>
              Dream Eater lifesteal at 3★:
              <span class="old-value">75%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">50%</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Boa Hancock</h4>
            </div>
            <p>
              Slave Arrow stun:
              <span class="old-value">1/1/1 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">1/1/2 seconds</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Queen</h4>
            </div>
            <p>
              Plague Bullet DEF shred:
              <span class="old-value">12/22/35</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">14/25/40</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Nico Robin</h4>
            </div>
            <p>
              Max mana:
              <span class="old-value">45/40/50</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">40/35/45</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Moria</h4>
            </div>
            <p>
              Shadow Steal DEF shred:
              <span class="old-value">10/18/30</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">12/21/34</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Charlotte Katakuri</h4>
            </div>
            <p>
              Mochi Thrust damage:
              <span class="old-value">920/1656/2981</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">966/1739/3130</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Timing</span>
              <h4>Combat and Augment Pacing</h4>
            </div>
            <p>
              Combat phase duration:
              <span class="old-value">25 seconds</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">32 seconds</strong>. Augment offer rounds:
              <span class="old-value">2 / 5 / 10</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value mixed">3 / 6 / 11</strong>.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">New</span>
              <h4>Emergency Drop</h4>
            </div>
            <p>
              Human players crossing the red-health threshold from
              <span class="old-value">above 20 HP with 0 rescue drops</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">20 HP or lower with 10–15 normal gold/unit orbs</strong> once per match. The
              drops arrive in the following planning phase with a dedicated announcement and staggered presentation.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag buff">Buff</span>
              <h4>Leveling</h4>
            </div>
            <p>
              XP requirements from levels 1 through 9:
              <span class="old-value">2/6/10/20/36/56/80/100</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">2/6/10/20/26/36/44/50</strong>. Level 9 is now the maximum level.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Mixed</span>
              <h4>Pokemon Traits</h4>
            </div>
            <p>
              Grass Health:
              <span class="old-value">40/150/260</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">100/300/500</strong>. Ground defense:
              <span class="old-value">5/18/32/50 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/12/20/35 DEF</strong>. Rock:
              <span class="old-value">6/24 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/18 DEF</strong>. Ice:
              <span class="old-value">4/14/26/42 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/14/25/40 DEF</strong>. Poison:
              <span class="old-value">3/7/11/16% ATK per tick</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/10/18/30%</strong>. Ghost:
              <span class="old-value">4/14% Lifesteal</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">6/20%</strong>. Steel:
              <span class="old-value">12 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">8 DEF</strong>. Normal ATK:
              <span class="old-value">1/5/10/16%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">2/7/14/22%</strong>. Fire Ability Damage:
              <span class="old-value">4/14/23/34%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">4/14/22/32%</strong>. Water Mana Gain:
              <span class="old-value">10/30/50/70%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">15/40/65/90%</strong>. Psychic Starting Mana:
              <span class="old-value">5/18/28/40%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">4/14/24/35%</strong>. Flying low-health Attack Speed:
              <span class="old-value">4/12/24/36%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">3/10/20/30%</strong>. Bug extra-attack chance:
              <span class="old-value">3/10/17%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/14/24%</strong>. Fighting ATK:
              <span class="old-value">4/13/22/32%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">5/15/25/38%</strong>. Dragon Ability Damage:
              <span class="old-value">8/26%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">8/24%</strong>. Electric remains
              <strong>4/12/20%</strong>, but now scales as a true percentage. Overlapping traits now stack.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag mixed">Mixed</span>
              <h4>Augments</h4>
            </div>
            <p>
              Flat Gold:
              <span class="old-value">15/25/35</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">10/16/24</strong>. Gold per empty bench slot:
              <span class="old-value">3/5/8</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">1/2/3</strong>. Starting Mana:
              <span class="old-value">10/20/35</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">10/15/20</strong>. Ranged Attack Damage:
              <span class="old-value">7/12/18 One Piece, 5/8/12 Pokemon</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">9/15/24 One Piece, 7/11/16 Pokemon</strong>. Ability Damage remains
              <strong>10/18/30%</strong>. Team Attack Damage:
              <span class="old-value">6/10/16 One Piece, 4/7/10 Pokemon</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">8/14/22 One Piece, 6/10/15 Pokemon</strong>. Melee Lifesteal:
              <span class="old-value">10/16/24%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">12/20/30%</strong>. Mana Gain:
              <span class="old-value">12/20/30%</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">15/25/40%</strong>. Iron Line:
              <span class="old-value">5/8/12 unused Armor/MR</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value buff">8/14/22 DEF</strong>.
            </p>
          </div>
        </article>
      </section>

      <section class="release-section latest-release">
        <div class="release-header">
          <p class="eyebrow">Previous</p>
          <h2>Version 1.7.0</h2>
          <p>
            Gameplay analytics now persist anonymous match outcomes in SQLite, with a password-protected production
            dashboard and human-vs-bot results broken down by round. Matches now complete as soon as every human has
            been eliminated, rather than continuing with bots only. Active matches can also recover from a same-tab
            reconnect, return safely to the lobby after a game, and be explicitly abandoned from the in-game controls.
            Bot 3★ units now follow a cost-based round progression rather than appearing at any stage.
          </p>
        </div>
        <article class="release-panel">
          <ul class="commit-list">
            <li v-for="commit in version170Commits" :key="commit.hash">
              <span class="hash">{{ commit.hash }}</span>
              <span>{{ commit.title }}</span>
            </li>
          </ul>
        </article>
        <article class="release-panel">
          <div class="section-heading">
            <span class="marker balance"></span>
            <h3>Balance Changes</h3>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag nerf">Nerf</span>
              <h4>Bot 3★ Scaling</h4>
            </div>
            <p>
              3★ round gate for 1-4 cost units:
              <span class="old-value">no cost-based cap</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">1-cost: round 6, 2-cost: round 8, 3-cost: round 12, 4-cost: round 16</strong>.
              5-cost bots remain capped at 2★.
            </p>
          </div>
          <div class="balance-block">
            <div class="balance-title">
              <span class="tag nerf">Nerf</span>
              <h4>3★ Golem</h4>
            </div>
            <p>
              Health:
              <span class="old-value">2900</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">2600</strong>. Mana:
              <span class="old-value">45</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">55</strong>. Attack Damage:
              <span class="old-value">180</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">165</strong>. Stealth Rock damage:
              <span class="old-value">1000</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">800</strong>. Execute threshold and bonus damage:
              <span class="old-value">42% threshold, 55% bonus</span>
              <span class="change-arrow">&nbsp;=>&nbsp;</span>
              <strong class="value nerf">35% threshold, 40% bonus</strong>.
            </p>
          </div>
        </article>
      </section>

      <section class="release-section latest-release">
        <div class="release-header">
          <p class="eyebrow">Previous</p>
          <h2>Version 1.6.2</h2>
          <p>
            Frontend and backend dependencies have been refreshed for the current security baseline, including Vite 8,
            Spring Boot 4.1, Vue 3.5, and updated build tooling. One Piece and Pokemon unit balance has also been
            adjusted from same-star and randomized-star combat simulation results.
          </p>
        </div>

        <div class="release-grid latest-release-grid">
          <div class="release-sidebar">
            <article class="release-panel">
              <div class="section-heading">
                <span class="marker release"></span>
                <h3>Development</h3>
              </div>
              <ul class="commit-list">
                <li v-for="commit in version162Commits" :key="commit.hash">
                  <span class="hash">{{ commit.hash }}</span>
                  <span>{{ commit.title }}</span>
                </li>
              </ul>
            </article>

            <aside class="simulation-note">
              <div class="section-heading compact-heading">
                <span class="marker release"></span>
                <h3>Simulation</h3>
              </div>
              <p>
                Balance tooling now supports deterministic tick-based reports, randomized-star and randomized-board
                modes, board-size rankings, trait impact tables, coverage diagnostics, and parallel workers.
              </p>
            </aside>
          </div>

          <article class="balance-panel">
            <div class="section-heading">
              <span class="marker balance"></span>
              <h3>Balance Changes</h3>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Pokemon Bots</h4>
              </div>
              <p>
                Round 8-9 active units:
                <span class="old-value">6</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">5</strong>. Round 10-15 active units:
                <span class="old-value">7</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">6</strong>. One Piece bot unit counts are unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Monkey D. Luffy</h4>
              </div>
              <p>
                Gum Gum Pistol damage:
                <span class="old-value">200/450/1000</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">175/400/1000</strong>. The 3★ value is unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Sanji</h4>
              </div>
              <p>
                Diable Jambe attack speed:
                <span class="old-value">30/50/80%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">25/45/75%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Boa Hancock</h4>
              </div>
              <p>
                Slave Arrow range:
                <span class="old-value">3/3/3</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">4/4/4</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Tony Tony Chopper</h4>
              </div>
              <p>
                Emergency Treatment healing:
                <span class="old-value">150/300/600</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">300/600/1200</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Ivankov</h4>
              </div>
              <p>
                Emporio Healing Hormone healing:
                <span class="old-value">250/450/810</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">350/630/1134</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Marco</h4>
              </div>
              <p>
                Phoenix Flames healing:
                <span class="old-value">350/630/1134</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">450/810/1458</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Sengoku</h4>
              </div>
              <p>
                Buddha Palm attack:
                <span class="old-value">40/60/85%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">45/70/100%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Charlotte Katakuri</h4>
              </div>
              <p>
                Mochi Thrust damage:
                <span class="old-value">700/1260/2268</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">800/1440/2592</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Zapdos</h4>
              </div>
              <p>
                Mana:
                <span class="old-value">85</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">95</strong>. Thunderstorm damage:
                <span class="old-value">200/455/945</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">150/340/700</strong>. Range:
                <span class="old-value">3/4/4</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">3/3/4</strong>. Stun:
                <span class="old-value">1/2/2s</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">1/1/1s</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Moltres</h4>
              </div>
              <p>
                Inferno Wing damage:
                <span class="old-value">200/455/945</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">190/430/900</strong>. Burn per tick:
                <span class="old-value">42/90/180</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">40/85/170</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>3★ Raichu</h4>
              </div>
              <p>
                Thunder damage:
                <span class="old-value">699</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">620</strong>. Stun:
                <span class="old-value">2s</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">1s</strong>. Pikachu and 2★ Raichu are unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Bulbasaur Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">532/958/1723</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">600/1080/1945</strong>. Mana:
                <span class="old-value">55</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">45</strong>. Attack Damage:
                <span class="old-value">47/84/151</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">52/94/170</strong>. Attack Speed:
                <span class="old-value">0.62</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.68</strong>. Vine Whip:
                <span class="old-value">143/322/692</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">180/405/870</strong>. 2★ Razor Leaf:
                <span class="old-value">287 damage + 38 poison</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">360 damage + 50 poison</strong>. 3★ Grassy Terrain:
                <span class="old-value">710 healing at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1000 healing at 4 range</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Weedle Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">428/770/1385</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">470/850/1530</strong>. Mana:
                <span class="old-value">55</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">50</strong>. Attack Damage:
                <span class="old-value">50/90/163</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">54/98/176</strong>. 1★ Poison Sting:
                <span class="old-value">173 damage + 20 poison</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">195 damage + 24 poison</strong>. 2★ Iron Defense:
                <span class="old-value">350 shield</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">400 shield</strong>. 3★ Fell Stinger:
                <span class="old-value">832 damage, 35% threshold, 50% bonus</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">945 damage, 40% threshold, 60% bonus</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Rattata Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">450/810/1458</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">485/875/1575</strong>. Mana:
                <span class="old-value">55</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">50</strong>. Attack Damage:
                <span class="old-value">53/95/172</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">57/103/185</strong>. Ability damage:
                <span class="old-value">173/387/832</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">195/440/945</strong>. Quick Attack execute bonus:
                <span class="old-value">20/28/40%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">24/34/48%</strong>. 3★ Super Fang max-health scaling:
                <span class="old-value">5%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">6%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Nidoran Lines</h4>
              </div>
              <p>
                Nidoran-F Health:
                <span class="old-value">700/1260/2155</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">700/1325/2600</strong>. Attack Damage:
                <span class="old-value">37/67/114</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">37/70/140</strong>. 2★ Toxic Spikes:
                <span class="old-value">287 damage + 40 poison</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">320 damage + 46 poison</strong>. 3★ Earth Power:
                <span class="old-value">617 damage at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">850 damage at 4 range</strong>. Nidoran-M Health:
                <span class="old-value">540/972/1662</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">540/1020/2100</strong>. Attack Damage:
                <span class="old-value">57/103/176</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">57/108/220</strong>. 2★ Poison Jab:
                <span class="old-value">387 damage + 50 poison</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">430 damage + 56 poison</strong>. 3★ Megahorn:
                <span class="old-value">692 damage, 35% threshold, 50% bonus</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">950 damage, 45% threshold, 70% bonus</strong>. Both lines' Mana:
                <span class="old-value">55/55/55</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">55/50/45</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag mixed">Mixed</span>
                <h4>Oddish Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">461/829/1492</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">550/990/1700</strong>. Mana:
                <span class="old-value">75/75/75</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">60/60/65</strong>. Attack Damage:
                <span class="old-value">35/64/114</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">42/76/137</strong>. Attack Speed:
                <span class="old-value">0.62</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.70</strong>. Absorb:
                <span class="old-value">173/387/832 damage, 30/38/48% healing</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">220/495/1060 damage, 40/50/65% healing</strong>. 2★ Stun Spore:
                <span class="old-value">1s at 2 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2s at 3 range</strong>. 3★ Petal Dance:
                <span class="old-value">617 damage + 92 poison at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">800 damage + 120 poison at 4 range</strong>. Follow-up 3★ tuning:
                <span class="old-value">1785 health, 60 mana, 850 damage + 130 poison</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">1700 health, 65 mana, 800 damage + 120 poison</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Poliwag Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">450/810/1385</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">485/875/1500</strong>. Mana:
                <span class="old-value">55</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">50</strong>. Attack Damage:
                <span class="old-value">53/95/163</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">57/103/180</strong>. Bubble Beam:
                <span class="old-value">143/322/692</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">160/365/800</strong>. 2★ Hypnosis:
                <span class="old-value">1s</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2s</strong>. 3★ Dynamic Punch:
                <span class="old-value">832</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">950</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>3★ Butterfree</h4>
              </div>
              <p>
                Health:
                <span class="old-value">1755</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2200</strong>. Mana:
                <span class="old-value">75</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">60</strong>. Attack Damage:
                <span class="old-value">107</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">140</strong>. Attack Speed:
                <span class="old-value">0.62</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.75</strong>. Sleep Powder stun:
                <span class="old-value">2s at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">3s at 4 range</strong>. Caterpie and Metapod remain unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Vulpix Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">595/1071/1928</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">625/1125/2350</strong>. Mana:
                <span class="old-value">80/80/80</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">65/65/50</strong>. Attack Damage:
                <span class="old-value">48/86/156</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">48/86/185</strong>. Attack Speed:
                <span class="old-value">0.65</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.70/0.70/0.78</strong>. Will-O-Wisp damage:
                <span class="old-value">146/329/699</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">175/395/840</strong>. 2★ Fire Spin:
                <span class="old-value">329 damage + 60 burn at 2 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">460 damage + 90 burn at 3 range</strong>. Mystical Fire damage:
                <span class="old-value">161/364/774</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">200/450/1200</strong>. 3★ Mystical Fire burn:
                <span class="old-value">122</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">190</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Jigglypuff Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">680/1224/2203</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">680/1450/2600</strong>. Mana:
                <span class="old-value">80/80/80</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">70/55/55</strong>. Attack Damage:
                <span class="old-value">46/83/149</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">46/83/180</strong>. Attack Speed:
                <span class="old-value">0.65</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.70/0.75/0.75</strong>. 2★ Helping Hand:
                <span class="old-value">24% at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">45% at 4 range</strong>. 3★ Play Rough damage:
                <span class="old-value">914</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1300</strong>. 3★ Play Rough stun:
                <span class="old-value">2s</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">3s</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Doduo Line</h4>
              </div>
              <p>
                Mana:
                <span class="old-value">70</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">60</strong>. Attack Damage:
                <span class="old-value">74/133/240</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">78/140/252</strong>. Double Hit:
                <span class="old-value">209/471/996</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">230/520/1100</strong>. Tri Attack:
                <span class="old-value">179/406/856</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">200/460/1000</strong>. 3★ Agility:
                <span class="old-value">40%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">50%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Ponyta Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">560/1008/1814</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">590/1100/2200</strong>. Mana:
                <span class="old-value">60/60/60</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">55/55/50</strong>. Attack Damage:
                <span class="old-value">64/115/207</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">68/122/235</strong>. Flame Charge:
                <span class="old-value">16/24/36%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">18/28/45%</strong>. 2★ Fire Spin:
                <span class="old-value">329 damage + 60 burn</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">400 damage + 75 burn</strong>. 3★ Megahorn:
                <span class="old-value">774 damage, 35% threshold, 50% bonus</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1050 damage, 45% threshold, 70% bonus</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Magnemite Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">565/1017/1832</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">565/1125/2200</strong>. Mana:
                <span class="old-value">80/80/80</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">80/65/60</strong>. Attack Speed:
                <span class="old-value">0.65/0.65/0.65</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.65/0.70/0.75</strong>. 2★ Tri Attack:
                <span class="old-value">364 damage + 46 burn</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">430 damage + 58 burn</strong>. 3★ Magnetic Field:
                <span class="old-value">874 shield at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1150 shield at 4 range</strong>. 1★ Magnemite is unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Growlithe Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">650/1170/2106</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">650/1300/2500</strong>. Mana:
                <span class="old-value">60/60/60</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">60/50/45</strong>. Attack Damage:
                <span class="old-value">68/122/220</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">68/135/260</strong>. Attack Speed:
                <span class="old-value">0.67/0.67/0.67</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.67/0.72/0.78</strong>. 2★ Extreme Speed:
                <span class="old-value">364 damage, 32% threshold, 30% bonus</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">500 damage, 38% threshold, 45% bonus</strong>. 3★ Flare Blitz:
                <span class="old-value">774 damage + 130 burn for 4s at 5 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1100 damage + 180 burn for 5s at 6 range</strong>. 1★ Growlithe is unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>3★ Cloyster</h4>
              </div>
              <p>
                Health:
                <span class="old-value">2954</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">3300</strong>. Mana:
                <span class="old-value">70</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">55</strong>. Attack Damage:
                <span class="old-value">191</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">220</strong>. Shell Smash:
                <span class="old-value">40% at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">55% at 4 range</strong>. Shellder and 2★ Cloyster are unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>3★ Charizard</h4>
              </div>
              <p>
                Health:
                <span class="old-value">1785</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2200</strong>. Mana:
                <span class="old-value">55</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">45</strong>. Attack Damage:
                <span class="old-value">188</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">225</strong>. Attack Speed:
                <span class="old-value">0.64</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.72</strong>. Flamethrower:
                <span class="old-value">692 damage + 118 burn at 5 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1000 damage + 160 burn at 6 range</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>3★ Crobat</h4>
              </div>
              <p>
                Health:
                <span class="old-value">1723</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2100</strong>. Mana:
                <span class="old-value">60</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">50</strong>. Attack Damage:
                <span class="old-value">197</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">230</strong>. Attack Speed:
                <span class="old-value">0.79</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.85</strong>. Cross Poison:
                <span class="old-value">774 damage + 128 poison, 35% threshold, 50% bonus</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1050 damage + 160 poison, 42% threshold, 65% bonus</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Geodude Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">770/1385/2493</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">770/1500/2900</strong>. Mana:
                <span class="old-value">60/60/60</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">60/50/45</strong>. Attack Damage:
                <span class="old-value">46/82/148</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">46/90/180</strong>. Attack Speed:
                <span class="old-value">0.62/0.62/0.62</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.62/0.66/0.70</strong>. 2★ Rollout:
                <span class="old-value">364 damage, 1-cell knockback at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">450 damage, 2-cell knockback at 4 range</strong>. 3★ Stealth Rock:
                <span class="old-value">699 damage, 35% threshold, 40% bonus at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1000 damage, 42% threshold, 55% bonus at 4 range</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>3★ Victreebel</h4>
              </div>
              <p>
                Health:
                <span class="old-value">2293</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2800</strong>. Mana:
                <span class="old-value">90</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">65</strong>. Attack Damage:
                <span class="old-value">191</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">230</strong>. Attack Speed:
                <span class="old-value">0.68</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.75</strong>. Power Whip:
                <span class="old-value">996 damage, 45% threshold, 58% bonus at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1350 damage, 50% threshold, 75% bonus at 4 range</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Gastly Line</h4>
              </div>
              <p>
                Health:
                <span class="old-value">708/1274/2293</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">708/1350/2800</strong>. Mana:
                <span class="old-value">90/90/90</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">90/80/65</strong>. Attack Damage:
                <span class="old-value">59/106/191</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">59/112/230</strong>. Attack Speed:
                <span class="old-value">0.68/0.68/0.68</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.68/0.68/0.75</strong>. 2★ Nightmare range:
                <span class="old-value">3</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">4</strong>. 3★ Dream Eater:
                <span class="old-value">996 damage, 1s stun, 60% healing at 4 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1350 damage, 2s stun, 75% healing at 5 range</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>3★ Dewgong</h4>
              </div>
              <p>
                Mana:
                <span class="old-value">90</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">70</strong>. Perish Song stun:
                <span class="old-value">2s at 3 range</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">3s at 4 range</strong>. Seel and 2★ Dewgong are unchanged.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Porygon</h4>
              </div>
              <p>
                Mana:
                <span class="old-value">95</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">75</strong>. Conversion Attack Speed:
                <span class="old-value">20/30/44%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">22/34/50%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Ditto</h4>
              </div>
              <p>
                Mana:
                <span class="old-value">95</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">75</strong>. Transform Attack Damage:
                <span class="old-value">20/30/44%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">24/36/52%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Lickitung</h4>
              </div>
              <p>
                Health:
                <span class="old-value">1160/2088/3758</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1220/2196/3953</strong>. Mana:
                <span class="old-value">75</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">60</strong>. Wrap stun:
                <span class="old-value">1/2/2s</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2/2/3s</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Snorlax</h4>
              </div>
              <p>
                Health:
                <span class="old-value">1430/2574/4633</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">1500/2700/4860</strong>. Mana:
                <span class="old-value">85</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">75</strong>. Heavy Slam damage:
                <span class="old-value">200/455/945</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">240/545/1135</strong>. Range:
                <span class="old-value">1/2/2</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">2/2/3</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Aerodactyl</h4>
              </div>
              <p>
                Mana:
                <span class="old-value">85</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">75</strong>. Stone Edge damage:
                <span class="old-value">215/490/1020</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">250/565/1175</strong>. Execute threshold:
                <span class="old-value">28/35/45%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">30/38/48%</strong>. Execute bonus:
                <span class="old-value">35/50/75%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">40/60/90%</strong>.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="release-section">
        <div class="release-header">
          <p class="eyebrow">Previous</p>
          <h2>Version 1.6.1</h2>
          <p>
            Bot opponents now scale more deliberately, completed 3-star character lines stop appearing in shops and unit
            loot, and augment rewards have a tighter combat-versus-economy balance.
          </p>
        </div>

        <div class="release-grid">
          <article class="release-panel">
            <div class="section-heading">
              <span class="marker release"></span>
              <h3>Development</h3>
            </div>
            <ul class="commit-list">
              <li v-for="commit in version161Commits" :key="commit.hash">
                <span class="hash">{{ commit.hash }}</span>
                <span>{{ commit.title }}</span>
              </li>
            </ul>
          </article>

          <article class="balance-panel">
            <div class="section-heading">
              <span class="marker balance"></span>
              <h3>Balance Changes</h3>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag mixed">Mixed</span>
                <h4>Augments</h4>
              </div>
              <p>
                Flat gold:
                <span class="old-value">20/35/50 gold</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">15/25/35 gold</strong>. On-kill team Attack Damage:
                <span class="old-value">5/8/12</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">6/10/15</strong>. Melee Lifesteal:
                <span class="old-value">8/12/18%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">10/16/24%</strong>. Starting Shield:
                <span class="old-value">100/180/300</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">125/225/375</strong>. Ability Power now increases damaging ability output by
                <strong class="value buff">10/18/30%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Bot Opponents</h4>
              </div>
              <p>
                Overall bot power level:
                <span class="old-value">too low</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">greatly improved</strong>, with more pressure from early upgraded boards and
                stronger late-game threats.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="release-section">
        <div class="release-header">
          <p class="eyebrow">Previous</p>
          <h2>Version 1.6.0</h2>
          <p>
            Combat reliability fixes, lobby safeguards, drag polish, mana flow, and Pokemon plus One Piece balance
            passes.
          </p>
        </div>

        <div class="release-grid">
          <article class="release-panel">
            <div class="section-heading">
              <span class="marker release"></span>
              <h3>Development</h3>
            </div>
            <ul class="commit-list">
              <li v-for="commit in version160Commits" :key="commit.hash">
                <span class="hash">{{ commit.hash }}</span>
                <span>{{ commit.title }}</span>
              </li>
            </ul>
          </article>

          <article class="balance-panel">
            <div class="section-heading">
              <span class="marker balance"></span>
              <h3>Balance Changes</h3>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Mana</h4>
              </div>
              <p>
                Defender mana on direct attacks and damage abilities:
                <span class="old-value">0%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">5%</strong> max mana.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Straw Hat</h4>
              </div>
              <p>
                Health:
                <span class="old-value">200/400/700/1000</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">150/300/500/750</strong>. Attack speed:
                <span class="old-value">10/25/50/75%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">6/14/28/42%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Jinbei</h4>
              </div>
              <p>
                Health:
                <span class="old-value">1050/1890/3402</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">950/1710/3078</strong>. Mana:
                <span class="old-value">65</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">75</strong>. Armor:
                <span class="old-value">40</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">35</strong>. Vagabond Drill:
                <span class="old-value">500/900/1620</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">420/760/1368</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Boa Hancock</h4>
              </div>
              <p>
                Slave Arrow stun:
                <span class="old-value">3/4/5s</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">1/1/2s</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Garp</h4>
              </div>
              <p>
                Mana:
                <span class="old-value">60</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">55</strong>. Fist of Love:
                <span class="old-value">600/1080/1944</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">700/1260/2268</strong>. Missing HP scaling:
                <span class="old-value">0.5/0.75/1.0</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">0.6/0.85/1.1</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>One Piece Augments</h4>
              </div>
              <p>
                Battle Standard:
                <span class="old-value">120/220/360</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">150/275/450</strong>. Sharpened Blades:
                <span class="old-value">4/7/10</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">6/10/16</strong>. Iron Line:
                <span class="old-value">8/14/24</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">10/18/30</strong>. Backline Barrage:
                <span class="old-value">5/8/12</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">7/12/18</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Normal</h4>
              </div>
              <p>
                Team attack bonus:
                <span class="old-value">3/10/16/24%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">1/5/10/16%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Flying</h4>
              </div>
              <p>
                Low-health attack speed:
                <span class="old-value">8/24/40/60%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">4/12/24/36%</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag buff">Buff</span>
                <h4>Poison</h4>
              </div>
              <p>
                Duration:
                <span class="old-value">2s</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">3s</strong>. Damage per tick:
                <span class="old-value">2/7/12/18%</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">3/7/11/16%</strong> attack damage.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag nerf">Nerf</span>
                <h4>Raichu</h4>
              </div>
              <p>
                Thunder target count:
                <span class="old-value">uncapped</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">3 targets</strong>. 3-star stun remains
                <strong class="value buff">2s</strong>.
              </p>
            </div>

            <div class="balance-block">
              <div class="balance-title">
                <span class="tag mixed">Economy</span>
                <h4>Augments</h4>
              </div>
              <p>
                Flat gold:
                <span class="old-value">30/45/70</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value nerf">20/35/50</strong>. Empty bench gold:
                <span class="old-value">2/3/5</span>
                <span class="change-arrow">&nbsp;=>&nbsp;</span>
                <strong class="value buff">3/5/8</strong> per slot.
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.changelog-page {
    position: relative;
    height: 100vh;
    overflow-y: auto;
    padding: 36px clamp(18px, 5vw, 72px) 56px;
    color: #f8fafc;
    background:
        linear-gradient(135deg, rgba(14, 165, 233, 0.14), transparent 34%),
        radial-gradient(circle at 92% 14%, rgba(244, 114, 182, 0.16), transparent 28%),
        #0b1120;
}

.back-button {
    position: sticky;
    top: 0;
    z-index: 2;
    margin-bottom: 18px;
    padding: 10px 14px;
    border: 1px solid rgba(148, 163, 184, 0.34);
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.86);
    color: #e2e8f0;
    font-weight: 800;
    cursor: pointer;
}

.eyebrow {
    margin: 0 0 8px;
    color: #38bdf8;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
}

.release-history {
    display: grid;
    gap: 42px;
}

.release-section {
    max-width: 1180px;
    margin: 0 auto;
}

.latest-release {
    max-width: 1400px;
}

.release-header {
    margin-bottom: 18px;
}

.release-header h2 {
    margin: 0;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1;
}

.release-header p:last-child {
    max-width: 720px;
    margin: 12px 0 0;
    color: #cbd5e1;
    font-size: 17px;
}

.release-grid {
    display: grid;
    grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.3fr);
    gap: 22px;
    margin: 0;
}

.latest-release-grid {
    grid-template-columns: minmax(280px, 340px) minmax(620px, 1fr);
    align-items: start;
}

.release-sidebar {
    display: grid;
    gap: 16px;
}

.release-panel,
.balance-panel,
.simulation-note {
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.72);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
}

.release-panel {
    padding: 24px;
}

.balance-panel {
    padding: 24px;
}

.simulation-note {
    padding: 16px;
    background: rgba(15, 23, 42, 0.54);
}

.simulation-note p {
    margin: 0;
    color: #cbd5e1;
    font-size: 14px;
    line-height: 1.5;
}

.section-heading,
.balance-title {
    display: flex;
    align-items: center;
    gap: 10px;
}

.section-heading {
    margin-bottom: 18px;
}

.compact-heading {
    margin-bottom: 10px;
}

.section-heading h3,
.balance-title h4 {
    margin: 0;
}

.section-heading h3 {
    font-size: 22px;
}

.compact-heading h3 {
    font-size: 16px;
}

.balance-title h4 {
    font-size: 18px;
}

.marker {
    width: 10px;
    height: 28px;
    border-radius: 6px;
}

.marker.release {
    background: #38bdf8;
}

.marker.balance {
    background: #f59e0b;
}

.commit-list {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.commit-list li {
    display: grid;
    grid-template-columns: 76px 1fr;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 6px;
    background: rgba(30, 41, 59, 0.62);
}

.hash {
    color: #67e8f9;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    font-weight: 900;
}

.balance-block {
    padding: 16px 0;
    border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.balance-block:first-of-type {
    border-top: 0;
    padding-top: 0;
}

.balance-block p {
    margin: 8px 0 0;
    color: #dbeafe;
    font-size: 16px;
}

.tag {
    min-width: 68px;
    padding: 4px 8px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
}

.tag.nerf,
.value.nerf {
    color: #fca5a5;
}

.tag.nerf {
    background: rgba(239, 68, 68, 0.18);
}

.tag.buff,
.value.buff {
    color: #86efac;
}

.tag.buff {
    background: rgba(34, 197, 94, 0.18);
}

.tag.mixed {
    color: #fde68a;
    background: rgba(245, 158, 11, 0.18);
}

.value {
    font-weight: 900;
}

.character-name {
    display: inline-block;
    min-width: 112px;
    color: #f8fafc;
    font-weight: 900;
}

.old-value {
    display: inline-block;
    margin: 0 4px;
    color: #cbd5e1;
    font-weight: 900;
    text-decoration-line: line-through;
    text-decoration-thickness: 2px;
    text-decoration-color: rgba(203, 213, 225, 0.74);
}

.change-arrow {
    margin: 0 4px;
    color: #64748b;
    font-size: 13px;
    font-weight: 900;
}

@media (max-width: 820px) {
    .release-grid {
        grid-template-columns: 1fr;
    }

    .latest-release-grid {
        grid-template-columns: 1fr;
    }

    .commit-list li {
        grid-template-columns: 1fr;
    }
}
</style>
