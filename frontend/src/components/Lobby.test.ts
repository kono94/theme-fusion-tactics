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

    it('shows an invite-only name confirmation without a room field', async () => {
        const wrapper = mount(Lobby, {
            props: {
                title: 'Theme Fusion Tactics',
                inviteRoomId: 'FRIEND',
                playerName: '',
            },
        })

        expect(wrapper.find('.subtitle').text()).toContain('FRIEND')
        expect(wrapper.find('[data-test="room-id-input"]').exists()).toBe(false)
        expect(wrapper.find('.actions').exists()).toBe(false)
        expect(wrapper.get<HTMLButtonElement>('[data-test="invite-continue"]').element.disabled).toBe(true)

        await wrapper.get('[data-test="player-name-input"]').setValue('Robin')
        await wrapper.setProps({ playerName: 'Robin' })
        await wrapper.get('[data-test="invite-continue"]').trigger('click')
        expect(wrapper.emitted('join')).toEqual([['FRIEND']])
    })
})
