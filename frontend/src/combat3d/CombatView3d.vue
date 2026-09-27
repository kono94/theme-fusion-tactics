<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { prefersReducedMotion } from '../animations/renderPolicy'
import type { CombatEvent, RenderedUnit } from '../types'
import { latestCombatEventTimestamp, takeNewCombatEvents } from '../utils/combatView'
import { getArena } from './arenas'
import { BattleScene, isWebGlAvailable } from './battleScene'
import { toCombatUnit3d } from './snapshot'

const props = defineProps<{
  units: RenderedUnit[]
  events: CombatEvent[] | null | undefined
  arenaId: string
}>()

const emit = defineEmits<{
  fallback: [reason: 'unsupported' | 'context-lost']
}>()

const host = ref<HTMLDivElement | null>(null)
const overlay = ref<HTMLDivElement | null>(null)
const arenaLabel = computed(() => getArena(props.arenaId).label)
let scene: BattleScene | null = null
let lastEventTimestamp = 0

onMounted(() => {
  if (!host.value || !overlay.value) return
  if (!isWebGlAvailable()) {
    emit('fallback', 'unsupported')
    return
  }
  try {
    scene = new BattleScene(host.value, overlay.value, {
      arenaId: props.arenaId,
      reducedMotion: prefersReducedMotion(),
      onContextLost: () => emit('fallback', 'context-lost'),
    })
  } catch {
    emit('fallback', 'unsupported')
    return
  }
  // Switching views mid-combat must not replay the events the other view already showed.
  lastEventTimestamp = latestCombatEventTimestamp(props.events)
  scene.sync(props.units.map(toCombatUnit3d))
})

watch(
  () => props.units,
  (units) => scene?.sync(units.map(toCombatUnit3d)),
)

watch(
  () => props.events,
  (events) => {
    if (!scene) return
    const fresh = takeNewCombatEvents(events, lastEventTimestamp)
    lastEventTimestamp = fresh.lastTimestamp
    if (fresh.events.length > 0) scene.play(fresh.events)
  },
)

onBeforeUnmount(() => {
  scene?.dispose()
  scene = null
})
</script>

<template>
  <div class="combat-view-3d">
    <div ref="host" class="scene-host"></div>
    <div ref="overlay" class="overlay"></div>
    <div class="arena-chip">
      <span class="preview-badge">3D Preview</span>
      <span class="arena-name">{{ arenaLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.combat-view-3d {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background: #0b1020;
}

.scene-host,
.overlay {
  position: absolute;
  inset: 0;
}

.scene-host :deep(canvas) {
  display: block;
  cursor: grab;
}

.scene-host :deep(canvas:active) {
  cursor: grabbing;
}

.overlay {
  pointer-events: none;
  overflow: hidden;
}

.arena-chip {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 3px 8px 3px 4px;
  border-radius: 999px;
  background: rgb(10 14 26 / 70%);
  color: #e2e8f0;
  font-size: 0.7rem;
  pointer-events: none;
}

.preview-badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: #f59e0b;
  color: #1c1917;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.6rem;
}

.overlay :deep(.screen-flash) {
  position: absolute;
  inset: 0;
  opacity: 0;
  mix-blend-mode: screen;
}

.overlay :deep(.unit-label) {
  position: absolute;
  left: 0;
  top: 0;
  width: 78px;
  will-change: transform;
}

.overlay :deep(.unit-name) {
  margin-bottom: 2px;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  color: #f8fafc;
  text-shadow: 0 1px 3px rgb(0 0 0 / 90%);
}

.overlay :deep(.bar) {
  position: relative;
  height: 6px;
  margin-top: 2px;
  overflow: hidden;
  border-radius: 3px;
  background: rgb(0 0 0 / 65%);
}

.overlay :deep(.bar.mana) {
  height: 4px;
}

.overlay :deep(.bar .fill) {
  height: 100%;
  transition: width 120ms linear;
}

.overlay :deep(.side-mine .hp .fill) {
  background: #10b981;
}

.overlay :deep(.side-enemy .hp .fill) {
  background: #ef4444;
}

.overlay :deep(.bar .shield) {
  position: absolute;
  top: 0;
  height: 100%;
  background: #e8f1ff;
}

.overlay :deep(.mana .fill) {
  background: #4f8dff;
}

.overlay :deep(.float-text) {
  position: absolute;
  transform: translate(-50%, -50%);
  font-weight: 800;
  font-size: 16px;
  white-space: nowrap;
  opacity: 0;
  color: #fff;
  text-shadow:
    0 2px 0 rgb(0 0 0 / 80%),
    0 0 6px rgb(0 0 0 / 60%);
  animation: float-up 900ms ease-out both;
}

.overlay :deep(.float-text.skill) {
  color: #ffb347;
  font-size: 20px;
}

.overlay :deep(.float-text.heal) {
  color: #7dff9a;
}

.overlay :deep(.float-text.shield) {
  color: #cfe6ff;
}

.overlay :deep(.float-text.skill-name) {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgb(10 14 26 / 80%);
  color: #fff3c4;
  font-size: 13px;
  text-shadow: none;
  animation-duration: 1300ms;
}

@keyframes float-up {
  0% {
    opacity: 0;
    margin-top: 0;
  }

  10% {
    opacity: 1;
  }

  70% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    margin-top: -42px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .overlay :deep(.float-text) {
    animation-duration: 1200ms;
  }
}
</style>
