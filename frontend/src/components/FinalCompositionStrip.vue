<script setup lang="ts">
import { ref } from 'vue'
import type { AnalyticsBoardUnit } from '../types/analytics'
import type { GameMode } from '../types'
import { getUnitIconPath, UNIT_ICON_PLACEHOLDER } from '../utils/iconUtils'

const props = defineProps<{
    mode: string
    composition: AnalyticsBoardUnit[] | null
    compact?: boolean
    readableLabels?: boolean
}>()

const failedImages = ref(new Set<string>())

const labelFor = (value: string) => {
    if (!props.readableLabels) return value
    return value
        .replace(/(?:[_-]v\d+)$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
}

const portraitKey = (unit: AnalyticsBoardUnit) => `${props.mode}:${unit.definitionId}`
const imagePath = (unit: AnalyticsBoardUnit) =>
    failedImages.value.has(portraitKey(unit))
        ? UNIT_ICON_PLACEHOLDER
        : getUnitIconPath(unit.definitionId, props.mode as GameMode)

const markMissing = (unit: AnalyticsBoardUnit) => {
    failedImages.value = new Set(failedImages.value).add(portraitKey(unit))
}

const unitLabel = (unit: AnalyticsBoardUnit) => labelFor(unit.definitionId)
const itemLabel = (itemId: string) => labelFor(itemId)
</script>

<template>
  <div v-if="composition === null" class="composition-unavailable" role="status">
    Final board unavailable for this historical run.
  </div>
  <div v-else-if="composition.length === 0" class="composition-empty" role="status">
    Captured empty board
  </div>
  <div v-else class="composition-strip" :class="{ compact }" role="list" aria-label="Final board composition">
    <div v-for="(unit, index) in composition" :key="`${unit.definitionId}-${unit.lineId}-${index}`" class="composition-unit" role="listitem">
      <img
        :src="imagePath(unit)"
        :alt="unitLabel(unit)"
        @error="markMissing(unit)"
      />
      <span class="composition-name">{{ unitLabel(unit) }}</span>
      <span class="composition-stars" :aria-label="`${unit.starLevel} star`">{{ '★'.repeat(unit.starLevel) }}</span>
      <span
        v-if="unit.itemIds.length"
        class="composition-items"
        role="list"
        :aria-label="`Items: ${unit.itemIds.map(itemLabel).join(', ')}`"
      >
        <span v-for="(itemId, itemIndex) in unit.itemIds" :key="`${itemId}-${itemIndex}`" class="item-badge" role="listitem">
          {{ itemLabel(itemId) }}
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.composition-strip { display: flex; flex-wrap: wrap; gap: 8px; }
.composition-unit { position: relative; display: grid; grid-template-columns: 38px 1fr; grid-template-rows: auto auto; column-gap: 7px; min-width: 142px; padding: 6px; border: 1px solid #33465f; border-radius: 8px; background: #122238; }
.composition-unit img { grid-row: 1 / span 2; width: 38px; height: 38px; border-radius: 6px; object-fit: cover; background: #07111f; }
.composition-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; align-self: end; font-size: .72rem; }
.composition-stars { color: #fbbf24; font-size: .7rem; }
.composition-items { grid-column: 1 / span 2; display: flex; flex-wrap: wrap; gap: 3px; }
.item-badge { max-width: 100%; overflow: hidden; padding: 2px 5px; border-radius: 999px; background: #312e81; color: #ddd6fe; font-size: .62rem; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.compact .composition-unit { min-width: 112px; grid-template-columns: 28px 1fr; }
.compact .composition-unit img { width: 28px; height: 28px; }
.composition-unavailable, .composition-empty { color: #8293aa; font-size: .78rem; }
</style>
