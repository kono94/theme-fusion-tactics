import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Lobby from './Lobby.vue'

describe('Lobby mode theme', () => {
    it('renders generated creation and manual joining', async () => {
        const wrapper = mount(Lobby, {
            props: {
                title: 'Pokemon Tactics',
                themeClass: 'theme-pokemon',
            },
        })

        expect(wrapper.find('.lobby').classes()).toContain('theme-pokemon')
        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('.subtitle').text()).toBe('Create or join a tactics room')
        expect(wrapper.findAll('input')).toHaveLength(1)

        await wrapper.find('.card button').trigger('click')
        await wrapper.find('input').setValue('FRIEND')
        await wrapper.find('.secondary').trigger('click')

        expect(wrapper.emitted('create')).toEqual([[]])
        expect(wrapper.emitted('join')).toEqual([['FRIEND']])
    })
})
