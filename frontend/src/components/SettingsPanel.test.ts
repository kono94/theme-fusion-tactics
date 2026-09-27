import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsPanel from './SettingsPanel.vue'

describe('SettingsPanel', () => {
  it('opens the panel and marks the 3D view as a preview', async () => {
    const wrapper = mount(SettingsPanel, { props: { settings: { combatView: 'classic' } } })

    expect(wrapper.find('.settings-panel').exists()).toBe(false)
    await wrapper.find('.settings-trigger').trigger('click')

    expect(wrapper.find('.settings-panel').text()).toContain('3D battle view')
    expect(wrapper.find('.preview-badge').text()).toBe('Preview')
    expect((wrapper.find('input.switch').element as HTMLInputElement).checked).toBe(false)
  })

  it('emits the toggled combat view', async () => {
    const wrapper = mount(SettingsPanel, { props: { settings: { combatView: 'classic' } } })
    await wrapper.find('.settings-trigger').trigger('click')

    await wrapper.find('input.switch').setValue(true)
    expect(wrapper.emitted('update-settings')?.[0]).toEqual([{ combatView: '3d' }])

    await wrapper.setProps({ settings: { combatView: '3d' } })
    await wrapper.find('input.switch').setValue(false)
    expect(wrapper.emitted('update-settings')?.[1]).toEqual([{ combatView: 'classic' }])
  })

  it('explains when 3D is unavailable on the device', async () => {
    const wrapper = mount(SettingsPanel, {
      props: { settings: { combatView: '3d' }, combat3dUnavailable: true },
    })
    await wrapper.find('.settings-trigger').trigger('click')

    expect(wrapper.find('.setting-warning').exists()).toBe(true)
  })
})
