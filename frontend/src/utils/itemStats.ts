import type { GameItem, ItemStat } from '../types'

const STAT_LABELS: Record<ItemStat, { label: string; percent: boolean }> = {
  MAX_HEALTH_PERCENT: { label: 'Max HP', percent: true },
  ATTACK_DAMAGE_PERCENT: { label: 'Attack', percent: true },
  DEFENSE_FLAT: { label: 'Defense', percent: false },
  ATTACK_SPEED_PERCENT: { label: 'Attack speed', percent: true },
  ABILITY_DAMAGE_PERCENT: { label: 'Ability damage', percent: true },
}

export function formatItemBonuses(item: Pick<GameItem, 'statBonuses'>): string[] {
  return (Object.keys(STAT_LABELS) as ItemStat[])
    .filter((stat) => item.statBonuses[stat])
    .map((stat) => {
      const { label, percent } = STAT_LABELS[stat]
      return `+${item.statBonuses[stat]}${percent ? '%' : ''} ${label}`
    })
}
