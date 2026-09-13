import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMatchHistory, MatchHistoryApiError } from './matchHistoryClient'

describe('match history client', () => {
    beforeEach(() => vi.restoreAllMocks())

    it('loads the public latest-match feed without credentials', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ matches: [] }), { status: 200 }),
        )

        await expect(getMatchHistory()).resolves.toEqual({ matches: [] })
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/match-history',
            expect.objectContaining({ cache: 'no-store' }),
        )
        const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
        expect(headers.has('Authorization')).toBe(false)
    })

    it('surfaces public endpoint failures with their status', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ error: 'temporarily unavailable' }), { status: 503 }),
        )

        await expect(getMatchHistory()).rejects.toEqual(
            new MatchHistoryApiError(503, 'temporarily unavailable'),
        )
    })
})
