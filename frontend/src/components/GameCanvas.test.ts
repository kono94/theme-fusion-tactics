import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState, GameUnit, PlayerState } from '../types'
import GameCanvas from './GameCanvas.vue'

vi.mock('../utils/dragPreview', () => ({
    setUnitDragPreview: vi.fn(() => null),
}))

function unit(id: string, ownerId: string, traits: string[], x: number, y: number): GameUnit {
    return {
        id,
        definitionId: id,
        lineId: id,
        name: id,
        cost: 1,
        role: 'DAMAGE',
        maxHealth: 100,
        currentHealth: 100,
        shield: 0,
        mana: 0,
        maxMana: 100,
        attackDamage: 10,
        abilityPower: 0,
        defense: 0,
        attackSpeed: 1,
        range: 1,
        traits,
        items: [],
        x,
        y,
        starLevel: 1,
        ownerId,
        ability: null,
        activeAbility: null,
        stunSecondsRemaining: 0,
        atkBuff: 1,
        spdBuff: 1,
    }
}

function player(playerId: string, board: GameUnit[], combatSide: PlayerState['combatSide']): PlayerState {
    return {
        playerId,
        name: playerId,
        health: 100,
        gold: 0,
        level: 2,
        xp: 0,
        nextLevelXp: 2,
        place: null,
        combatSide,
        bench: [],
        board,
        shop: [],
        lootOrbs: [],
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
    }
}

function state(phase: GameState['phase']): GameState {
    const ownY = phase === 'COMBAT' ? 3 : 0
    const opponentY = 0
    return {
        roomId: 'room',
        hostId: 'me',
        phase,
        round: 1,
        timeRemainingMs: 1000,
        totalPhaseDuration: 1000,
        players: {
            me: player(
                'me',
                [
                    unit('fighter', 'me', ['Fire-Fighter'], 0, ownY),
                    unit('support', 'me', ['Support'], 1, ownY),
                ],
                phase === 'COMBAT' ? 'BOTTOM' : null,
            ),
            opponent: player(
                'opponent',
                [unit('opponent-fighter', 'opponent', ['Fire Fighter'], 0, opponentY)],
                phase === 'COMBAT' ? 'TOP' : null,
            ),
        },
        matchups: phase === 'COMBAT' ? { me: 'opponent', opponent: 'me' } : {},
        recentEvents: [],
        damageLog: {},
        gameMode: 'onepiece',
        planningTimerPaused: false,
        planningReadyPlayerId: null,
        planningPauseReason: null,
    }
}

describe('GameCanvas trait highlighting', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        })
    })

    it('highlights matching viewed units and dims other viewed units', () => {
        const wrapper = mount(GameCanvas, {
            props: {
                state: state('PLANNING'),
                actingPlayerId: 'me',
                viewedPlayerId: 'me',
                highlightedTraitId: 'fire_fighter',
            },
            global: { stubs: { CombatEffectsCanvas: true } },
        })

        const units = wrapper.findAll('.unit')
        expect(units).toHaveLength(2)
        expect(units[0].classes()).toContain('trait-contributor')
        expect(units[1].classes()).toContain('trait-dimmed')
        wrapper.unmount()
    })

    it('does not alter opponent units during combat', () => {
        const wrapper = mount(GameCanvas, {
            props: {
                state: state('COMBAT'),
                actingPlayerId: 'me',
                viewedPlayerId: 'me',
                highlightedTraitId: 'fire_fighter',
            },
            global: { stubs: { CombatEffectsCanvas: true } },
        })

        const opponent = wrapper.findAll('.unit').find((renderedUnit) =>
            renderedUnit.get('img').attributes('alt') === 'opponent-fighter',
        )
        expect(opponent?.classes()).not.toContain('trait-contributor')
        expect(opponent?.classes()).not.toContain('trait-dimmed')
        wrapper.unmount()
    })
})
