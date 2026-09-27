<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import CombatEffectsCanvas from './CombatEffectsCanvas.vue'
import { getGalleryAbilityRoster, getGalleryAttackRoster } from '../../animations/galleryRegistry'
import { getAnimationRenderPolicy, getAttackParticleBudget } from '../../animations/renderPolicy'
import { getGalleryEntryKey, type GalleryGameMode, type UltimateGalleryUnit } from '../../data/ultimateGalleryRoster'
import { getAbilityConfig, getAttackConfig } from '../../data/animationConfig'
import type { AbilityDefinition, CombatEvent, RenderedUnit } from '../../types'
import type { NormalizedCombatVisualEvent } from '../../types/combatEffects'
import { getUnitIconPath } from '../../utils/iconUtils'
import { getGameModeMetadata } from '../../data/gameModeMetadata'
import onePieceUnits from '../../../../backend/src/main/resources/data/units_onepiece.json'
import pokemonUnits from '../../../../backend/src/main/resources/data/units_pokemon.json'

const CombatView3d = defineAsyncComponent(() => import('../../combat3d/CombatView3d.vue'))

interface RawRangeUnit {
    id: string
    range: number[]
    forms?: { definitionId: string }[]
}

// Real attack ranges, so the 3D lab shows melee units next to their target and ranged units casting from afar.
const UNIT_RANGES = new Map<string, number>(
    [...onePieceUnits, ...pokemonUnits].flatMap((unit: RawRangeUnit) => [
        [unit.id, unit.range[0]] as const,
        ...(unit.forms ?? []).map((form) => [form.definitionId, unit.range[0]] as const)
    ])
)

const GRID_COLS = 9
const GRID_ROWS = 6
const CELL_SIZE = 78

const props = defineProps<{
    mode?: GalleryGameMode
}>()

const galleryMode = computed<GalleryGameMode>(() => props.mode ?? 'onepiece')
const starLevel = ref(3)
const autoReplay = ref(true)
const previewType = ref<'ultimate' | 'attack'>('ultimate')
const events = ref<NormalizedCombatVisualEvent[]>([])
const renderView = ref<'2d' | '3d'>('2d')
const combatEvents3d = ref<CombatEvent[]>([])
const arenaOptions = computed(() => getGameModeMetadata(galleryMode.value).arenas)
const selectedArena = ref(arenaOptions.value[0])
const view3dKey = computed(() => `${selectedKey.value}-${starLevel.value}-${selectedArena.value}`)
let combatClock = 0

const roster = computed(() => previewType.value === 'attack'
    ? getGalleryAttackRoster(galleryMode.value)
    : getGalleryAbilityRoster(galleryMode.value))
const defaultSelectedKey = computed(() => galleryKey(roster.value.find(unit => unit.id === (galleryMode.value === 'pokemon' ? 'pikachu' : 'whitebeard_v1')) ?? roster.value[0]))
const selectedKey = ref(defaultSelectedKey.value)

let nextEventId = 1
let replayTimer: number | null = null

const selectedUnit = computed(() => roster.value.find(unit => galleryKey(unit) === selectedKey.value) ?? roster.value[0])
const selectedAbilityConfig = computed(() => resolveAbilityConfig(selectedUnit.value))
const selectedTargetIsAlly = computed(() => isSupportAbility(selectedUnit.value.abilityType))
const pageTitle = computed(() => galleryMode.value === 'pokemon' ? 'Pokemon Animation Lab' : 'Ultimate Gallery')
const modeLabel = computed(() => galleryMode.value === 'pokemon' ? 'Pokemon' : 'One Piece')

const sourceUnit = computed(() => createRenderedUnit(selectedUnit.value, 'gallery-source', 2, 4, 'PLAYER', true))
const enemyUnit = computed(() => createRenderedUnit(createDummyUnit('Training Target', galleryMode.value === 'pokemon' ? 'snorlax' : 'kaido_v1', 3), 'gallery-target', 6, 1, 'ENEMY', false))
const allyUnit = computed(() => createRenderedUnit(createDummyUnit('Ally Preview', galleryMode.value === 'pokemon' ? 'bulbasaur' : 'luffy_v1', 3), 'gallery-ally', 5, 4, 'PLAYER', true))
const targetUnit = computed(() => selectedTargetIsAlly.value ? allyUnit.value : enemyUnit.value)
const renderedUnits = computed(() => selectedTargetIsAlly.value
    ? [sourceUnit.value, allyUnit.value]
    : [sourceUnit.value, enemyUnit.value]
)

