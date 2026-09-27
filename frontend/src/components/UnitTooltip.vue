<script setup lang="ts">
import { computed } from 'vue'
import type { GameUnit, UnitDefinition, UnitRole, UnitStats } from '../types'
import { getTraitData } from '../data/traitData'

type TooltipUnit = Partial<GameUnit & UnitDefinition> & {
    formattedAbilityDescription?: string
}

type TooltipValue = number | string | (number | string)[] | null | undefined

const props = defineProps<{
    unit: TooltipUnit,
    placement?: 'top' | 'bottom',
    shift?: 'left' | 'more-left' | 'center',
    showCost?: boolean,
    preview?: UnitStats | null
}>()

const getBaseValue = (val: TooltipValue): number | string | undefined => {
    if (Array.isArray(val)) return val[0]
    return val ?? undefined
}

const stats = computed(() => {
    if (!props.unit) return {}
    const value = props.preview || props.unit
    const maxHp = Number(getBaseValue(value.maxHealth) ?? 100)
    // If currentHealth is missing (shop unit), use maxHealth
    const curHp = value.currentHealth !== undefined ? value.currentHealth : maxHp;
    // Units usually start with 0 mana unless specified
    const curMana = value.mana !== undefined ? value.mana : 0;
    
    return {
        hp: `${curHp || 0}/${maxHp || 100}`,
        atk: getBaseValue(value.attackDamage) || 0,
        defense: getBaseValue(value.defense) || 0,
        spd: parseFloat(String(getBaseValue(value.attackSpeed) || 0)).toFixed(2),
        range: getBaseValue(props.unit.range) || 0,
        mana: `${curMana || 0}/${getBaseValue(value.maxMana) || 100}`,
        abilityDamage: Math.round(((props.preview?.abilityDamageMultiplier ?? props.unit.abilityDamageMultiplier ?? 1) - 1) * 100),
        damageReduction: props.preview?.damageReduction ?? props.unit.damageReduction ?? 0,
        lifesteal: Math.round((props.preview?.lifesteal ?? props.unit.lifesteal ?? 0) * 100),
        shield: props.preview?.shield ?? props.unit.shield ?? 0,
    }
})

const starLevel = computed(() => props.unit.starLevel || 1)
const ability = computed(() => props.unit.ability)
const role = computed<UnitRole>(() => props.unit.role || 'DAMAGE')
const attackStyle = computed(() => Number(stats.value.range) === 1 ? 'MELEE' : 'RANGED')

const formatRole = (value: UnitRole): string =>
    value.charAt(0) + value.slice(1).toLowerCase()

const NEUTRAL_TRAIT_COLOR = '#94a3b8'

const traitTagStyle = (trait: string) => {
    const color = getTraitData(trait)?.iconColor || NEUTRAL_TRAIT_COLOR
    const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1]
    const backgroundColor = hex
        ? `rgba(${Number.parseInt(hex.slice(0, 2), 16)}, ${Number.parseInt(hex.slice(2, 4), 16)}, ${Number.parseInt(hex.slice(4, 6), 16)}, 0.14)`
        : 'rgba(148, 163, 184, 0.14)'

    return { color, borderColor: color, backgroundColor }
}

const rarityColor = computed(() => {
    const cost = props.unit.cost || 1
    switch (cost) {
        case 1: return '#94a3b8' // Common
        case 2: return '#22c55e' // Uncommon
        case 3: return '#3b82f6' // Rare
        case 4: return '#a855f7' // Epic
        case 5: return '#eab308' // Legendary
        default: return '#ffd700'
    }
})
</script>

