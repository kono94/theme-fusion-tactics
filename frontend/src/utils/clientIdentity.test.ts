import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    clearActiveRoomSession,
    createActiveRoomSession,
    getAnalyticsClientId,
    loadPlayerName,
    loadActiveRoomSession,
    savePlayerName,
    setActiveRoomPlayerId,
} from './clientIdentity'

describe('client identity', () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        vi.spyOn(crypto, 'randomUUID')
            .mockReturnValueOnce('10000000-0000-4000-8000-000000000001')
            .mockReturnValueOnce('10000000-0000-4000-8000-000000000002')
    })

    it('keeps the anonymous analytics id across visits', () => {
        expect(getAnalyticsClientId()).toBe('10000000-0000-4000-8000-000000000001')
        expect(getAnalyticsClientId()).toBe('10000000-0000-4000-8000-000000000001')
    })

    it('persists a normalized player name across visits', () => {
        savePlayerName('  Nami  ')
        expect(loadPlayerName()).toBe('Nami')
        expect(localStorage.getItem('tactics.playerName')).toBe('Nami')

        savePlayerName('   ')
        expect(loadPlayerName()).toBe('')
    })

    it('stores reconnect credentials across tabs in the same browser', () => {
        expect(createActiveRoomSession('room-1', 'Player_1')).toEqual({
            roomId: 'room-1',
            playerName: 'Player_1',
            reconnectToken: '10000000-0000-4000-8000-000000000001',
        })
        expect(localStorage.getItem('tactics.activeRoom')).not.toBeNull()
        expect(sessionStorage.getItem('tactics.activeRoom')).toBeNull()
        expect(loadActiveRoomSession()?.roomId).toBe('room-1')
        setActiveRoomPlayerId('room-1', 'player-1')
        expect(loadActiveRoomSession()?.playerId).toBe('player-1')
        clearActiveRoomSession()
        expect(loadActiveRoomSession()).toBeNull()
    })

    it('migrates an existing tab-scoped reconnect session', () => {
        sessionStorage.setItem(
            'tactics.activeRoom',
            JSON.stringify({
                roomId: 'room-1',
                playerName: 'Player_1',
                reconnectToken: 'legacy-token',
                playerId: 'player-1',
            }),
        )

        expect(loadActiveRoomSession()?.playerId).toBe('player-1')
        expect(localStorage.getItem('tactics.activeRoom')).not.toBeNull()
        expect(sessionStorage.getItem('tactics.activeRoom')).toBeNull()
    })
})
