import { describe, expect, it } from 'vitest'
import type { EvolutionOption } from '../types'
import {
  buildChooseEvolutionAction,
  canChooseEvolution,
  evolutionHint,
  isEvolutionPending,
  laterFormsLabel,
  traitChoices,
} from './evolution'

function option(branchId: string, name: string, laterForms: string[] = []): EvolutionOption {
  return {
    branchId,
    definitionId: branchId,
    name,
    role: 'TANK',
    traits: ['Bug'],
    range: 1,
    maxHealth: 900,
    attackDamage: 70,
    defense: 20,
    attackSpeed: 0.7,
    maxMana: 50,
    abilityName: 'Harden',
    abilityDescription: 'Hardens.',
    laterForms: laterForms.map((formName, index) => ({
      starLevel: 3 + index,
      definitionId: formName.toLowerCase(),
      name: formName,
    })),
  }
}

const pending = {
  ownerId: 'me',
  evolutionOptions: [option('silcoon', 'Silcoon', ['Beautifly']), option('cascoon', 'Cascoon')],
}
const planning = { phase: 'PLANNING' as const, actingPlayerId: 'me', readOnly: false }

describe('evolution helpers', () => {
  it('recognises a second-type choice when every option keeps the unit and adds one trait', () => {
    const typed = (trait: string): EvolutionOption => ({
      ...option(trait.toLowerCase(), 'Unown K'),
      definitionId: 'unown_k',
      traits: ['Psychic', trait],
    })
    const options = [typed('Fire'), typed('Water')]

    expect(traitChoices(options)).toEqual([
      { branchId: 'fire', trait: 'Fire' },
      { branchId: 'water', trait: 'Water' },
    ])
    expect(evolutionHint({ ownerId: 'me', evolutionOptions: options })).toBe(
      'Press Evolve to choose a second type',
    )
    expect(traitChoices(pending.evolutionOptions)).toBeNull()
    expect(traitChoices([typed('Fire')])).toBeNull()
    expect(traitChoices(null)).toBeNull()
  })

  it('treats only units with options as pending', () => {
    expect(isEvolutionPending(pending)).toBe(true)
    expect(isEvolutionPending({ ownerId: 'me', evolutionOptions: null })).toBe(false)
    expect(isEvolutionPending({ ownerId: 'me' })).toBe(false)
    expect(isEvolutionPending(null)).toBe(false)
  })

  it('allows a choice only for own pending units during planning when not read-only', () => {
    expect(canChooseEvolution(pending, planning)).toBe(true)
    expect(canChooseEvolution(pending, { ...planning, phase: 'COMBAT' })).toBe(false)
    expect(canChooseEvolution(pending, { ...planning, readOnly: true })).toBe(false)
    expect(canChooseEvolution(pending, { ...planning, actingPlayerId: 'other' })).toBe(false)
    expect(canChooseEvolution(pending, { ...planning, actingPlayerId: undefined })).toBe(false)
    expect(canChooseEvolution({ ownerId: 'me', evolutionOptions: null }, planning)).toBe(false)
  })

  it('lists the options in the tooltip hint and later forms label', () => {
    expect(evolutionHint(pending)).toBe('Choose an evolution: Silcoon, Cascoon')
    expect(evolutionHint({ ownerId: 'me', evolutionOptions: null })).toBeNull()
    expect(laterFormsLabel(pending.evolutionOptions[0]!)).toBe('then: Beautifly')
    expect(laterFormsLabel(pending.evolutionOptions[1]!)).toBeNull()
  })

  it('builds the CHOOSE_EVOLUTION action shape', () => {
    expect(buildChooseEvolutionAction('me', 'unit-1', 'silcoon')).toEqual({
      type: 'CHOOSE_EVOLUTION',
      playerId: 'me',
      unitId: 'unit-1',
      branchId: 'silcoon',
    })
  })
})
