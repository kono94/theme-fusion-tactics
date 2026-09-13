<script setup lang="ts">
import { computed, ref } from 'vue'
import {
    getTraitGlyph,
    normalizeTraitId,
    TRAIT_DATA,
    type TraitDefinition,
    type TraitEffect,
    type TraitRosterUnit,
} from '../data/traitData'
import type { GameMode, GameUnit } from '../types'
import { getRarityColor } from '../utils/colorUtils'
import { getUnitIconPath } from '../utils/iconUtils'
import UnitTooltip from './UnitTooltip.vue'

const props = defineProps<{
    units: GameUnit[]
    gameMode: GameMode
}>()

const emit = defineEmits<{
    'hover-trait': [traitId: string | null]
}>()

const hoveredTraitId = ref<string | null>(null)
const activeUnitTooltip = ref<{
    unit: GameUnit | TraitRosterUnit
    rect: DOMRect
    placement: 'top' | 'bottom'
} | null>(null)

const processedTraits = computed(() => {
    const uniqueLinesByTrait: Record<string, Set<string>> = {}

    props.units.forEach((unit) => {
        if (!unit.name) return

        const unitKey = unit.lineId || unit.definitionId || unit.name
        unit.traits?.forEach((traitName) => {
            const traitId = normalizeTraitId(traitName)
            uniqueLinesByTrait[traitId] ??= new Set<string>()
            uniqueLinesByTrait[traitId].add(unitKey)
        })
    })

    const list = Object.entries(uniqueLinesByTrait)
        .map(([id, unitLines]) => {
            const def = TRAIT_DATA[id]
            if (!def) return null

            const count = unitLines.size
            const activeEffect = getActiveEffect(def, count)
            return {
                id,
                def,
                count,
                activeEffect,
                nextBreakpoint: getNextBreakpoint(def, count),
                style: activeEffect?.style || 'inactive',
            }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

    list.sort((a, b) => {
        const styleScore: Record<string, number> = {
            inactive: 1,
            bronze: 2,
            silver: 3,
            gold: 4,
            prismatic: 5,
        }
        const styleDifference = styleScore[b.style] - styleScore[a.style]
        return styleDifference || b.count - a.count
    })

    return list
})

function getActiveEffect(trait: TraitDefinition, count: number): TraitEffect | null {
    return trait.effects.reduce<TraitEffect | null>(
        (active, effect) => (count >= effect.minUnits ? effect : active),
        null,
    )
}

function getNextBreakpoint(trait: TraitDefinition, count: number): number | null {
    return trait.effects.find((effect) => effect.minUnits > count)?.minUnits ?? null
}

function lineIdentity(unit: GameUnit | TraitRosterUnit): string {
    return unit.lineId || unit.definitionId || unit.name
}

function activeBoardUnit(traitId: string, rosterUnit: TraitRosterUnit): GameUnit | null {
    return props.units.find((unit) =>
        lineIdentity(unit) === rosterUnit.lineId
        && unit.traits.some((trait) => normalizeTraitId(trait) === traitId),
    ) ?? null
}

function displayUnit(traitId: string, rosterUnit: TraitRosterUnit): GameUnit | TraitRosterUnit {
    return activeBoardUnit(traitId, rosterUnit) ?? rosterUnit
}

function isActiveUnit(traitId: string, rosterUnit: TraitRosterUnit): boolean {
    return activeBoardUnit(traitId, rosterUnit) !== null
}

function showUnitTooltip(event: MouseEvent | FocusEvent, unit: GameUnit | TraitRosterUnit) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    activeUnitTooltip.value = {
        unit,
        rect,
        placement: rect.top > window.innerHeight / 2 ? 'top' : 'bottom',
    }
}

function hideUnitTooltip() {
    activeUnitTooltip.value = null
}

function hideTraitTooltip() {
    hoveredTraitId.value = null
    emit('hover-trait', null)
    hideUnitTooltip()
}

function showTraitTooltip(traitId: string) {
    hoveredTraitId.value = traitId
    emit('hover-trait', traitId)
}
</script>

<template>
  <div class="trait-sidebar">
      <div
          v-for="item in processedTraits"
          :key="item.id"
          class="trait-item"
          :class="item.style"
          @mouseenter="showTraitTooltip(item.id)"
          @mouseleave="hideTraitTooltip"
      >
          <div class="trait-icon" :style="{ backgroundColor: item.def.iconColor || '#94a3b8' }">
              {{ getTraitGlyph(item.def) }}
          </div>

          <div class="trait-info">
              <div class="trait-name">{{ item.def.name }}</div>
              <div class="trait-count">
                  {{ item.count }} / {{ item.nextBreakpoint || item.activeEffect?.minUnits || 'Max' }}
              </div>
          </div>

          <transition name="fade">
              <div v-if="hoveredTraitId === item.id" class="trait-tooltip">
                  <div class="tt-header">{{ item.def.name }}</div>
                  <div class="tt-desc">{{ item.def.description }}</div>
                  <div class="tt-effects">
                      <div
                          v-for="effect in item.def.effects"
                          :key="effect.minUnits"
                          class="tt-effect-row"
                          :class="{ active: item.count >= effect.minUnits }"
                      >
                          <span class="tt-meta">{{ effect.minUnits }}</span>
                          <span>{{ effect.description }}</span>
                      </div>
                  </div>

                  <div v-if="item.def.units?.length" class="tt-roster" data-test="trait-roster">
                      <button
                          v-for="rosterUnit in item.def.units"
                          :key="rosterUnit.lineId"
                          type="button"
                          class="trait-unit"
                          :class="{ active: isActiveUnit(item.id, rosterUnit) }"
                          :style="{ '--cost-color': getRarityColor(rosterUnit.cost) }"
                          :aria-label="`${displayUnit(item.id, rosterUnit).name}, ${rosterUnit.cost} gold`"
                          @mouseenter="showUnitTooltip($event, displayUnit(item.id, rosterUnit))"
                          @mouseleave="hideUnitTooltip"
                          @focus="showUnitTooltip($event, displayUnit(item.id, rosterUnit))"
                          @blur="hideUnitTooltip"
                      >
                          <img
                              :src="getUnitIconPath(displayUnit(item.id, rosterUnit).definitionId, gameMode)"
                              :alt="displayUnit(item.id, rosterUnit).name"
                              draggable="false"
                          >
                          <span class="unit-cost">{{ rosterUnit.cost }}</span>
                      </button>
                  </div>
              </div>
          </transition>
      </div>
  </div>

  <Teleport to="body">
      <transition name="fade">
          <div
              v-if="activeUnitTooltip"
              class="trait-unit-tooltip"
              :style="{
                  left: `${activeUnitTooltip.rect.left}px`,
                  top: `${activeUnitTooltip.rect.top}px`,
                  width: `${activeUnitTooltip.rect.width}px`,
                  height: `${activeUnitTooltip.rect.height}px`,
              }"
          >
              <UnitTooltip
                  :unit="activeUnitTooltip.unit"
                  :placement="activeUnitTooltip.placement"
                  shift="center"
                  show-cost
              />
          </div>
      </transition>
  </Teleport>