// The 3D lab adds bystanders so area, chain, and team-wide ultimates have more than one unit to hit.
const renderedUnits3d = computed(() => {
    const dummyIds = galleryMode.value === 'pokemon' ? ['geodude', 'rattata', 'squirtle'] : ['gifter_v1', 'chess_soldiers_v1', 'koby_v1']
    const source = sourceUnit.value
    const target = targetUnit.value
    const melee = source.range <= 1 && target.ownerId !== source.ownerId
    return [
        source,
        melee ? { ...target, x: source.x + 1, y: source.y - 1, visualX: source.x + 1, visualY: source.y - 1 } : target,
        createRenderedUnit(createDummyUnit('Bystander', dummyIds[0], 1), 'gallery-extra-enemy-1', 5, 0, 'ENEMY', false),
        createRenderedUnit(createDummyUnit('Bystander', dummyIds[1], 1), 'gallery-extra-enemy-2', 7, 2, 'ENEMY', false),
        ...(selectedTargetIsAlly.value
            ? [createRenderedUnit(createDummyUnit('Training Target', galleryMode.value === 'pokemon' ? 'snorlax' : 'kaido_v1', 3), 'gallery-target', 6, 1, 'ENEMY', false)]
            : [createRenderedUnit(createDummyUnit('Ally Preview', dummyIds[2], 1), 'gallery-extra-ally', 3, 5, 'PLAYER', true)])
    ]
})

const filteredRoster = computed(() => roster.value)

function galleryKey(unit: UltimateGalleryUnit | undefined) {
    return unit ? getGalleryEntryKey(unit) : ''
}

function resolveAbilityConfig(unit: UltimateGalleryUnit) {
    return getAbilityConfig(unit.id)
}

function resolveAttackConfig(unit: UltimateGalleryUnit) {
    return getAttackConfig(unit.id)
}

function createDummyUnit(name: string, id: string, cost: number): UltimateGalleryUnit {
    return {
        id,
        name,
        cost,
        abilityType: 'DAMAGE',
        pattern: 'SINGLE',
        abilityName: 'Preview'
    }
}

function createRenderedUnit(unit: UltimateGalleryUnit, instanceId: string, x: number, y: number, ownerId: string, isMine: boolean): RenderedUnit {
    const ability: AbilityDefinition = {
        name: unit.abilityName,
        description: '',
        type: unit.abilityType,
        pattern: unit.pattern,
        range: [1, 2, 3],
        values: unit.abilityType === 'HEAL' ? [-80, -140, -220] : [120, 190, 300]
    }
    if (unit.abilityAnimationKey) {
        ability.key = unit.abilityAnimationKey
        ability.animationKey = unit.abilityAnimationKey
    }
    if (unit.element) ability.element = unit.element

    return {
        id: instanceId,
        definitionId: unit.id,
        lineId: unit.id,
        name: unit.name,
        cost: unit.cost,
        role: 'DAMAGE',
        maxHealth: 1000,
        currentHealth: 1000,
        shield: 0,
        mana: 100,
        maxMana: 100,
        attackDamage: 70,
        abilityPower: 100,
        defense: 30,
        attackSpeed: 0.8,
        range: UNIT_RANGES.get(unit.id) ?? 1,
        traits: unit.traits ?? [],
        items: [],
        x,
        y,
        visualX: x,
        visualY: y,
        starLevel: starLevel.value,
        ownerId,
        ability,
        activeAbility: null,
        stunSecondsRemaining: 0,
        atkBuff: unit.abilityType === 'BUFF_ATK' ? 1.2 : 1,
        spdBuff: unit.abilityType === 'BUFF_SPD' ? 1.2 : 1,
        isMine,
        image: getUnitIconPath(unit.id, galleryMode.value)
    }
}

function pointFor(unit: RenderedUnit) {
    return {
        x: unit.visualX * CELL_SIZE + CELL_SIZE / 2,
        y: unit.visualY * CELL_SIZE + CELL_SIZE / 2
    }
}

function isSupportAbility(type: string) {
    return type === 'HEAL' || type === 'SHIELD' || type.startsWith('BUFF')
}

