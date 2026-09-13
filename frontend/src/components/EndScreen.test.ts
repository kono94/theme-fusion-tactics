import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlayerState } from '../types'
import EndScreen from './EndScreen.vue'

afterEach(() => {
  vi.useRealTimers()
})

function player(overrides: Partial<PlayerState> = {}): PlayerState {
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
      damageTaken: 7_654,
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
      unitStats: [
        {
          lineId: 'hero-line',
          definitionId: 'hero-v2',
          unitName: 'Hero',
          starLevel: 2,
          damageDealt: 9_876,
          damageTaken: 4_321,
          healingDone: 456,
          shieldingDone: 789,
        },
      ],
    },
    ...overrides,
  }
}

describe('EndScreen match summary', () => {
  it('shows simple aggregate stats and round results', () => {
    const wrapper = mount(EndScreen, {
      props: { players: [player()], myPlayerId: 'player-1', gameMode: 'onepiece' },
    })

    expect(wrapper.get('.match-record').text()).toContain('2W')
    expect(wrapper.get('.match-record').text()).toContain('1L')
    expect(wrapper.get('.match-summary__totals').text()).toContain('12,345')
    expect(wrapper.get('.match-summary__totals').text()).toContain('7,654')
    expect(wrapper.get('.unit-totals__table').text()).toContain('Hero')
    expect(wrapper.get('.unit-totals__table').text()).toContain('9,876')
    expect(wrapper.get('.unit-totals__table').text()).toContain('4,321')
    expect(wrapper.findAll('.round-result').map((result) => result.text())).toEqual([
      'R1W',
      'R2L',
      'R3W',
    ])

    wrapper.unmount()
  })

  it('shows another player summary when their ranking is selected', async () => {
    const rival = player({
      playerId: 'player-2',
      name: 'Rival',
      place: 1,
      matchStats: {
        damageDealt: 22_000,
        damageTaken: 8_000,
        healingDone: 100,
        shieldingDone: 200,
        roundsWon: 3,
        roundsLost: 0,
        roundsDrawn: 0,
        rounds: [],
        unitStats: [],
      },
    })
    const wrapper = mount(EndScreen, {
      props: {
        players: [player(), rival],
        myPlayerId: 'player-1',
        gameMode: 'onepiece',
      },
    })

    await wrapper.findAll('.end-screen__player')[0].trigger('click')

    expect(wrapper.get('#match-summary-title').text()).toBe("Rival's Match Summary")
    expect(wrapper.get('.match-summary__totals').text()).toContain('22,000')
        expect(wrapper.find('.unit-totals__empty').exists()).toBe(true)

    wrapper.unmount()
  })

  it('cancels pending animation timers when unmounted', () => {
    vi.useFakeTimers()
    const wrapper = mount(EndScreen, {
      props: { players: [player()], myPlayerId: 'player-1', gameMode: 'onepiece' },
    })

    expect(vi.getTimerCount()).toBe(1)

    wrapper.unmount()

    expect(vi.getTimerCount()).toBe(0)
    expect(() => vi.runAllTimers()).not.toThrow()
  })
})
