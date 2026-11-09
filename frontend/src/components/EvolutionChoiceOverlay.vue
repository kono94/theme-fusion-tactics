<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { EvolutionOption, GameMode, UnitRole } from '../types'
import { getUnitIconPath } from '../utils/iconUtils'
import { traitTagStyle } from '../utils/traitTagStyle'
import { laterFormsLabel } from '../utils/evolution'

defineProps<{
  unitName: string
  choices: EvolutionOption[]
  gameMode: GameMode | string
}>()

const emit = defineEmits<{
  select: [branchId: string]
  close: []
}>()

const selectedId = ref<string | null>(null)
const gridRef = ref<HTMLElement | null>(null)

function selectBranch(branchId: string) {
  if (selectedId.value) return
  selectedId.value = branchId
  emit('select', branchId)
}

function formatRole(role: UnitRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  void nextTick(() => gridRef.value?.querySelector<HTMLButtonElement>('button')?.focus())
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="evolution-layer" @click.self="emit('close')">
    <div
      class="evolution-shell"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evolution-title"
    >
      <div class="evolution-heading">
        <span class="evolution-label">Evolution</span>
        <h2 id="evolution-title">Choose how {{ unitName }} evolves</h2>
        <button type="button" class="close-button" aria-label="Close evolution choice" @click="emit('close')">
          ✕
        </button>
      </div>

      <div ref="gridRef" class="evolution-grid">
        <button
          v-for="choice in choices"
          :key="choice.branchId"
          class="evolution-card"
          :class="{ selected: selectedId === choice.branchId }"
          type="button"
          :disabled="selectedId !== null"
          :aria-label="`Evolve into ${choice.name}`"
          @click="selectBranch(choice.branchId)"
        >
          <span class="portrait">
            <img :src="getUnitIconPath(choice.definitionId, gameMode)" :alt="choice.name" draggable="false" />
          </span>
          <span class="card-name">{{ choice.name }}</span>
          <span class="card-role" :class="`role-${choice.role.toLowerCase()}`">{{ formatRole(choice.role) }}</span>
          <span class="trait-row">
            <span
              v-for="trait in choice.traits"
              :key="trait"
              class="trait-tag"
              :style="traitTagStyle(trait)"
            >{{ trait }}</span>
          </span>
          <span class="stat-grid">
            <span>HP <b>{{ choice.maxHealth }}</b></span>
            <span>ATK <b>{{ choice.attackDamage }}</b></span>
            <span>DEF <b>{{ choice.defense }}</b></span>
            <span>SPD <b>{{ choice.attackSpeed.toFixed(2) }}</b></span>
            <span>Range <b>{{ choice.range }}</b></span>
            <span>Mana <b>{{ choice.maxMana }}</b></span>
          </span>
          <span v-if="choice.abilityName" class="ability">
            <span class="ability-name">{{ choice.abilityName }}</span>
            <span class="ability-description" v-html="choice.abilityDescription"></span>
          </span>
          <span v-if="laterFormsLabel(choice)" class="later-forms">{{ laterFormsLabel(choice) }}</span>
        </button>
      </div>

      <button type="button" class="cancel-button" @click="emit('close')">Decide later</button>
    </div>
  </div>
</template>

<style scoped>
.evolution-layer {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(2, 6, 23, 0.82);
  backdrop-filter: blur(10px);
}

.evolution-shell {
  width: min(1240px, 100%);
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.evolution-heading {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.evolution-label {
  padding: 4px 14px;
  border: 1px solid var(--room-accent, #f59e0b);
  border-radius: 999px;
  color: var(--room-accent, #f59e0b);
  background: rgba(15, 23, 42, 0.7);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 32px;
  line-height: 1.1;
}

.close-button {
  position: absolute;
  top: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.8);
  cursor: pointer;
}

.evolution-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.evolution-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 10px;
  border: 2px solid rgba(148, 163, 184, 0.45);
  border-radius: 8px;
  color: #f8fafc;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.evolution-card:hover,
.evolution-card:focus-visible {
  transform: translateY(-3px);
  border-color: var(--room-accent, #f59e0b);
  outline: none;
}

.evolution-card:disabled {
  cursor: default;
}

.evolution-card.selected {
  border-color: var(--room-accent, #f59e0b);
}

.portrait img {
  width: 84px;
  height: 84px;
  object-fit: contain;
}

.card-name {
  font-size: 18px;
  font-weight: 900;
}

.card-role {
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(148, 163, 184, 0.2);
}

.card-role.role-tank {
  color: #93c5fd;
}

.card-role.role-damage {
  color: #fca5a5;
}

.card-role.role-support {
  color: #86efac;
}

.trait-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.trait-tag {
  padding: 1px 6px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

.stat-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 8px;
  color: #cbd5e1;
  font-size: 12px;
}

.stat-grid b {
  color: #f8fafc;
}

.ability {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  line-height: 1.3;
}

.ability-name {
  color: var(--room-accent, #f59e0b);
  font-weight: 800;
}

.ability-description {
  color: #cbd5e1;
}

.ability-description :deep(.active) {
  color: #ffd700;
  font-weight: bold;
}

.ability-description :deep(.inactive) {
  color: #94a3b8;
}

.later-forms {
  color: #94a3b8;
  font-size: 11px;
  font-style: italic;
}

.cancel-button {
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.85);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 720px) {
  h2 {
    font-size: 22px;
    padding: 0 40px;
  }

  .evolution-grid {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  }
}
</style>
