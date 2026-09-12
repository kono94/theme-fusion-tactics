import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
                augmentChoices: [],
                selectedAugments: [],
                isGhost: false,
                isBot: false,
                botPersonality: null,
            },
        },
        matchups: {},
        recentEvents: [],
        damageLog: {},
        gameMode,
        planningTimerPaused: false,
        planningReadyPlayerId: null,
        planningPauseReason: null,
    }
}

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

        const modeButtons = wrapper.findAll('.mode-option')
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

        expect(wrapper.findAll('.mode-option').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
        expect(wrapper.find('.mode-option.active').text()).toContain('Pokemon')
        expect(wrapper.emitted('mode-change')).toBeUndefined()
    })
})
