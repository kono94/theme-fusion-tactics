import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CombatView3d from './CombatView3d.vue'

describe('CombatView3d', () => {
  it('asks for the classic view when WebGL is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const wrapper = mount(CombatView3d, { props: { units: [], events: [], arenaId: 'wano' } })

    expect(wrapper.emitted('fallback')).toEqual([['unsupported']])
    expect(wrapper.text()).toContain('Wano Country')
    wrapper.unmount()
  })
})
