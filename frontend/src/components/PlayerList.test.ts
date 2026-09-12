import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { PlayerState } from '../types'
import PlayerList from './PlayerList.vue'

function player(overrides: Partial<PlayerState> = {}): PlayerState {
    return {
        playerId: 'player-1',
        name: 'Player',
        health: 100,
        gold: 10,
        level: 2,
        xp: 0,
        nextLevelXp: 4,
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
        ...overrides,
    }
}

describe('PlayerList', () => {
    it('shows the server-assigned bot personality', () => {
        const wrapper = mount(PlayerList, {
            props: {
                players: [
                    player({
                        playerId: 'bot-1',
                        name: 'Bot',
                        isBot: true,
                        botPersonality: 'TRAIT_FOCUSED',
                    }),
                ],
                myPlayerId: 'player-1',
                selectedPlayerId: undefined,
            },
        })

        expect(wrapper.get('.bot-personality').text()).toBe('Trait focused')
    })
})
