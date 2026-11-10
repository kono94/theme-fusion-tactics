import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState, GameUnit, PlayerState } from '../types'
import GameCanvas from './GameCanvas.vue'

vi.mock('../utils/dragPreview', () => ({
    setUnitDragPreview: vi.fn(() => null),
}))

vi.mock('../combat3d/CombatView3d.vue', () => ({
    __esModule: true,
    default: {
        name: 'CombatView3d',
        props: ['units', 'events', 'arenaId', 'fieldConditionId'],
        emits: ['fallback'],
        template: '<div class="combat-3d-stub" :data-arena="arenaId" :data-units="units.length" :data-field="fieldConditionId" @click="$emit(\'fallback\')"></div>',
    },
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
        itemSlotsPerUnit: 2,
        matchRuleSelection: 'RANDOM',
        activeMatchRule: null,
        baseIncome: 5,
        maxInterest: 5,
        rerollCost: 2,
        fieldConditions: {},
        fieldForecast: null,
        roundTimeSettings: { planningSeconds: 15, combatSeconds: 32 },
    }
}

describe('GameCanvas trait highlighting', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        })
    })

    it('shows equipped item icons and accepts an item dropped on an owned planning unit', async () => {
        const game = state('PLANNING')
        game.players.me.board[0]!.items = [{
            instanceId: 'owned-item', id: 'onepiece_axe', name: 'Haki Axe', description: '+40% ATK',
            icon: '/assets/items/onepiece/axe.png', statBonuses: { ATTACK_DAMAGE_PERCENT: 40 },
        }]
        const wrapper = mount(GameCanvas, {
            props: { state: game, actingPlayerId: 'me', viewedPlayerId: 'me', isReadOnly: false },
            global: { stubs: { CombatEffectsCanvas: true } },
        })

        expect(wrapper.get('.board-item').attributes('aria-label')).toContain('+40% ATK')
        await wrapper.get('.board-item').trigger('mouseenter')
        expect(wrapper.emitted('show-item-tooltip')?.[0]?.[0]).toMatchObject({ item: { instanceId: 'owned-item' } })
        await wrapper.get('.board-item').trigger('click')
        expect(wrapper.emitted('item-select')?.[0]?.[0]).toBe('owned-item')
        const dataTransfer = { getData: (key: string) => key === 'itemInstanceId' ? 'new-item' : '' }
        await wrapper.findAll('.cell')[27]!.trigger('drop', { dataTransfer })
        expect(wrapper.emitted('item-drop')?.[0]).toEqual(['new-item', 'fighter'])
        wrapper.unmount()
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

describe('GameCanvas held item procs', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        })
    })

    it('floats item names for item procs and item-named heals but not ability heals', async () => {
        const game = state('COMBAT')
        game.players.me.board[0]!.items = [{
            instanceId: 'leftovers-1', id: 'pokemongen23_leftovers', name: 'Leftovers',
            description: 'Restores 1.5% max HP every second in combat.', icon: '/leftovers.png',
            statBonuses: { MAX_HEALTH_PERCENT: 20 },
            effects: [{ type: 'REGEN_MAX_HEALTH_PERCENT', values: { percentPerSecond: 1.5 } }],
        }]
        const wrapper = mount(GameCanvas, {
            props: { state: game, actingPlayerId: 'me', viewedPlayerId: 'me' },
            global: { stubs: { CombatEffectsCanvas: true } },
        })

        await wrapper.setProps({
            state: {
                ...game,
                recentEvents: [
                    { timestamp: 100, type: 'ITEM', sourceId: 'fighter', targetId: 'opponent-fighter', value: 600, skillName: "King's Rock" },
                    { timestamp: 100, type: 'HEAL', sourceId: 'fighter', targetId: 'fighter', value: 15, skillName: 'Leftovers' },
                    { timestamp: 100, type: 'HEAL', sourceId: 'support', targetId: 'fighter', value: 40, skillName: 'Soft-Boiled' },
                ],
            },
        })

        expect(wrapper.findAll('.item-proc-label').map((label) => label.text())).toEqual([
            "King's Rock!",
            'Leftovers!',
        ])
        wrapper.unmount()
    })
})

describe('GameCanvas field conditions', () => {
    const rain = {
        id: 'rain',
        name: 'Rain',
        description: 'Water damage +25%.',
        icon: '/assets/field-conditions/rain.png',
        remainingMs: null,
    }

    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        })
    })

    it('overlays the viewed pairing weather and shows field damage without an attack', async () => {
        const game = { ...state('COMBAT'), fieldConditions: { me: rain, opponent: rain } }
        const wrapper = mount(GameCanvas, {
            props: { state: game, actingPlayerId: 'me', viewedPlayerId: 'me' },
            global: { stubs: { CombatEffectsCanvas: true } },
        })
        expect(wrapper.get('[data-testid="field-condition-overlay"]').classes()).toContain('field-rain')

        await wrapper.setProps({
            state: {
                ...game,
                recentEvents: [
                    { timestamp: 100, type: 'FIELD', sourceId: null, targetId: null, value: 0, skillName: 'rain' },
                    { timestamp: 100, type: 'FIELD_DAMAGE', sourceId: 'fighter', targetId: 'fighter', value: 30, skillName: 'sandstorm' },
                ],
            },
        })

        expect(wrapper.findAll('.floating-text.field-damage').map((label) => label.text())).toEqual(['-30'])
        expect(wrapper.findComponent({ name: 'CombatEffectsCanvas' }).props('events')).toEqual([])
        expect(wrapper.find('.unit.attacking-lunge').exists()).toBe(false)
        wrapper.unmount()
    })

    it('passes the viewed condition to the 3D view and hides the 2D overlay there', async () => {
        const wrapper = mount(GameCanvas, {
            props: {
                state: { ...state('COMBAT'), fieldConditions: { me: rain } },
                actingPlayerId: 'me',
                viewedPlayerId: 'me',
                combatView: '3d',
            },
            global: { stubs: { CombatEffectsCanvas: true } },
        })
        await flushPromises()

        expect(wrapper.get('.combat-3d-stub').attributes('data-field')).toBe('rain')
        expect(wrapper.find('[data-testid="field-condition-overlay"]').exists()).toBe(false)
        wrapper.unmount()
    })
})

