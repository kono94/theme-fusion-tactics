import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CameraRig, EffectSystem, TimedEffect } from '../../effects'
import type { CombatUnit3d } from '../../types'
import { UnitView } from '../../unitView'
import { GEN23_TIER45_ATTACKS } from '../attacks/gen23Tier45'
import type { FxContext } from '../primitives'
import { GEN23_TIER45_ULTIMATES } from './gen23Tier45'

const KEYS = [
  'scizor:Bullet Punch',
  'heracross:Megahorn',
  'skarmory:Spikes',
  'steelix:Iron Tail',
  'blissey:Soft-Boiled',
  'wobbuffet:Counter',
  'miltank:Milk Drink',
  'absol:Razor Wind',
  'sableye:Confuse Ray',
  'mawile:Fake Tears',
  'torkoal:Heat Wave',
  'castform:Weather Ball',
  'zangoose:Crush Claw',
  'seviper:Poison Tail',
  'lugia:Aeroblast',
  'ho_oh:Sacred Fire',
  'raikou:Thunder',
  'entei:Eruption',
  'suicune:Mist',
  'kyogre:Origin Pulse',
  'groudon:Precipice Blades',
  'rayquaza:Dragon Ascent',
  'latios:Luster Purge',
]
const IDS = KEYS.map((key) => key.split(':')[0])
const SUPPORT = new Set(['blissey', 'miltank', 'suicune'])

interface Options {
  definitionId?: string
  range?: number
  ownerId?: string
  gridX?: number
  gridY?: number
}

function makeUnit(id: string, options: Options = {}): CombatUnit3d {
  return {
    id,
    definitionId: options.definitionId ?? `test_${id}`,
    name: id,
    ownerId: options.ownerId ?? 'a',
    isMine: (options.ownerId ?? 'a') === 'a',
    starLevel: 2,
    range: options.range ?? 1,
    gridX: options.gridX ?? 4,
    gridY: options.gridY ?? 4,
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

function harness(definitionId: string, range = 1) {
  const effects: TimedEffect[] = []
  const source = new UnitView(makeUnit('source', { definitionId, range }), new THREE.Texture(), 0)
  const target = new UnitView(
    makeUnit('target', { ownerId: 'b', gridY: 2 }),
    new THREE.Texture(),
    0,
  )
  const bystander = new UnitView(
    makeUnit('bystander', { ownerId: 'b', gridX: 5, gridY: 3 }),
    new THREE.Texture(),
    0,
  )
  const liner = new UnitView(makeUnit('liner', { ownerId: 'b', gridY: 1 }), new THREE.Texture(), 0)
  const ally = new UnitView(makeUnit('ally', { gridX: 5 }), new THREE.Texture(), 0)
  const views = [source, target, bystander, liner, ally]
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
    enemiesOf: (view) => views.filter((other) => other.unit.ownerId !== view.unit.ownerId),
    alliesOf: (view) =>
      views.filter((other) => other !== view && other.unit.ownerId === view.unit.ownerId),
  }
  const run = () => {
    for (const effect of effects) {
      for (const p of [0, 0.1, 0.5, 0.9, 1]) {
        views.forEach((view) => view.resetPose())
        effect.update(p, effect.start + effect.duration * p)
        views.forEach((view) => {
          expect(Number.isFinite(view.pose.lift), 'pose stays finite').toBe(true)
          expect(Number.isFinite(view.pose.offset.x), 'pose stays finite').toBe(true)
          expect(Number.isFinite(view.pose.scale), 'pose stays finite').toBe(true)
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

describe('Gen 2/3 cost 4-5 signature choreographies', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('covers exactly the cost 4-5 ability keys and definition ids', () => {
    expect(Object.keys(GEN23_TIER45_ULTIMATES).sort()).toEqual([...KEYS].sort())
    expect(Object.keys(GEN23_TIER45_ATTACKS).sort()).toEqual([...IDS].sort())
  })

  it.each(KEYS)('ultimate %s lands within budget', (key) => {
    const definitionId = key.split(':')[0]
    const { ctx, effects, source, target, ally, run } = harness(definitionId)
    const impact = GEN23_TIER45_ULTIMATES[key](ctx, {
      source,
      target: SUPPORT.has(definitionId) ? ally : target,
      primary: '#22c55e',
      secondary: '#bbf7d0',
      shake: 0.3,
    })
    expect(impact).toBeGreaterThan(0)
    expect(impact).toBeLessThanOrEqual(1200)
    expect(effects.length).toBeGreaterThan(0)
    expect(effects.length).toBeLessThanOrEqual(45)
    run()
  })

  it.each(IDS.flatMap((id) => [[id, 1] as const, [id, 3] as const]))(
    'auto-attack %s (range %i) is cheap and quick',
    (id, range) => {
      const { ctx, effects, source, target, run } = harness(id, range)
      const impact = GEN23_TIER45_ATTACKS[id](ctx, {
        source,
        target,
        color: '#ef4444',
        secondary: '#fde047',
      })
      expect(impact).toBeGreaterThanOrEqual(0)
      expect(impact).toBeLessThanOrEqual(320)
      expect(effects.length).toBeLessThanOrEqual(5)
      expect(effects.every((effect) => effect.priority === 'standard')).toBe(true)
      expect(
        Math.max(...effects.map((effect) => effect.start + effect.duration)),
      ).toBeLessThanOrEqual(1000)
      run()
    },
  )
})
