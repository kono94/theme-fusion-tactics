import { describe, expect, it } from 'vitest'
import { variantShopHint } from './variantGroups'

describe('variant shop hint', () => {
  it('ignores cards outside a variant group', () => {
    expect(variantShopHint({}, new Set(['glyph']))).toBeNull()
    expect(variantShopHint({ variantGroup: null }, new Set(['glyph']))).toBeNull()
    expect(variantShopHint({ variantGroup: '  ' }, new Set(['glyph']))).toBeNull()
  })

  it('shows a random variant until the player owns a unit of the group line', () => {
    expect(variantShopHint({ variantGroup: 'glyph' }, new Set(['other']))).toBe('random')
  })

  it('shows the lock while the player owns a unit of the group line', () => {
    expect(variantShopHint({ variantGroup: 'glyph' }, new Set(['other', 'glyph']))).toBe('locked')
  })
})
