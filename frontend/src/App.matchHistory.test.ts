import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const activate = vi.fn()
const deactivate = vi.fn()

vi.mock('@stomp/stompjs', () => ({
    Client: vi.fn(function MockClient() {
        return {
            activate,
            deactivate,
            publish: vi.fn(),
            subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
        }
    }),
}))

import App from './App.vue'

describe('public match history route', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        activate.mockClear()
        deactivate.mockClear()
        localStorage.clear()
        sessionStorage.clear()
        window.location.hash = '#/match-history'
    })

    it('renders the public page without starting the game websocket', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ matches: [] }), { status: 200 }),
        )
        const wrapper = mount(App)

        await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('Match history'))
        expect(activate).not.toHaveBeenCalled()
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/match-history',
            expect.objectContaining({ cache: 'no-store' }),
        )
        wrapper.unmount()
    })
})
