import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import GameInterface from './GameInterface.vue'
import UnitTooltip from './UnitTooltip.vue'
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
        itemSlotsPerUnit: 2,
        matchRuleSelection: 'RANDOM',
        activeMatchRule: null,
        baseIncome: 5,
        maxInterest: 5,
        rerollCost: 2,
    }
}

const childStubs = {
    GameCanvas: true,
    TraitSidebar: true,
    PlayerList: true,
    AugmentSelectionOverlay: true,
    PhaseAnnouncement: true,
    UnitTooltip: true,
    DamageReport: true,
}

describe('GameInterface end celebration', () => {
    it('keeps players and items visible and swaps the players card for the combat report', async () => {
        const wrapper = mount(GameInterface, {
            props: { state: gameState('PLANNING', 100, 1), currentPlayerId: 'player-1' },
            global: { stubs: childStubs },
        })

        expect(wrapper.findComponent({ name: 'PlayerList' }).exists()).toBe(true)
        expect(wrapper.find('.inventory-card').exists()).toBe(true)
        await wrapper.get('[role="tab"]:nth-child(2)').trigger('click')
        expect(wrapper.findComponent({ name: 'PlayerList' }).exists()).toBe(false)
        expect(wrapper.findComponent({ name: 'DamageReport' }).exists()).toBe(true)
        expect(wrapper.find('.inventory-card').exists()).toBe(true)
        wrapper.unmount()
    })
    it('equips a selected inventory item on a bench unit during planning', async () => {
        const state = gameState('PLANNING', 100, 1)
        state.players['player-1'].bench = [benchUnit()]
        state.players['player-1'].inventory = [{
            instanceId: 'item-copy', id: 'onepiece_axe', name: 'Haki Axe', description: '+40% ATK',
            icon: '/assets/items/onepiece/axe.png', statBonuses: { ATTACK_DAMAGE_PERCENT: 40 },
        }]
        const wrapper = mount(GameInterface, {
            props: { state, currentPlayerId: 'player-1' },
            global: { stubs: childStubs },
        })

        await wrapper.get('.inventory-item').trigger('click')
        await wrapper.get('.bench-unit').trigger('click')
        expect((wrapper.emitted('action') as [GameAction][])[0][0]).toMatchObject({
            type: 'MOVE_ITEM', itemInstanceId: 'item-copy', targetUnitId: 'bench-unit', playerId: 'player-1',
        })
        wrapper.unmount()
    })
    it('updates an open unit tooltip when a fresh snapshot changes equipment and stats', async () => {
        const state = gameState('PLANNING', 100, 1)
        state.players['player-1'].bench = [benchUnit()]
        const wrapper = mount(GameInterface, {
            props: { state, currentPlayerId: 'player-1' },
            global: { stubs: { ...childStubs, UnitTooltip: false } },
        })

        await wrapper.get('.bench-unit').trigger('mouseenter')
        expect(wrapper.findComponent(UnitTooltip).text()).toContain('10')

        const updated = gameState('PLANNING', 100, 1)
        const equipped = benchUnit()
        equipped.items = [{
            instanceId: 'item-copy', id: 'onepiece_axe', name: 'Haki Axe', description: '+40% ATK',
            icon: '/assets/items/onepiece/axe.png', statBonuses: { ATTACK_DAMAGE_PERCENT: 40 },
        }]
        updated.players['player-1'].bench = [equipped]
        updated.players['player-1'].statPreviews = { 'bench-unit': {
            maxHealth: 100, currentHealth: 100, mana: 0, maxMana: 100, attackDamage: 14,
            defense: 0, attackSpeed: 1, abilityDamageMultiplier: 1, shield: 0,
            damageReduction: 0, lifesteal: 0,
        } }
        await wrapper.setProps({ state: updated })

        expect(wrapper.findComponent(UnitTooltip).text()).toContain('Item-adjusted bench stats')
        expect(wrapper.findComponent(UnitTooltip).props('preview')).toMatchObject({ attackDamage: 14 })
        wrapper.unmount()
    })
    it('shows equipped item bonuses on tap during combat without moving the item', async () => {
        const state = gameState('COMBAT', 100, 1)
        const equipped = benchUnit()
        equipped.items = [{
            instanceId: 'item-copy', id: 'onepiece_axe', name: 'Haki Axe', description: '+40% ATK',
            icon: '/assets/items/onepiece/axe.png', statBonuses: { ATTACK_DAMAGE_PERCENT: 40 },
        }]
        state.players['player-1'].bench = [equipped]
        const wrapper = mount(GameInterface, {
            props: { state, currentPlayerId: 'player-1' },
            global: { stubs: childStubs },
        })

        await wrapper.get('.equipped-item').trigger('click')
        expect(document.body.querySelector('.item-tooltip')?.textContent).toContain('+40% Attack')
        expect(wrapper.emitted('action')).toBeUndefined()
        wrapper.unmount()
    })
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

    it('rerolls with R and sells the hovered owned unit with S', async () => {
        const state = gameState('PLANNING', 100, 1)
        state.players['player-1'].bench = [benchUnit()]
        const wrapper = mount(GameInterface, {
            props: {
                state,
                currentPlayerId: 'player-1',
            },
            global: { stubs: childStubs },
        })

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
        await wrapper.get('.bench-unit').trigger('mouseenter')
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))

        const emittedActions = wrapper.emitted('action') as [GameAction][]
        expect(emittedActions.map(([action]) => action.type)).toEqual(['REROLL', 'SELL'])
        expect(emittedActions[1][0].unitId).toBe('bench-unit')

        wrapper.unmount()
    })

    it('does not trigger gameplay shortcuts while typing', () => {
        const state = gameState('PLANNING', 100, 1)
        const wrapper = mount(GameInterface, {
            props: {
                state,
                currentPlayerId: 'player-1',
            },
            global: { stubs: childStubs },
        })
        const input = document.createElement('input')
        wrapper.element.appendChild(input)

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))

        expect(wrapper.emitted('action')).toBeUndefined()
        wrapper.unmount()
    })
})