function replayUltimate() {
    const source = sourceUnit.value
    const target = targetUnit.value
    const abilityConfig = resolveAbilityConfig(selectedUnit.value)
    const attackConfig = resolveAttackConfig(selectedUnit.value)
    const abilityRenderPolicy = getAnimationRenderPolicy(abilityConfig)
    const value = source.ability?.type === 'HEAL' ? -180 : (isSupportAbility(source.ability?.type ?? '') ? 0 : 240)
    const isUltimate = previewType.value === 'ultimate'

    combatClock += 100
    combatEvents3d.value = [
        ...combatEvents3d.value.slice(-4),
        {
            timestamp: combatClock,
            type: isUltimate ? (source.ability?.type === 'HEAL' ? 'HEAL' : 'SKILL') : 'DAMAGE',
            sourceId: source.id,
            targetId: target.id,
            value: isUltimate ? Math.abs(value) : 80,
            skillName: isUltimate ? abilityConfig.signature ?? source.ability?.name : undefined,
        },
    ]

    events.value = [
        ...events.value.slice(-4),
        {
            id: nextEventId++,
            timestamp: performance.now(),
            type: isUltimate ? 'SKILL' : 'DAMAGE',
            sourceId: source.id,
            targetId: target.id,
            value: isUltimate ? value : 80,
            skillName: isUltimate ? abilityConfig.signature ?? source.ability?.name : undefined,
            source,
            target,
            start: pointFor(source),
            end: pointFor(target),
            definitionId: source.definitionId,
            attack: {
                ...attackConfig,
                particles: getAttackParticleBudget(attackConfig)
            },
            ability: {
                ...abilityConfig,
                particleScale: abilityRenderPolicy.particleScale,
                screenShake: abilityRenderPolicy.screenShake,
                durationScale: abilityRenderPolicy.durationScale
            },
            pattern: source.ability?.pattern ?? 'SINGLE',
            starLevel: starLevel.value,
            intensity: isUltimate ? 'ultimate' : 'normal',
            batchSize: 1,
            crowded: false
        }
    ]
}

function selectUnit(unit: UltimateGalleryUnit) {
    selectedKey.value = galleryKey(unit)
    window.setTimeout(replayUltimate, 80)
}

function scheduleReplay() {
    if (replayTimer !== null) {
        window.clearInterval(replayTimer)
        replayTimer = null
    }
    if (autoReplay.value) {
        replayTimer = window.setInterval(replayUltimate, 2200)
    }
}

watch([selectedKey, starLevel, galleryMode, previewType], () => {
    if (!roster.value.some(unit => galleryKey(unit) === selectedKey.value)) {
        selectedKey.value = defaultSelectedKey.value
        return
    }
    window.setTimeout(replayUltimate, 80)
})

watch(autoReplay, scheduleReplay)

watch(arenaOptions, (options) => {
    selectedArena.value = options[0]
})

watch(pageTitle, (title) => {
    document.title = title
})

onMounted(() => {
    document.title = pageTitle.value
    replayUltimate()
    scheduleReplay()
})

onUnmounted(() => {
    if (replayTimer !== null) window.clearInterval(replayTimer)
})
</script>

