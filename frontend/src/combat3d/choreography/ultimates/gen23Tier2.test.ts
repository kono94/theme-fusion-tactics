import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CameraRig, EffectSystem, TimedEffect } from '../../effects'
import type { CombatUnit3d } from '../../types'
import { UnitView } from '../../unitView'
import type { FxContext } from '../primitives'
import { GEN23_TIER2_ULTIMATES } from './gen23Tier2'

const KEYS = [
  'mareep:Thunder Shock',
  'flaaffy:Thunder Punch',
  'ampharos:Zap Cannon',
  'marill:Bubble',
  'azumarill:Rollout',
  'togepi:Charm',
  'togetic:Wish',
  'togekiss:Air Slash',
  'natu:Confuse Ray',
  'xatu:Future Sight',
  'sneasel:Quick Attack',
  'weavile:Night Slash',
  'murkrow:Pursuit',
  'honchkrow:Sucker Punch',
  'houndour:Ember',
  'houndoom:Flamethrower',
  'swinub:Powder Snow',
  'piloswine:Ice Fang',
  'mamoswine:Earthquake',
  'snubbull:Scary Face',
  'granbull:Crunch',
  'shroomish:Spore',
  'breloom:Mach Punch',
  'makuhita:Arm Thrust',
  'hariyama:Force Palm',
  'aron:Headbutt',
  'lairon:Iron Defense',
  'aggron:Heavy Slam',
  'electrike:Spark',
  'manectric:Thunder',
  'spheal:Powder Snow',
  'sealeo:Aurora Beam',
  'walrein:Hail',
  'snorunt:Icy Wind',
  'glalie:Hail',
  'froslass:Ominous Wind',
  'phanpy:Rollout',
  'donphan:Rapid Spin',
]

const SUPPORT_KEYS = new Set(['togetic:Wish', 'togekiss:Air Slash', 'lairon:Iron Defense'])

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
    abilityType: 'DAMAGE',
    abilityName: null,
    abilityPattern: null,
    items: [],
    attack: { type: 'punch', color: '#ef4444', secondaryColor: '#fde047' },
    ability: { color: '#22c55e', secondaryColor: '#bbf7d0' },
  }
}

function harness(range: number) {
  const effects: TimedEffect[] = []
  const view = (id: string, owner: string, x: number, y: number, r = 1) =>
    new UnitView(makeUnit(id, owner, x, y, r), new THREE.Texture(), 0)
  const source = view('source', 'a', 4, 4, range)
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

describe('Gen 2/3 cost-2 signature ultimates', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('covers exactly the cost-2 forms and moves', () => {
    expect(Object.keys(GEN23_TIER2_ULTIMATES).sort()).toEqual([...KEYS].sort())
  })

  it.each(KEYS.flatMap((key) => [[key, 1] as const, [key, 4] as const]))(
    '%s (range %i) lands in time and stays within budget',
    (key, range) => {
      const { ctx, effects, source, target, ally, run } = harness(range)
      const impact = GEN23_TIER2_ULTIMATES[key](ctx, {
        source,
        target: SUPPORT_KEYS.has(key) ? ally : target,
        primary: '#22c55e',
        secondary: '#bbf7d0',
        shake: 0.2,
      })
      expect(impact).toBeGreaterThan(0)
      expect(impact).toBeLessThanOrEqual(1200)
      expect(effects.length).toBeGreaterThan(0)
      expect(effects.length).toBeLessThanOrEqual(40)
      run()
    },
  )
})
