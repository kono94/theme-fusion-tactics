import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WaitingRoom from './WaitingRoom.vue'
import type { GameState } from '../types'

function gameState(gameMode: GameState['gameMode'] = 'pokemon'): GameState {
    return {
        roomId: 'mode-room',
        hostId: 'player-1',
        phase: 'LOBBY',
        round: 1,
        timeRemainingMs: 0,
        totalPhaseDuration: 0,
        players: {
            'player-1': {
                playerId: 'player-1',
                name: 'Host',
                health: 100,
                gold: 0,
                level: 1,
                xp: 0,
                nextLevelXp: 2,
                place: null,
                combatSide: null,
                bench: [],
                board: [],
                shop: [],
                lootOrbs: [],
        inventory: [],
        statPreviews: {},
                augmentChoices: [],
                selectedAugments: [],
                isGhost: false,
                isBot: false,
                botPersonality: null,
                matchStats: {
                    damageDealt: 0,
                    damageTaken: 0,
                    healingDone: 0,
                    shieldingDone: 0,
                    roundsWon: 0,
                    roundsLost: 0,
                    roundsDrawn: 0,
                    rounds: [],
                    unitStats: [],
                },
            },
        },
        matchups: {},
        recentEvents: [],
        damageLog: {},
        gameMode,
        planningTimerPaused: false,
        planningReadyPlayerId: null,
        planningPauseReason: null,
        itemSlotsPerUnit: 2,
        matchRuleSelection: 'RANDOM',
        activeMatchRule: null,
        baseIncome: 5,
        maxInterest: 5,
        rerollCost: 2,
    }
}

const modeOptionSelector = '[aria-label="Select game theme"] .mode-option'

describe('WaitingRoom mode selection', () => {
    it('renders both modes and emits the selected mode for the host', async () => {
        const wrapper = mount(WaitingRoom, {
            props: {
                gameState: gameState(),
                currentPlayerId: 'player-1',
                availableModes: ['pokemon', 'onepiece'],
                defaultMode: 'onepiece',
                themeClass: 'theme-onepiece',
            },
        })

        const modeButtons = wrapper.findAll(modeOptionSelector)
        expect(modeButtons).toHaveLength(2)
        expect(modeButtons.map((button) => button.find('span.mode-name').text())).toEqual(['One Piece', 'Pokemon'])
        expect(wrapper.find('.waiting-room').classes()).toContain('theme-onepiece')

        await modeButtons[0].trigger('click')
        await modeButtons[1].trigger('click')
        expect(wrapper.emitted('mode-change')).toEqual([['onepiece'], ['pokemon']])
    })

    it('keeps mode choices visible but disabled for non-hosts', () => {
        const wrapper = mount(WaitingRoom, {
            props: {
                gameState: gameState(),
                currentPlayerId: 'guest-player',
                availableModes: ['onepiece', 'pokemon'],
                defaultMode: 'onepiece',
            },
        })

        expect(wrapper.findAll(modeOptionSelector).every((button) => button.attributes('disabled') !== undefined)).toBe(true)
        expect(wrapper.find(`${modeOptionSelector}.active`).text()).toContain('Pokemon')
        expect(wrapper.emitted('mode-change')).toBeUndefined()
    })

    it('copies a direct invite link for the room', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        })
        const wrapper = mount(WaitingRoom, {
            props: {
                gameState: gameState(),
                currentPlayerId: 'player-1',
                availableModes: ['onepiece', 'pokemon'],
                defaultMode: 'onepiece',
            },
        })

        await wrapper.get('.invite-btn').trigger('click')

        expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#\/join\/mode-room$/))
        expect(wrapper.get('.invite-btn').text()).toBe('Copied!')
        wrapper.unmount()
    })
})

describe('WaitingRoom match rule selection', () => {
    const matchRules = [
        { id: 'volatile', name: 'Volatile', description: 'Units explode on death.', icon: '/assets/match-rules/volatile.png' },
        { id: 'head-start', name: 'Head Start', description: 'Start at level 4.', icon: '/assets/match-rules/head-start.png' },
    ]

    const mountRoom = (currentPlayerId: string, matchRuleSelection = 'RANDOM') =>
        mount(WaitingRoom, {
            props: {
                gameState: { ...gameState(), matchRuleSelection },
                currentPlayerId,
                availableModes: ['onepiece', 'pokemon'],
                defaultMode: 'onepiece',
                matchRules,
            },
        })

    it('lists Random, None and every rule with the selection highlighted', () => {
        const wrapper = mountRoom('player-1')

        const options = wrapper.findAll('.rule-option')
        expect(options.map((option) => option.find('.mode-name').text())).toEqual([
            'Random',
            'None',
            'Volatile',
            'Head Start',
        ])
        expect(wrapper.find('.rule-option.active').text()).toContain('Random')
    })

    it('emits the chosen rule id for the host and describes the selection', async () => {
        const wrapper = mountRoom('player-1', 'volatile')

        expect(wrapper.get('[data-testid="rule-description"]').text()).toContain('Units explode on death.')

        await wrapper.get('[data-rule="head-start"]').trigger('click')
        await wrapper.get('[data-rule="NONE"]').trigger('click')

        expect(wrapper.emitted('rule-change')).toEqual([['head-start'], ['NONE']])
    })

    it('shows the host choice read-only for other players', async () => {
        const wrapper = mountRoom('guest-player', 'volatile')

        const options = wrapper.findAll('.rule-option')
        expect(options.every((option) => option.attributes('disabled') !== undefined)).toBe(true)
        await options[0].trigger('click')
        expect(wrapper.emitted('rule-change')).toBeUndefined()
        expect(wrapper.find('.rule-option.active').text()).toContain('Volatile')
    })
})
