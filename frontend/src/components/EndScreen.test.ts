import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlayerState } from '../types'
import EndScreen from './EndScreen.vue'

afterEach(() => {
    vi.useRealTimers()
})

function player(): PlayerState {
    return {
        playerId: 'player-1',
        name: 'Player',
        health: 0,
        gold: 10,
        level: 6,
        xp: 0,
        nextLevelXp: 20,
        place: 2,
        combatSide: null,
        bench: [],
        board: [],
        shop: [],
        lootOrbs: [],
        augmentChoices: [],
        selectedAugments: [],
        isGhost: false,
        isBot: false,
        botPersonality: null,
        matchStats: {
            damageDealt: 12_345,
            healingDone: 678,
            shieldingDone: 910,
            roundsWon: 2,
            roundsLost: 1,
            roundsDrawn: 0,
            rounds: [
                { round: 1, outcome: 'WIN' },
                { round: 2, outcome: 'LOSS' },
                { round: 3, outcome: 'WIN' },
            ],
        },
    }
}

describe('EndScreen match summary', () => {
    it('shows simple aggregate stats and round results', () => {
        const wrapper = mount(EndScreen, {
            props: { players: [player()], myPlayerId: 'player-1' },
        })

        expect(wrapper.get('.match-record').text()).toContain('2W')
        expect(wrapper.get('.match-record').text()).toContain('1L')
        expect(wrapper.get('.match-summary__totals').text()).toContain('12,345')
        expect(wrapper.findAll('.round-result').map(result => result.text())).toEqual(['R1W', 'R2L', 'R3W'])

        wrapper.unmount()
    })

    it('cancels pending animation timers when unmounted', () => {
        vi.useFakeTimers()
        const wrapper = mount(EndScreen, {
            props: { players: [player()], myPlayerId: 'player-1' },
        })

        expect(vi.getTimerCount()).toBe(1)

        wrapper.unmount()

        expect(vi.getTimerCount()).toBe(0)
        expect(() => vi.runAllTimers()).not.toThrow()
    })
})
