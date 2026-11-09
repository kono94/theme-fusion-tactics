import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import pokemonUnits from '../../../backend/src/main/resources/data/units_pokemon.json'
import UnitTooltip from './UnitTooltip.vue'
import type { UnitDefinition } from '../types'
import { setTraitData } from '../data/traitData'

function unitDefinition(overrides: Partial<UnitDefinition> = {}): UnitDefinition {
    return {
        id: 'caterpie',
        lineId: 'caterpie',
        name: 'Caterpie',
        cost: 1,
        role: 'SUPPORT',
        maxHealth: 500,
        maxMana: 80,
        attackDamage: 30,
        abilityPower: 0,
        defense: 20,
        attackSpeed: 0.6,
        range: 3,
        traits: ['Bug'],
        ability: null,
        ...overrides
    }
}

describe('UnitTooltip', () => {
    it.each(['articuno', 'zapdos', 'moltres'])('shows %s as ranged using roster data', (id) => {
        const definition = pokemonUnits.find((unit) => unit.id === id)!
        for (const range of definition.range) {
            const wrapper = mount(UnitTooltip, {
                props: { unit: unitDefinition({ id, name: definition.name, range }) }
            })
            expect(wrapper.get('.range-badge').text()).toBe('RANGED')
            expect(range).toBe(3)
        }
    })

    it.each([
        ['bulbasaur', [2, 2, 2]],
        ['charmander', [2, 2, 2]],
        ['weedle', [2, 2, 2]],
        ['poliwag', [3, 3, 3]],
        ['pikachu', [3, 3, 3]],
        ['grimer', [2, 2, 2]],
        ['aerodactyl', [3, 3, 3]],
        ['mewtwo', [4, 4, 4]],
    ])('shows the configured attack range for %s at every star', (id, expectedRanges) => {
        const definition = pokemonUnits.find((unit) => unit.id === id)!
        expect(definition.range).toEqual(expectedRanges)

        definition.range.forEach((range) => {
            const wrapper = mount(UnitTooltip, {
                props: { unit: unitDefinition({ id, name: definition.name, range }) }
            })
            expect(wrapper.get('.range-badge').text()).toBe('RANGED')
            expect(wrapper.get('.stats-grid').text()).toContain(`Range:${range}`)
        })
    })

    it('renders the current role and defense stat', () => {
        const wrapper = mount(UnitTooltip, {
            props: {
                unit: unitDefinition()
            }
        })

        expect(wrapper.get('.role-badge').text()).toBe('Support')
        expect(wrapper.get('.role-badge').classes()).toContain('role-support')
        expect(wrapper.text()).toContain('DEF:')
        expect(wrapper.text()).toContain('20')
    })

    it.each([
        [1, 'MELEE', 'range-melee'],
        [3, 'RANGED', 'range-ranged'],
    ])('labels range %s as %s', (range, label, badgeClass) => {
        const wrapper = mount(UnitTooltip, {
            props: {
                unit: unitDefinition({ range })
            }
        })

        expect(wrapper.get('.range-badge').text()).toBe(label)
        expect(wrapper.get('.range-badge').classes()).toContain(badgeClass)
        expect(wrapper.find('.role-progression').exists()).toBe(false)
    })

    it('colors known trait tags and uses the neutral fallback for unknown traits', () => {
        setTraitData([{
            id: 'bug',
            name: 'Bug',
            description: 'Bug trait',
            effects: [],
            type: 'type',
            iconColor: '#22c55e',
        }])
        const wrapper = mount(UnitTooltip, {
            props: {
                unit: unitDefinition({ traits: ['Bug', 'Unknown'] })
            }
        })

        const tags = wrapper.findAll('.trait-tag')
        expect(tags[0].attributes('style')).toContain('rgb(34, 197, 94)')
        expect(tags[1].attributes('style')).toContain('rgb(148, 163, 184)')
    })

    it('shows a pending evolution hint only for pending units', () => {
        const base = { ...unitDefinition(), evolutionOptions: null }
        const plain = mount(UnitTooltip, { props: { unit: base } })
        expect(plain.find('[data-testid="evolution-hint"]').exists()).toBe(false)
        plain.unmount()

        const option = {
            definitionId: 'x', role: 'TANK' as const, traits: [], range: 1, maxHealth: 1, attackDamage: 1,
            defense: 1, attackSpeed: 1, maxMana: 1, abilityName: null, abilityDescription: '', laterForms: [],
        }
        const pending = mount(UnitTooltip, {
            props: {
                unit: {
                    ...base,
                    evolutionOptions: [
                        { ...option, branchId: 'silcoon', name: 'Silcoon' },
                        { ...option, branchId: 'cascoon', name: 'Cascoon' },
                    ],
                },
            },
        })
        expect(pending.get('[data-testid="evolution-hint"]').text()).toBe('Choose an evolution: Silcoon, Cascoon')
        pending.unmount()
    })
})

