import { describe, expect, it, vi } from 'vitest'
import { buildInviteUrl, generateRoomCode, isInviteRoute, parseInviteRoomId } from './roomInvite'

describe('room invites', () => {
    it('generates an unambiguous six-character room code', () => {
        vi.spyOn(crypto, 'getRandomValues').mockImplementation((values) => {
            const bytes = values as Uint8Array
            bytes.set([0, 1, 7, 23, 24, 31])
            return values
        })

        expect(generateRoomCode()).toBe('ABHZ29')
    })

    it('builds and parses a room invite URL', () => {
        const invite = buildInviteUrl('ABC_23', 'https://tft.example/game?source=test#old')

        expect(invite).toBe('https://tft.example/game?source=test#/join/ABC_23')
        expect(parseInviteRoomId(new URL(invite).hash)).toBe('ABC_23')
        expect(isInviteRoute(new URL(invite).hash)).toBe(true)
    })

    it.each(['#/join/', '#/join/with space', '#/join/a/b', '#/other/ABC123'])(
        'rejects invalid invite route %s',
        (hash) => {
            expect(parseInviteRoomId(hash)).toBeNull()
        },
    )
})