</template>

<style scoped>
.trait-sidebar {
    position: absolute;
    left: 20px;
    top: 50%;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    transform: translateY(-50%);
}

.trait-item {
    position: relative;
    display: flex;
    width: 60px;
    align-items: center;
    gap: 8px;
    padding: 8px;
    overflow: visible;
    border: 1px solid #334155;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.8);
    cursor: default;
    pointer-events: auto;
    transition: width 0.2s, background-color 0.2s;
}

.trait-item:hover {
    width: 160px;
    background: rgba(15, 23, 42, 0.95);
}

.trait-item.inactive { border-color: #334155; opacity: 0.6; }
.trait-item.bronze { border-color: #cd7f32; box-shadow: 0 0 5px rgba(205, 127, 50, 0.2); }
.trait-item.silver { border-color: #c0c0c0; box-shadow: 0 0 5px rgba(192, 192, 192, 0.2); }
.trait-item.gold { border-color: #ffd700; box-shadow: 0 0 10px rgba(255, 215, 0, 0.4); }
.trait-item.prismatic { border-color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.5); }

.trait-icon {
    display: flex;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #1e293b;
    font-size: 14px;
    font-weight: bold;
}

.trait-info {
    display: flex;
    flex-direction: column;
    opacity: 0;
    white-space: nowrap;
    transition: opacity 0.2s;
}

.trait-item:hover .trait-info { opacity: 1; }

.trait-name {
    color: white;
    font-size: 12px;
    font-weight: bold;
}

.trait-count {
    color: #94a3b8;
    font-size: 10px;
}

.trait-tooltip {
    position: absolute;
    top: 50%;
    left: 100%;
    z-index: 200;
    width: 264px;
    max-height: calc(100vh - 24px);
    margin-left: 10px;
    padding: 12px;
    overflow-y: auto;
    border: 1px solid #475569;
    border-radius: 8px;
    background: #1e293b;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    transform: translateY(-50%);
}

.trait-tooltip::before {
    position: absolute;
    top: 0;
    right: 100%;
    width: 10px;
    height: 100%;
    content: '';
}

.tt-header {
    margin-bottom: 4px;
    color: #eab308;
    font-weight: bold;
}

.tt-desc {
    margin-bottom: 8px;
    color: #cbd5e1;
    font-size: 12px;
    font-style: italic;
}

.tt-effects {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.tt-effect-row {
    display: flex;
    gap: 8px;
    color: #64748b;
    font-size: 11px;
}

.tt-effect-row.active {
    color: white;
    font-weight: bold;
}

.tt-meta {
    min-width: 20px;
    padding: 1px 6px;
    border-radius: 4px;
    background: #334155;
    text-align: center;
}

.tt-effect-row.active .tt-meta {
    background: #eab308;
    color: black;
}

.tt-roster {
    display: grid;
    grid-template-columns: repeat(5, 40px);
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #475569;
}

.trait-unit {
    position: relative;
    width: 40px;
    height: 40px;
    padding: 0;
    overflow: hidden;
    border: 2px solid var(--cost-color);
    border-radius: 5px;
    background: #0f172a;
    cursor: help;
    filter: grayscale(1);
    opacity: 0.38;
    transition: filter 0.15s, opacity 0.15s, transform 0.15s;
}

.trait-unit.active {
    filter: none;
    opacity: 1;
}

.trait-unit:hover,
.trait-unit:focus-visible {
    z-index: 1;
    outline: 2px solid white;
    outline-offset: 1px;
    transform: scale(1.08);
}

.trait-unit img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.unit-cost {
    position: absolute;
    right: 1px;
    bottom: 1px;
    min-width: 14px;
    padding: 0 2px;
    border-radius: 3px;
    background: rgba(2, 6, 23, 0.9);
    color: var(--cost-color);
    font-size: 9px;
    font-weight: 900;
    line-height: 13px;
    text-align: center;
}

.trait-unit-tooltip {
    position: fixed;
    z-index: 100000;
    pointer-events: none;
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }

.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
