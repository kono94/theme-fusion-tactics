<script setup lang="ts">
import { computed } from 'vue'
import type { FieldConditionView } from '../../types'
import { formatFieldConditionTime } from '../../utils/fieldConditions'

const props = defineProps<{
  condition: FieldConditionView
  forecast: boolean
}>()

const timeLabel = computed(() => formatFieldConditionTime(props.condition.remainingMs))
const ariaLabel = computed(() =>
  props.forecast
    ? `Forecast for the next fight: ${props.condition.name}`
    : `Weather: ${props.condition.name}`,
)
</script>

<template>
  <div
    class="field-chip"
    :class="{ forecast }"
    tabindex="0"
    data-testid="field-condition-chip"
    :aria-label="ariaLabel"
  >
    <img class="field-chip-icon" :src="condition.icon" alt="" />
    <span v-if="forecast" class="field-chip-prefix">Forecast</span>
    <span class="field-chip-name">{{ condition.name }}</span>
    <span v-if="!forecast && timeLabel" class="field-chip-time">{{ timeLabel }}</span>
    <span class="field-chip-tooltip" role="tooltip">{{ condition.description }}</span>
  </div>
</template>

<style scoped>
.field-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 2px 9px 2px 4px;
  border: 1px solid rgb(125 211 252 / 45%);
  border-radius: 999px;
  background: rgb(15 23 42 / 70%);
  color: #bae6fd;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: none;
  cursor: default;
  flex-shrink: 1;
}

.field-chip.forecast {
  border-style: dashed;
  color: #cbd5e1;
}

.field-chip-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.field-chip-prefix {
  font-size: 9px;
  opacity: 0.75;
  text-transform: uppercase;
}

.field-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-chip-time {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

.field-chip-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  z-index: 50;
  width: 220px;
  padding: 8px 10px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 10px;
  background: rgb(15 23 42 / 96%);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.35;
  text-align: left;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%);
  transition: opacity 0.15s ease;
}

.field-chip:hover .field-chip-tooltip,
.field-chip:focus-visible .field-chip-tooltip {
  opacity: 1;
  visibility: visible;
}
</style>
