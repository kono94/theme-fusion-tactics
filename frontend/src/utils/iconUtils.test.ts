import { describe, expect, it, vi } from 'vitest'
import { getUnitIconPath, UNIT_ICON_PLACEHOLDER } from './iconUtils'

describe('getUnitIconPath', () => {
    it('resolves each mode through its metadata asset folder', () => {
        expect(getUnitIconPath('luffy_v1', 'onepiece')).toBe('/assets/units/onepiece/luffy_v1.png')
        expect(getUnitIconPath('pikachu', 'pokemon')).toBe('/assets/units/pokemon/pikachu.png')
        expect(getUnitIconPath('ho_oh', 'pokemongen23')).toBe('/assets/units/pokemongen23/ho_oh.png')
    })

    it('uses a shared placeholder instead of a cross-mode fallback', () => {
        expect(getUnitIconPath('', 'pokemon')).toBe(UNIT_ICON_PLACEHOLDER)
        expect(getUnitIconPath('unknown', 'unsupported')).toBe(UNIT_ICON_PLACEHOLDER)
        vi.restoreAllMocks()
    })
})