describe('GameInterface match rules and economy', () => {
    it('shows the active match rule badge with its description', () => {
        const state = gameState('PLANNING', 100, 1)
        state.activeMatchRule = {
            id: 'volatile',
            name: 'Volatile',
            description: 'Units explode on death.',
            icon: '/assets/match-rules/volatile.png',
        }
        const wrapper = mount(GameInterface, {
            props: { state, currentPlayerId: 'player-1' },
            global: { stubs: childStubs },
        })

        const badge = wrapper.get('[data-testid="rule-badge"]')
        expect(badge.text()).toContain('Volatile')
        expect(badge.get('[role="tooltip"]').text()).toBe('Units explode on death.')
        expect(badge.get('img').attributes('src')).toBe('/assets/match-rules/volatile.png')
        expect(badge.element.parentElement).toBe(wrapper.get('.room-details').element)
        wrapper.unmount()
    })

    it('hides the rule badge when no rule is active', () => {
        const wrapper = mount(GameInterface, {
            props: { state: gameState('PLANNING', 100, 1), currentPlayerId: 'player-1' },
            global: { stubs: childStubs },
        })

        expect(wrapper.find('[data-testid="rule-badge"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('shows small interest markers before gold and updates the projected income after spending', async () => {
        const state = gameState('PLANNING', 100, 1)
        state.players['player-1'].gold = 37
        state.maxInterest = 5
        const wrapper = mount(GameInterface, {
            props: { state, currentPlayerId: 'player-1' },
            global: { stubs: childStubs },
        })

        const markers = wrapper.get('[data-testid="interest-markers"]')
        expect(markers.findAll('svg')).toHaveLength(5)
        expect(markers.findAll('.filled')).toHaveLength(3)
        expect(markers.attributes('aria-label')).toBe('3 gold interest out of 5')
        expect(wrapper.get('.gold-info').element.firstElementChild).toBe(markers.element)
        expect(wrapper.get('.gold-tooltip').text()).toContain('Next round: +8 gold')
        expect(wrapper.get('.gold-tooltip').text()).toContain('5 base + 3 interest')

        const spentState = gameState('PLANNING', 100, 1)
        spentState.players['player-1'].gold = 29
        await wrapper.setProps({ state: spentState })
        expect(markers.findAll('.filled')).toHaveLength(2)
        expect(wrapper.get('.gold-tooltip').text()).toContain('Next round: +7 gold')
        wrapper.unmount()
    })

    it.each([[0, 5, 0], [50, 5, 5], [100, 2, 2]])(
        'uses the server cap for %s gold and %s interest slots', (gold, cap, filled) => {
            const state = gameState('PLANNING', 100, 1)
            state.players['player-1'].gold = gold
            state.maxInterest = cap
            state.baseIncome = 7
            const wrapper = mount(GameInterface, {
                props: { state, currentPlayerId: 'player-1' },
                global: { stubs: childStubs },
            })
            expect(wrapper.findAll('.interest-coin')).toHaveLength(cap)
            expect(wrapper.findAll('.interest-coin.filled')).toHaveLength(filled)
            expect(wrapper.get('.gold-tooltip').text()).toContain(`Next round: +${7 + filled} gold`)
            wrapper.unmount()
        },
    )

    it('uses the room reroll cost for the button and the R shortcut', () => {
        const state = gameState('PLANNING', 100, 1)
        state.players['player-1'].gold = 1
        state.rerollCost = 1
        const wrapper = mount(GameInterface, {
            props: { state, currentPlayerId: 'player-1' },
            global: { stubs: childStubs },
        })

        expect(wrapper.get('.reroll-btn .cost').text()).toBe('1g')
        expect(wrapper.get('.reroll-btn').attributes('disabled')).toBeUndefined()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))

        const emittedActions = wrapper.emitted('action') as [GameAction][]
        expect(emittedActions.map(([action]) => action.type)).toEqual(['REROLL'])
        wrapper.unmount()
    })
})
