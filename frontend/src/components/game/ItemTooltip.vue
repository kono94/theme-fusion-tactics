<script setup lang="ts">
import { computed } from 'vue'
import type { GameItem } from '../../types'
import { formatItemBonuses } from '../../utils/itemStats'

const props = defineProps<{ item: GameItem }>()

const bonuses = computed(() => formatItemBonuses(props.item))
</script>

<template>
  <div class="item-tooltip" role="tooltip">
    <img :src="item.icon" :alt="item.name" class="item-tooltip-icon" />
    <div class="item-tooltip-body">
      <strong>{{ item.name }}</strong>
      <span v-for="bonus in bonuses" :key="bonus">{{ bonus }}</span>
    </div>
  </div>
</template>

<style scoped>
.item-tooltip {
  display: flex;
  gap: 10px;
  align-items: center;
  width: max-content;
  max-width: 230px;
  padding: 9px 12px 9px 9px;
  background-color: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  font-family: var(--app-font-family);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.item-tooltip-icon {
  width: 40px;
  height: 40px;
  flex: none;
  image-rendering: pixelated;
}

.item-tooltip-body {
  display: grid;
  gap: 2px;
  font-size: 12px;
  line-height: 1.3;
  color: #cbd5e1;
}

.item-tooltip-body strong {
  color: #fbbf24;
  font-size: 13px;
}
</style>
