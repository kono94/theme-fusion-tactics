<script setup lang="ts">
withDefaults(
  defineProps<{
    unitName: string
    placement?: 'board' | 'bench'
  }>(),
  { placement: 'board' },
)

const emit = defineEmits<{
  evolve: []
  'hover-start': [event: MouseEvent]
  'hover-end': [event: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    class="evolve-badge"
    :class="placement"
    draggable="false"
    data-testid="evolve-badge"
    :aria-label="`Choose evolution for ${unitName}`"
    @click.stop="emit('evolve')"
    @mouseenter="emit('hover-start', $event)"
    @mouseleave="emit('hover-end', $event)"
    @dragstart.stop.prevent
  >
    <span class="evolve-arrow" aria-hidden="true">▲</span>
    Evolve
  </button>
</template>

<style scoped>
.evolve-badge {
  position: absolute;
  left: 50%;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  padding: 3px 10px;
  border: 2px solid var(--room-accent-contrast, #0f172a);
  border-radius: 999px;
  color: var(--room-accent-contrast, #0f172a);
  background: var(--room-accent, #f59e0b);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.55);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.4px;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  transform: translateX(-50%);
  transition:
    transform 0.12s ease,
    filter 0.12s ease;
  cursor: pointer;
}

.evolve-badge.board {
  bottom: -9px;
}

.evolve-badge.bench {
  bottom: -7px;
}

.evolve-arrow {
  font-size: 8px;
}

.evolve-badge:hover {
  filter: brightness(1.12);
  transform: translateX(-50%) scale(1.08);
}

.evolve-badge:active {
  filter: brightness(0.94);
  transform: translateX(-50%) scale(0.98);
}

.evolve-badge:focus-visible {
  outline: 2px solid #f8fafc;
  outline-offset: 2px;
}
</style>
