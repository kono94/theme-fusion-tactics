<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
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

const TRAIT_TILE_HEIGHT = 50
const TRAIT_GAP = 8
const SIDEBAR_INSET = 12
const TOOLTIP_GAP = 10

type ProcessedTrait = {
  id: string
  def: TraitDefinition
  count: number
  activeEffect: TraitEffect | null
  nextBreakpoint: number | null
  style: TraitEffect['style'] | 'inactive'
}

const sidebarElement = ref<HTMLElement | null>(null)
const traitTooltipElement = ref<HTMLElement | null>(null)
const hoveredTraitId = ref<string | null>(null)
const availableHeight = ref(0)
const traitTooltipPosition = ref({ left: 0, top: 0 })
const activeUnitTooltip = ref<{
  unit: GameUnit | TraitRosterUnit
  rect: DOMRect
  placement: 'top' | 'bottom'
} | null>(null)

let resizeObserver: ResizeObserver | null = null

const processedTraits = computed<ProcessedTrait[]>(() => {
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
      const style: ProcessedTrait['style'] = activeEffect?.style ?? 'inactive'
      return {
        id,
        def,
        count,
        activeEffect,
        nextBreakpoint: getNextBreakpoint(def, count),
        style,
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

const rowCapacity = computed(() =>
  Math.max(1, Math.floor((availableHeight.value + TRAIT_GAP) / (TRAIT_TILE_HEIGHT + TRAIT_GAP))),
)

const visibleRowCount = computed(() =>
  Math.max(1, Math.min(processedTraits.value.length, rowCapacity.value)),
)

const activeTrait = computed(
  () => processedTraits.value.find((trait) => trait.id === hoveredTraitId.value) ?? null,
)

const sidebarStyle = computed(() => ({
  '--trait-row-count': visibleRowCount.value,
}))

const traitTooltipStyle = computed<CSSProperties>(() => ({
  left: `${traitTooltipPosition.value.left}px`,
  top: `${traitTooltipPosition.value.top}px`,
  paddingLeft: `${TOOLTIP_GAP}px`,
}))

const traitPanelStyle = computed<CSSProperties>(() => ({
  maxHeight: `${availableHeight.value}px`,
  overflowY: 'auto',
}))

function getActiveEffect(trait: TraitDefinition, count: number): TraitEffect | null {
  return trait.effects.reduce<TraitEffect | null>(
    (active, effect) => (count >= effect.minUnits ? effect : active),
    null,
  )
}

function getNextBreakpoint(trait: TraitDefinition, count: number): number | null {
  return trait.effects.find((effect) => effect.minUnits > count)?.minUnits ?? null
}

function getTraitProgress(trait: ProcessedTrait): string {
  return `${trait.count} / ${trait.nextBreakpoint || trait.activeEffect?.minUnits || 'Max'}`
}

function lineIdentity(unit: GameUnit | TraitRosterUnit): string {
  return unit.lineId || unit.definitionId || unit.name
}

function activeBoardUnit(traitId: string, rosterUnit: TraitRosterUnit): GameUnit | null {
  return (
    props.units.find(
      (unit) =>
        lineIdentity(unit) === rosterUnit.lineId &&
        unit.traits.some((trait) => normalizeTraitId(trait) === traitId),
    ) ?? null
  )
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
  if (!hoveredTraitId.value) return

  hoveredTraitId.value = null
  emit('hover-trait', null)
  hideUnitTooltip()
}

async function showTraitTooltip(traitId: string) {
  hideUnitTooltip()
  if (hoveredTraitId.value === traitId) {
    await nextTick()
    updateTraitTooltipPosition()
    return
  }

  hoveredTraitId.value = traitId
  emit('hover-trait', traitId)
  await nextTick()
  updateTraitTooltipPosition()
}

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget
  if (nextTarget instanceof Node && sidebarElement.value?.contains(nextTarget)) return
  hideTraitTooltip()
}

function updateAvailableHeight(height?: number) {
  const mainArea = sidebarElement.value?.parentElement
  const measuredHeight = height ?? mainArea?.getBoundingClientRect().height ?? window.innerHeight
  availableHeight.value = Math.max(0, measuredHeight - SIDEBAR_INSET * 2)
}

function updateTraitTooltipPosition() {
  if (!hoveredTraitId.value || !sidebarElement.value || !traitTooltipElement.value) return

  const mainArea = sidebarElement.value.parentElement
  const traitItem = sidebarElement.value.querySelector<HTMLElement>(
    `[data-trait-id="${hoveredTraitId.value}"]`,
  )
  if (!mainArea || !traitItem) return

  const mainAreaRect = mainArea.getBoundingClientRect()
  const sidebarRect = sidebarElement.value.getBoundingClientRect()
  const traitItemRect = traitItem.getBoundingClientRect()
  const tooltipRect = traitTooltipElement.value.getBoundingClientRect()
  const minimumTop = mainAreaRect.top + SIDEBAR_INSET
  const maximumTop = Math.max(minimumTop, mainAreaRect.bottom - SIDEBAR_INSET - tooltipRect.height)
  const centeredTop = traitItemRect.top + (traitItemRect.height - tooltipRect.height) / 2

  traitTooltipPosition.value = {
    left: traitItemRect.right - sidebarRect.left,
    top: Math.min(Math.max(centeredTop, minimumTop), maximumTop) - sidebarRect.top,
  }
}

async function handleResize() {
  updateAvailableHeight()
  await nextTick()
  updateTraitTooltipPosition()
}

watch(
  () => processedTraits.value.map((trait) => trait.id).join('|'),
  async () => {
    if (hoveredTraitId.value && !activeTrait.value) {
      hideTraitTooltip()
      return
    }

    await handleResize()
  },
)

onMounted(() => {
  const mainArea = sidebarElement.value?.parentElement
  updateAvailableHeight()
  window.addEventListener('resize', handleResize)

  if (mainArea && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height
      updateAvailableHeight(height)
      void nextTick().then(updateTraitTooltipPosition)
    })
    resizeObserver.observe(mainArea)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div
    ref="sidebarElement"
    class="trait-sidebar"
    :style="sidebarStyle"
    @mouseleave="hideTraitTooltip"
    @focusout="handleFocusOut"
  >
    <button
      v-for="item in processedTraits"
      :key="item.id"
      type="button"
      class="trait-item"
      :class="item.style"
      :data-trait-id="item.id"
      :aria-label="`${item.def.name}, ${getTraitProgress(item)}`"
      @mouseenter="showTraitTooltip(item.id)"
      @focus="showTraitTooltip(item.id)"
    >
      <div class="trait-icon" :style="{ backgroundColor: item.def.iconColor || '#94a3b8' }">
        {{ getTraitGlyph(item.def) }}
      </div>

      <span class="trait-count">{{ getTraitProgress(item) }}</span>
    </button>

    <transition name="fade">
      <div
        v-if="activeTrait"
        ref="traitTooltipElement"
        class="trait-tooltip-shell"
        :style="traitTooltipStyle"
      >
        <div class="trait-tooltip" :style="traitPanelStyle">
          <div class="tt-header">{{ activeTrait.def.name }}</div>
          <div class="tt-desc">{{ activeTrait.def.description }}</div>
          <div class="tt-effects">
            <div
              v-for="effect in activeTrait.def.effects"
              :key="effect.minUnits"
              class="tt-effect-row"
              :class="{ active: activeTrait.count >= effect.minUnits }"
            >
              <span class="tt-meta">{{ effect.minUnits }}</span>
              <span>{{ effect.description }}</span>
            </div>
          </div>

          <div v-if="activeTrait.def.units?.length" class="tt-roster" data-test="trait-roster">
            <button
              v-for="rosterUnit in activeTrait.def.units"
              :key="rosterUnit.lineId"
              type="button"
              class="trait-unit"
              :class="{ active: isActiveUnit(activeTrait.id, rosterUnit) }"
              :style="{ '--cost-color': getRarityColor(rosterUnit.cost) }"
              :aria-label="`${displayUnit(activeTrait.id, rosterUnit).name}, ${rosterUnit.cost} gold`"
              @mouseenter="showUnitTooltip($event, displayUnit(activeTrait.id, rosterUnit))"
              @mouseleave="hideUnitTooltip"
              @focus="showUnitTooltip($event, displayUnit(activeTrait.id, rosterUnit))"
              @blur="hideUnitTooltip"
            >
              <img
                :src="
                  getUnitIconPath(displayUnit(activeTrait.id, rosterUnit).definitionId, gameMode)
                "
                :alt="displayUnit(activeTrait.id, rosterUnit).name"
                draggable="false"
              />
              <span class="unit-cost">{{ rosterUnit.cost }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
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
  display: grid;
  grid-auto-columns: 60px;
  grid-auto-flow: column;
  grid-template-rows: repeat(var(--trait-row-count), 50px);
  gap: 8px;
  pointer-events: none;
  transform: translateY(-50%);
}

.trait-item {
  position: relative;
  display: flex;
  width: 60px;
  height: 50px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 5px;
  overflow: visible;
  border: 1px solid #334155;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  color: white;
  cursor: default;
  font: inherit;
  pointer-events: auto;
  transition:
    background-color 0.2s,
    transform 0.2s;
}

.trait-item:hover,
.trait-item:focus-visible {
  z-index: 1;
  outline: 2px solid rgba(255, 255, 255, 0.85);
  outline-offset: 1px;
  background: rgba(15, 23, 42, 0.95);
  transform: translateY(-1px);
}

.trait-item.inactive {
  border-color: #334155;
  opacity: 0.6;
}
.trait-item.bronze {
  border-color: #cd7f32;
  box-shadow: 0 0 5px rgba(205, 127, 50, 0.2);
}
.trait-item.silver {
  border-color: #c0c0c0;
  box-shadow: 0 0 5px rgba(192, 192, 192, 0.2);
}
.trait-item.gold {
  border-color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
}
.trait-item.prismatic {
  border-color: #a855f7;
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
}

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

.trait-count {
  position: absolute;
  right: 2px;
  bottom: 2px;
  min-width: 24px;
  padding: 0 3px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.9);
  color: #e2e8f0;
  font-size: 8px;
  font-weight: 800;
  line-height: 13px;
  text-align: center;
  white-space: nowrap;
}

.trait-tooltip-shell {
  position: absolute;
  z-index: 200;
  pointer-events: auto;
}

.trait-tooltip {
  position: relative;
  width: 264px;
  box-sizing: border-box;
  padding: 12px;
  overflow-y: auto;
  border: 1px solid #475569;
  border-radius: 8px;
  background: #1e293b;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
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
  transition:
    filter 0.15s,
    opacity 0.15s,
    transform 0.15s;
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
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
