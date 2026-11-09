import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FieldConditionOverlay from './FieldConditionOverlay.vue'

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches })),
  )
}

describe('FieldConditionOverlay', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['rain', 'field-rain'],
    ['sun', 'field-sun'],
    ['sandstorm', 'field-sand'],
    ['hail', 'field-hail'],
  ])('renders %s particles with the %s class', (conditionId, className) => {
    mockReducedMotion(false)
    const wrapper = mount(FieldConditionOverlay, { props: { conditionId } })

    const overlay = wrapper.get('[data-testid="field-condition-overlay"]')
    expect(overlay.classes()).toContain(className)
    expect(overlay.classes()).not.toContain('reduced-motion')
    expect(wrapper.findAll('.particle').length).toBeGreaterThan(0)
  })

  it('renders nothing for conditions without visuals', () => {
    mockReducedMotion(false)
    const wrapper = mount(FieldConditionOverlay, { props: { conditionId: 'clear' } })

    expect(wrapper.find('[data-testid="field-condition-overlay"]').exists()).toBe(false)
  })

  it('swaps moving particles for a static tint when reduced motion is preferred', () => {
    mockReducedMotion(true)
    const wrapper = mount(FieldConditionOverlay, { props: { conditionId: 'rain' } })

    const overlay = wrapper.get('[data-testid="field-condition-overlay"]')
    expect(overlay.classes()).toContain('reduced-motion')
    expect(wrapper.findAll('.particle')).toHaveLength(0)
  })
})
