import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CameraRig, EffectSystem, TimedEffect } from '../../effects'
import type { CombatUnit3d } from '../../types'
import { UnitView } from '../../unitView'
import type { FxContext } from '../primitives'
import { GEN23_TIER1_ULTIMATES } from './gen23Tier1'

const EXPECTED_KEYS = [
  'chikorita:Synthesis',
  'bayleef:Reflect',
  'meganium:Aromatherapy',
  'cyndaquil:Ember',
  'quilava:Flame Wheel',
  'typhlosion:Eruption',
  'totodile:Bite',
  'croconaw:Ice Fang',
  'feraligatr:Waterfall',
  'treecko:Pound',
  'grovyle:Fury Cutter',
  'sceptile:Leaf Blade',
  'torchic:Peck',
  'combusken:Double Kick',
  'blaziken:Blaze Kick',
  'mudkip:Water Gun',
  'marshtomp:Mud Shot',
  'swampert:Muddy Water',
  'hoothoot:Hypnosis',
  'noctowl:Extrasensory',
  'poochyena:Bite',
  'mightyena:Crunch',
  'zigzagoon:Headbutt',
  'linoone:Extreme Speed',
  'wurmple:String Shot',
  'silcoon:Harden',
  'cascoon:Iron Defense',
  'beautifly:Silver Wind',
  'dustox:Poison Powder',
  'taillow:Wing Attack',
  'swellow:Brave Bird',
  'wingull:Supersonic',
  'pelipper:Rain Dance',
  'lotad:Absorb',
  'lombre:Fake Out',
  'ludicolo:Giga Drain',
  'seedot:Bullet Seed',
  'nuzleaf:Feint Attack',
  'shiftry:Leaf Tornado',
]

function makeUnit(
  id: string,
  ownerId: string,
  gridX: number,
  gridY: number,
  range = 1,
): CombatUnit3d {
  return {
    id,
    definitionId: `gen23_test_${id}`,
    name: id,
    ownerId,
    isMine: ownerId === 'a',
    starLevel: 1,
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
    abilityType: 'DAMAGE',
    abilityName: null,
    abilityPattern: null,
    items: [],
    attack: { type: 'punch', color: '#ef4444', secondaryColor: '#fde047' },
    ability: { color: '#22c55e', secondaryColor: '#bbf7d0' },
  }
}

function harness(range: number, reducedMotion: boolean) {
  const effects: TimedEffect[] = []
  const view = (unit: CombatUnit3d) => new UnitView(unit, new THREE.Texture(), 0)
  const source = view(makeUnit('source', 'a', 4, 4, range))
  const target = view(makeUnit('target', 'b', 4, 1))
  const bystander = view(makeUnit('bystander', 'b', 5, 1))
  const ally = view(makeUnit('ally', 'a', 5, 4))
  const views = [source, target, bystander, ally]
  const ctx: FxContext = {
    now: 0,
    effects: { add: (effect: TimedEffect) => effects.push(effect) } as unknown as EffectSystem,
    camera: {
      quaternion: new THREE.Quaternion(),
      punch: () => {},
      shake: () => {},
    } as unknown as CameraRig,
    particleScale: 1,
    reducedMotion,
    floatText: () => {},
    flash: () => {},
    enemiesOf: (unit) => views.filter((other) => other.unit.ownerId !== unit.unit.ownerId),
    alliesOf: (unit) =>
      views.filter((other) => other !== unit && other.unit.ownerId === unit.unit.ownerId),
  }
  const run = () => {
    for (const effect of effects) {
      for (const p of [0, 0.1, 0.5, 0.9, 1]) {
        views.forEach((other) => other.resetPose())
        effect.update(p, effect.start + effect.duration * p)
        views.forEach((other) => {
          expect(Number.isFinite(other.pose.lift), 'pose stays finite').toBe(true)
          expect(Number.isFinite(other.pose.offset.x), 'pose stays finite').toBe(true)
        })
      }
      effect.finish?.()
      effect.object?.traverse((object) => {
        if (object instanceof THREE.Mesh)
          expect(object.position.toArray().every(Number.isFinite)).toBe(true)
      })
    }
  }
  return { ctx, effects, source, target, ally, run }
}

const SUPPORT_KEYS = new Set([
  'chikorita:Synthesis',
  'bayleef:Reflect',
  'meganium:Aromatherapy',
  'silcoon:Harden',
  'cascoon:Iron Defense',
  'pelipper:Rain Dance',
])

describe('Gen 2/3 cost-1 signature ultimates', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('covers exactly the cost-1 moves with full keys', () => {
    expect(Object.keys(GEN23_TIER1_ULTIMATES).sort()).toEqual([...EXPECTED_KEYS].sort())
  })

  it.each(EXPECTED_KEYS.flatMap((key) => [[key, 1, false] as const, [key, 4, true] as const]))(
    '%s (range %i, reduced motion %s) lands in time and within budget',
    (key, range, reducedMotion) => {
      const { ctx, effects, source, target, ally, run } = harness(range, reducedMotion)
      const impact = GEN23_TIER1_ULTIMATES[key](ctx, {
        source,
        target: SUPPORT_KEYS.has(key) ? ally : target,
        primary: '#22c55e',
        secondary: '#bbf7d0',
        shake: 2,
      })
      expect(impact).toBeGreaterThan(0)
      expect(impact).toBeLessThanOrEqual(1200)
      expect(effects.length).toBeGreaterThan(0)
      expect(effects.length).toBeLessThanOrEqual(40)
      run()
    },
  )
})
