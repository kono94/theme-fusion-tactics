import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const activate = vi.fn()
let onConnect: (() => void) | undefined

vi.mock('@stomp/stompjs', () => ({
    Client: vi.fn(function MockClient(options: { onConnect?: () => void }) {
        onConnect = options.onConnect
        return { activate, deactivate: vi.fn(), publish: vi.fn(), subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) }
    }),
}))

import App from './App.vue'

describe('admin route bootstrap', () => {
    beforeEach(() => {
        activate.mockClear()
        onConnect = undefined
        localStorage.clear()
        sessionStorage.clear()
        window.location.hash = '#/admin/analytics'
    })

    it('renders the admin login without starting the game websocket', async () => {
        const wrapper = mount(App)
        await wrapper.vm.$nextTick()
        expect(wrapper.get('h1').text()).toBe('Analytics admin')
        expect(activate).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('returns to the lobby when a restored room no longer exists', async () => {
        window.location.hash = ''
        localStorage.setItem(
            'tactics.activeRoom',
            JSON.stringify({ roomId: 'gone-room', playerName: 'Player_1', reconnectToken: 'token' }),
        )
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }), {
                status: 200,
            }),
        )

        const wrapper = mount(App)
        await new Promise((resolve) => window.setTimeout(resolve, 0))
        expect(onConnect).toBeDefined()
        vi.useFakeTimers()
        onConnect?.()
        await wrapper.vm.$nextTick()
        vi.advanceTimersByTime(5000)
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('Your previous game is no longer available.')
        expect(localStorage.getItem('tactics.activeRoom')).toBeNull()
        wrapper.unmount()
        vi.useRealTimers()
    })
})