<template>
  <div class="unit-tooltip" :class="[placement || 'top', shift ? `shift-${shift}` : '']">
      <div class="header">
          <span class="name" :style="{ color: rarityColor }">{{ unit.name }}</span>
          <span class="header-meta">
              <span v-if="showCost" class="unit-cost">{{ unit.cost || 1 }}g</span>
              <span class="stars">
                  <span v-for="n in starLevel" :key="n">⭐</span>
              </span>
          </span>
      </div>
      <div class="role-section">
          <span class="role-badge" :class="`role-${role.toLowerCase()}`">{{ formatRole(role) }}</span>
          <span class="range-badge" :class="`range-${attackStyle.toLowerCase()}`">{{ attackStyle }}</span>
      </div>
      <div v-if="preview" class="preview-label">{{ unit.y === -1 ? 'Item-adjusted bench stats' : 'Projected combat-start stats' }}</div>
      <div class="stats-grid">
          <div class="stat-row">
              <span class="label">HP:</span>
              <span class="value">{{ stats.hp }}</span>
          </div>
          <div class="stat-row">
              <span class="label">Mana:</span>
              <span class="value">{{ stats.mana }}</span>
          </div>
          <div class="stat-row">
              <span class="label">ATK:</span>
              <span class="value">{{ stats.atk }}</span>
          </div>
          <div class="stat-row">
              <span class="label">DEF:</span>
              <span class="value">{{ stats.defense }}</span>
          </div>
          <div class="stat-row">
              <span class="label">SPD:</span>
              <span class="value">{{ stats.spd }}</span>
          </div>
          <div class="stat-row">
              <span class="label">Range:</span>
              <span class="value">{{ stats.range }}</span>
          </div>
          <div v-if="stats.abilityDamage" class="stat-row"><span class="label">Ability dmg:</span><span class="value">+{{ stats.abilityDamage }}%</span></div>
          <div v-if="stats.damageReduction" class="stat-row"><span class="label">Damage reduction:</span><span class="value">{{ stats.damageReduction }}%</span></div>
          <div v-if="stats.lifesteal" class="stat-row"><span class="label">Lifesteal:</span><span class="value">{{ stats.lifesteal }}%</span></div>
          <div v-if="stats.shield" class="stat-row"><span class="label">Starting shield:</span><span class="value">{{ stats.shield }}</span></div>
      </div>
      
      <div class="ability-section" v-if="ability">
          <div class="ability-header">
              <span class="ability-name">{{ ability.name }}</span>
          </div>
          <div class="ability-description" v-html="unit.formattedAbilityDescription || ability.description">
          </div>
      </div>

      <div class="traits" v-if="unit.traits && unit.traits.length">
          <span v-for="trait in unit.traits" :key="trait" class="trait-tag" :style="traitTagStyle(trait)">{{ trait }}</span>
      </div>
  </div>
</template>

<style scoped>
.unit-tooltip :deep(.active) {
    color: #ffd700;
    font-weight: bold;
    font-style: normal;
}

.unit-tooltip :deep(.inactive) {
    color: #94a3b8;
    font-weight: normal;
    font-style: normal;
}
.unit-tooltip {
    position: absolute;
    left: 50%;
    transform: translateX(-30%);
    background-color: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 12px;
    color: white;
    width: 220px;
    z-index: 10000;
    pointer-events: none;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.unit-tooltip.shift-center {
    transform: translateX(-50%);
}

.unit-tooltip.shift-left {
    transform: translateX(-75%);
}

.unit-tooltip.shift-more-left {
    transform: translateX(-95%);
}

.unit-tooltip.top {
    bottom: 110%;
}

.unit-tooltip.bottom {
    top: 110%;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #334155;
    padding-bottom: 6px;
    margin-bottom: 6px;
}

.name {
    font-weight: bold;
    font-size: 0.95em;
    color: #ffd700;
}

.stars {
    font-size: 0.8em;
}

.header-meta {
    display: flex;
    align-items: center;
    gap: 6px;
}

.unit-cost {
    border: 1px solid currentColor;
    border-radius: 999px;
    padding: 1px 5px;
    color: #facc15;
    font-size: 0.7em;
    font-weight: 800;
}

.role-section {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 31px;
    padding-right: 68px;
    margin-bottom: 8px;
}

.role-badge {
    border: 1px solid currentColor;
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 0.72em;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    box-shadow: 0 2px 8px rgba(2, 6, 23, 0.22);
}

.role-damage {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.14);
}

.role-tank {
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.14);
}

.role-support {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.14);
}

.range-badge {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    border: 0;
    border-radius: 0;
    padding: 3px 0;
    font-size: 0.56em;
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1;
    opacity: 0.82;
}

.range-melee {
    color: #f59e0b;
    background: transparent;
}

.range-ranged {
    color: #d946ef;
    background: transparent;
}

.stats-grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 0.85em;
}

.stat-row {
    display: flex;
    justify-content: space-between;
}

.label {
    color: #94a3b8;
}

.value {
    font-weight: 500;
}

.ability-section {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #334155;
}

.ability-header {
    margin-bottom: 4px;
}

.ability-name {
    font-weight: bold;
    font-size: 0.85em;
    color: #60a5fa;
    text-transform: uppercase;
}

.ability-description {
    font-size: 0.8em;
    color: #cbd5e1;
    line-height: 1.4;
    font-style: italic;
}

.traits {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.trait-tag {
    border: 1px solid currentColor;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75em;
}
.preview-label { color: #93c5fd; font-size: .68em; margin: 4px 0; }
</style>
