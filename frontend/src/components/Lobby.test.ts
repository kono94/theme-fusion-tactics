import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Lobby from './Lobby.vue'

describe('Lobby mode theme', () => {
    it('renders generated creation and manual joining', async () => {
        const wrapper = mount(Lobby, {
            props: {
                title: 'Pokemon Tactics',
                playerName: 'Nami',
                themeClass: 'theme-pokemon',
            },
        })

        expect(wrapper.find('.lobby').classes()).toContain('theme-pokemon')
        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('.subtitle').text()).toBe('Create or join a tactics room')
        expect(wrapper.findAll('input')).toHaveLength(2)

        await wrapper.find('.card button').trigger('click')
        await wrapper.find('[data-test="room-id-input"]').setValue('FRIEND')
        await wrapper.find('.secondary').trigger('click')

        expect(wrapper.emitted('create')).toEqual([[]])
        expect(wrapper.emitted('join')).toEqual([['FRIEND']])
    })

    it('requires a name and prefills an invited room', async () => {
        const wrapper = mount(Lobby, {
            props: {
                title: 'Theme Fusion Tactics',
                inviteRoomId: 'FRIEND',
                playerName: '',
            },
        })

        expect(wrapper.find('.subtitle').text()).toContain('FRIEND')
        expect(wrapper.get<HTMLInputElement>('[data-test="room-id-input"]').element.value).toBe('FRIEND')
        expect(wrapper.get<HTMLButtonElement>('.secondary').element.disabled).toBe(true)
    })
})
