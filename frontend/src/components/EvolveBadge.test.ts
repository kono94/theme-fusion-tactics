import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EvolveBadge from './EvolveBadge.vue'

describe('EvolveBadge', () => {
  it('labels the unit and emits evolve without bubbling the click', async () => {
    let parentClicks = 0
    const wrapper = mount({
      components: { EvolveBadge },
      setup: () => ({ onParentClick: () => parentClicks++ }),
      template: '<div @click="onParentClick"><EvolveBadge unit-name="Eevee" /></div>',
    })
    const badge = wrapper.findComponent(EvolveBadge)

    await wrapper.get('[data-testid="evolve-badge"]').trigger('click')

    expect(wrapper.get('button').attributes('aria-label')).toBe('Choose evolution for Eevee')
    expect(wrapper.get('button').attributes('draggable')).toBe('false')
    expect(badge.emitted('evolve')).toHaveLength(1)
    expect(parentClicks).toBe(0)
  })

  it('reports when the pointer enters and leaves the button', async () => {
    const wrapper = mount(EvolveBadge, { props: { unitName: 'Eevee' } })

    await wrapper.trigger('mouseenter')
    await wrapper.trigger('mouseleave')

    expect(wrapper.emitted('hover-start')).toHaveLength(1)
    expect(wrapper.emitted('hover-end')).toHaveLength(1)
  })

  it('uses the board placement by default and the bench placement on request', () => {
    expect(mount(EvolveBadge, { props: { unitName: 'Eevee' } }).classes()).toContain('board')
    expect(
      mount(EvolveBadge, { props: { unitName: 'Eevee', placement: 'bench' } }).classes(),
    ).toContain('bench')
  })
})
