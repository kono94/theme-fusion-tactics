import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { EvolutionOption } from '../types'
import EvolutionChoiceOverlay from './EvolutionChoiceOverlay.vue'

function option(branchId: string, name: string, laterForms: string[] = []): EvolutionOption {
  return {
    branchId,
    definitionId: branchId,
    name,
    role: 'DAMAGE',
    traits: ['Water'],
    range: 2,
    maxHealth: 1400,
    attackDamage: 95,
    defense: 40,
    attackSpeed: 1,
    maxMana: 50,
    abilityName: `${name} Move`,
    abilityDescription: `${name} deals <span class="active">20</span> damage.`,
    laterForms: laterForms.map((formName) => ({
      starLevel: 3,
      definitionId: formName.toLowerCase(),
      name: formName,
    })),
  }
}

const sevenChoices = ['vaporeon', 'jolteon', 'flareon', 'espeon', 'umbreon', 'leafeon', 'glaceon'].map(
  (id) => option(id, id.charAt(0).toUpperCase() + id.slice(1)),
)

describe('EvolutionChoiceOverlay', () => {
  it('offers a compact type grid when the options only add a second type', async () => {
    const typed = (trait: string): EvolutionOption => ({
      ...option(trait.toLowerCase(), 'Unown K'),
      definitionId: 'unown_k',
      traits: ['Psychic', trait],
    })
    const wrapper = mount(EvolutionChoiceOverlay, {
      props: {
        unitName: 'Unown K',
        choices: [typed('Fire'), typed('Water'), typed('Grass')],
        gameMode: 'pokemongen23',
      },
    })

    expect(wrapper.text()).toContain('Choose a second type for Unown K')
    expect(wrapper.findAll('.evolution-card')).toHaveLength(0)
    const buttons = wrapper.findAll('.type-button')
    expect(buttons.map((button) => button.text())).toEqual(['Fire', 'Water', 'Grass'])
    expect(buttons[1]!.attributes('aria-label')).toBe('Add the Water type')
    expect(wrapper.get('.type-summary img').attributes('src')).toBe(
      '/assets/units/pokemongen23/unown_k.png',
    )

    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['water']])
  })

  it('renders one accessible card per option with portrait, stats, ability and later forms', () => {
    const wrapper = mount(EvolutionChoiceOverlay, {
      props: {
        unitName: 'Wurmple',
        choices: [option('silcoon', 'Silcoon', ['Beautifly']), option('cascoon', 'Cascoon')],
        gameMode: 'pokemon',
      },
    })

    const cards = wrapper.findAll('.evolution-card')
    expect(cards).toHaveLength(2)
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.text()).toContain('Choose how Wurmple evolves')
    expect(cards[0]!.attributes('aria-label')).toBe('Evolve into Silcoon')
    expect(cards[0]!.get('img').attributes('src')).toBe('/assets/units/pokemon/silcoon.png')
    expect(cards[0]!.text()).toContain('HP 1400')
    expect(cards[0]!.text()).toContain('Silcoon Move')
    expect(cards[0]!.get('.ability-description').html()).toContain('<span class="active">20</span>')
    expect(cards[0]!.get('.later-forms').text()).toBe('then: Beautifly')
    expect(cards[1]!.find('.later-forms').exists()).toBe(false)
    wrapper.unmount()
  })

  it('fits seven choices', () => {
    const wrapper = mount(EvolutionChoiceOverlay, {
      props: { unitName: 'Eevee', choices: sevenChoices, gameMode: 'pokemon' },
    })
    expect(wrapper.findAll('.evolution-card')).toHaveLength(7)
    wrapper.unmount()
  })

  it('emits the picked branch once and locks the other cards', async () => {
    const wrapper = mount(EvolutionChoiceOverlay, {
      props: { unitName: 'Eevee', choices: sevenChoices, gameMode: 'pokemon' },
    })

    await wrapper.findAll('.evolution-card')[1]!.trigger('click')
    await wrapper.findAll('.evolution-card')[2]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['jolteon']])
    expect(wrapper.findAll('.evolution-card').every((card) => card.attributes('disabled') !== undefined)).toBe(
      true,
    )
    wrapper.unmount()
  })

  it('closes on Escape, the close button and the cancel button', async () => {
    const wrapper = mount(EvolutionChoiceOverlay, {
      props: { unitName: 'Eevee', choices: sevenChoices, gameMode: 'pokemon' },
      attachTo: document.body,
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.get('.close-button').trigger('click')
    await wrapper.get('.cancel-button').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(3)
    wrapper.unmount()
  })
})