<template>
  <main class="ultimate-gallery" :class="`mode-${galleryMode}`">
    <section class="gallery-preview">
      <div class="preview-header">
        <div>
          <a href="#" class="back-link">Back to game</a>
          <h1>{{ pageTitle }}</h1>
          <p>{{ modeLabel }} · {{ selectedUnit.name }} · {{ selectedAbilityConfig.signature || selectedUnit.abilityName }}</p>
        </div>
        <div class="preview-controls">
          <button
            v-for="level in [1, 2, 3]"
            :key="level"
            class="star-button"
            :class="{ active: starLevel === level }"
            type="button"
            @click="starLevel = level"
          >
            {{ level }} Star
          </button>
          <div class="segmented-control" aria-label="Animation type">
            <button
              type="button"
              :class="{ active: previewType === 'ultimate' }"
              @click="previewType = 'ultimate'"
            >
              Ultimate
            </button>
            <button
              type="button"
              :class="{ active: previewType === 'attack' }"
              @click="previewType = 'attack'"
            >
              Auto
            </button>
          </div>
          <div class="segmented-control" aria-label="Render view">
            <button type="button" :class="{ active: renderView === '2d' }" @click="renderView = '2d'">2D</button>
            <button type="button" :class="{ active: renderView === '3d' }" @click="renderView = '3d'">3D</button>
          </div>
          <select v-if="renderView === '3d'" v-model="selectedArena" class="arena-select" aria-label="Arena">
            <option v-for="arena in arenaOptions" :key="arena" :value="arena">{{ arena }}</option>
          </select>
          <button type="button" class="replay-button" @click="replayUltimate">Replay</button>
          <label class="auto-toggle">
            <input v-model="autoReplay" type="checkbox">
            Auto
          </label>
        </div>
      </div>

      <div class="board-shell">
        <div
          v-if="renderView === '3d'"
          class="gallery-board-3d"
          :style="{ width: `${GRID_COLS * CELL_SIZE}px`, height: `${GRID_ROWS * CELL_SIZE}px` }"
        >
          <CombatView3d
            :key="view3dKey"
            :units="renderedUnits3d"
            :events="combatEvents3d"
            :arena-id="selectedArena"
            @fallback="renderView = '2d'"
          />
        </div>
        <div
          v-else
            class="gallery-board"
          :style="{ width: `${GRID_COLS * CELL_SIZE}px`, height: `${GRID_ROWS * CELL_SIZE}px` }"
        >
          <div
            v-for="index in GRID_COLS * GRID_ROWS"
            :key="index"
            class="gallery-cell"
            :style="{
              width: `${CELL_SIZE}px`,
              height: `${CELL_SIZE}px`,
              left: `${((index - 1) % GRID_COLS) * CELL_SIZE}px`,
              top: `${Math.floor((index - 1) / GRID_COLS) * CELL_SIZE}px`
            }"
          />
          <CombatEffectsCanvas
            :events="events"
            :units="renderedUnits"
            :cell-size="CELL_SIZE"
            :grid-rows="GRID_ROWS"
            :grid-cols="GRID_COLS"
            phase="COMBAT"
          />
          <div
            v-for="unit in renderedUnits"
            :key="unit.id"
            class="gallery-unit"
            :class="{ ally: unit.isMine, enemy: !unit.isMine, selected: unit.id === 'gallery-source' }"
            :style="{
              width: `${CELL_SIZE - 12}px`,
              height: `${CELL_SIZE - 12}px`,
              left: `${unit.visualX * CELL_SIZE + 6}px`,
              top: `${unit.visualY * CELL_SIZE + 6}px`
            }"
          >
            <div class="unit-health" />
            <img :src="unit.image" :alt="unit.name" draggable="false">
            <span class="unit-label">{{ unit.name }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="roster-panel" aria-label="Ultimate roster">
      <button
        v-for="unit in filteredRoster"
        :key="galleryKey(unit)"
        type="button"
        class="roster-card"
        :class="{ active: selectedKey === galleryKey(unit) }"
        @click="selectUnit(unit)"
      >
        <img :src="getUnitIconPath(unit.id, galleryMode)" :alt="unit.name" draggable="false">
        <span class="roster-name">{{ unit.name }}</span>
        <span class="roster-meta">{{ getAbilityConfig(unit.id).signature || unit.abilityName }} · {{ unit.cost }}g</span>
      </button>
    </section>
  </main>
</template>

<style scoped>
.ultimate-gallery {
    height: 100vh;
    display: grid;
    grid-template-columns: minmax(760px, 1fr) 390px;
    grid-template-rows: minmax(0, 1fr);
    gap: 18px;
    padding: 18px;
    background: radial-gradient(circle at 30% 0%, #1f2937 0%, #0b1120 62%);
    color: #f8fafc;
    overflow: hidden;
}

.gallery-preview,
.roster-panel {
    min-height: 0;
    height: 100%;
}

.preview-header {
    min-height: 94px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    padding: 4px 4px 16px;
}

.back-link {
    color: #93c5fd;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;
}

h1 {
    margin: 5px 0 3px;
    font-size: 34px;
    line-height: 1;
}

p {
    margin: 0;
    color: #cbd5e1;
    font-weight: 700;
}

.preview-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

.star-button,
.replay-button,
.segmented-control button {
    min-height: 38px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #111827;
    color: #e5e7eb;
    font-weight: 900;
    cursor: pointer;
}

.star-button {
    padding: 0 12px;
}

.star-button.active,
.replay-button,
.segmented-control button.active {
    border-color: #fbbf24;
    background: #1d4ed8;
    color: #ffffff;
}

.segmented-control {
    display: inline-grid;
    grid-template-columns: repeat(2, minmax(64px, 1fr));
    gap: 3px;
    padding: 3px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #020617;
}

.segmented-control button {
    min-height: 32px;
    border-color: transparent;
    border-radius: 6px;
}

.arena-select {
    min-height: 38px;
    padding: 0 8px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #111827;
    color: #e5e7eb;
    font-weight: 800;
}

.gallery-board-3d {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
}

.auto-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 0 10px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #111827;
    color: #cbd5e1;
    font-weight: 800;
}

.board-shell {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 132px);
    border: 1px solid #1f3b63;
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(2, 6, 23, 0.94));
    box-shadow: inset 0 0 42px rgba(30, 64, 175, 0.18);
    overflow: auto;
}

