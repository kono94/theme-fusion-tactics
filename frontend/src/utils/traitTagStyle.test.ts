import { afterEach, describe, expect, it } from 'vitest'
import { setTraitData } from '../data/traitData'
import { NEUTRAL_TRAIT_COLOR, traitTagStyle } from './traitTagStyle'

describe('traitTagStyle', () => {
  afterEach(() => setTraitData([]))

  it('tints tags with the trait color', () => {
    setTraitData([{ id: 'water', name: 'Water', description: '', type: 'origin', iconColor: '#3b82f6', effects: [] }])
    expect(traitTagStyle('Water')).toEqual({
      color: '#3b82f6',
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.14)',
    })
  })

  it('falls back to a neutral color for unknown traits', () => {
    expect(traitTagStyle('Unknown').color).toBe(NEUTRAL_TRAIT_COLOR)
  })
})
