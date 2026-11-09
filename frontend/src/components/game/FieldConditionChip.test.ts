import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { FieldConditionView } from '../../types'
import FieldConditionChip from './FieldConditionChip.vue'

const sandstorm: FieldConditionView = {
  id: 'sandstorm',
  name: 'Sandstorm',
  description: 'Units that are not Rock, Ground or Steel lose 3% max HP every second.',
  icon: '/assets/field-conditions/sandstorm.png',
  remainingMs: 7200,
}

describe('FieldConditionChip', () => {
  it('shows the active condition with its remaining seconds and description tooltip', () => {
    const wrapper = mount(FieldConditionChip, { props: { condition: sandstorm, forecast: false } })

    expect(wrapper.get('img').attributes('src')).toBe('/assets/field-conditions/sandstorm.png')
    expect(wrapper.get('.field-chip-name').text()).toBe('Sandstorm')
    expect(wrapper.get('.field-chip-time').text()).toBe('8s')
    expect(wrapper.get('[role="tooltip"]').text()).toContain('lose 3% max HP')
    expect(wrapper.find('.field-chip-prefix').exists()).toBe(false)
  })

  it('labels the planning forecast and omits the timer for whole-combat conditions', () => {
    const wrapper = mount(FieldConditionChip, {
      props: { condition: { ...sandstorm, remainingMs: null }, forecast: true },
    })

    expect(wrapper.classes()).toContain('forecast')
    expect(wrapper.get('.field-chip-prefix').text()).toBe('Forecast')
    expect(wrapper.find('.field-chip-time').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('Forecast for the next fight: Sandstorm')
  })
})