describe('GameCanvas 3D battle view', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        })
    })

    it('renders combat in 3D with a mode arena when the setting is on', async () => {
        const wrapper = mount(GameCanvas, {
            props: { state: state('COMBAT'), actingPlayerId: 'me', viewedPlayerId: 'me', combatView: '3d' },
            global: { stubs: { CombatEffectsCanvas: true } },
        })
        await flushPromises()

        const view = wrapper.get('.combat-3d-stub')
        expect(view.attributes('data-units')).toBe('3')
        expect(['foosha', 'baratie', 'sabaody', 'marineford', 'wano']).toContain(view.attributes('data-arena'))
        expect(wrapper.findComponent({ name: 'CombatEffectsCanvas' }).exists()).toBe(false)

        await view.trigger('click')
        expect(wrapper.emitted('combat-view-fallback')).toHaveLength(1)
        wrapper.unmount()
    })

    it('keeps planning and the classic setting on the 2D board', async () => {
        const planning = mount(GameCanvas, {
            props: { state: state('PLANNING'), actingPlayerId: 'me', viewedPlayerId: 'me', combatView: '3d' },
            global: { stubs: { CombatEffectsCanvas: true } },
        })
        const classic = mount(GameCanvas, {
            props: { state: state('COMBAT'), actingPlayerId: 'me', viewedPlayerId: 'me', combatView: 'classic' },
            global: { stubs: { CombatEffectsCanvas: true } },
        })
        await flushPromises()

        expect(planning.find('.combat-3d-stub').exists()).toBe(false)
        expect(classic.find('.combat-3d-stub').exists()).toBe(false)
        expect(classic.findComponent({ name: 'CombatEffectsCanvas' }).exists()).toBe(true)
        planning.unmount()
        classic.unmount()
    })
})

describe('GameCanvas evolve badge', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        })
    })

    function pendingState(phase: GameState['phase']): GameState {
        const game = state(phase)
        game.players.me.board[0]!.evolutionOptions = [{
            branchId: 'vaporeon', definitionId: 'vaporeon', name: 'Vaporeon', role: 'TANK', traits: ['Water'],
            range: 1, maxHealth: 1400, attackDamage: 70, defense: 40, attackSpeed: 0.7, maxMana: 50,
            abilityName: null, abilityDescription: '', laterForms: [],
        }]
        game.players.opponent.board[0]!.evolutionOptions = game.players.me.board[0]!.evolutionOptions
        return game
    }

    it('shows the badge on own pending planning units and emits evolve', async () => {
        const wrapper = mount(GameCanvas, {
            props: { state: pendingState('PLANNING'), actingPlayerId: 'me', viewedPlayerId: 'me', isReadOnly: false },
            global: { stubs: { CombatEffectsCanvas: true } },
        })

        const badges = wrapper.findAll('[data-testid="evolve-badge"]')
        expect(badges).toHaveLength(1)
        await badges[0]!.trigger('click')
        expect(wrapper.emitted('evolve')?.[0]).toEqual(['fighter'])
        expect(wrapper.emitted('unit-click')).toBeUndefined()
        wrapper.unmount()
    })

    it('hides the unit tooltip and pauses dragging while the pointer is on the badge', async () => {
        const wrapper = mount(GameCanvas, {
            props: { state: pendingState('PLANNING'), actingPlayerId: 'me', viewedPlayerId: 'me', isReadOnly: false },
            global: { stubs: { CombatEffectsCanvas: true } },
        })
        const badge = wrapper.get('[data-testid="evolve-badge"]')
        const unit = wrapper.findAll('.unit').find((candidate) => candidate.element.contains(badge.element))!

        expect(unit.attributes('draggable')).toBe('true')
        await badge.trigger('mouseenter')
        expect(wrapper.emitted('hide-tooltip')).toHaveLength(1)
        expect(unit.attributes('draggable')).toBe('false')

        await badge.trigger('mouseleave', { relatedTarget: unit.element })
        expect(wrapper.emitted('show-tooltip')).toHaveLength(1)
        expect(unit.attributes('draggable')).toBe('true')
        wrapper.unmount()
    })

    it('hides the badge while spectating, read-only or in combat', () => {
        for (const props of [
            { state: pendingState('PLANNING'), actingPlayerId: 'me', viewedPlayerId: 'opponent', isReadOnly: true },
            { state: pendingState('PLANNING'), actingPlayerId: 'me', viewedPlayerId: 'me', isReadOnly: true },
            { state: pendingState('COMBAT'), actingPlayerId: 'me', viewedPlayerId: 'me', isReadOnly: false },
        ]) {
            const wrapper = mount(GameCanvas, { props, global: { stubs: { CombatEffectsCanvas: true } } })
            expect(wrapper.find('[data-testid="evolve-badge"]').exists()).toBe(false)
            wrapper.unmount()
        }
    })
})

