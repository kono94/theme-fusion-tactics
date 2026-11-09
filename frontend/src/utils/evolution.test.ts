import { describe, expect, it } from 'vitest'
import type { EvolutionOption } from '../types'
import {
  buildChooseEvolutionAction,
  canChooseEvolution,
  evolutionHint,
  isEvolutionPending,
  laterFormsLabel,
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
