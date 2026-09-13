import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState } from './types'
import { TRAIT_DATA } from './data/traitData'

const stomp = vi.hoisted(() => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
    publish: vi.fn(),
    onConnect: undefined as (() => void) | undefined,
    subscriptions: [] as Array<{ destination: string; callback: (message: { body: string }) => void }>,
}))

const roomInvite = vi.hoisted(() => ({
    generateRoomCode: vi.fn(),
}))

vi.mock('@stomp/stompjs', () => ({
    Client: vi.fn(function MockClient(options: { onConnect?: () => void }) {
        stomp.onConnect = options.onConnect
        return {
            activate: stomp.activate,
            deactivate: stomp.deactivate,
            publish: stomp.publish,
            subscribe: vi.fn((destination: string, callback: (message: { body: string }) => void) => {
                stomp.subscriptions.push({ destination, callback })
                return { unsubscribe: vi.fn() }
            }),
        }
    }),
}))

vi.mock('./components/GameInterface.vue', () => ({
    default: { template: '<div data-test="game-interface" />' },
}))

vi.mock('./utils/roomInvite', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./utils/roomInvite')>()
    return { ...actual, generateRoomCode: roomInvite.generateRoomCode }
})

import App from './App.vue'

function roomState(gameMode: GameState['gameMode']): GameState {
    return {
        roomId: 'mode-room',
        hostId: 'host',
        phase: 'LOBBY',
        round: 1,
        timeRemainingMs: 0,
        totalPhaseDuration: 0,
        players: {},
        matchups: {},
        recentEvents: [],
        damageLog: {},
        gameMode,
        planningTimerPaused: false,
        planningReadyPlayerId: null,
        planningPauseReason: null,
    }
}

const traits = (name: string) => [{
    id: name.toLowerCase(),
    name,
    description: `${name} trait`,
    effects: [],
    type: 'type',
    iconColor: '#5bc9e8',
}]

