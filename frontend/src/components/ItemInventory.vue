<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GameItem } from '../types'

const MIN_SLOTS = 6
const COLUMNS = 6

const props = defineProps<{
  items: GameItem[]
  canManage: boolean
  selectedItemId: string | null
  selectedIsEquipped: boolean
}>()

const emit = defineEmits<{
  select: [itemId: string, anchor: HTMLElement]
  'drag-item': [event: DragEvent, item: GameItem]
  'drag-end': []
  'return-item': [itemId: string]
  'show-item': [rect: DOMRect, item: GameItem]
  'hide-item': []
}>()

const isDropTarget = ref(false)
const emptySlots = computed(() => {
  const slots = Math.max(MIN_SLOTS, Math.ceil(props.items.length / COLUMNS) * COLUMNS)
  return slots - props.items.length
})

function isInventoryItem(itemId: string) {
  return props.items.some((item) => item.instanceId === itemId)
}

function onDragOver(event: DragEvent) {
  if (!props.canManage || !event.dataTransfer?.types.includes('iteminstanceid')) return
  event.preventDefault()
  isDropTarget.value = true
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDropTarget.value = false
  const itemId = event.dataTransfer?.getData('itemInstanceId')
  if (props.canManage && itemId && !isInventoryItem(itemId)) emit('return-item', itemId)
}

function onEmptySlotClick() {
  if (props.canManage && props.selectedIsEquipped && props.selectedItemId) {
    emit('return-item', props.selectedItemId)
  }
}

function onItemEnter(event: MouseEvent | FocusEvent, item: GameItem) {
  emit('show-item', (event.currentTarget as HTMLElement).getBoundingClientRect(), item)
}
</script>

<template>
  <section
    class="inventory-card"
    :class="{ 'drop-target': isDropTarget }"
    aria-label="Item inventory"
    @dragover="onDragOver"
    @dragleave="isDropTarget = false"
    @drop="onDrop"
  >
    <header class="inventory-header">
      <span>Items</span>
      <span class="inventory-hint">
        {{ items.length ? (canManage ? 'Drag onto a unit' : 'Planning only') : 'Found in loot orbs' }}
      </span>
    </header>
    <div class="inventory-grid">
      <button
        v-for="item in items"
        :key="item.instanceId"
        class="item-slot inventory-item"
        :class="{ selected: selectedItemId === item.instanceId }"
        type="button"
        :draggable="canManage"
        :aria-label="`${item.name}: ${item.description}`"
        @mouseenter="(event) => onItemEnter(event, item)"
        @mouseleave="emit('hide-item')"
        @focus="(event) => onItemEnter(event, item)"
        @blur="emit('hide-item')"
        @click="(event) => emit('select', item.instanceId, event.currentTarget as HTMLElement)"
        @dragstart="(event) => emit('drag-item', event, item)"
        @dragend="emit('drag-end')"
      >
        <img :src="item.icon" :alt="item.name" draggable="false" />
      </button>
      <button
        v-for="slot in emptySlots"
        :key="`empty-${slot}`"
        type="button"
        class="item-slot empty-slot"
        :class="{ returnable: selectedIsEquipped && canManage }"
        :aria-label="selectedIsEquipped ? 'Unequip selected item' : 'Empty item slot'"
        @click="onEmptySlotClick"
      />
    </div>
  </section>
</template>

<style scoped>
.inventory-card {
  padding: 8px 10px 10px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.inventory-card.drop-target {
  border-color: #fbbf24;
  background: rgba(59, 44, 19, 0.92);
}

.inventory-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #f59e0b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.inventory-hint {
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(6, var(--item-slot-size));
  justify-content: space-between;
  row-gap: 6px;
  max-height: calc(var(--item-slot-size) * 2 + 6px);
  overflow-y: auto;
}

.item-slot {
  width: var(--item-slot-size);
  height: var(--item-slot-size);
  padding: 0;
  display: grid;
  place-items: center;
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 4px;
}

.inventory-item {
  border-color: #fbbf24;
  background: #0f172a;
  cursor: grab;
}

.inventory-item:not([draggable='true']) {
  cursor: pointer;
}

.inventory-item:hover,
.inventory-item:focus-visible,
.inventory-item.selected {
  outline: 2px solid #fbbf24;
  outline-offset: 1px;
}

.inventory-item img {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

.empty-slot {
  border-style: dashed;
  background: #111d2f;
  cursor: default;
}

.empty-slot.returnable {
  border-color: #fbbf24;
  cursor: pointer;
}
</style>
