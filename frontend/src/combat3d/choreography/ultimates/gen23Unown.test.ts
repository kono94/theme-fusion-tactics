import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import pokemonGen23Units from '../../../../../backend/src/main/resources/data/units_pokemongen23.json'
import type { CameraRig, EffectSystem, TimedEffect } from '../../effects'
import type { CombatUnit3d } from '../../types'
import { UnitView } from '../../unitView'
import type { FxContext } from '../primitives'
import { GEN23_UNOWN_ULTIMATES, UNOWN_IDS } from './gen23Unown'

interface RawVariant {
  id: string
  ability: { name: string; type: string; pattern: string }
}

const VARIANTS = (pokemonGen23Units as { variants?: RawVariant[] }[]).flatMap(
  (unit) => unit.variants ?? [],
)

const SUPPORT_TYPES = new Set(['HEAL', 'SHIELD', 'BUFF_SPD'])

function makeUnit(
  id: string,
  ownerId: string,
  gridX: number,
  gridY: number,
  range = 1,
  ability: Pick<CombatUnit3d, 'abilityType' | 'abilityPattern'> = {
    abilityType: 'DAMAGE',
    abilityPattern: 'SINGLE',
  },
): CombatUnit3d {
  return {
    id,
    definitionId: `gen23_test_${id}`,
    name: id,
    ownerId,
    isMine: ownerId === 'a',
    starLevel: 2,
    range,
    gridX,
    gridY,
    hp: 100,
    maxHp: 100,
    shield: 0,
    mana: 0,
    maxMana: 100,
    stunned: false,
    portraitUrl: '',
    abilityType: ability.abilityType,
    abilityName: 'Hidden Power',
    abilityPattern: ability.abilityPattern,
    items: [],
    attack: { type: 'punch', color: '#ef4444', secondaryColor: '#fde047' },
    ability: { color: '#22c55e', secondaryColor: '#bbf7d0' },
  }
}

function harness(range: number, ability: Pick<CombatUnit3d, 'abilityType' | 'abilityPattern'>) {
  const effects: TimedEffect[] = []
  const view = (id: string, owner: string, x: number, y: number, r = 1) =>
    new UnitView(makeUnit(id, owner, x, y, r), new THREE.Texture(), 0)
  const source = new UnitView(makeUnit('source', 'a', 4, 4, range, ability), new THREE.Texture(), 0)
  const target = view('target', 'b', 4, 1)
  const views = [
    source,
    target,
    view('bystander', 'b', 5, 1),
    view('behind', 'b', 4, 0),
    view('ally', 'a', 5, 4),
  ]
  const ctx: FxContext = {
    now: 0,
    effects: { add: (effect: TimedEffect) => effects.push(effect) } as unknown as EffectSystem,
    camera: {
      quaternion: new THREE.Quaternion(),
      punch: () => {},
      shake: () => {},
    } as unknown as CameraRig,
    particleScale: 1,
    reducedMotion: false,
    floatText: () => {},
    flash: () => {},
    enemiesOf: (unit) => views.filter((other) => other.unit.ownerId !== unit.unit.ownerId),
    alliesOf: (unit) =>
      views.filter((other) => other !== unit && other.unit.ownerId === unit.unit.ownerId),
  }
  const run = () => {
    for (const effect of effects) {
      for (const p of [0, 0.1, 0.5, 0.9, 1]) {
        views.forEach((unit) => unit.resetPose())
        effect.update(p, effect.start + effect.duration * p)
        views.forEach((unit) => {
          expect(Number.isFinite(unit.pose.lift), 'pose stays finite').toBe(true)
          expect(Number.isFinite(unit.pose.offset.x), 'pose stays finite').toBe(true)
          expect(Number.isFinite(unit.pose.scale), 'pose stays finite').toBe(true)
        })
      }
      effect.finish?.()
      effect.object?.traverse((object) => {
        if (object instanceof THREE.Mesh)
          expect(object.position.toArray().every(Number.isFinite)).toBe(true)
      })
    }
  }
  return { ctx, effects, source, target, ally: views[4], run }
}

describe('Gen 2/3 Unown Hidden Power', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers one shared choreography for every Unown variant in the data', () => {
    expect([...UNOWN_IDS].sort()).toEqual(VARIANTS.map((variant) => variant.id).sort())
    expect(Object.keys(GEN23_UNOWN_ULTIMATES).sort()).toEqual(
      VARIANTS.map((variant) => `${variant.id}:${variant.ability.name}`).sort(),
    )
    expect(new Set(Object.values(GEN23_UNOWN_ULTIMATES)).size).toBe(1)
  })

  it.each(
    VARIANTS.flatMap((variant) => [
      [variant.id, 1, variant] as const,
      [variant.id, 4, variant] as const,
    ]),
  )('%s (range %i) lands in time and stays within budget', (_id, range, variant) => {
    const ability = { abilityType: variant.ability.type, abilityPattern: variant.ability.pattern }
    const { ctx, effects, source, target, ally, run } = harness(range, ability)
    const impact = GEN23_UNOWN_ULTIMATES[`${variant.id}:Hidden Power`](ctx, {
      source,
      target: SUPPORT_TYPES.has(variant.ability.type) ? ally : target,
      primary: '#22c55e',
      secondary: '#bbf7d0',
      shake: 0.2,
    })
    expect(impact).toBeGreaterThan(0)
    expect(impact).toBeLessThanOrEqual(1200)
    expect(effects.length).toBeGreaterThan(0)
    expect(effects.length).toBeLessThanOrEqual(40)
    run()
  })
})
