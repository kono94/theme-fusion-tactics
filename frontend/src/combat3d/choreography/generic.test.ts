import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AbilityEffectStyle, AttackType } from '../../data/animationConfig'
import type { CameraRig, EffectSystem, TimedEffect } from '../effects'
import type { CombatUnit3d } from '../types'
import { UnitView } from '../unitView'
import { abilityTick, typedAttack } from './attacks/generic'
import { ELEMENT_ULTIMATES } from './elements'
import type { FxContext } from './primitives'
import { playHeal, playShield, playUltimate } from './registry'

// Isolate the shared fallbacks from the per-unit signature sets.
vi.mock('./ultimates', () => ({ SIGNATURE_ULTIMATES: {} }))
vi.mock('./attacks', () => ({ SIGNATURE_ATTACKS: {} }))

const ATTACK_TYPES: AttackType[] = [
  'punch',
  'slash',
  'projectile',
  'kick',
  'blunt',
  'rubberPunch',
  'tripleSlash',
  'sniperShot',
  'magmaFist',
  'waterShock',
  'lightning',
  'fireKick',
  'leafCut',
  'flameBurst',
  'aquaJet',
  'thunderJolt',
  'psyPulse',
  'poisonSting',
  'windGust',
  'stoneToss',
  'iceShard',
  'shadowOrb',
  'bugBite',
  'forcePalm',
  'dragonSpark',
  'metalSpark',
]

const POKEMON_STYLES: AbilityEffectStyle[] = [
  'POKEMON_GRASS_BLOOM',
  'POKEMON_FIRE_STREAM',
  'POKEMON_WATER_CANNON',
  'POKEMON_ELECTRIC_STORM',
  'POKEMON_PSYCHIC_WAVE',
  'POKEMON_POISON_BURST',
  'POKEMON_EARTH_SPIKES',
  'POKEMON_ICE_CRYSTAL',
  'POKEMON_DRAGON_BEAM',
  'POKEMON_GHOST_NIGHTMARE',
  'POKEMON_NORMAL_RALLY',
  'POKEMON_BUG_SWARM',
  'POKEMON_FIGHTING_COMBO',
  'POKEMON_FLYING_GUST',
  'POKEMON_STEEL_FIELD',
]

interface Options {
  attackType?: AttackType
  range?: number
  abilityType?: string | null
  effectStyle?: AbilityEffectStyle
  ownerId?: string
  gridX?: number
  gridY?: number
}

function makeUnit(id: string, options: Options = {}): CombatUnit3d {
  return {
    id,
    definitionId: `generic_test_${id}`,
    name: id,
    ownerId: options.ownerId ?? 'a',
    isMine: (options.ownerId ?? 'a') === 'a',
    starLevel: 1,
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
    abilityType: options.abilityType ?? 'DAMAGE',
    abilityName: null,
    abilityPattern: null,
    items: [],
    attack: { type: options.attackType ?? 'punch', color: '#ef4444', secondaryColor: '#fde047' },
    ability: { color: '#22c55e', secondaryColor: '#bbf7d0', effectStyle: options.effectStyle },
  }
}

