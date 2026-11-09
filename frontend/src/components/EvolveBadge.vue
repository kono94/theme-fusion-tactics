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
    @dragstart.stop.prevent
  >
    Evolve
  </button>
</template>

<style scoped>
.evolve-badge {
  position: absolute;
  left: 50%;
  padding: 1px 6px;
  border: 1px solid var(--room-accent-contrast, #0f172a);
  border-radius: 999px;
  color: var(--room-accent-contrast, #0f172a);
  background: var(--room-accent, #f59e0b);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.4px;
  line-height: 1.4;
  text-transform: uppercase;
  transform: translateX(-50%);
  cursor: pointer;
}

.evolve-badge.board {
  z-index: 14;
  top: -9px;
}

.evolve-badge.bench {
  z-index: 12;
  top: -8px;
}

.evolve-badge:focus-visible {
  outline: 2px solid #f8fafc;
  outline-offset: 1px;
}
</style>