describe('App game-mode bootstrap', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        stomp.activate.mockClear()
        stomp.deactivate.mockClear()
        stomp.publish.mockClear()
        stomp.onConnect = undefined
        stomp.subscriptions.length = 0
        roomInvite.generateRoomCode.mockReset()
        roomInvite.generateRoomCode.mockReturnValue('ABC234')
        localStorage.clear()
        sessionStorage.clear()
        Object.keys(TRAIT_DATA).forEach((key) => delete TRAIT_DATA[key])
        document.head.innerHTML = '<link rel="icon" href="/favicon.svg"><link rel="icon" href="/duplicate.svg">'
        window.location.hash = ''
    })

    it('ignores unsupported configured modes and applies the supported default metadata', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                defaultGameMode: 'retired-mode',
                availableModes: ['retired-mode', 'onepiece', 'pokemon'],
            }),
        }))

        sessionStorage.setItem('tactics.activeRoom', JSON.stringify({
            roomId: 'mode-room',
            playerName: 'ModeTester',
            reconnectToken: 'token',
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.activate).toHaveBeenCalled())

        expect(document.title).toBe('Theme Fusion Tactics — One Piece')
        expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(1)
        expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.svg')
        wrapper.unmount()
    })

    it('ignores a stale trait response after switching modes', async () => {
        let resolvePokemon!: (response: unknown) => void
        let resolveOnepiece!: (response: unknown) => void
        const pokemonResponse = new Promise((resolve) => { resolvePokemon = resolve })
        const onepieceResponse = new Promise((resolve) => { resolveOnepiece = resolve })

        vi.stubGlobal('fetch', vi.fn((request: string) => {
            if (request === '/api/config') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
                })
            }
            if (request.includes('mode=pokemon')) return pokemonResponse
            return onepieceResponse
        }))

        sessionStorage.setItem('tactics.activeRoom', JSON.stringify({
            roomId: 'mode-room',
            playerName: 'ModeTester',
            reconnectToken: 'token',
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())
        stomp.onConnect?.()
        await vi.waitFor(() => expect(stomp.subscriptions).toHaveLength(3))

        const stateSubscription = stomp.subscriptions.find(({ destination }) => destination.endsWith('/mode-room'))
        expect(stateSubscription).toBeDefined()
        stateSubscription?.callback({ body: JSON.stringify(roomState('pokemon')) })
        stateSubscription?.callback({ body: JSON.stringify(roomState('onepiece')) })

        resolveOnepiece({ ok: true, json: async () => traits('One Piece') })
        await vi.waitFor(() => expect(TRAIT_DATA.one_piece?.name).toBe('One Piece'))
        resolvePokemon({ ok: true, json: async () => traits('Pokemon') })
        await Promise.resolve()

        expect(TRAIT_DATA.one_piece?.name).toBe('One Piece')
        expect(TRAIT_DATA.pokemon).toBeUndefined()
        wrapper.unmount()
    })

    it('returns to the lobby when a room state contains an unsupported mode', async () => {
        const fetchMock = vi.fn((request: string) => {
            if (request === '/api/config') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
                })
            }
            return Promise.resolve({ ok: true, json: async () => traits('Pokemon') })
        })
        vi.stubGlobal('fetch', fetchMock)

        sessionStorage.setItem('tactics.activeRoom', JSON.stringify({
            roomId: 'mode-room',
            playerName: 'ModeTester',
            reconnectToken: 'token',
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())
        stomp.onConnect?.()
        await vi.waitFor(() => expect(stomp.subscriptions).toHaveLength(3))

        const stateSubscription = stomp.subscriptions.find(({ destination }) => destination.endsWith('/mode-room'))
        expect(stateSubscription).toBeDefined()
        stateSubscription?.callback({ body: JSON.stringify(roomState('pokemon')) })
        stateSubscription?.callback({
            body: JSON.stringify({ ...roomState('pokemon'), gameMode: 'retired-mode' }),
        })

        await vi.waitFor(() => expect(wrapper.find('.lobby-error').text()).toContain(
            'Unsupported game mode received from server: retired-mode',
        ))
        expect(wrapper.find('.lobby').exists()).toBe(true)
        expect(fetchMock.mock.calls.some(([request]) => String(request).includes('mode=retired-mode'))).toBe(false)
        expect(sessionStorage.getItem('tactics.activeRoom')).toBeNull()
        wrapper.unmount()
    })

    it('persists the server-acknowledged player id for room identity', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                defaultGameMode: 'onepiece',
                availableModes: ['onepiece', 'pokemon'],
            }),
        }))
        sessionStorage.setItem('tactics.activeRoom', JSON.stringify({
            roomId: 'mode-room',
            playerName: 'DuplicateName',
            reconnectToken: 'token',
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()
        await vi.waitFor(() => expect(stomp.subscriptions).toHaveLength(3))
        const resultSubscription = stomp.subscriptions.find(({ destination }) => destination === '/user/queue/room-result')
        resultSubscription?.callback({
            body: JSON.stringify({
                accepted: true,
                roomId: 'mode-room',
                playerId: 'server-player-id',
                code: null,
                message: null,
            }),
        })

        await vi.waitFor(() => {
            const session = JSON.parse(sessionStorage.getItem('tactics.activeRoom') || '{}')
            expect(session.playerId).toBe('server-player-id')
        })
        wrapper.unmount()
    })

    it('creates a room with a generated code', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()
        await vi.waitFor(() => expect(wrapper.find('[data-test="player-name-input"]').exists()).toBe(true))
        await wrapper.find('[data-test="player-name-input"]').setValue('  Luffy  ')
        await wrapper.find('.card button').trigger('click')

        expect(stomp.subscriptions.map(({ destination: subscribedTo }) => subscribedTo)).toEqual(
            expect.arrayContaining([
                '/topic/room/ABC234',
                '/topic/room/ABC234/event',
            ])
        )
        const publishedRequest = stomp.publish.mock.calls.find(([request]) => request.destination === '/app/create')?.[0]
        expect(publishedRequest).toBeDefined()
        expect(JSON.parse(publishedRequest.body).roomId).toBe('ABC234')
        expect(JSON.parse(publishedRequest.body).playerName).toBe('Luffy')
        expect(localStorage.getItem('tactics.playerName')).toBe('Luffy')
        expect(JSON.parse(sessionStorage.getItem('tactics.activeRoom') || '{}').roomId).toBe('ABC234')
        wrapper.unmount()
    })

    it('restores the saved player name on a later visit', async () => {
        localStorage.setItem('tactics.playerName', 'Chopper')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()

        await vi.waitFor(() => {
            expect(wrapper.get<HTMLInputElement>('[data-test="player-name-input"]').element.value).toBe('Chopper')
        })
        wrapper.unmount()
    })

    it('normalizes a manually entered room id before joining', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()
        await vi.waitFor(() => expect(wrapper.find('[data-test="room-id-input"]').exists()).toBe(true))
        await wrapper.find('[data-test="player-name-input"]').setValue('Zoro')
        await wrapper.find('[data-test="room-id-input"]').setValue('  canonical-room  ')
        await wrapper.find('.secondary').trigger('click')

        const publishedRequest = stomp.publish.mock.calls.find(([request]) => request.destination === '/app/join')?.[0]
        expect(JSON.parse(publishedRequest.body).roomId).toBe('canonical-room')
        wrapper.unmount()
    })

    it('waits for a player name before joining a valid invite link', async () => {
        window.location.hash = '#/join/FRIEND'
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()

        await vi.waitFor(() => expect(wrapper.find('.subtitle').text()).toContain('FRIEND'))
        expect(stomp.publish.mock.calls.some(([published]) => published.destination === '/app/join')).toBe(false)
        expect(wrapper.find('[data-test="room-id-input"]').exists()).toBe(false)
        expect(wrapper.get<HTMLButtonElement>('[data-test="invite-continue"]').element.disabled).toBe(true)

        await wrapper.find('[data-test="player-name-input"]').setValue('Robin')
        await wrapper.find('[data-test="invite-continue"]').trigger('click')

        const request = stomp.publish.mock.calls.find(([published]) => published.destination === '/app/join')?.[0]
        expect(JSON.parse(request.body)).toMatchObject({ roomId: 'FRIEND', playerName: 'Robin' })
        expect(window.location.hash).toBe('')
        wrapper.unmount()
    })

    it('joins a valid invite automatically when a player name is remembered', async () => {
        window.location.hash = '#/join/FRIEND'
        localStorage.setItem('tactics.playerName', 'Robin')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()

        await vi.waitFor(() => {
            const requests = stomp.publish.mock.calls.filter(([published]) => published.destination === '/app/join')
            expect(requests).toHaveLength(1)
            expect(JSON.parse(requests[0][0].body)).toMatchObject({ roomId: 'FRIEND', playerName: 'Robin' })
        })
        expect(window.location.hash).toBe('')
        expect(wrapper.find('[data-test="player-name-input"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('joins an invite added after the WebSocket connects when a name is remembered', async () => {
        localStorage.setItem('tactics.playerName', 'Robin')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()
        await vi.waitFor(() => expect(wrapper.find('[data-test="player-name-input"]').exists()).toBe(true))

        window.location.hash = '#/join/LATER'

        await vi.waitFor(() => {
            const requests = stomp.publish.mock.calls.filter(([published]) => published.destination === '/app/join')
            expect(requests).toHaveLength(1)
            expect(JSON.parse(requests[0][0].body)).toMatchObject({ roomId: 'LATER', playerName: 'Robin' })
        })
        expect(window.location.hash).toBe('')
        wrapper.unmount()
    })

    it('returns to the lobby when an automatically joined invite is rejected', async () => {
        window.location.hash = '#/join/MISSING'
        localStorage.setItem('tactics.playerName', 'Robin')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()
        await vi.waitFor(() => expect(
            stomp.publish.mock.calls.some(([published]) => published.destination === '/app/join'),
        ).toBe(true))

        const resultSubscription = stomp.subscriptions.find(({ destination }) => destination === '/user/queue/room-result')
        resultSubscription?.callback({
            body: JSON.stringify({
                accepted: false,
                roomId: 'MISSING',
                playerId: null,
                code: 'ROOM_NOT_FOUND',
                message: 'That room does not exist.',
            }),
        })

        await vi.waitFor(() => expect(wrapper.find('.lobby-error').text()).toContain('That room does not exist.'))
        expect(wrapper.find('[data-test="room-id-input"]').exists()).toBe(true)
        expect(sessionStorage.getItem('tactics.activeRoom')).toBeNull()
        wrapper.unmount()
    })

    it('uses the active invite session to recover after reconnecting before acknowledgement', async () => {
        window.location.hash = '#/join/RECOVER'
        localStorage.setItem('tactics.playerName', 'Robin')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())

        stomp.onConnect?.()
        await vi.waitFor(() => expect(
            stomp.publish.mock.calls.filter(([published]) => published.destination === '/app/join'),
        ).toHaveLength(1))
        const firstRequest = stomp.publish.mock.calls.find(([published]) => published.destination === '/app/join')?.[0]
        const firstBody = JSON.parse(firstRequest.body)

        stomp.onConnect?.()

        await vi.waitFor(() => expect(
            stomp.publish.mock.calls.filter(([published]) => published.destination === '/app/join'),
        ).toHaveLength(2))
        const joinRequests = stomp.publish.mock.calls
            .filter(([published]) => published.destination === '/app/join')
            .map(([published]) => JSON.parse(published.body))

        expect(joinRequests[1]).toMatchObject({
            roomId: 'RECOVER',
            playerName: 'Robin',
            reconnectToken: firstBody.reconnectToken,
        })
        wrapper.unmount()
    })

    it('retries a generated code collision', async () => {
        roomInvite.generateRoomCode
            .mockReturnValueOnce('COLLIDE')
            .mockReturnValueOnce('NEW234')
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ defaultGameMode: 'onepiece', availableModes: ['onepiece', 'pokemon'] }),
        }))
        const wrapper = mount(App)
        await vi.waitFor(() => expect(stomp.onConnect).toBeDefined())
        stomp.onConnect?.()
        await vi.waitFor(() => expect(wrapper.find('.card button').exists()).toBe(true))
        await wrapper.find('[data-test="player-name-input"]').setValue('Sanji')
        await wrapper.find('.card button').trigger('click')

        const resultSubscription = stomp.subscriptions.find(({ destination }) => destination === '/user/queue/room-result')
        resultSubscription?.callback({
            body: JSON.stringify({
                accepted: false,
                roomId: 'COLLIDE',
                playerId: null,
                code: 'ROOM_EXISTS',
                message: 'A room with that ID already exists.',
            }),
        })

        await vi.waitFor(() => {
            const roomIds = stomp.publish.mock.calls
                .filter(([request]) => request.destination === '/app/create')
                .map(([request]) => JSON.parse(request.body).roomId)
            expect(roomIds).toEqual(['COLLIDE', 'NEW234'])
        })
        wrapper.unmount()
    })
})