function harness(sourceOptions: Options = {}) {
  const effects: TimedEffect[] = []
  const source = new UnitView(makeUnit('source', sourceOptions), new THREE.Texture(), 0)
  const target = new UnitView(
    makeUnit('target', { ownerId: 'b', gridY: 1 }),
    new THREE.Texture(),
    0,
  )
  const bystander = new UnitView(
    makeUnit('bystander', { ownerId: 'b', gridX: 5, gridY: 1 }),
    new THREE.Texture(),
    0,
  )
  const ally = new UnitView(makeUnit('ally', { gridX: 5 }), new THREE.Texture(), 0)
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

describe('generic choreographies', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(ATTACK_TYPES.flatMap((type) => [[type, 1] as const, [type, 4] as const]))(
    'auto-attack %s (range %i) is cheap, standard priority and lands quickly',
    (type, range) => {
      const { ctx, effects, source, target, run } = harness({ attackType: type, range })
      const impact = typedAttack(ctx, { source, target, color: '#ef4444', secondary: '#fde047' })
      expect(impact).toBeGreaterThanOrEqual(0)
      expect(impact).toBeLessThanOrEqual(320)
      expect(effects.length).toBeLessThanOrEqual(4)
      expect(effects.every((effect) => effect.priority === 'standard')).toBe(true)
      expect(
        Math.max(...effects.map((effect) => effect.start + effect.duration)),
      ).toBeLessThanOrEqual(700)
      run()
    },
  )

  it('covers every Pokemon element style', () => {
    for (const style of POKEMON_STYLES)
      expect(ELEMENT_ULTIMATES[style], style).toBeTypeOf('function')
  })

  it.each(POKEMON_STYLES)('element ultimate %s stays within budget', (style) => {
    const { ctx, effects, source, target, run } = harness({ effectStyle: style })
    const impact = playUltimate(ctx, source, target)
    expect(impact).toBeGreaterThan(0)
    expect(impact).toBeLessThanOrEqual(900)
    expect(effects.length).toBeLessThanOrEqual(34)
    run()
  })

  it.each([
    ['DAMAGE', undefined],
    ['DAMAGE', 'QUAKE'],
    ['DAMAGE', 'MAGMA_RAIN'],
    ['DAMAGE', 'ZORO_ONIGIRI'],
    ['STUN', undefined],
    ['STUN', 'POKEMON_ELECTRIC_STORM'],
    ['DEBUFF_DEF', 'POKEMON_POISON_BURST'],
    ['BUFF_ATK', undefined],
    ['BUFF_SPD', undefined],
    ['BUFF_DEF', undefined],
    ['HEAL', undefined],
    ['SHIELD', undefined],
  ] as const)('role family %s / %s plays on its target', (abilityType, effectStyle) => {
    const { ctx, effects, source, target, ally, run } = harness({ abilityType, effectStyle })
    const buffLike =
      abilityType.startsWith('BUFF') || abilityType === 'HEAL' || abilityType === 'SHIELD'
    const impact = playUltimate(ctx, source, buffLike ? ally : target)
    expect(impact).toBeGreaterThanOrEqual(0)
    expect(impact).toBeLessThanOrEqual(900)
    expect(effects.length).toBeGreaterThan(0)
    expect(effects.length).toBeLessThanOrEqual(34)
    run()
  })

  it('keeps event-driven heal, shield and ability ticks light', () => {
    for (const play of [playHeal, playShield]) {
      const { ctx, effects, source, ally, run } = harness()
      play(ctx, source, ally)
      expect(effects.length).toBeLessThanOrEqual(5)
      run()
    }
    for (const abilityType of ['DOT', 'LIFESTEAL', 'DAMAGE']) {
      const { ctx, effects, source, target, run } = harness({ abilityType })
      abilityTick(ctx, source, target)
      expect(effects.length).toBeLessThanOrEqual(3)
      expect(effects.every((effect) => effect.priority === 'standard')).toBe(true)
      run()
    }
  })
})

describe('UnitView reactions', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('knocks the unit away from the attacker and recovers', () => {
    const view = new UnitView(makeUnit('victim'), new THREE.Texture(), 0)
    const home = view.root.position.clone()
    view.onHit(1000, home.clone().add(new THREE.Vector3(-1, 0, 0)))
    view.update(1040, true)
    expect(view.body.position.x).toBeGreaterThan(0)
    view.update(1600, true)
    expect(view.body.position.x).toBeCloseTo(0)
  })

  it('fades out and is gone after the death animation', () => {
    const view = new UnitView(makeUnit('victim'), new THREE.Texture(), 0)
    view.die(1000)
    view.update(1450, false)
    expect(view.isDying).toBe(true)
    expect(view.isGone(1500)).toBe(false)
    expect(view.isGone(2000)).toBe(true)
  })
})
