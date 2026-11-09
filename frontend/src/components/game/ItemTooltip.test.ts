import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { GameItem } from '../../types'
import ItemTooltip from './ItemTooltip.vue'

const statOnly: GameItem = {
  instanceId: 'axe-1',
  id: 'onepiece_axe',
  name: 'Haki Axe',
  description: '+40% ATK',
  icon: '/assets/items/onepiece/axe.png',
  statBonuses: { ATTACK_DAMAGE_PERCENT: 40 },
  effects: [],
}

const leftovers: GameItem = {
  instanceId: 'leftovers-1',
  id: 'pokemongen23_leftovers',
  name: 'Leftovers',
  description: 'Restores 1.5% max HP every second in combat.',
  icon: '/assets/items/pokemongen23/leftovers.png',
  statBonuses: { MAX_HEALTH_PERCENT: 20 },
  effects: [{ type: 'REGEN_MAX_HEALTH_PERCENT', values: { percentPerSecond: 1.5 } }],
}

describe('ItemTooltip', () => {
  it('shows only the formatted stat lines for stat-only items', () => {
    const wrapper = mount(ItemTooltip, { props: { item: statOnly } })

    expect(wrapper.text()).toContain('+40% Attack')
    expect(wrapper.find('.item-tooltip-effect').exists()).toBe(false)
  })

  it('shows the stat lines and the effect description for items with effects', () => {
    const wrapper = mount(ItemTooltip, { props: { item: leftovers } })

    expect(wrapper.text()).toContain('+20% Max HP')
    expect(wrapper.get('.item-tooltip-effect').text()).toBe(
      'Restores 1.5% max HP every second in combat.',
    )
  })
})
