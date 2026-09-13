import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DamageReport from './DamageReport.vue'

describe('DamageReport', () => {
  it('shows post-mitigation damage taken per unit', async () => {
    const wrapper = mount(DamageReport, {
      props: {
        myPlayerId: 'player-1',
        gameMode: 'onepiece',
        damageLog: {
          hero: {
            unitName: 'Hero',
            definitionId: 'hero',
            lineId: 'hero-line',
            starLevel: 1,
            ownerId: 'player-1',
            damage: 900,
            damageTaken: 450,
            healing: 0,
            shielding: 0,
          },
        },
      },
    })

    await wrapper.findAll('.metric-tab-btn')[1].trigger('click')

    expect(wrapper.get('.unit-name').text()).toBe('Hero')
    expect(wrapper.get('.dmg-val').text()).toBe('450')
  })

  it('shows the damage taken empty state when no unit took damage', async () => {
    const wrapper = mount(DamageReport, {
      props: {
        myPlayerId: 'player-1',
        damageLog: {},
      },
    })

    await wrapper.findAll('.metric-tab-btn')[1].trigger('click')

    expect(wrapper.get('.empty-state').text()).toContain('No damage taken data available')
  })
})
