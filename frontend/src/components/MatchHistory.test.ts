import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMatchHistory, MatchHistoryApiError } from '../services/matchHistoryClient'
import MatchHistory from './MatchHistory.vue'

vi.mock('../services/matchHistoryClient', () => ({
    getMatchHistory: vi.fn(),
    MatchHistoryApiError: class MatchHistoryApiError extends Error {
        constructor(public readonly status: number, message: string) {
            super(message)
        }
    },
}))

const getMatchHistoryMock = vi.mocked(getMatchHistory)

const match = {
    historyId: 'history-1',
    mode: 'pokemon',
    completedAt: '2026-09-13T18:00:00Z',
    finalRound: 14,
    finalPlacement: 3,
    finalComposition: [{
        definitionId: 'mewtwo',
        lineId: 'mewtwo',
        starLevel: 1,
        itemIds: ['item-1'],
    }],
}

describe('MatchHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getMatchHistoryMock.mockResolvedValue({ matches: [match] })
    })

    it('renders completed matches and their final compositions', async () => {
        const wrapper = mount(MatchHistory)

        await vi.waitFor(() => expect(wrapper.find('[data-test="match-history-card"]').exists()).toBe(true))
        expect(wrapper.text()).toContain('Pokemon solo match')
        expect(wrapper.text()).toContain('Final round 14')
        expect(wrapper.text()).toContain('1 real player vs 7 bots')
        expect(wrapper.text()).toContain('★')
        expect(wrapper.text()).toContain('Item 1')
    })

    it('uses the server history ID for distinct cards with matching metadata', async () => {
        getMatchHistoryMock.mockResolvedValue({
            matches: [match, { ...match, historyId: 'history-2' }],
        })
        const wrapper = mount(MatchHistory)

        await vi.waitFor(() => expect(wrapper.findAll('[data-test="match-history-card"]')).toHaveLength(2))
    })

    it('shows an empty state when no matches qualify', async () => {
        getMatchHistoryMock.mockResolvedValue({ matches: [] })
        const wrapper = mount(MatchHistory)

        await vi.waitFor(() => expect(wrapper.find('[data-test="match-history-empty"]').exists()).toBe(true))
        expect(wrapper.text()).toContain('No completed solo matches yet.')
    })

    it('offers retry after an API failure', async () => {
        getMatchHistoryMock
            .mockRejectedValueOnce(new MatchHistoryApiError(503, 'temporarily unavailable'))
            .mockResolvedValueOnce({ matches: [match] })
        const wrapper = mount(MatchHistory)

        await vi.waitFor(() => expect(wrapper.find('[data-test="match-history-error"]').exists()).toBe(true))
        await wrapper.get('[data-test="match-history-retry"]').trigger('click')
        await vi.waitFor(() => expect(wrapper.find('[data-test="match-history-card"]').exists()).toBe(true))
        expect(getMatchHistoryMock).toHaveBeenCalledTimes(2)
    })

    it('emits back from the standalone page', async () => {
        const wrapper = mount(MatchHistory)
        await wrapper.get('.back-button').trigger('click')
        expect(wrapper.emitted('back')).toHaveLength(1)
    })
})
