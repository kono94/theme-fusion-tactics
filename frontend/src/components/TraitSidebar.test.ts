import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { setTraitData, TRAIT_DATA, type TraitRosterUnit } from '../data/traitData'
import type { GameUnit } from '../types'
import TraitSidebar from './TraitSidebar.vue'

function rosterUnit(index: number, overrides: Partial<TraitRosterUnit> = {}): TraitRosterUnit {
    const cost = Math.min(5, Math.floor(index / 3) + 1)
    return {
        lineId: `line-${index}`,
        cost,
        starLevel: 1,
        definitionId: `unit-${index}`,
        name: `Unit ${index}`,
        role: 'DAMAGE',
        maxHealth: 100,
        maxMana: 100,
        attackDamage: 10,
        abilityPower: 0,
        defense: 10,
        attackSpeed: 1,
        range: 1,
        traits: ['Fighter'],
        ability: null,
        formattedAbilityDescription: '',
        ...overrides,
    }
}

function boardUnit(overrides: Partial<GameUnit> = {}): GameUnit {
    return {
        id: 'board-unit',
        definitionId: 'unit-0',
        lineId: 'line-0',
        name: 'Unit 0',
        cost: 1,
        role: 'DAMAGE',
        maxHealth: 100,
        currentHealth: 100,
        shield: 0,
        mana: 0,
        maxMana: 100,
        attackDamage: 10,
        abilityPower: 0,
        defense: 10,
        attackSpeed: 1,
        range: 1,
        traits: ['Fighter'],
        items: [],
        x: 0,
        y: 0,
        starLevel: 1,
        ownerId: 'player',
        ability: null,
        activeAbility: null,
        stunSecondsRemaining: 0,
        atkBuff: 1,
        spdBuff: 1,
        ...overrides,
    }
}

describe('TraitSidebar', () => {
    beforeEach(() => {
        Object.keys(TRAIT_DATA).forEach((key) => delete TRAIT_DATA[key])
    })

    afterEach(() => {
        document.body.querySelectorAll('.trait-unit-tooltip').forEach((element) => element.remove())
    })

    it('renders every roster member in a five-column dynamic grid', async () => {
        setTraitData([{
            id: 'fighter',
            name: 'Fighter',
            description: 'Fighters gain attack damage.',
            effects: [{ minUnits: 1, description: '+5% ATK', style: 'bronze' }],
            type: 'class',
            iconColor: '#ef4444',
            units: Array.from({ length: 15 }, (_, index) => rosterUnit(index)),
        }])
        const wrapper = mount(TraitSidebar, {
            props: { units: [boardUnit()], gameMode: 'onepiece' },
        })

        await wrapper.get('.trait-item').trigger('mouseenter')

        expect(wrapper.find('[data-test="trait-roster"]').exists()).toBe(true)
        expect(wrapper.findAll('.trait-unit')).toHaveLength(15)
        expect(wrapper.findAll('.trait-unit').map((unit) => unit.attributes('aria-label'))).toEqual(
            Array.from({ length: 15 }, (_, index) => `Unit ${index}, ${Math.min(5, Math.floor(index / 3) + 1)} gold`),
        )
    })

    it('colors only contributing forms and uses the qualifying evolution otherwise', async () => {
        setTraitData([{
            id: 'flying',
            name: 'Flying',
            description: 'Flying Pokemon attack faster.',
            effects: [{ minUnits: 1, description: '+3% AS', style: 'bronze' }],
            type: 'type',
            iconColor: '#38bdf8',
            units: [
                rosterUnit(0, {
                    lineId: 'charmander',
                    definitionId: 'charizard',
                    name: 'Charizard',
                    starLevel: 3,
                    traits: ['Fire', 'Flying'],
                }),
                rosterUnit(1, {
                    lineId: 'pidgey',
                    definitionId: 'pidgey',
                    name: 'Pidgey',
                    traits: ['Normal', 'Flying'],
                }),
            ],
        }])
        const wrapper = mount(TraitSidebar, {
            props: {
                gameMode: 'pokemon',
                units: [
                    boardUnit({
                        lineId: 'charmander',
                        definitionId: 'charmeleon',
                        name: 'Charmeleon',
                        starLevel: 2,
                        traits: ['Fire'],
                    }),
                    boardUnit({
                        id: 'pidgey-board',
                        lineId: 'pidgey',
                        definitionId: 'pidgey',
                        name: 'Pidgey',
                        traits: ['Normal', 'Flying'],
                    }),
                ],
            },
        })

        await wrapper.get('.trait-item').trigger('mouseenter')
        const roster = wrapper.findAll('.trait-unit')

        expect(roster[0].classes()).not.toContain('active')
        expect(roster[0].get('img').attributes('src')).toBe('/assets/units/pokemon/charizard.png')
        expect(roster[1].classes()).toContain('active')

        await roster[0].trigger('mouseenter')
        expect(document.body.querySelector('.unit-tooltip .name')?.textContent).toBe('Charizard')
        expect(document.body.querySelector('.unit-tooltip .unit-cost')?.textContent).toBe('1g')
        expect(wrapper.find('.trait-tooltip').exists()).toBe(true)
    })

    it('counts distinct lines per trait when different forms share a board', () => {
        setTraitData([{
            id: 'fighter',
            name: 'Fighter',
            description: 'Fighter trait',
            effects: [{ minUnits: 1, description: '+5% ATK', style: 'bronze' }],
            type: 'class',
            iconColor: '#ef4444',
            units: [rosterUnit(0)],
        }])
        const wrapper = mount(TraitSidebar, {
            props: {
                gameMode: 'onepiece',
                units: [boardUnit(), boardUnit({ id: 'duplicate', starLevel: 2 })],
            },
        })

        expect(wrapper.get('.trait-count').text()).toContain('1 / 1')
    })

    it('emits the active trait while its tooltip is hovered', async () => {
        setTraitData([{
            id: 'fighter',
            name: 'Fighter',
            description: 'Fighter trait',
            effects: [{ minUnits: 1, description: '+5% ATK', style: 'bronze' }],
            type: 'class',
            iconColor: '#ef4444',
            units: [rosterUnit(0)],
        }])
        const wrapper = mount(TraitSidebar, {
            props: { units: [boardUnit()], gameMode: 'onepiece' },
        })

        await wrapper.get('.trait-item').trigger('mouseenter')
        await wrapper.get('.trait-item').trigger('mouseleave')

        expect(wrapper.emitted('hover-trait')).toEqual([['fighter'], [null]])
    })
})
