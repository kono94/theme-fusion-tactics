import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import type { CombatUnit3d } from './types'
import { UnitView } from './unitView'

describe('UnitView equipment labels', () => {
  it('shows equipped icons in the 3D combat overlay', () => {
    const canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const unit: CombatUnit3d = {
      id: 'unit', definitionId: 'spearow', name: 'Spearow', ownerId: 'player', isMine: true,
      starLevel: 1, range: 4, gridX: 2, gridY: 4, hp: 100, maxHp: 100, shield: 0,
      mana: 0, maxMana: 50, stunned: false, portraitUrl: '/spearow.png',
      abilityType: null, abilityName: null, abilityPattern: null,
      items: [{ id: 'pokemon_charm', name: 'Vital Charm', icon: '/assets/items/pokemon/charm.png' }],
      attack: { type: 'projectile', color: '#fff' }, ability: { color: '#fff' },
    }

    const view = new UnitView(unit, new THREE.Texture(), 0)
    const icon = view.label.querySelector<HTMLImageElement>('.unit-items img')
    expect(icon?.getAttribute('src')).toBe('/assets/items/pokemon/charm.png')
    expect(icon?.alt).toBe('Vital Charm')
    view.dispose()
    canvasContext.mockRestore()
  })
})
