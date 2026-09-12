import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import GameInterface from './GameInterface.vue'
import type { GameAction, GamePhase, GameState, GameUnit, PlayerState, UnitDefinition } from '../types'

vi.mock('../utils/dragPreview', () => ({
    setUnitDragPreview: vi.fn(() => null),
}))

function unitDefinition(): UnitDefinition {
    return {
        id: 'test-unit',
        lineId: 'test-unit',
        name: 'Test Unit',
        cost: 1,
        role: 'DAMAGE',
        maxHealth: 100,
        maxMana: 100,
        attackDamage: 10,
        abilityPower: 0,
        defense: 0,
        attackSpeed: 1,
        range: 1,
        traits: [],
        ability: null,
    }
}

function benchUnit(): GameUnit {
    return {
        ...unitDefinition(),
        id: 'bench-unit',
        definitionId: 'test-unit',
        lineId: 'test-unit',
        currentHealth: 100,
        shield: 0,
        mana: 0,
        items: [],
        x: -1,
        y: -1,
        starLevel: 1,
        ownerId: 'player-1',
        activeAbility: null,
        stunSecondsRemaining: 0,
        atkBuff: 1,
        spdBuff: 1,
    }
}

function player(health: number, place: number): PlayerState {
    return {
        playerId: 'player-1',
        name: 'Player',
        health,
        gold: 10,
        level: 1,
        xp: 0,
        nextLevelXp: 2,
        place,
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
    }
}

function gameState(phase: GamePhase, health: number, place: number): GameState {
    return {
        roomId: 'room-1',
        hostId: 'player-1',
        phase,
        round: 1,
        timeRemainingMs: 6000,
        totalPhaseDuration: 6000,
        players: { 'player-1': player(health, place) },
        matchups: {},
        recentEvents: [],
        damageLog: {},
        gameMode: 'onepiece',
        planningTimerPaused: false,
        planningReadyPlayerId: null,
        planningPauseReason: null,
    }
}

const childStubs = {
    GameCanvas: true,
    TraitSidebar: true,
    PlayerList: true,
    AugmentSelectionOverlay: true,
    PhaseAnnouncement: true,
    UnitTooltip: true,
}

describe('GameInterface end celebration', () => {
    it.each([
        ['losing', 0, 2],
        ['winning', 100, 1],
    ])('renders the end screen immediately when END_CELEBRATION starts for a %s player', async (_outcome, health, place) => {
        const wrapper = mount(GameInterface, {
            props: {
                state: gameState('COMBAT', health, place),
                currentPlayerId: 'player-1',
            },
            global: { stubs: childStubs },
        })

        expect(wrapper.find('.end-screen').exists()).toBe(false)

        await wrapper.setProps({ state: gameState('END_CELEBRATION', health, place) })

        expect(wrapper.find('.end-screen').exists()).toBe(true)
        expect(wrapper.text()).toContain(`${place === 1 ? '1st' : '2nd'} Place`)

        wrapper.unmount()
    })

    it('does not show the end screen for an eliminated player while the match continues', () => {
        const wrapper = mount(GameInterface, {
            props: {
                state: gameState('COMBAT', 0, 2),
                currentPlayerId: 'player-1',
            },
            global: { stubs: childStubs },
        })

        expect(wrapper.find('.end-screen').exists()).toBe(false)

        wrapper.unmount()
    })

    it('allows shop and bench management during combat', async () => {
        const state = gameState('COMBAT', 100, 1)
        state.players['player-1'].shop = [unitDefinition()]
        state.players['player-1'].bench = [benchUnit()]
        const wrapper = mount(GameInterface, {
            props: {
                state,
                currentPlayerId: 'player-1',
            },
            global: { stubs: childStubs },
        })

        const xpButton = wrapper.get('.xp-btn')
        const rerollButton = wrapper.get('.reroll-btn')
        expect(xpButton.attributes('disabled')).toBeUndefined()
        expect(rerollButton.attributes('disabled')).toBeUndefined()
        await xpButton.trigger('click')
        await rerollButton.trigger('click')
        await wrapper.get('.shop-card').trigger('click')

        const bench = wrapper.get('.bench-unit')
        expect(bench.attributes('draggable')).toBe('true')
        const dataTransfer = {
            setData: vi.fn(),
            getData: vi.fn(() => 'bench-unit'),
            setDragImage: vi.fn(),
            effectAllowed: 'none',
            dropEffect: 'none',
        }
        await bench.trigger('dragstart', { dataTransfer })
        await wrapper.findAll('.bench-slot')[1].trigger('drop', { dataTransfer })
        await wrapper.get('.bench-sell-zone').trigger('drop', { dataTransfer })

        const emittedActions = wrapper.emitted('action') as [GameAction][]
        expect(emittedActions.map(([action]) => action.type)).toEqual([
            'EXP',
            'REROLL',
            'BUY',
            'MOVE',
            'SELL',
        ])

        wrapper.unmount()
    })
})