.gallery-board {
    position: relative;
    flex: 0 0 auto;
    border: 3px solid #243b5a;
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(53, 39, 55, 0.56) 0 50%, rgba(15, 23, 42, 0.88) 50% 100%);
    overflow: hidden;
}

.gallery-board.light-board {
    border-color: #94a3b8;
    background: linear-gradient(180deg, rgba(226, 232, 240, 0.92) 0 50%, rgba(148, 163, 184, 0.92) 50% 100%);
}

.mode-pokemon .gallery-board {
    border-color: #2f5f58;
    background:
        radial-gradient(circle at 28% 72%, rgba(34, 197, 94, 0.16), transparent 28%),
        radial-gradient(circle at 74% 28%, rgba(248, 113, 113, 0.12), transparent 24%),
        linear-gradient(180deg, rgba(34, 72, 66, 0.7) 0 50%, rgba(32, 43, 58, 0.94) 50% 100%);
}

.mode-pokemon .board-shell {
    border-color: #24554d;
    box-shadow: inset 0 0 42px rgba(45, 212, 191, 0.14);
}

.mode-pokemon .roster-card.active {
    border-color: #facc15;
    background: #14532d;
}

.gallery-cell {
    position: absolute;
    border-right: 1px solid rgba(148, 163, 184, 0.12);
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.gallery-unit {
    position: absolute;
    z-index: 40;
    border: 2px solid #22c55e;
    border-radius: 50%;
    background: #0f172a;
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.5);
}

.gallery-unit.enemy {
    border-color: #ef4444;
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.45);
}

.gallery-unit.selected {
    border-color: #fbbf24;
    box-shadow: 0 0 22px rgba(251, 191, 36, 0.64);
}

.gallery-unit img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    user-select: none;
}

.unit-health {
    position: absolute;
    top: -8px;
    left: 10%;
    width: 80%;
    height: 6px;
    border-radius: 999px;
    background: #22c55e;
}

.unit-label {
    position: absolute;
    left: 50%;
    top: 100%;
    width: 120px;
    transform: translateX(-50%);
    color: #e5e7eb;
    font-size: 11px;
    font-weight: 900;
    line-height: 1.1;
    text-align: center;
    text-shadow: 0 2px 8px #020617;
}

.roster-panel {
    display: grid;
    grid-template-columns: 1fr;
    align-content: start;
    gap: 8px;
    padding: 10px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.88);
    overflow: auto;
    overscroll-behavior: contain;
}

.roster-card {
    display: grid;
    grid-template-columns: 48px 1fr;
    grid-template-rows: auto auto;
    column-gap: 10px;
    align-items: center;
    min-height: 62px;
    padding: 7px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: #111827;
    color: #f8fafc;
    text-align: left;
    cursor: pointer;
}

.roster-card.active {
    border-color: #fbbf24;
    background: #172554;
}

.roster-card img {
    grid-row: 1 / span 2;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
}

.roster-name {
    font-weight: 900;
}

.roster-meta {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 700;
}

@media (max-width: 1120px) {
    .ultimate-gallery {
        grid-template-columns: 1fr;
        height: 100vh;
        overflow: auto;
    }

    .roster-panel {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        height: auto;
        max-height: none;
        overflow: visible;
    }
}
</style>
